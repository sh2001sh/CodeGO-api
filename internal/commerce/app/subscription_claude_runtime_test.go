package app

import (
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	"github.com/sh2001sh/new-api/constant"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"testing"
	"time"
)

func TestConvertSubscriptionQuotaToClaudeQuota_Success(t *testing.T) {
	db := setupRedemptionTestDB(t)
	restoreSubscriptionClaudeConversionConfigForTest(t)

	commerceschema.SubscriptionClaudeConversionEnabled = true
	commerceschema.SubscriptionClaudeConversionRatioNumerator = 1
	commerceschema.SubscriptionClaudeConversionRatioDenominator = 10
	commerceschema.SubscriptionClaudeConversionExcludeDayPass = true

	user := &identityschema.User{
		Id:          9201,
		Username:    "conversion_user_success",
		Status:      constant.UserStatusEnabled,
		ClaudeQuota: 100,
	}
	require.NoError(t, db.Create(user).Error)

	plan := &commerceschema.SubscriptionPlan{
		Id:               9301,
		Title:            "Standard月卡",
		DurationUnit:     commerceschema.SubscriptionDurationMonth,
		DurationValue:    1,
		TotalAmount:      int64(platformruntime.QuotaPerUnit * 3),
		QuotaResetPeriod: commerceschema.SubscriptionResetNever,
	}
	require.NoError(t, db.Create(plan).Error)

	sub := &commerceschema.UserSubscription{
		Id:          9401,
		UserId:      user.Id,
		PlanId:      plan.Id,
		AmountTotal: int64(platformruntime.QuotaPerUnit * 3),
		AmountUsed:  int64(platformruntime.QuotaPerUnit),
		StartTime:   time.Now().Add(-24 * time.Hour).Unix(),
		EndTime:     time.Now().Add(24 * time.Hour).Unix(),
		Status:      "active",
	}
	require.NoError(t, db.Create(sub).Error)

	sourceQuota := int64(platformruntime.QuotaPerUnit)
	result, err := ConvertSubscriptionQuotaToClaudeQuota("req-success-1", user.Id, sub.Id, sourceQuota)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, sourceQuota, result.SourceQuota)
	assert.Equal(t, int(platformruntime.QuotaPerUnit/10), result.TargetClaudeQuota)
	assert.Equal(t, int64(platformruntime.QuotaPerUnit*2), result.AmountUsedAfter)

	var savedUser identityschema.User
	require.NoError(t, db.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Equal(t, 100+int(platformruntime.QuotaPerUnit/10), savedUser.ClaudeQuota)

	var savedSub commerceschema.UserSubscription
	require.NoError(t, db.Where("id = ?", sub.Id).First(&savedSub).Error)
	assert.Equal(t, int64(platformruntime.QuotaPerUnit*2), savedSub.AmountUsed)
}

func TestConvertSubscriptionQuotaToClaudeQuota_DayPassRejected(t *testing.T) {
	db := setupRedemptionTestDB(t)
	restoreSubscriptionClaudeConversionConfigForTest(t)

	commerceschema.SubscriptionClaudeConversionEnabled = true
	commerceschema.SubscriptionClaudeConversionRatioNumerator = 1
	commerceschema.SubscriptionClaudeConversionRatioDenominator = 10
	commerceschema.SubscriptionClaudeConversionExcludeDayPass = true

	user := &identityschema.User{
		Id:       9202,
		Username: "conversion_user_day_pass",
		Status:   constant.UserStatusEnabled,
	}
	require.NoError(t, db.Create(user).Error)

	plan := &commerceschema.SubscriptionPlan{
		Id:            9302,
		Title:         "50刀日卡",
		DurationUnit:  commerceschema.SubscriptionDurationDay,
		DurationValue: 1,
		TotalAmount:   int64(platformruntime.QuotaPerUnit),
	}
	require.NoError(t, db.Create(plan).Error)

	sub := &commerceschema.UserSubscription{
		Id:          9402,
		UserId:      user.Id,
		PlanId:      plan.Id,
		AmountTotal: int64(platformruntime.QuotaPerUnit),
		StartTime:   time.Now().Add(-2 * time.Hour).Unix(),
		EndTime:     time.Now().Add(12 * time.Hour).Unix(),
		Status:      "active",
	}
	require.NoError(t, db.Create(sub).Error)

	_, err := ConvertSubscriptionQuotaToClaudeQuota("req-day-pass", user.Id, sub.Id, int64(platformruntime.QuotaPerUnit))
	require.ErrorIs(t, err, commerceschema.ErrSubscriptionClaudeConversionNoTarget)
}

