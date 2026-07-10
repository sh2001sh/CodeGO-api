package app

import (
	"errors"
	commercedomain "github.com/sh2001sh/new-api/internal/commerce/domain"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"gorm.io/gorm"
	"math"
	"strings"
)

// EnsureDefaultSubscriptionPlans creates built-in plans and repairs legacy preset snapshots.
func EnsureDefaultSubscriptionPlans() error {
	plans := defaultSubscriptionPlans()
	for index := range plans {
		existing, err := findPresetSubscriptionPlan(plans[index].Title)
		if err == nil {
			updates := syncPresetSubscriptionPlanFields(existing, plans[index])
			if existing.Title != plans[index].Title {
				updates["title"] = plans[index].Title
			}
			if len(updates) > 0 {
				if err := platformdb.DB.Model(existing).Updates(updates).Error; err != nil {
					return err
				}
				InvalidateSubscriptionPlanCache(existing.Id)
			}
			migrationPlan := plans[index]
			migrationPlan.Id = existing.Id
			if err := migratePresetUserSubscriptions(&migrationPlan); err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := platformdb.DB.Create(&plans[index]).Error; err != nil {
			return err
		}
		if err := migratePresetUserSubscriptions(&plans[index]); err != nil {
			return err
		}
	}
	return nil
}

func defaultSubscriptionPlans() []commerceschema.SubscriptionPlan {
	return []commerceschema.SubscriptionPlan{
		{
			Title:              "Lite月卡",
			Subtitle:           "月卡",
			PriceAmount:        49,
			Currency:           "CNY",
			DurationUnit:       commerceschema.SubscriptionDurationMonth,
			DurationValue:      1,
			Enabled:            true,
			InternalOnly:       false,
			SortOrder:          70,
			TotalAmount:        quotaUnitsFromUSD(300),
			PeriodAmount:       0,
			QuotaResetPeriod:   commerceschema.SubscriptionResetNever,
			ModelLimits:        "",
			UpgradeGroup:       "",
			MaxPurchasePerUser: 0,
			PlanType:           commerceschema.SubscriptionPlanTypeMonthly,
			GroupBuyEnabled:    true,
			GroupBuyBonus2:     20,
			GroupBuyBonus3:     35,
			GroupBuyBonus5:     60,
			RenewalBonus2:      0.03,
			RenewalBonus3:      0.05,
			RenewalBonus4:      0.08,
		},
		{
			Title:            "Standard月卡",
			Subtitle:         "月卡",
			PriceAmount:      89,
			Currency:         "CNY",
			DurationUnit:     commerceschema.SubscriptionDurationMonth,
			DurationValue:    1,
			Enabled:          true,
			InternalOnly:     false,
			SortOrder:        80,
			TotalAmount:      quotaUnitsFromUSD(620),
			PeriodAmount:     0,
			QuotaResetPeriod: commerceschema.SubscriptionResetNever,
			PlanType:         commerceschema.SubscriptionPlanTypeMonthly,
			GroupBuyEnabled:  true,
			GroupBuyBonus2:   40,
			GroupBuyBonus3:   70,
			GroupBuyBonus5:   110,
			RenewalBonus2:    0.03,
			RenewalBonus3:    0.05,
			RenewalBonus4:    0.08,
		},
		{
			Title:            "Pro月卡",
			Subtitle:         "月卡",
			PriceAmount:      169,
			Currency:         "CNY",
			DurationUnit:     commerceschema.SubscriptionDurationMonth,
			DurationValue:    1,
			Enabled:          true,
			InternalOnly:     false,
			SortOrder:        60,
			TotalAmount:      quotaUnitsFromUSD(1200),
			PeriodAmount:     0,
			QuotaResetPeriod: commerceschema.SubscriptionResetNever,
			PlanType:         commerceschema.SubscriptionPlanTypeMonthly,
			GroupBuyEnabled:  true,
			GroupBuyBonus2:   70,
			GroupBuyBonus3:   130,
			GroupBuyBonus5:   220,
			RenewalBonus2:    0.03,
			RenewalBonus3:    0.05,
			RenewalBonus4:    0.08,
		},
		{
			Title:            "Ultra月卡",
			Subtitle:         "月卡",
			PriceAmount:      299,
			Currency:         "CNY",
			DurationUnit:     commerceschema.SubscriptionDurationMonth,
			DurationValue:    1,
			Enabled:          true,
			InternalOnly:     false,
			SortOrder:        50,
			TotalAmount:      quotaUnitsFromUSD(2200),
			PeriodAmount:     0,
			QuotaResetPeriod: commerceschema.SubscriptionResetNever,
			PlanType:         commerceschema.SubscriptionPlanTypeMonthly,
			GroupBuyEnabled:  true,
			GroupBuyBonus2:   120,
			GroupBuyBonus3:   220,
			GroupBuyBonus5:   380,
			RenewalBonus2:    0.03,
			RenewalBonus3:    0.05,
			RenewalBonus4:    0.08,
		},
		{
			Title:              "新人体验卡",
			Subtitle:           "新人专区",
			PriceAmount:        2.9,
			Currency:           "CNY",
			DurationUnit:       commerceschema.SubscriptionDurationDay,
			DurationValue:      1,
			Enabled:            true,
			InternalOnly:       false,
			SortOrder:          90,
			TotalAmount:        quotaUnitsFromUSD(10),
			QuotaResetPeriod:   commerceschema.SubscriptionResetNever,
			MaxPurchasePerUser: 1,
			PlanType:           commerceschema.SubscriptionPlanTypeStarter,
			GroupBuyEnabled:    false,
		},
		{
			Title:            "标准周卡",
			Subtitle:         "周卡",
			PriceAmount:      39,
			Currency:         "CNY",
			DurationUnit:     commerceschema.SubscriptionDurationDay,
			DurationValue:    7,
			Enabled:          true,
			InternalOnly:     false,
			SortOrder:        40,
			TotalAmount:      quotaUnitsFromUSD(220),
			QuotaResetPeriod: commerceschema.SubscriptionResetNever,
			PlanType:         commerceschema.SubscriptionPlanTypeWeekly,
			GroupBuyEnabled:  true,
			GroupBuyBonus2:   20,
			GroupBuyBonus3:   35,
			GroupBuyBonus5:   55,
		},
		{
			Title:            "50刀日卡",
			Subtitle:         "日卡",
			PriceAmount:      9.9,
			Currency:         "CNY",
			DurationUnit:     commerceschema.SubscriptionDurationDay,
			DurationValue:    1,
			Enabled:          true,
			InternalOnly:     false,
			SortOrder:        30,
			TotalAmount:      quotaUnitsFromUSD(50),
			QuotaResetPeriod: commerceschema.SubscriptionResetNever,
			PlanType:         commerceschema.SubscriptionPlanTypeDaily,
			GroupBuyEnabled:  true,
			GroupBuyBonus2:   5,
			GroupBuyBonus3:   8,
			GroupBuyBonus5:   12,
		},
		{
			Title:            "100刀日卡",
			Subtitle:         "日卡",
			PriceAmount:      18.9,
			Currency:         "CNY",
			DurationUnit:     commerceschema.SubscriptionDurationDay,
			DurationValue:    1,
			Enabled:          true,
			InternalOnly:     false,
			SortOrder:        20,
			TotalAmount:      quotaUnitsFromUSD(100),
			QuotaResetPeriod: commerceschema.SubscriptionResetNever,
			PlanType:         commerceschema.SubscriptionPlanTypeDaily,
			GroupBuyEnabled:  true,
			GroupBuyBonus2:   10,
			GroupBuyBonus3:   18,
			GroupBuyBonus5:   28,
		},
	}
}

func legacyPresetSubscriptionPlanTitleMap() map[string]string {
	return map[string]string{
		"Lite":         "Lite月卡",
		"Standard":     "Standard月卡",
		"Pro":          "Pro月卡",
		"Ultra":        "Ultra月卡",
		"Day Pass 50":  "50刀日卡",
		"Day Pass 100": "100刀日卡",
	}
}

func getPresetPlanLegacyTitles(title string) []string {
	titleMap := legacyPresetSubscriptionPlanTitleMap()
	aliases := make([]string, 0, 2)
	for legacy, current := range titleMap {
		if current == title {
			aliases = append(aliases, legacy)
		}
	}
	return aliases
}

func findPresetSubscriptionPlan(title string) (*commerceschema.SubscriptionPlan, error) {
	var existing commerceschema.SubscriptionPlan
	err := platformdb.DB.Where("title = ?", title).First(&existing).Error
	if err == nil {
		return &existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	for _, legacyTitle := range getPresetPlanLegacyTitles(title) {
		err = platformdb.DB.Where("title = ?", legacyTitle).First(&existing).Error
		if err == nil {
			return &existing, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}
	return nil, gorm.ErrRecordNotFound
}

func syncPresetSubscriptionPlanFields(existing *commerceschema.SubscriptionPlan, preset commerceschema.SubscriptionPlan) map[string]interface{} {
	if existing == nil {
		return nil
	}
	updates := make(map[string]interface{})
	if existing.Subtitle != preset.Subtitle {
		updates["subtitle"] = preset.Subtitle
	}
	if existing.PriceAmount != preset.PriceAmount {
		updates["price_amount"] = preset.PriceAmount
	}
	if existing.Currency != preset.Currency {
		updates["currency"] = preset.Currency
	}
	if existing.DurationUnit != preset.DurationUnit {
		updates["duration_unit"] = preset.DurationUnit
	}
	if existing.DurationValue != preset.DurationValue {
		updates["duration_value"] = preset.DurationValue
	}
	if existing.CustomSeconds != preset.CustomSeconds {
		updates["custom_seconds"] = preset.CustomSeconds
	}
	if existing.Enabled != preset.Enabled {
		updates["enabled"] = preset.Enabled
	}
	if existing.InternalOnly != preset.InternalOnly {
		updates["internal_only"] = preset.InternalOnly
	}
	if existing.SortOrder != preset.SortOrder {
		updates["sort_order"] = preset.SortOrder
	}
	if existing.MaxPurchasePerUser != preset.MaxPurchasePerUser {
		updates["max_purchase_per_user"] = preset.MaxPurchasePerUser
	}
	if commercedomain.NormalizeSubscriptionPlanType(existing.PlanType) != commercedomain.NormalizeSubscriptionPlanType(preset.PlanType) {
		updates["plan_type"] = commercedomain.NormalizeSubscriptionPlanType(preset.PlanType)
	}
	if existing.GroupBuyEnabled != preset.GroupBuyEnabled {
		updates["group_buy_enabled"] = preset.GroupBuyEnabled
	}
	if existing.GroupBuyBonus2 != preset.GroupBuyBonus2 {
		updates["group_buy_bonus2"] = preset.GroupBuyBonus2
	}
	if existing.GroupBuyBonus3 != preset.GroupBuyBonus3 {
		updates["group_buy_bonus3"] = preset.GroupBuyBonus3
	}
	if existing.GroupBuyBonus5 != preset.GroupBuyBonus5 {
		updates["group_buy_bonus5"] = preset.GroupBuyBonus5
	}
	if existing.RenewalBonus2 != preset.RenewalBonus2 {
		updates["renewal_bonus2"] = preset.RenewalBonus2
	}
	if existing.RenewalBonus3 != preset.RenewalBonus3 {
		updates["renewal_bonus3"] = preset.RenewalBonus3
	}
	if existing.RenewalBonus4 != preset.RenewalBonus4 {
		updates["renewal_bonus4"] = preset.RenewalBonus4
	}
	if existing.UpgradeGroup != preset.UpgradeGroup {
		updates["upgrade_group"] = preset.UpgradeGroup
	}
	if existing.TotalAmount != preset.TotalAmount {
		updates["total_amount"] = preset.TotalAmount
	}
	if existing.PeriodAmount != preset.PeriodAmount {
		updates["period_amount"] = preset.PeriodAmount
	}
	if existing.ModelLimits != preset.ModelLimits {
		updates["model_limits"] = preset.ModelLimits
	}
	if existing.QuotaResetPeriod != preset.QuotaResetPeriod {
		updates["quota_reset_period"] = preset.QuotaResetPeriod
	}
	if existing.QuotaResetCustomSeconds != preset.QuotaResetCustomSeconds {
		updates["quota_reset_custom_seconds"] = preset.QuotaResetCustomSeconds
	}
	return updates
}

func getLegacyPresetPlanQuota(title string) (totalAmount int64, periodAmount int64, ok bool) {
	switch strings.TrimSpace(title) {
	case "Lite月卡":
		return quotaUnitsFromUSD(300), quotaUnitsFromUSD(75), true
	case "Standard月卡":
		return quotaUnitsFromUSD(600), quotaUnitsFromUSD(150), true
	case "Pro月卡":
		return quotaUnitsFromUSD(1500), quotaUnitsFromUSD(375), true
	case "Ultra月卡":
		return quotaUnitsFromUSD(4000), quotaUnitsFromUSD(1000), true
	case "50刀日卡":
		return quotaUnitsFromUSD(50), 0, true
	case "100刀日卡":
		return quotaUnitsFromUSD(100), 0, true
	default:
		return 0, 0, false
	}
}

func getLegacyPresetPlanQuotaUSD(title string) (totalAmount float64, periodAmount float64, ok bool) {
	switch strings.TrimSpace(title) {
	case "Lite月卡":
		return 300, 75, true
	case "Standard月卡":
		return 600, 150, true
	case "Pro月卡":
		return 1500, 375, true
	case "Ultra月卡":
		return 4000, 1000, true
	case "50刀日卡":
		return 50, 0, true
	case "100刀日卡":
		return 100, 0, true
	default:
		return 0, 0, false
	}
}

func isLegacyPresetPlainUSDValue(value int64, usd float64) bool {
	if value <= 0 || usd <= 0 {
		return false
	}
	return value == int64(math.Round(usd))
}

func isCollapsedPresetPeriodicQuota(plan *commerceschema.SubscriptionPlan, sub commerceschema.UserSubscription) bool {
	if plan == nil {
		return false
	}
	if commercedomain.NormalizeResetPeriod(plan.QuotaResetPeriod) == commerceschema.SubscriptionResetNever {
		return false
	}
	if plan.TotalAmount <= 0 || plan.PeriodAmount <= 0 || plan.TotalAmount <= plan.PeriodAmount {
		return false
	}
	if sub.AmountTotal <= 0 || sub.PeriodAmount <= 0 {
		return false
	}
	if sub.AmountTotal != sub.PeriodAmount {
		return false
	}
	return sub.AmountTotal <= plan.PeriodAmount
}

func migratePresetUserSubscriptions(plan *commerceschema.SubscriptionPlan) error {
	if plan == nil || plan.Id <= 0 {
		return nil
	}
	_, _, ok := getLegacyPresetPlanQuota(plan.Title)
	if !ok {
		return nil
	}
	legacyTotalUSD, legacyPeriodUSD, _ := getLegacyPresetPlanQuotaUSD(plan.Title)

	return platformdb.DB.Transaction(func(tx *gorm.DB) error {
		var subs []commerceschema.UserSubscription
		if err := tx.Where("plan_id = ?", plan.Id).Find(&subs).Error; err != nil {
			return err
		}
		for _, sub := range subs {
			updateMap := map[string]interface{}{}

			shouldFixTotal := false
			switch {
			case legacyTotalUSD > 0 && isLegacyPresetPlainUSDValue(sub.AmountTotal, legacyTotalUSD):
				shouldFixTotal = true
			case isCollapsedPresetPeriodicQuota(plan, sub):
				shouldFixTotal = true
			case plan.PeriodAmount == 0 && sub.PeriodAmount > 0 && sub.AmountTotal <= sub.PeriodAmount:
				shouldFixTotal = true
			}
			if shouldFixTotal && sub.AmountTotal != plan.TotalAmount {
				updateMap["amount_total"] = plan.TotalAmount
			}
			if shouldFixTotal && plan.TotalAmount > 0 && sub.AmountUsed > 0 {
				targetUsed := sub.AmountUsed
				if legacyTotalUSD > 0 && isLegacyPresetPlainUSDValue(sub.AmountTotal, legacyTotalUSD) {
					targetUsed = quotaUnitsFromUSD(float64(sub.AmountUsed))
				}
				if targetUsed > plan.TotalAmount {
					targetUsed = plan.TotalAmount
				}
				if targetUsed != sub.AmountUsed {
					updateMap["amount_used"] = targetUsed
				}
			}

			shouldFixPeriod := false
			switch {
			case legacyPeriodUSD > 0 && isLegacyPresetPlainUSDValue(sub.PeriodAmount, legacyPeriodUSD):
				shouldFixPeriod = true
			case isCollapsedPresetPeriodicQuota(plan, sub):
				shouldFixPeriod = true
			case plan.PeriodAmount == 0 && sub.PeriodAmount > 0:
				shouldFixPeriod = true
			}
			if shouldFixPeriod && sub.PeriodAmount != plan.PeriodAmount {
				updateMap["period_amount"] = plan.PeriodAmount
			}
			if shouldFixPeriod && plan.PeriodAmount > 0 && sub.PeriodUsed > 0 {
				targetPeriodUsed := sub.PeriodUsed
				if legacyPeriodUSD > 0 && isLegacyPresetPlainUSDValue(sub.PeriodAmount, legacyPeriodUSD) {
					targetPeriodUsed = quotaUnitsFromUSD(float64(sub.PeriodUsed))
				}
				if targetPeriodUsed > plan.PeriodAmount {
					targetPeriodUsed = plan.PeriodAmount
				}
				if targetPeriodUsed != sub.PeriodUsed {
					updateMap["period_used"] = targetPeriodUsed
				}
			}
			if commercedomain.NormalizeResetPeriod(plan.QuotaResetPeriod) == commerceschema.SubscriptionResetNever || plan.PeriodAmount == 0 {
				if sub.PeriodUsed != 0 {
					updateMap["period_used"] = 0
				}
				if sub.LastResetTime != 0 {
					updateMap["last_reset_time"] = 0
				}
				if sub.NextResetTime != 0 {
					updateMap["next_reset_time"] = 0
				}
			}

			if len(updateMap) == 0 {
				continue
			}
			updateMap["updated_at"] = platformruntime.GetTimestamp()
			if err := tx.Model(&commerceschema.UserSubscription{}).Where("id = ?", sub.Id).Updates(updateMap).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
