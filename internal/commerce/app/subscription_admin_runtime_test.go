package app

import (
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResetAdminUserSubscriptionQuotaRuntime(t *testing.T) {
	db := setupRedemptionTestDB(t)

	insertSubscriptionResetAppTestUser(t, 9201, 0)
	plan := insertSubscriptionResetAppTestPlan(t, 9201, 0, 3000)
	plan.QuotaResetPeriod = commerceschema.SubscriptionResetMonthly
	require.NoError(t, db.Save(plan).Error)

	now := time.Now().Unix()
	sub := &commerceschema.UserSubscription{
		Id:            9202,
		UserId:        9201,
		PlanId:        plan.Id,
		AmountTotal:   3000,
		AmountUsed:    1200,
		PeriodAmount:  1000,
		PeriodUsed:    600,
		ModelUsage:    `{"gpt-4.1":200}`,
		StartTime:     now - 7200,
		EndTime:       now + 86400*30,
		Status:        "active",
		LastResetTime: now - 3600,
		NextResetTime: now + 86400,
	}
	require.NoError(t, db.Create(sub).Error)

	reset, err := resetAdminUserSubscriptionQuotaRuntime(sub.Id, adminResetUserSubscriptionQuotaRuntimeInput{})
	require.NoError(t, err)
	require.NotNil(t, reset)
	assert.Zero(t, reset.AmountUsed)
	assert.Zero(t, reset.PeriodUsed)
	assert.Equal(t, "", reset.ModelUsage)

	advanced, err := resetAdminUserSubscriptionQuotaRuntime(sub.Id, adminResetUserSubscriptionQuotaRuntimeInput{
		AdvanceResetTime: true,
	})
	require.NoError(t, err)
	require.NotNil(t, advanced)
	assert.True(t, advanced.LastResetTime > 0)
	assert.True(t, advanced.NextResetTime > advanced.LastResetTime)
}
