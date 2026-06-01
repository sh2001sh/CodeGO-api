package model

import (
	"errors"
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	PointLedgerTypeEarn    = "earn"
	PointLedgerTypeSpend   = "spend"
	PointLedgerTypeFreeze  = "freeze"
	PointLedgerTypeRelease = "release"
	PointLedgerTypeRefund  = "refund"

	PointSourcePackagePurchase  = "package_purchase"
	PointSourceBonusConversion  = "bonus_quota_conversion"
	PointSourceReferralRegister = "referral_register"
	PointSourceReferralCall     = "referral_first_call"
	PointSourceReferralTopup    = "referral_first_topup"
	PointSourceReferralSpend7   = "referral_7_day_spend"
	PointSourceReferralRetain30 = "referral_30_day_retention"
	PointSourceMallRedeem       = "mall_redeem"
	PointSourceAdminAdjust      = "admin_adjust"

	PointProductTypeJDCard       = "jd_card"
	PointProductTypeBlindBox     = "blind_box_ticket"
	PointProductTypeSubscription = "subscription_plan"

	PointProductStatusOn  = "on"
	PointProductStatusOff = "off"

	PointCardStatusUnused = "unused"
	PointCardStatusLocked = "locked"
	PointCardStatusIssued = "issued"
	PointCardStatusVoid   = "void"

	PointOrderStatusPending  = "pending"
	PointOrderStatusSuccess  = "success"
	PointOrderStatusFailed   = "failed"
	PointOrderStatusRefunded = "refunded"

	BonusQuotaStatusActive    = "active"
	BonusQuotaStatusExhausted = "exhausted"

	PointMallMonthlyBonusConvertLimitUSD = 500
	PointMallBonusQuotaPerPointUSD       = 5
)

type PointAccount struct {
	Id            int   `json:"id"`
	UserId        int   `json:"user_id" gorm:"uniqueIndex;not null"`
	Balance       int64 `json:"balance" gorm:"type:bigint;not null;default:0"`
	FrozenBalance int64 `json:"frozen_balance" gorm:"type:bigint;not null;default:0"`
	CreatedAt     int64 `json:"created_at" gorm:"bigint"`
	UpdatedAt     int64 `json:"updated_at" gorm:"bigint"`
}

type PointLedger struct {
	Id             int    `json:"id"`
	UserId         int    `json:"user_id" gorm:"index;not null"`
	Type           string `json:"type" gorm:"type:varchar(32);index;not null"`
	Delta          int64  `json:"delta" gorm:"type:bigint;not null;default:0"`
	BalanceAfter   int64  `json:"balance_after" gorm:"type:bigint;not null;default:0"`
	FrozenAfter    int64  `json:"frozen_after" gorm:"type:bigint;not null;default:0"`
	SourceType     string `json:"source_type" gorm:"type:varchar(64);index;not null"`
	SourceId       string `json:"source_id" gorm:"type:varchar(128);index;default:''"`
	IdempotencyKey string `json:"idempotency_key" gorm:"type:varchar(160);uniqueIndex;not null"`
	Note           string `json:"note" gorm:"type:varchar(255);default:''"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint;index"`
}

type PointMallProduct struct {
	Id                  int    `json:"id"`
	Name                string `json:"name" gorm:"type:varchar(128);not null"`
	Type                string `json:"type" gorm:"type:varchar(32);index;not null"`
	ImageUrl            string `json:"image_url" gorm:"type:varchar(512);default:''"`
	Description         string `json:"description" gorm:"type:varchar(512);default:''"`
	PointsPrice         int64  `json:"points_price" gorm:"type:bigint;not null;default:0"`
	FaceValue           int64  `json:"face_value" gorm:"type:bigint;not null;default:0"`
	BlindBoxQuantity    int    `json:"blind_box_quantity" gorm:"type:int;not null;default:0"`
	SubscriptionPlanId  int    `json:"subscription_plan_id" gorm:"type:int;not null;default:0"`
	VirtualStock        int    `json:"virtual_stock" gorm:"type:int;not null;default:0"`
	DailyLimitPerUser   int    `json:"daily_limit_per_user" gorm:"type:int;not null;default:0"`
	MonthlyLimitPerUser int    `json:"monthly_limit_per_user" gorm:"type:int;not null;default:0"`
	TotalLimit          int    `json:"total_limit" gorm:"type:int;not null;default:0"`
	Status              string `json:"status" gorm:"type:varchar(16);index;not null;default:'on'"`
	SortOrder           int    `json:"sort_order" gorm:"type:int;not null;default:0"`
	CreatedAt           int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt           int64  `json:"updated_at" gorm:"bigint"`
}

