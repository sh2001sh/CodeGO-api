package model

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const referralInviteeRegisterRewardPoints int64 = 2

func PackagePurchasePointReward(planTitle string) int64 {
	title := strings.TrimSpace(planTitle)
	cfg := GetPointMallRulesConfig()
	switch {
	case strings.HasPrefix(title, "Lite"):
		return cfg.PackagePurchasePoints["Lite"]
	case strings.HasPrefix(title, "Standard"):
		return cfg.PackagePurchasePoints["Standard"]
	case strings.HasPrefix(title, "Pro"):
		return cfg.PackagePurchasePoints["Pro"]
	case strings.HasPrefix(title, "Ultra"):
		return cfg.PackagePurchasePoints["Ultra"]
	default:
		return 0
	}
}

func AwardPackagePurchasePointsTx(tx *gorm.DB, userId int, plan *SubscriptionPlan, orderId int) error {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 || plan == nil || orderId <= 0 {
		return nil
	}
	points := PackagePurchasePointReward(plan.Title)
	if points <= 0 {
		return nil
	}
	key := fmt.Sprintf("package-purchase:%d:%d", userId, orderId)
	_, _, err := AddPointLedgerTx(tx, userId, PointLedgerTypeEarn, points, PointSourcePackagePurchase, fmt.Sprintf("%d", orderId), key, "套餐购买赠送积分")
	return err
}

func AwardReferralRegisterFrozenPointsTx(tx *gorm.DB, inviterId int, inviteeId int) error {
	if tx == nil {
		tx = DB
	}
	if inviterId <= 0 || inviteeId <= 0 {
		return nil
	}
	if DB == nil || !DB.Migrator().HasTable(&PointAccount{}) {
		return nil
	}
	key := fmt.Sprintf("referral-register-invitee:%d:%d", inviterId, inviteeId)
	_, _, err := AddPointLedgerTx(
		tx,
		inviteeId,
		PointLedgerTypeEarn,
		referralInviteeRegisterRewardPoints,
		PointSourceReferralRegister,
		fmt.Sprintf("%d", inviterId),
		key,
		"受邀注册赠送积分",
	)
	if err != nil {
		return err
	}
	return nil
}

func AwardReferralFirstCall(inviteeId int) {
	if inviteeId <= 0 || DB == nil || !DB.Migrator().HasTable(&PointAccount{}) {
		return
	}
	_ = DB.Transaction(func(tx *gorm.DB) error {
		return AwardReferralFirstCallTx(tx, inviteeId)
	})
}

func AwardReferralFirstCallTx(tx *gorm.DB, inviteeId int) error {
	return nil
}

func AwardReferralFirstTopupTx(tx *gorm.DB, inviteeId int, _ string) error {
	return nil
}

func releaseReferralRegisterFrozenTx(tx *gorm.DB, userId int, role string, inviterId int, inviteeId int) error {
	key := fmt.Sprintf("referral-register-release:%s:%d:%d", role, inviterId, inviteeId)
	_, _, err := AddPointLedgerTx(tx, userId, PointLedgerTypeRelease, -2, PointSourceReferralRegister, fmt.Sprintf("%d", inviteeId), key, "邀请注册冻结积分释放")
	return err
}

func referralInviterIdTx(tx *gorm.DB, inviteeId int) (int, error) {
	var user User
	if err := tx.Select("inviter_id").Where("id = ?", inviteeId).First(&user).Error; err != nil {
		return 0, err
	}
	return user.InviterId, nil
}

func awardReferralFirstTopupForCompletedOrderTx(tx *gorm.DB, userId int, sourceId string) error {
	if userId <= 0 {
		return nil
	}
	var count int64
	if err := tx.Model(&SubscriptionOrder{}).Where("user_id = ? AND status = ?", userId, common.TopUpStatusSuccess).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}
	return AwardReferralFirstTopupTx(tx, userId, sourceId)
}
