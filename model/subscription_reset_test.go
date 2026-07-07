package model

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdminResetUserSubscriptionQuota(t *testing.T) {
	truncateTables(t)

	insertSubscriptionResetTestUser(t, 9201, 0)
	plan := insertSubscriptionResetTestPlan(t, 9201, 0, 3000)
	plan.QuotaResetPeriod = SubscriptionResetMonthly
	require.NoError(t, DB.Save(plan).Error)

	now := time.Now().Unix()
	sub := &UserSubscription{
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
	require.NoError(t, DB.Create(sub).Error)

	reset, err := AdminResetUserSubscriptionQuota(sub.Id, AdminResetUserSubscriptionQuotaInput{})
	require.NoError(t, err)
	require.NotNil(t, reset)
	assert.Zero(t, reset.AmountUsed)
	assert.Zero(t, reset.PeriodUsed)
	assert.Equal(t, "", reset.ModelUsage)

	advanced, err := AdminResetUserSubscriptionQuota(sub.Id, AdminResetUserSubscriptionQuotaInput{AdvanceResetTime: true})
	require.NoError(t, err)
	require.NotNil(t, advanced)
	assert.True(t, advanced.LastResetTime > 0)
	assert.True(t, advanced.NextResetTime > advanced.LastResetTime)
}
