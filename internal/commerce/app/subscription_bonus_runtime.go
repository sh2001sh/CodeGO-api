package app

import (
	"fmt"
	"github.com/sh2001sh/new-api/constant"
	auditapp "github.com/sh2001sh/new-api/internal/audit/app"
	auditschema "github.com/sh2001sh/new-api/internal/audit/schema"
	commercedomain "github.com/sh2001sh/new-api/internal/commerce/domain"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"math"
	"strings"
	"time"

	// HasStarterPurchaseWithin reports whether the user purchased a starter subscription within the window.
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"gorm.io/gorm"
)

func HasStarterPurchaseWithin(userID int, window time.Duration) (bool, error) {
	if userID <= 0 {
		return false, nil
	}

	cutoff := platformruntime.GetTimestamp() - int64(window.Seconds())
	var count int64
	err := platformdb.DB.Model(&commerceschema.UserSubscription{}).
		Joins("JOIN subscription_plans ON subscription_plans.id = user_subscriptions.plan_id").
		Where("user_subscriptions.user_id = ? AND subscription_plans.plan_type = ? AND user_subscriptions.created_at >= ?", userID, commerceschema.SubscriptionPlanTypeStarter, cutoff).
		Count(&count).Error
	return count > 0, err
}

func hasStarterPurchaseWithinTx(tx *gorm.DB, userID int, window time.Duration) (bool, error) {
	if tx == nil || userID <= 0 {
		return false, nil
	}
	cutoff := platformruntime.GetTimestamp() - int64(window.Seconds())
	var count int64
	err := tx.Model(&commerceschema.UserSubscription{}).
		Joins("JOIN subscription_plans ON subscription_plans.id = user_subscriptions.plan_id").
		Where("user_subscriptions.user_id = ? AND subscription_plans.plan_type = ? AND user_subscriptions.created_at >= ?", userID, commerceschema.SubscriptionPlanTypeStarter, cutoff).
		Count(&count).Error
	return count > 0, err
}

func starterUpgradeBonusUSD(plan *commerceschema.SubscriptionPlan) float64 {
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

func renewalBonusRate(plan *commerceschema.SubscriptionPlan, renewalIndex int) float64 {
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

func countCompletedSubscriptionOrdersTx(tx *gorm.DB, userID int, planID int) (int, error) {
	if tx == nil || userID <= 0 || planID <= 0 {
		return 0, nil
	}
	var count int64
	err := tx.Model(&commerceschema.SubscriptionOrder{}).
		Where("user_id = ? AND plan_id = ? AND status = ?", userID, planID, constant.TopUpStatusSuccess).
		Count(&count).Error
	return int(count), err
}

func quotaUnitsToUSD(amount int64) float64 {
	if amount <= 0 || platformruntime.QuotaPerUnit <= 0 {
		return 0
	}
	return float64(amount) / platformruntime.QuotaPerUnit
}

func addSubscriptionBonusTx(tx *gorm.DB, sub *commerceschema.UserSubscription, bonusQuota int64) error {
	if tx == nil || sub == nil || bonusQuota <= 0 {
		return nil
	}
	sub.AmountTotal += bonusQuota
	if sub.PeriodAmount > 0 {
		sub.PeriodAmount += bonusQuota
	}
	return tx.Model(&commerceschema.UserSubscription{}).Where("id = ?", sub.Id).
		Updates(map[string]any{
			"amount_total":  sub.AmountTotal,
			"period_amount": sub.PeriodAmount,
			"updated_at":    platformruntime.GetTimestamp(),
		}).Error
}

// ApplySubscriptionPurchaseBonusTx applies starter-upgrade and renewal bonuses to a purchased subscription.
func ApplySubscriptionPurchaseBonusTx(tx *gorm.DB, userID int, sub *commerceschema.UserSubscription, plan *commerceschema.SubscriptionPlan, preview *commercedomain.SubscriptionPurchasePreview) error {
	if tx == nil || sub == nil || plan == nil || preview == nil {
		return nil
	}
	planType := commercedomain.NormalizeSubscriptionPlanType(plan.PlanType)
	totalBonusUSD := 0.0

	if planType == commerceschema.SubscriptionPlanTypeMonthly {
		eligible, err := hasStarterPurchaseWithinTx(tx, userID, 72*time.Hour)
		if err != nil {
			return err
		}
		if eligible {
			totalBonusUSD += starterUpgradeBonusUSD(plan)
		}
		if preview.Action == commerceschema.SubscriptionPurchaseActionRenew {
			completedCount, err := countCompletedSubscriptionOrdersTx(tx, userID, plan.Id)
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
	return auditapp.RecordLogTx(tx, userID, auditschema.LogTypeTopup, fmt.Sprintf("套餐奖励到账，套餐: %s，奖励额度: $%.2f", plan.Title, totalBonusUSD))
}
