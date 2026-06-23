package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestConvertSubscriptionQuotaToClaudeQuota_Success(t *testing.T) {
	truncateTables(t)

	SubscriptionClaudeConversionEnabled = true
	SubscriptionClaudeConversionRatioNumerator = 1
	SubscriptionClaudeConversionRatioDenominator = 10
	SubscriptionClaudeConversionExcludeDayPass = true

	user := &User{
		Id:          9201,
		Username:    "conversion_user_success",
		Status:      common.UserStatusEnabled,
		ClaudeQuota: 100,
	}
	require.NoError(t, DB.Create(user).Error)

	plan := &SubscriptionPlan{
		Id:               9301,
		Title:            "Standard月卡",
		DurationUnit:     SubscriptionDurationMonth,
		DurationValue:    1,
		TotalAmount:      int64(common.QuotaPerUnit * 3),
		QuotaResetPeriod: SubscriptionResetNever,
	}
	require.NoError(t, DB.Create(plan).Error)

	sub := &UserSubscription{
		Id:          9401,
		UserId:      user.Id,
		PlanId:      plan.Id,
		AmountTotal: int64(common.QuotaPerUnit * 3),
		AmountUsed:  int64(common.QuotaPerUnit),
		StartTime:   time.Now().Add(-24 * time.Hour).Unix(),
		EndTime:     time.Now().Add(24 * time.Hour).Unix(),
		Status:      "active",
	}
	require.NoError(t, DB.Create(sub).Error)

	sourceQuota := int64(common.QuotaPerUnit)
	result, err := ConvertSubscriptionQuotaToClaudeQuota("req-success-1", user.Id, sub.Id, sourceQuota)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, 9201, user.Id)
	assert.Equal(t, sourceQuota, result.SourceQuota)
	assert.Equal(t, int(common.QuotaPerUnit/10), result.TargetClaudeQuota)
	assert.Equal(t, int64(common.QuotaPerUnit*2), result.AmountUsedAfter)

	var savedUser User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Equal(t, 100+int(common.QuotaPerUnit/10), savedUser.ClaudeQuota)

	var savedSub UserSubscription
	require.NoError(t, DB.Where("id = ?", sub.Id).First(&savedSub).Error)
	assert.Equal(t, int64(common.QuotaPerUnit*2), savedSub.AmountUsed)
}

func TestConvertSubscriptionQuotaToClaudeQuota_DayPassRejected(t *testing.T) {
	truncateTables(t)

	SubscriptionClaudeConversionEnabled = true
	SubscriptionClaudeConversionRatioNumerator = 1
	SubscriptionClaudeConversionRatioDenominator = 10
	SubscriptionClaudeConversionExcludeDayPass = true

	user := &User{
		Id:       9202,
		Username: "conversion_user_day_pass",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, DB.Create(user).Error)

	plan := &SubscriptionPlan{
		Id:            9302,
		Title:         "50刀日卡",
		DurationUnit:  SubscriptionDurationDay,
		DurationValue: 1,
		TotalAmount:   int64(common.QuotaPerUnit),
	}
	require.NoError(t, DB.Create(plan).Error)

	sub := &UserSubscription{
		Id:          9402,
		UserId:      user.Id,
		PlanId:      plan.Id,
		AmountTotal: int64(common.QuotaPerUnit),
		StartTime:   time.Now().Add(-2 * time.Hour).Unix(),
		EndTime:     time.Now().Add(12 * time.Hour).Unix(),
		Status:      "active",
	}
	require.NoError(t, DB.Create(sub).Error)

	_, err := ConvertSubscriptionQuotaToClaudeQuota("req-day-pass", user.Id, sub.Id, int64(common.QuotaPerUnit))
	require.ErrorIs(t, err, ErrSubscriptionClaudeConversionNoTarget)
}

func TestConvertSubscriptionQuotaToClaudeQuota_Idempotent(t *testing.T) {
	truncateTables(t)

	SubscriptionClaudeConversionEnabled = true
	SubscriptionClaudeConversionRatioNumerator = 1
	SubscriptionClaudeConversionRatioDenominator = 10
	SubscriptionClaudeConversionExcludeDayPass = true

	user := &User{
		Id:          9203,
		Username:    "conversion_user_idempotent",
		Status:      common.UserStatusEnabled,
		ClaudeQuota: 50,
	}
	require.NoError(t, DB.Create(user).Error)

	plan := &SubscriptionPlan{
		Id:            9303,
		Title:         "Pro月卡",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		TotalAmount:   int64(common.QuotaPerUnit * 3),
	}
	require.NoError(t, DB.Create(plan).Error)

	sub := &UserSubscription{
		Id:          9403,
		UserId:      user.Id,
		PlanId:      plan.Id,
		AmountTotal: int64(common.QuotaPerUnit * 3),
		StartTime:   time.Now().Add(-24 * time.Hour).Unix(),
		EndTime:     time.Now().Add(24 * time.Hour).Unix(),
		Status:      "active",
	}
	require.NoError(t, DB.Create(sub).Error)

	requestId := "req-idempotent-1"
	sourceQuota := int64(common.QuotaPerUnit)

	first, err := ConvertSubscriptionQuotaToClaudeQuota(requestId, user.Id, sub.Id, sourceQuota)
	require.NoError(t, err)
	second, err := ConvertSubscriptionQuotaToClaudeQuota(requestId, user.Id, sub.Id, sourceQuota)
	require.NoError(t, err)

	assert.Equal(t, first.TargetClaudeQuota, second.TargetClaudeQuota)
	assert.Equal(t, first.AmountUsedAfter, second.AmountUsedAfter)
	assert.Equal(t, first.ClaudeQuotaAfter, second.ClaudeQuotaAfter)

	var count int64
	require.NoError(t, DB.Model(&SubscriptionClaudeConversion{}).Count(&count).Error)
	assert.Equal(t, int64(1), count)
}

