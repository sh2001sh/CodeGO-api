package model

import (
	"fmt"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func insertSubscriptionResetTestUser(t *testing.T, id int, inviterId int) {
	t.Helper()
	user := &User{
		Id:        id,
		Username:  fmt.Sprintf("subscription_reset_test_user_%d", id),
		Status:    common.UserStatusEnabled,
		AffCode:   fmt.Sprintf("AFF-%d", id),
		InviterId: inviterId,
	}
	require.NoError(t, DB.Create(user).Error)
}

func insertSubscriptionResetTestPlan(t *testing.T, id int, durationDays int, totalAmount int64) *SubscriptionPlan {
	t.Helper()
	plan := &SubscriptionPlan{
		Id:            id,
		Title:         "Subscription Reset Test Plan",
		PriceAmount:   50,
		Currency:      "CNY",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		Enabled:       true,
		TotalAmount:   totalAmount,
	}
	if durationDays > 0 {
		plan.DurationUnit = SubscriptionDurationDay
		plan.DurationValue = durationDays
	}
	require.NoError(t, DB.Create(plan).Error)
	return plan
}

func TestAwardReferralSubscriptionResetOpportunityTx_MonthCardAwardedOnce(t *testing.T) {
	truncateTables(t)

	insertSubscriptionResetTestUser(t, 7101, 0)
	insertSubscriptionResetTestUser(t, 7102, 7101)

	err := DB.Transaction(func(tx *gorm.DB) error {
		return AwardReferralSubscriptionResetOpportunityTx(
			tx,
			7102,
			ReferralPurchaseTypeMonthCard,
			"subscription_order",
			"trade-7102",
		)
	})
	require.NoError(t, err)

	summary, err := GetUserSubscriptionResetOpportunity(7101)
	require.NoError(t, err)
	assert.Equal(t, 1, summary.AvailableCount)
	assert.Equal(t, 1, summary.EarnedTotal)
	assert.Equal(t, 0, summary.UsedTotal)

	err = DB.Transaction(func(tx *gorm.DB) error {
		return AwardReferralSubscriptionResetOpportunityTx(
			tx,
			7102,
			ReferralPurchaseTypeMonthCard,
			"subscription_order",
			"trade-7102-duplicate",
		)
	})
	require.NoError(t, err)

	summary, err = GetUserSubscriptionResetOpportunity(7101)
	require.NoError(t, err)
	assert.Equal(t, 1, summary.AvailableCount)
	assert.Equal(t, 1, summary.EarnedTotal)
}

func TestUseUserSubscriptionResetOpportunity_ClearsCurrentSubscriptionAndLimitsMonthlyUsage(t *testing.T) {
	truncateTables(t)

	insertSubscriptionResetTestUser(t, 7201, 0)
	planA := insertSubscriptionResetTestPlan(t, 7201, 0, 1000)
	planB := insertSubscriptionResetTestPlan(t, 7202, 0, 2000)

	now := time.Now().Unix()
	require.NoError(t, DB.Create(&UserSubscription{
		Id:          7301,
		UserId:      7201,
		PlanId:      planA.Id,
		AmountTotal: planA.TotalAmount,
		AmountUsed:  360,
		StartTime:   now - 3600,
		EndTime:     now + 10*86400,
		Status:      "active",
	}).Error)
	require.NoError(t, DB.Create(&UserSubscription{
		Id:          7302,
		UserId:      7201,
		PlanId:      planB.Id,
		AmountTotal: planB.TotalAmount,
		AmountUsed:  180,
		StartTime:   now - 3600,
		EndTime:     now + 20*86400,
		Status:      "active",
	}).Error)
	require.NoError(t, DB.Create(&SubscriptionResetOpportunityAccount{
		UserId:         7201,
		EarnedTotal:    2,
		AvailableTotal: 2,
	}).Error)

	result, err := UseUserSubscriptionResetOpportunity(7201)
	require.NoError(t, err)
	assert.Equal(t, 7301, result.UserSubscriptionId)
	assert.EqualValues(t, 360, result.AmountUsedBefore)
	assert.EqualValues(t, 0, result.AmountUsedAfter)
	assert.Equal(t, 1, result.ResetOpportunity.AvailableCount)
	assert.Equal(t, 1, result.ResetOpportunity.UsedTotal)
	assert.True(t, result.ResetOpportunity.UsedThisMonth)

	var current UserSubscription
	require.NoError(t, DB.Where("id = ?", 7301).First(&current).Error)
	assert.Zero(t, current.AmountUsed)

	var untouched UserSubscription
	require.NoError(t, DB.Where("id = ?", 7302).First(&untouched).Error)
	assert.EqualValues(t, 180, untouched.AmountUsed)

	_, err = UseUserSubscriptionResetOpportunity(7201)
	require.ErrorIs(t, err, ErrSubscriptionResetOpportunityMonthlyUsed)

	summary, err := GetUserSubscriptionResetOpportunity(7201)
	require.NoError(t, err)
	assert.Equal(t, 1, summary.AvailableCount)
	assert.Equal(t, 1, summary.UsedTotal)
}
