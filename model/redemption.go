package model

import (
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"

	"gorm.io/gorm"
)

const (
	RedemptionTypeQuota        = "quota"
	RedemptionTypeSubscription = "subscription"
	RedemptionTypeBlindBox     = "blind_box"
)

type Redemption struct {
	Id               int            `json:"id"`
	UserId           int            `json:"user_id"`
	Key              string         `json:"key" gorm:"type:char(32);uniqueIndex"`
	Status           int            `json:"status" gorm:"default:1"`
	Name             string         `json:"name" gorm:"index"`
	RedeemType       string         `json:"redeem_type" gorm:"type:varchar(32);not null;default:'quota';index"`
	Quota            int            `json:"quota" gorm:"default:100"`
	WalletType       string         `json:"wallet_type" gorm:"type:varchar(32);not null;default:'default';index"`
	PlanId           int            `json:"plan_id" gorm:"default:0;index"`
	PlanTitle        string         `json:"plan_title" gorm:"type:varchar(128);default:''"`
	BlindBoxQuantity int            `json:"blind_box_quantity" gorm:"type:int;not null;default:0"`
	CreatedTime      int64          `json:"created_time" gorm:"bigint"`
	RedeemedTime     int64          `json:"redeemed_time" gorm:"bigint"`
	Count            int            `json:"count" gorm:"-:all"`
	UsedUserId       int            `json:"used_user_id"`
	DeletedAt        gorm.DeletedAt `gorm:"index"`
	ExpiredTime      int64          `json:"expired_time" gorm:"bigint"`
}

type RedemptionResult struct {
	RedeemType         string `json:"redeem_type"`
	Quota              int    `json:"quota,omitempty"`
	WalletType         string `json:"wallet_type,omitempty"`
	PlanId             int    `json:"plan_id,omitempty"`
	PlanTitle          string `json:"plan_title,omitempty"`
	BlindBoxQuantity   int    `json:"blind_box_quantity,omitempty"`
	BlindBoxOrderId    int    `json:"blind_box_order_id,omitempty"`
	UserSubscriptionId int    `json:"user_subscription_id,omitempty"`
}

func (redemption *Redemption) BeforeCreate(tx *gorm.DB) error {
	redemption.WalletType = NormalizeWalletType(redemption.WalletType)
	return nil
}

func (redemption *Redemption) BeforeUpdate(tx *gorm.DB) error {
	redemption.WalletType = NormalizeWalletType(redemption.WalletType)
	return nil
}

func NormalizeRedemptionType(value string) string {
	switch strings.TrimSpace(value) {
	case RedemptionTypeSubscription:
		return RedemptionTypeSubscription
	case RedemptionTypeBlindBox:
		return RedemptionTypeBlindBox
	default:
		return RedemptionTypeQuota
	}
}

func createBlindBoxRedemptionOrderTx(tx *gorm.DB, userId int, quantity int, redemptionId int) (*BlindBoxOrder, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}
	if userId <= 0 {
		return nil, errors.New("invalid user id")
	}
	if quantity <= 0 {
		return nil, errors.New("invalid blind box quantity")
	}

	tradeNo := fmt.Sprintf("RDBBUSR%dRID%dNO%s", userId, redemptionId, common.GetUUID())
	order := &BlindBoxOrder{
		UserId:          userId,
		Quantity:        quantity,
		Money:           0,
		TradeNo:         tradeNo,
		PaymentMethod:   "redemption",
		PaymentProvider: "redemption",
		Status:          common.TopUpStatusSuccess,
		CreateTime:      common.GetTimestamp(),
		CompleteTime:    common.GetTimestamp(),
		ProviderPayload: fmt.Sprintf(`{"source":"redemption","redemption_id":%d}`, redemptionId),
	}
	if err := tx.Create(order).Error; err != nil {
		return nil, err
	}
	return order, nil
}

func GetAllRedemptions(startIdx int, num int) (redemptions []*Redemption, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	err = tx.Model(&Redemption{}).Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	err = tx.Order("id desc").Limit(num).Offset(startIdx).Find(&redemptions).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return redemptions, total, nil
}