func TestResolveSubscriptionPurchasePreview_UpgradeUsesFullTargetPrice(t *testing.T) {
	truncateTables(t)

	user := &User{
		Id:       9210,
		Username: "upgrade_preview_user",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, DB.Create(user).Error)

	currentPlan := &SubscriptionPlan{
		Id:            9310,
		Title:         "Lite月卡",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		PriceAmount:   50,
		TotalAmount:   int64(common.QuotaPerUnit * 3),
	}
	targetPlan := &SubscriptionPlan{
		Id:            9311,
		Title:         "Standard月卡",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		PriceAmount:   90,
		TotalAmount:   int64(common.QuotaPerUnit * 6),
	}
	require.NoError(t, DB.Create(currentPlan).Error)
	require.NoError(t, DB.Create(targetPlan).Error)

	now := time.Now().Unix()
	require.NoError(t, DB.Create(&UserSubscription{
		Id:          9410,
		UserId:      user.Id,
		PlanId:      currentPlan.Id,
		AmountTotal: currentPlan.TotalAmount,
		AmountUsed:  int64(common.QuotaPerUnit),
		StartTime:   now - 29*24*3600,
		EndTime:     now + 2*3600,
		Status:      "active",
	}).Error)

	preview, err := ResolveSubscriptionPurchasePreview(user.Id, targetPlan)
	require.NoError(t, err)
	require.NotNil(t, preview)
	assert.Equal(t, SubscriptionPurchaseActionUpgrade, preview.Action)
	assert.InDelta(t, 56.67, preview.AmountDue, 0.01)
}

func TestUpgradeUserSubscriptionWithPlanTx_ResetsUsageAndStartsNewCycle(t *testing.T) {
	truncateTables(t)

	user := &User{
		Id:       9220,
		Username: "upgrade_apply_user",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, DB.Create(user).Error)

	currentPlan := &SubscriptionPlan{
		Id:            9320,
		Title:         "Lite月卡",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		PriceAmount:   50,
		TotalAmount:   int64(common.QuotaPerUnit * 3),
	}
	targetPlan := &SubscriptionPlan{
		Id:            9321,
		Title:         "Standard月卡",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		PriceAmount:   90,
		TotalAmount:   int64(common.QuotaPerUnit * 6),
	}
	require.NoError(t, DB.Create(currentPlan).Error)
	require.NoError(t, DB.Create(targetPlan).Error)

	now := time.Now().Unix()
	sub := &UserSubscription{
		Id:           9420,
		UserId:       user.Id,
		PlanId:       currentPlan.Id,
		AmountTotal:  currentPlan.TotalAmount,
		AmountUsed:   int64(common.QuotaPerUnit),
		PeriodAmount: 0,
		PeriodUsed:   0,
		StartTime:    now - 10*24*3600,
		EndTime:      now + 2*3600,
		Status:       "active",
	}
	require.NoError(t, DB.Create(sub).Error)

	var upgraded *UserSubscription
	require.NoError(t, DB.Transaction(func(tx *gorm.DB) error {
		var locked UserSubscription
		if err := tx.Where("id = ?", sub.Id).First(&locked).Error; err != nil {
			return err
		}
		var err error
		upgraded, err = upgradeUserSubscriptionWithPlanTx(tx, &locked, targetPlan, "order")
		return err
	}))
	require.NotNil(t, upgraded)
	assert.Equal(t, targetPlan.Id, upgraded.PlanId)
	assert.Equal(t, int64(0), upgraded.AmountUsed)
	assert.Equal(t, targetPlan.TotalAmount, upgraded.AmountTotal)
	assert.GreaterOrEqual(t, upgraded.StartTime, now)
	assert.Greater(t, upgraded.EndTime, upgraded.StartTime)
	assert.Equal(t, targetPlan.TotalAmount, upgraded.AmountTotal)
}
