package model

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

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
	for _, item := range []struct {
		userId int
		role   string
	}{
		{userId: inviterId, role: "inviter"},
		{userId: inviteeId, role: "invitee"},
	} {
		key := fmt.Sprintf("referral-register:%s:%d:%d", item.role, inviterId, inviteeId)
		if _, _, err := AddPointLedgerTx(tx, item.userId, PointLedgerTypeFreeze, 2, PointSourceReferralRegister, fmt.Sprintf("%d", inviteeId), key, "邀请注册冻结积分"); err != nil {
			return err
		}
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
	if tx == nil {
		tx = DB
	}
	inviterId, err := referralInviterIdTx(tx, inviteeId)
	if err != nil || inviterId <= 0 {
		return err
	}
	for _, item := range []struct {
		userId int
		role   string
	}{
		{userId: inviterId, role: "inviter"},
		{userId: inviteeId, role: "invitee"},
	} {
		if err := releaseReferralRegisterFrozenTx(tx, item.userId, item.role, inviterId, inviteeId); err != nil {
			return err
		}
		key := fmt.Sprintf("referral-first-call:%s:%d:%d", item.role, inviterId, inviteeId)
		if _, _, err := AddPointLedgerTx(tx, item.userId, PointLedgerTypeEarn, 5, PointSourceReferralCall, fmt.Sprintf("%d", inviteeId), key, "邀请首调赠送积分"); err != nil {
			return err
		}
	}
	return nil
}

func AwardReferralFirstTopupTx(tx *gorm.DB, inviteeId int, _ string) error {
	if tx == nil {
		tx = DB
	}
	inviterId, err := referralInviterIdTx(tx, inviteeId)
	if err != nil || inviterId <= 0 {
		return err
	}
	awards := []struct {
		userId int
		role   string
		points int64
	}{
		{userId: inviterId, role: "inviter", points: 12},
		{userId: inviteeId, role: "invitee", points: 5},
	}
	for _, award := range awards {
		key := fmt.Sprintf("referral-first-topup:%s:%d:%d", award.role, inviterId, inviteeId)
		if _, _, err := AddPointLedgerTx(tx, award.userId, PointLedgerTypeEarn, award.points, PointSourceReferralTopup, fmt.Sprintf("%d", inviteeId), key, "邀请首充赠送积分"); err != nil {
			return err
		}
	}
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