type PointMallCardSecret struct {
	Id             int    `json:"id"`
	ProductId      int    `json:"product_id" gorm:"index;not null"`
	CardNo         string `json:"card_no" gorm:"type:varchar(128);default:''"`
	CardSecret     string `json:"-" gorm:"type:text;not null"`
	Status         string `json:"status" gorm:"type:varchar(16);index;not null;default:'unused'"`
	OrderId        int    `json:"order_id" gorm:"index;not null;default:0"`
	UserId         int    `json:"user_id" gorm:"index;not null;default:0"`
	IssuedAt       int64  `json:"issued_at" gorm:"bigint;not null;default:0"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt      int64  `json:"updated_at" gorm:"bigint"`
	CardSecretView string `json:"card_secret,omitempty" gorm:"-"`
}

type PointMallOrder struct {
	Id                 int    `json:"id"`
	UserId             int    `json:"user_id" gorm:"index;not null"`
	ProductId          int    `json:"product_id" gorm:"index;not null"`
	ProductName        string `json:"product_name" gorm:"type:varchar(128);not null"`
	ProductType        string `json:"product_type" gorm:"type:varchar(32);index;not null"`
	PointsCost         int64  `json:"points_cost" gorm:"type:bigint;not null;default:0"`
	Status             string `json:"status" gorm:"type:varchar(32);index;not null"`
	DeliveryContent    string `json:"delivery_content" gorm:"type:text"`
	CardSecretId       int    `json:"card_secret_id" gorm:"index;not null;default:0"`
	UserSubscriptionId int    `json:"user_subscription_id" gorm:"index;not null;default:0"`
	FailureReason      string `json:"failure_reason" gorm:"type:varchar(255);default:''"`
	CreatedAt          int64  `json:"created_at" gorm:"bigint;index"`
	CompletedAt        int64  `json:"completed_at" gorm:"bigint;not null;default:0"`
	UpdatedAt          int64  `json:"updated_at" gorm:"bigint"`
}

type BonusQuotaCredit struct {
	Id              int    `json:"id"`
	UserId          int    `json:"user_id" gorm:"index;not null"`
	OriginalAmount  int64  `json:"original_amount" gorm:"type:bigint;not null;default:0"`
	RemainingAmount int64  `json:"remaining_amount" gorm:"type:bigint;not null;default:0;index"`
	SourceType      string `json:"source_type" gorm:"type:varchar(64);index;not null"`
	SourceId        string `json:"source_id" gorm:"type:varchar(128);index;default:''"`
	IdempotencyKey  string `json:"idempotency_key" gorm:"type:varchar(160);uniqueIndex;not null"`
	Status          string `json:"status" gorm:"type:varchar(16);index;not null;default:'active'"`
	CreatedAt       int64  `json:"created_at" gorm:"bigint;index"`
	UpdatedAt       int64  `json:"updated_at" gorm:"bigint"`
}

func (a *PointAccount) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	a.CreatedAt = now
	a.UpdatedAt = now
	return nil
}

func (a *PointAccount) BeforeUpdate(tx *gorm.DB) error {
	a.UpdatedAt = common.GetTimestamp()
	return nil
}

func (l *PointLedger) BeforeCreate(tx *gorm.DB) error {
	l.CreatedAt = common.GetTimestamp()
	return nil
}

func (p *PointMallProduct) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	p.CreatedAt = now
	p.UpdatedAt = now
	return nil
}

func (p *PointMallProduct) BeforeUpdate(tx *gorm.DB) error {
	p.UpdatedAt = common.GetTimestamp()
	return nil
}

func (c *PointMallCardSecret) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	c.CreatedAt = now
	c.UpdatedAt = now
	return nil
}

func (c *PointMallCardSecret) BeforeUpdate(tx *gorm.DB) error {
	c.UpdatedAt = common.GetTimestamp()
	return nil
}

func (o *PointMallOrder) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	o.CreatedAt = now
	o.UpdatedAt = now
	return nil
}

func (o *PointMallOrder) BeforeUpdate(tx *gorm.DB) error {
	o.UpdatedAt = common.GetTimestamp()
	return nil
}

func (c *BonusQuotaCredit) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	c.CreatedAt = now
	c.UpdatedAt = now
	return nil
}

func (c *BonusQuotaCredit) BeforeUpdate(tx *gorm.DB) error {
	c.UpdatedAt = common.GetTimestamp()
	return nil
}

func quotaUnitsFromPointMallUSD(amount float64) int64 {
	if amount <= 0 {
		return 0
	}
	return int64(math.Round(amount * common.QuotaPerUnit))
}

func GetOrCreatePointAccountTx(tx *gorm.DB, userId int) (*PointAccount, error) {
	if tx == nil {
		tx = DB
	}
	var account PointAccount
	err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&PointAccount{UserId: userId}).Error
	if err != nil {
		return nil, err
	}
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("user_id = ?", userId).First(&account).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

func AddPointLedgerTx(tx *gorm.DB, userId int, ledgerType string, delta int64, sourceType string, sourceId string, key string, note string) (*PointLedger, bool, error) {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 || key == "" || delta == 0 {
		return nil, false, errors.New("invalid point ledger")
	}
	var existing PointLedger
	if err := tx.Where("idempotency_key = ?", key).First(&existing).Error; err == nil {
		return &existing, false, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, false, err
	}
	account, err := GetOrCreatePointAccountTx(tx, userId)
	if err != nil {
		return nil, false, err
	}
	switch ledgerType {
	case PointLedgerTypeEarn, PointLedgerTypeRefund:
		account.Balance += delta
	case PointLedgerTypeSpend:
		if account.Balance+delta < 0 {
			return nil, false, errors.New("points balance is insufficient")
		}
		account.Balance += delta
	case PointLedgerTypeFreeze:
		account.FrozenBalance += delta
	case PointLedgerTypeRelease:
		if account.FrozenBalance+delta < 0 {
			return nil, false, errors.New("frozen points balance is insufficient")
		}
		account.FrozenBalance += delta
		account.Balance -= delta
	default:
		return nil, false, errors.New("invalid point ledger type")
	}
	if err := tx.Save(account).Error; err != nil {
		return nil, false, err
	}
	ledger := &PointLedger{
		UserId:         userId,
		Type:           ledgerType,
		Delta:          delta,
		BalanceAfter:   account.Balance,
		FrozenAfter:    account.FrozenBalance,
		SourceType:     sourceType,
		SourceId:       sourceId,
		IdempotencyKey: key,
		Note:           strings.TrimSpace(note),
	}
	if err := tx.Create(ledger).Error; err != nil {
		return nil, false, err
	}
	return ledger, true, nil
}

func GrantBonusQuotaTx(tx *gorm.DB, userId int, amount int64, sourceType string, sourceId string, key string) (bool, error) {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 || amount <= 0 || key == "" {
		return false, errors.New("invalid bonus quota credit")
	}
	var existing BonusQuotaCredit
	if err := tx.Where("idempotency_key = ?", key).First(&existing).Error; err == nil {
		return false, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}
	credit := BonusQuotaCredit{
		UserId:          userId,
		OriginalAmount:  amount,
		RemainingAmount: amount,
		SourceType:      sourceType,
		SourceId:        sourceId,
		IdempotencyKey:  key,
		Status:          BonusQuotaStatusActive,
	}
	if err := tx.Create(&credit).Error; err != nil {
		return false, err
	}
	if err := tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", amount)).Error; err != nil {
		return false, err
	}
	_ = cacheIncrUserQuota(userId, amount)
	return true, nil
}

func ConsumeBonusQuotaCredits(userId int, amount int64) {
	if userId <= 0 || amount <= 0 {
		return
	}
	if DB == nil || !DB.Migrator().HasTable(&BonusQuotaCredit{}) {
		return
	}
	_ = DB.Transaction(func(tx *gorm.DB) error {
		remaining := amount
		var credits []BonusQuotaCredit
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("user_id = ? AND remaining_amount > 0", userId).
			Order("id asc").Find(&credits).Error; err != nil {
			return err
		}
		for _, credit := range credits {
			if remaining <= 0 {
				break
			}
			use := credit.RemainingAmount
			if use > remaining {
				use = remaining
			}
			credit.RemainingAmount -= use
			if credit.RemainingAmount <= 0 {
				credit.RemainingAmount = 0
				credit.Status = BonusQuotaStatusExhausted
			}
			if err := tx.Save(&credit).Error; err != nil {
				return err
			}
			remaining -= use
		}
		return nil
	})
}

func SumAvailableBonusQuota(userId int) (int64, error) {
	var total int64
	err := DB.Model(&BonusQuotaCredit{}).
		Where("user_id = ? AND remaining_amount > 0", userId).
		Select("COALESCE(SUM(remaining_amount), 0)").Scan(&total).Error
	return total, err
}