func SearchRedemptions(keyword string, startIdx int, num int) (redemptions []*Redemption, total int64, err error) {
	tx := DB.Begin()
	if tx.Error != nil {
		return nil, 0, tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query := tx.Model(&Redemption{})
	nameKeyword := "%" + keyword + "%"
	if id, err := strconv.Atoi(keyword); err == nil {
		query = query.Where("id = ? OR name LIKE ?", id, nameKeyword)
	} else {
		query = query.Where("name LIKE ?", nameKeyword)
	}

	err = query.Count(&total).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	err = query.Order("id desc").Limit(num).Offset(startIdx).Find(&redemptions).Error
	if err != nil {
		tx.Rollback()
		return nil, 0, err
	}

	if err = tx.Commit().Error; err != nil {
		return nil, 0, err
	}

	return redemptions, total, nil
}

func GetRedemptionById(id int) (*Redemption, error) {
	if id == 0 {
		return nil, errors.New("id is empty")
	}
	redemption := Redemption{Id: id}
	err := DB.First(&redemption, "id = ?", id).Error
	return &redemption, err
}

func Redeem(key string, userId int) (*RedemptionResult, error) {
	if key == "" {
		return nil, errors.New("redemption key is empty")
	}
	if userId == 0 {
		return nil, errors.New("invalid user id")
	}

	redemption := &Redemption{}
	result := &RedemptionResult{}

	keyCol := "`key`"
	if common.UsingPostgreSQL {
		keyCol = `"key"`
	}

	common.RandomSleep()
	err := DB.Transaction(func(tx *gorm.DB) error {
		err := tx.Set("gorm:query_option", "FOR UPDATE").Where(keyCol+" = ?", key).First(redemption).Error
		if err != nil {
			return errors.New("invalid redemption code")
		}
		if redemption.Status != common.RedemptionCodeStatusEnabled {
			return errors.New("redemption code is not available")
		}
		if redemption.ExpiredTime != 0 && redemption.ExpiredTime < common.GetTimestamp() {
			return errors.New("redemption code has expired")
		}

		redeemType := NormalizeRedemptionType(redemption.RedeemType)
		result.RedeemType = redeemType

		switch redeemType {
		case RedemptionTypeSubscription:
			if redemption.PlanId <= 0 {
				return errors.New("subscription redemption plan is invalid")
			}
			plan, err := getSubscriptionPlanByIdTx(tx, redemption.PlanId)
			if err != nil {
				return err
			}
			sub, err := CreateUserSubscriptionFromPlanTx(tx, userId, plan, "redemption")
			if err != nil {
				return err
			}
			result.PlanId = plan.Id
			result.PlanTitle = plan.Title
			result.UserSubscriptionId = sub.Id
		case RedemptionTypeBlindBox:
			if redemption.BlindBoxQuantity <= 0 {
				return errors.New("blind box redemption quantity is invalid")
			}
			order, err := createBlindBoxRedemptionOrderTx(tx, userId, redemption.BlindBoxQuantity, redemption.Id)
			if err != nil {
				return err
			}
			result.BlindBoxQuantity = redemption.BlindBoxQuantity
			result.BlindBoxOrderId = order.Id
		default:
			walletType := NormalizeWalletType(redemption.WalletType)
			field := "quota"
			if walletType == WalletTypeClaude {
				field = "claude_quota"
			}
			err = tx.Model(&User{}).Where("id = ?", userId).Update(field, gorm.Expr(field+" + ?", redemption.Quota)).Error
			if err != nil {
				return err
			}
			result.Quota = redemption.Quota
			result.WalletType = walletType
		}

		redemption.RedeemType = redeemType
		redemption.RedeemedTime = common.GetTimestamp()
		redemption.Status = common.RedemptionCodeStatusUsed
		redemption.UsedUserId = userId
		return tx.Save(redemption).Error
	})
	if err != nil {
		common.SysError("redemption failed: " + err.Error())
		return nil, ErrRedeemFailed
	}

	switch result.RedeemType {
	case RedemptionTypeSubscription:
		planTitle := result.PlanTitle
		if planTitle == "" {
			planTitle = fmt.Sprintf("#%d", result.PlanId)
		}
		RecordLog(userId, LogTypeTopup, fmt.Sprintf("Redeemed subscription code for %s, redemption ID %d", planTitle, redemption.Id))
	case RedemptionTypeBlindBox:
		RecordLog(userId, LogTypeTopup, fmt.Sprintf("Redeemed blind box code for %d blind box(es), redemption ID %d", result.BlindBoxQuantity, redemption.Id))
	default:
		if result.WalletType == WalletTypeClaude {
			RecordLog(userId, LogTypeTopup, fmt.Sprintf("Redeemed Claude quota code for %s, redemption ID %d", logger.LogQuota(redemption.Quota), redemption.Id))
		} else {
			RecordLog(userId, LogTypeTopup, fmt.Sprintf("Redeemed quota code for %s, redemption ID %d", logger.LogQuota(redemption.Quota), redemption.Id))
		}
	}

	return result, nil
}

func (redemption *Redemption) Insert() error {
	return DB.Create(redemption).Error
}

func (redemption *Redemption) SelectUpdate() error {
	return DB.Model(redemption).Select("redeemed_time", "status").Updates(redemption).Error
}

func (redemption *Redemption) Update() error {
	return DB.Model(redemption).Select(
		"name",
		"status",
		"redeem_type",
		"quota",
		"wallet_type",
		"plan_id",
		"plan_title",
		"blind_box_quantity",
		"redeemed_time",
		"expired_time",
	).Updates(redemption).Error
}

func (redemption *Redemption) Delete() error {
	return DB.Delete(redemption).Error
}

func DeleteRedemptionById(id int) error {
	if id == 0 {
		return errors.New("id is empty")
	}
	redemption := Redemption{Id: id}
	err := DB.Where(redemption).First(&redemption).Error
	if err != nil {
		return err
	}
	return redemption.Delete()
}

func DeleteInvalidRedemptions() (int64, error) {
	now := common.GetTimestamp()
	result := DB.Where(
		"status IN ? OR (status = ? AND expired_time != 0 AND expired_time < ?)",
		[]int{common.RedemptionCodeStatusUsed, common.RedemptionCodeStatusDisabled},
		common.RedemptionCodeStatusEnabled,
		now,
	).Delete(&Redemption{})
	return result.RowsAffected, result.Error
}
