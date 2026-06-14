package model

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	ReferralPurchaseTypeBlindBox = "blind_box"
	ReferralPurchaseTypeDayPass  = "day_pass"
	ReferralPurchaseTypeMonthCard = "month_card"
)

type ReferralPurchaseReward struct {
	Id               int    `json:"id"`
	InviterId        int    `json:"inviter_id" gorm:"index;not null"`
	InviteeId        int    `json:"invitee_id" gorm:"uniqueIndex;not null"`
	PurchaseType     string `json:"purchase_type" gorm:"type:varchar(32);index;not null"`
	PurchaseLabel    string `json:"purchase_label" gorm:"type:varchar(64);not null;default:''"`
	BonusQuotaAmount int64  `json:"bonus_quota_amount" gorm:"type:bigint;not null;default:0"`
	OrderSourceType  string `json:"order_source_type" gorm:"type:varchar(32);index;not null;default:''"`
	OrderSourceId    string `json:"order_source_id" gorm:"type:varchar(128);index;not null;default:''"`
	RewardedAt       int64  `json:"rewarded_at" gorm:"bigint;index"`
	CreatedAt        int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt        int64  `json:"updated_at" gorm:"bigint"`
}

func (r *ReferralPurchaseReward) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	r.CreatedAt = now
	r.UpdatedAt = now
	if r.RewardedAt == 0 {
		r.RewardedAt = now
	}
	return nil
}

func (r *ReferralPurchaseReward) BeforeUpdate(tx *gorm.DB) error {
	r.UpdatedAt = common.GetTimestamp()
	return nil
}

func ReferralPurchaseRewardUSD(purchaseType string) float64 {
	switch strings.TrimSpace(purchaseType) {
	case ReferralPurchaseTypeBlindBox:
		return 2
	case ReferralPurchaseTypeDayPass:
		return 5
	case ReferralPurchaseTypeMonthCard:
		return 10
	default:
		return 0
	}
}

func ReferralPurchaseRewardLabel(purchaseType string) string {
	switch strings.TrimSpace(purchaseType) {
	case ReferralPurchaseTypeBlindBox:
		return "首单购买盲盒"
	case ReferralPurchaseTypeDayPass:
		return "首单购买日卡"
	case ReferralPurchaseTypeMonthCard:
		return "首单购买月卡"
	default:
		return ""
	}
}

func referralPurchaseRewardQuota(purchaseType string) int64 {
	return quotaUnitsFromPointMallUSD(ReferralPurchaseRewardUSD(purchaseType))
}

func countSuccessfulPaidPurchasesTx(tx *gorm.DB, userId int) (int64, error) {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 {
		return 0, nil
	}
	var subscriptionCount int64
	if err := tx.Model(&SubscriptionOrder{}).
		Where("user_id = ? AND status = ? AND money > 0", userId, common.TopUpStatusSuccess).
		Count(&subscriptionCount).Error; err != nil {
		return 0, err
	}
	var blindBoxCount int64
	if err := tx.Model(&BlindBoxOrder{}).
		Where("user_id = ? AND status = ? AND money > 0", userId, common.TopUpStatusSuccess).
		Count(&blindBoxCount).Error; err != nil {
		return 0, err
	}
	return subscriptionCount + blindBoxCount, nil
}

func AwardReferralFirstPurchaseBonusTx(tx *gorm.DB, inviteeId int, purchaseType string, orderSourceType string, orderSourceId string) error {
	return nil
}
