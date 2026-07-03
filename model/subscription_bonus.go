package model

import (
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

func starterUpgradeBonusUSD(plan *SubscriptionPlan) float64 {
	if plan == nil {
		return 0
	}
	title := strings.ToLower(strings.TrimSpace(plan.Title))
	switch {
	case strings.Contains(title, "ultra"):
		return 100
	case strings.Contains(title, "pro"):
		return 60
	case strings.Contains(title, "standard"):
		return 30
	case strings.Contains(title, "lite"):
		return 10
	default:
		return 0
	}
}

func renewalBonusRate(plan *SubscriptionPlan, renewalIndex int) float64 {
	if plan == nil || renewalIndex < 2 {
		return 0
	}
	switch renewalIndex {
	case 2:
		return plan.RenewalBonus2
	case 3:
		return plan.RenewalBonus3
	default:
		return plan.RenewalBonus4
	}
}

func hasStarterPurchaseWithinTx(tx *gorm.DB, userId int, window time.Duration) (bool, error) {
	if tx == nil || userId <= 0 {
		return false, nil
	}
	cutoff := common.GetTimestamp() - int64(window.Seconds())
	var count int64
	err := tx.Model(&UserSubscription{}).
		Joins("JOIN subscription_plans ON subscription_plans.id = user_subscriptions.plan_id").
		Where("user_subscriptions.user_id = ? AND subscription_plans.plan_type = ? AND user_subscriptions.created_at >= ?", userId, SubscriptionPlanTypeStarter, cutoff).
		Count(&count).Error
	return count > 0, err
}

func HasStarterPurchaseWithin(userId int, window time.Duration) (bool, error) {
	return hasStarterPurchaseWithinTx(DB, userId, window)
}

func countCompletedSubscriptionOrdersTx(tx *gorm.DB, userId int, planId int) (int, error) {
	if tx == nil || userId <= 0 || planId <= 0 {
		return 0, nil
	}
	var count int64
	err := tx.Model(&SubscriptionOrder{}).
		Where("user_id = ? AND plan_id = ? AND status = ?", userId, planId, common.TopUpStatusSuccess).
		Count(&count).Error
	return int(count), err
}

func addSubscriptionBonusTx(tx *gorm.DB, sub *UserSubscription, bonusQuota int64) error {
	if tx == nil || sub == nil || bonusQuota <= 0 {
		return nil
	}
	sub.AmountTotal += bonusQuota
	if sub.PeriodAmount > 0 {
		sub.PeriodAmount += bonusQuota
	}
	return tx.Model(&UserSubscription{}).Where("id = ?", sub.Id).
		Updates(map[string]interface{}{
			"amount_total":  sub.AmountTotal,
			"period_amount": sub.PeriodAmount,
			"updated_at":    common.GetTimestamp(),
		}).Error
}

func ApplySubscriptionPurchaseBonusTx(tx *gorm.DB, userId int, sub *UserSubscription, plan *SubscriptionPlan, preview *SubscriptionPurchasePreview) error {
	if tx == nil || sub == nil || plan == nil || preview == nil {
		return nil
	}
	planType := NormalizeSubscriptionPlanType(plan.PlanType)
	totalBonusUSD := 0.0

	if planType == SubscriptionPlanTypeMonthly {
		if eligible, err := hasStarterPurchaseWithinTx(tx, userId, 72*time.Hour); err != nil {
			return err
		} else if eligible {
			totalBonusUSD += starterUpgradeBonusUSD(plan)
		}
		if preview.Action == SubscriptionPurchaseActionRenew {
			completedCount, err := countCompletedSubscriptionOrdersTx(tx, userId, plan.Id)
			if err != nil {
				return err
			}
			renewalIndex := completedCount + 1
			rate := renewalBonusRate(plan, renewalIndex)
			if rate > 0 && plan.TotalAmount > 0 {
				totalBonusUSD += math.Round(quotaUnitsToUSD(plan.TotalAmount)*rate*100) / 100
			}
		}
	}

	if totalBonusUSD <= 0 {
		return nil
	}
	bonusQuota := quotaUnitsFromUSD(totalBonusUSD)
	if err := addSubscriptionBonusTx(tx, sub, bonusQuota); err != nil {
		return err
	}
	return RecordLogTx(tx, userId, LogTypeTopup, fmt.Sprintf("套餐奖励到账，套餐: %s，奖励额度: $%.2f", plan.Title, totalBonusUSD))
}
