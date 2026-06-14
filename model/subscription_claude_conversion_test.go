package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
		Id:              9301,
		Title:           "Standard月卡",
		DurationUnit:    SubscriptionDurationMonth,
		DurationValue:   1,
		TotalAmount:     int64(common.QuotaPerUnit * 3),
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
