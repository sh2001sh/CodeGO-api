package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func ensureSubscriptionUsageTestSchema(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.AutoMigrate(&SubscriptionPreConsumeRecord{}))
	t.Cleanup(func() {
		DB.Exec("DELETE FROM subscription_pre_consume_records")
	})
}

func pickFirstBillableSubscriptionID(
	t *testing.T,
	userID int,
	amount int64,
) int {
	t.Helper()

	summaries, err := GetAllActiveUserSubscriptions(userID)
	require.NoError(t, err)

	for _, summary := range summaries {
		sub := summary.Subscription
		plan, err := getSubscriptionPlanByIdTx(nil, sub.PlanId)
		require.NoError(t, err)

		if sub.AmountTotal > 0 {
			remain := sub.AmountTotal - sub.AmountUsed
			if remain < amount {
				continue
			}
		}

		periodAmount := getSubscriptionPeriodAmount(plan, sub)
		if !usesLegacyPeriodicQuota(plan, sub) && periodAmount > 0 {
			periodRemain := periodAmount - sub.PeriodUsed
			if periodRemain < amount {
				continue
			}
		}
		return sub.Id
	}
	return 0
}

func insertSubscriptionUsageTestUser(t *testing.T, id int, orderIds []int) {
	t.Helper()
	user := &User{
		Id:       id,
		Username: "subscription_usage_test_user",
		Status:   common.UserStatusEnabled,
	}
	setting := dto.UserSetting{
		BillingPreference:    "subscription_first",
		SubscriptionOrderIds: orderIds,
	}
	user.SetSetting(setting)
	require.NoError(t, DB.Create(user).Error)
}

func TestSeedDefaultSubscriptionPlans_FixesLegacyPresetUsageUnits(t *testing.T) {
	truncateTables(t)
	ensureSubscriptionUsageTestSchema(t)

	now := time.Now().Unix()
	preset := defaultSubscriptionPlans()[4]
	legacyPlan := preset
	legacyPlan.Id = 9101
	legacyPlan.TotalAmount = 50
	legacyPlan.PeriodAmount = 0
	require.NoError(t, DB.Create(&legacyPlan).Error)

	insertSubscriptionUsageTestUser(t, 9101, []int{9201})
	legacySub := &UserSubscription{
		Id:          9201,
		UserId:      9101,
		PlanId:      legacyPlan.Id,
		AmountTotal: 50,
		AmountUsed:  50,
		StartTime:   now - 3600,
		EndTime:     now + 86400,
		Status:      "active",
	}
	require.NoError(t, DB.Create(legacySub).Error)

	require.NoError(t, SeedDefaultSubscriptionPlans())

	var reloadedSub UserSubscription
	require.NoError(t, DB.Where("id = ?", legacySub.Id).First(&reloadedSub).Error)

	expectedQuota := quotaUnitsFromUSD(50)
	assert.Equal(t, expectedQuota, reloadedSub.AmountTotal)
	assert.Equal(t, expectedQuota, reloadedSub.AmountUsed)

	selectedID := pickFirstBillableSubscriptionID(t, 9101, int64(common.QuotaPerUnit))
	assert.Zero(t, selectedID)
}

func TestSeedDefaultSubscriptionPlans_RepairsCollapsedMonthlyQuotaSnapshot(t *testing.T) {
	truncateTables(t)
	ensureSubscriptionUsageTestSchema(t)

	now := time.Now().Unix()
	monthPlan := defaultSubscriptionPlans()[0]
	monthPlan.Id = 9501
	require.NoError(t, DB.Create(&monthPlan).Error)

	insertSubscriptionUsageTestUser(t, 9501, []int{9601})
	collapsedSub := &UserSubscription{
		Id:            9601,
		UserId:        9501,
		PlanId:        monthPlan.Id,
		AmountTotal:   quotaUnitsFromUSD(50),
		AmountUsed:    quotaUnitsFromUSD(20),
		PeriodAmount:  quotaUnitsFromUSD(50),
		PeriodUsed:    quotaUnitsFromUSD(20),
		StartTime:     now - 3600,
		EndTime:       now + 30*86400,
		Status:        "active",
		LastResetTime: now - 3600,
		NextResetTime: now + 6*86400,
	}
	require.NoError(t, DB.Create(collapsedSub).Error)

	require.NoError(t, SeedDefaultSubscriptionPlans())

	var reloadedSub UserSubscription
	require.NoError(t, DB.Where("id = ?", collapsedSub.Id).First(&reloadedSub).Error)
	assert.Equal(t, monthPlan.TotalAmount, reloadedSub.AmountTotal)
	assert.Equal(t, quotaUnitsFromUSD(20), reloadedSub.AmountUsed)
	assert.Equal(t, monthPlan.PeriodAmount, reloadedSub.PeriodAmount)
	assert.Zero(t, reloadedSub.PeriodUsed)
	assert.Zero(t, reloadedSub.LastResetTime)
	assert.Zero(t, reloadedSub.NextResetTime)
}

