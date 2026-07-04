package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSettleGroupBuyOrderAddsBonusToSubscriptionInsteadOfWallet(t *testing.T) {
	truncateTables(t)

	plan := &SubscriptionPlan{
		Id:               9801,
		Title:            "Group Buy Bonus Plan",
		PriceAmount:      99,
		Currency:         "USD",
		DurationUnit:     SubscriptionDurationMonth,
		DurationValue:    1,
		Enabled:          true,
		GroupBuyEnabled:  true,
		GroupBuyBonus2:   20,
		GroupBuyBonus3:   35,
		GroupBuyBonus5:   50,
		TotalAmount:      int64(common.QuotaPerUnit * 100),
		PeriodAmount:     int64(common.QuotaPerUnit * 40),
		QuotaResetPeriod: SubscriptionResetMonthly,
	}
	require.NoError(t, DB.Create(plan).Error)

	users := []*User{
		{Id: 98011, Username: "group_buy_bonus_user_1", Status: common.UserStatusEnabled, Quota: 777, AffCode: "GB98011"},
		{Id: 98012, Username: "group_buy_bonus_user_2", Status: common.UserStatusEnabled, Quota: 888, AffCode: "GB98012"},
	}
	for _, user := range users {
		require.NoError(t, DB.Create(user).Error)
	}

	now := time.Now()
	subs := []*UserSubscription{
		{
			Id:           98101,
			UserId:       users[0].Id,
			PlanId:       plan.Id,
			AmountTotal:  plan.TotalAmount,
			AmountUsed:   int64(common.QuotaPerUnit * 10),
			PeriodAmount: plan.PeriodAmount,
			PeriodUsed:   int64(common.QuotaPerUnit * 4),
			StartTime:    now.Add(-24 * time.Hour).Unix(),
			EndTime:      now.Add(24 * time.Hour).Unix(),
			Status:       "active",
		},
		{
			Id:           98102,
			UserId:       users[1].Id,
			PlanId:       plan.Id,
			AmountTotal:  plan.TotalAmount,
			AmountUsed:   int64(common.QuotaPerUnit * 8),
			PeriodAmount: plan.PeriodAmount,
			PeriodUsed:   int64(common.QuotaPerUnit * 3),
			StartTime:    now.Add(-24 * time.Hour).Unix(),
			EndTime:      now.Add(24 * time.Hour).Unix(),
			Status:       "active",
		},
	}
	for _, sub := range subs {
		require.NoError(t, DB.Create(sub).Error)
	}

	order := &GroupBuyOrder{
		Id:           98201,
		InitiatorId:  users[0].Id,
		PlanId:       plan.Id,
		Status:       GroupBuyStatusPending,
		TargetCount:  5,
		CurrentCount: 2,
		ExpiresAt:    now.Add(-time.Minute).Unix(),
	}
	require.NoError(t, DB.Create(order).Error)

	members := []*GroupBuyMember{
		{Id: 98301, GroupBuyId: order.Id, UserId: users[0].Id, OrderId: 99101, UserSubscriptionId: subs[0].Id},
		{Id: 98302, GroupBuyId: order.Id, UserId: users[1].Id, OrderId: 99102, UserSubscriptionId: subs[1].Id},
	}
	for _, member := range members {
		require.NoError(t, DB.Create(member).Error)
	}

	require.NoError(t, settleGroupBuyOrder(order.Id))

	expectedBonusQuota := quotaUnitsFromUSD(plan.GroupBuyBonus2)

	var refreshedSubs []UserSubscription
	require.NoError(t, DB.Where("id IN ?", []int{subs[0].Id, subs[1].Id}).Order("id asc").Find(&refreshedSubs).Error)
	require.Len(t, refreshedSubs, 2)
	for _, sub := range refreshedSubs {
		assert.Equal(t, plan.TotalAmount+expectedBonusQuota, sub.AmountTotal)
		assert.Equal(t, plan.PeriodAmount+expectedBonusQuota, sub.PeriodAmount)
	}

	var refreshedUsers []User
	require.NoError(t, DB.Where("id IN ?", []int{users[0].Id, users[1].Id}).Order("id asc").Find(&refreshedUsers).Error)
	require.Len(t, refreshedUsers, 2)
	assert.Equal(t, 777, refreshedUsers[0].Quota)
	assert.Equal(t, 888, refreshedUsers[1].Quota)

	var refreshedMembers []GroupBuyMember
	require.NoError(t, DB.Where("group_buy_id = ?", order.Id).Order("id asc").Find(&refreshedMembers).Error)
	require.Len(t, refreshedMembers, 2)
	for _, member := range refreshedMembers {
		assert.True(t, member.BonusGranted)
		assert.Equal(t, plan.GroupBuyBonus2, member.BonusAmountUSD)
	}

	var refreshedOrder GroupBuyOrder
	require.NoError(t, DB.Where("id = ?", order.Id).First(&refreshedOrder).Error)
	assert.Equal(t, GroupBuyStatusCompleted, refreshedOrder.Status)
	assert.NotZero(t, refreshedOrder.SettledAt)
}
