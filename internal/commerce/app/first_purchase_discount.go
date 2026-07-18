package app

import (
	"errors"
	"time"

	"github.com/sh2001sh/new-api/constant"
	commercedomain "github.com/sh2001sh/new-api/internal/commerce/domain"
	commercestore "github.com/sh2001sh/new-api/internal/commerce/paymentsettings"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// FirstPurchaseDiscountOffer describes the current user's campaign state.
type FirstPurchaseDiscountOffer struct {
	Enabled    bool    `json:"enabled"`
	Active     bool    `json:"active"`
	Eligible   bool    `json:"eligible"`
	Multiplier float64 `json:"multiplier"`
	StartAt    int64   `json:"start_at"`
	EndAt      int64   `json:"end_at"`
}

func BuildFirstPurchaseDiscountOffer(userID int, now time.Time) FirstPurchaseDiscountOffer {
	setting := commercestore.GetPaymentSetting()
	offer := FirstPurchaseDiscountOffer{
		Enabled:    setting.FirstPurchaseDiscountEnabled,
		Active:     isFirstPurchaseCampaignActive(setting, now.Unix()),
		Multiplier: setting.FirstPurchaseDiscountMultiplier,
		StartAt:    setting.FirstPurchaseDiscountStartAt,
		EndAt:      setting.FirstPurchaseDiscountEndAt,
	}
	if !offer.Active || userID <= 0 || platformdb.DB == nil {
		return offer
	}

	eligible, err := isFirstPurchaseDiscountEligible(platformdb.DB, userID)
	if err == nil {
		offer.Eligible = eligible
	}
	return offer
}

func PreviewFirstPurchaseDiscount(userID int, money float64) float64 {
	offer := BuildFirstPurchaseDiscountOffer(userID, time.Now())
	if !offer.Active || !offer.Eligible {
		return money
	}
	return applyFirstPurchaseMultiplier(money, offer.Multiplier)
}

func applyFirstPurchaseDiscountTx(tx *gorm.DB, topUp *commerceschema.TopUp, now time.Time) error {
	setting := commercestore.GetPaymentSetting()
	if !isFirstPurchaseCampaignActive(setting, now.Unix()) {
		return nil
	}

	var user identityschema.User
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Select("id").First(&user, topUp.UserId).Error; err != nil {
		return err
	}

	eligible, err := isFirstPurchaseDiscountEligible(tx, topUp.UserId)
	if err != nil {
		return err
	}
	if !eligible {
		return nil
	}

	topUp.Money = applyFirstPurchaseMultiplier(topUp.Money, setting.FirstPurchaseDiscountMultiplier)
	topUp.FirstPurchaseDiscountApplied = true
	topUp.FirstPurchaseDiscountMultiplier = setting.FirstPurchaseDiscountMultiplier
	return nil
}

func isFirstPurchaseDiscountEligible(db *gorm.DB, userID int) (bool, error) {
	if db == nil || userID <= 0 {
		return false, errors.New("invalid first purchase eligibility query")
	}
	var count int64
	err := db.Model(&commerceschema.TopUp{}).
		Where("user_id = ?", userID).
		Where("status = ? OR (status = ? AND first_purchase_discount_applied = ?)",
			constant.TopUpStatusSuccess,
			constant.TopUpStatusPending,
			true,
		).
		Count(&count).Error
	return count == 0, err
}

func isFirstPurchaseCampaignActive(setting *commercestore.PaymentSetting, now int64) bool {
	if setting == nil || !setting.FirstPurchaseDiscountEnabled {
		return false
	}
	if setting.FirstPurchaseDiscountMultiplier <= 0 || setting.FirstPurchaseDiscountMultiplier >= 1 {
		return false
	}
	if setting.FirstPurchaseDiscountStartAt <= 0 || setting.FirstPurchaseDiscountEndAt <= setting.FirstPurchaseDiscountStartAt {
		return false
	}
	return now >= setting.FirstPurchaseDiscountStartAt && now <= setting.FirstPurchaseDiscountEndAt
}

func applyFirstPurchaseMultiplier(money float64, multiplier float64) float64 {
	return commercedomain.ApplyDiscountRateToMoney(money, 1-multiplier)
}