func TestConvertSubscriptionQuotaToClaudeQuota_Idempotent(t *testing.T) {
	db := setupRedemptionTestDB(t)
	restoreSubscriptionClaudeConversionConfigForTest(t)

	commerceschema.SubscriptionClaudeConversionEnabled = true
	commerceschema.SubscriptionClaudeConversionRatioNumerator = 1
	commerceschema.SubscriptionClaudeConversionRatioDenominator = 10
	commerceschema.SubscriptionClaudeConversionExcludeDayPass = true

	user := &identityschema.User{
		Id:          9203,
		Username:    "conversion_user_idempotent",
		Status:      constant.UserStatusEnabled,
		ClaudeQuota: 50,
	}
	require.NoError(t, db.Create(user).Error)

	plan := &commerceschema.SubscriptionPlan{
		Id:            9303,
		Title:         "Pro月卡",
		DurationUnit:  commerceschema.SubscriptionDurationMonth,
		DurationValue: 1,
		TotalAmount:   int64(platformruntime.QuotaPerUnit * 3),
	}
	require.NoError(t, db.Create(plan).Error)

	sub := &commerceschema.UserSubscription{
		Id:          9403,
		UserId:      user.Id,
		PlanId:      plan.Id,
		AmountTotal: int64(platformruntime.QuotaPerUnit * 3),
		StartTime:   time.Now().Add(-24 * time.Hour).Unix(),
		EndTime:     time.Now().Add(24 * time.Hour).Unix(),
		Status:      "active",
	}
	require.NoError(t, db.Create(sub).Error)

	requestID := "req-idempotent-1"
	sourceQuota := int64(platformruntime.QuotaPerUnit)

	first, err := ConvertSubscriptionQuotaToClaudeQuota(requestID, user.Id, sub.Id, sourceQuota)
	require.NoError(t, err)
	second, err := ConvertSubscriptionQuotaToClaudeQuota(requestID, user.Id, sub.Id, sourceQuota)
	require.NoError(t, err)

	assert.Equal(t, first.TargetClaudeQuota, second.TargetClaudeQuota)
	assert.Equal(t, first.AmountUsedAfter, second.AmountUsedAfter)
	assert.Equal(t, first.ClaudeQuotaAfter, second.ClaudeQuotaAfter)

	var count int64
	require.NoError(t, db.Model(&commerceschema.SubscriptionClaudeConversion{}).Count(&count).Error)
	assert.Equal(t, int64(1), count)
}

func restoreSubscriptionClaudeConversionConfigForTest(t *testing.T) {
	t.Helper()

	enabled := commerceschema.SubscriptionClaudeConversionEnabled
	numerator := commerceschema.SubscriptionClaudeConversionRatioNumerator
	denominator := commerceschema.SubscriptionClaudeConversionRatioDenominator
	excludeDayPass := commerceschema.SubscriptionClaudeConversionExcludeDayPass
	t.Cleanup(func() {
		commerceschema.SubscriptionClaudeConversionEnabled = enabled
		commerceschema.SubscriptionClaudeConversionRatioNumerator = numerator
		commerceschema.SubscriptionClaudeConversionRatioDenominator = denominator
		commerceschema.SubscriptionClaudeConversionExcludeDayPass = excludeDayPass
	})
}