func TestSeedDefaultSubscriptionPlans_UpdatesLegacyBonusColumnsWithoutMissingColumnError(t *testing.T) {
	truncateTables(t)
	ensureSubscriptionUsageTestSchema(t)

	preset := defaultSubscriptionPlans()[0]
	legacyPlan := preset
	legacyPlan.Id = 9701
	legacyPlan.GroupBuyBonus2 = 0
	legacyPlan.GroupBuyBonus3 = 0
	legacyPlan.GroupBuyBonus5 = 0
	legacyPlan.RenewalBonus2 = 0
	legacyPlan.RenewalBonus3 = 0
	legacyPlan.RenewalBonus4 = 0
	require.NoError(t, DB.Create(&legacyPlan).Error)

	require.NoError(t, SeedDefaultSubscriptionPlans())

	var reloadedPlan SubscriptionPlan
	require.NoError(t, DB.Where("id = ?", legacyPlan.Id).First(&reloadedPlan).Error)
	assert.Equal(t, preset.GroupBuyBonus2, reloadedPlan.GroupBuyBonus2)
	assert.Equal(t, preset.GroupBuyBonus3, reloadedPlan.GroupBuyBonus3)
	assert.Equal(t, preset.GroupBuyBonus5, reloadedPlan.GroupBuyBonus5)
	assert.Equal(t, preset.RenewalBonus2, reloadedPlan.RenewalBonus2)
	assert.Equal(t, preset.RenewalBonus3, reloadedPlan.RenewalBonus3)
	assert.Equal(t, preset.RenewalBonus4, reloadedPlan.RenewalBonus4)
}

func TestPreConsumeUserSubscription_KeepsExhaustedDayPassVisibleButSkipsBilling(t *testing.T) {
	truncateTables(t)
	ensureSubscriptionUsageTestSchema(t)

	now := time.Now().Unix()
	dayPlan := defaultSubscriptionPlans()[4]
	dayPlan.Id = 9301
	require.NoError(t, DB.Create(&dayPlan).Error)

	monthPlan := defaultSubscriptionPlans()[0]
	monthPlan.Id = 9302
	require.NoError(t, DB.Create(&monthPlan).Error)

	daySub := &UserSubscription{
		Id:          9401,
		UserId:      9301,
		PlanId:      dayPlan.Id,
		AmountTotal: dayPlan.TotalAmount,
		AmountUsed:  dayPlan.TotalAmount,
		StartTime:   now - 3600,
		EndTime:     now + 86400,
		Status:      "active",
	}
	monthSub := &UserSubscription{
		Id:            9402,
		UserId:        9301,
		PlanId:        monthPlan.Id,
		AmountTotal:   monthPlan.TotalAmount,
		AmountUsed:    0,
		PeriodAmount:  monthPlan.PeriodAmount,
		PeriodUsed:    0,
		StartTime:     now - 3600,
		EndTime:       now + 30*86400,
		Status:        "active",
		LastResetTime: now - 3600,
		NextResetTime: now + 6*86400,
	}

	insertSubscriptionUsageTestUser(t, 9301, []int{daySub.Id, monthSub.Id})
	require.NoError(t, DB.Create(daySub).Error)
	require.NoError(t, DB.Create(monthSub).Error)

	activeSubs, err := GetAllActiveUserSubscriptions(9301)
	require.NoError(t, err)
	require.Len(t, activeSubs, 2)
	assert.Equal(t, daySub.Id, activeSubs[0].Subscription.Id)
	assert.Equal(t, monthSub.Id, activeSubs[1].Subscription.Id)

	selectedID := pickFirstBillableSubscriptionID(t, 9301, int64(common.QuotaPerUnit))
	assert.Equal(t, monthSub.Id, selectedID)

	var reloadedDay UserSubscription
	require.NoError(t, DB.Where("id = ?", daySub.Id).First(&reloadedDay).Error)
	assert.Equal(t, dayPlan.TotalAmount, reloadedDay.AmountUsed)
	assert.Equal(t, "active", reloadedDay.Status)

	var reloadedMonth UserSubscription
	require.NoError(t, DB.Where("id = ?", monthSub.Id).First(&reloadedMonth).Error)
	assert.Zero(t, reloadedMonth.AmountUsed)
}
