package model

import (
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestInitGhostUsers(t *testing.T) {
	truncateTables(t)
	ghostUserIds = []int{}

	err := initGhostUsersDB()
	require.NoError(t, err)
	assert.Len(t, ghostUserIds, 3)

	// Verify users exist in DB
	for _, userId := range ghostUserIds {
		var user User
		err := DB.Where("id = ?", userId).First(&user).Error
		require.NoError(t, err)
		assert.True(t, strings.HasPrefix(user.Username, "ghost_user_"))
		assert.Equal(t, "ghost", user.Group)
		assert.Equal(t, 1, user.Status)
	}

	// Second call should be idempotent
	ghostUserIds = []int{}
	err = initGhostUsersDB()
	require.NoError(t, err)
	assert.Len(t, ghostUserIds, 3)
}

func TestAddGhostMemberToNewOrder(t *testing.T) {
	truncateTables(t)
	ghostUserIds = []int{}

	err := initGhostUsersDB()
	require.NoError(t, err)

	// Create a plan
	plan := &SubscriptionPlan{
		Id:              9901,
		Title:           "Test月卡",
		PriceAmount:     99,
		Currency:        "CNY",
		DurationUnit:    SubscriptionDurationMonth,
		DurationValue:   1,
		Enabled:         true,
		GroupBuyEnabled: true,
		GroupBuyBonus2:  20,
		GroupBuyBonus3:  35,
		GroupBuyBonus5:  50,
		TotalAmount:     int64(common.QuotaPerUnit * 100),
	}
	require.NoError(t, DB.Create(plan).Error)

	// Create a real user
	realUser := &User{
		Id:       9902,
		Username: "real_user_test",
		Status:   common.UserStatusEnabled,
		Quota:    1000,
		AffCode:  "RU9902",
	}
	require.NoError(t, DB.Create(realUser).Error)

	// Create a group buy order
	now := time.Now()
	order := &GroupBuyOrder{
		Id:           9903,
		InitiatorId:  realUser.Id,
		PlanId:       plan.Id,
		Status:       GroupBuyStatusPending,
		TargetCount:  5,
		CurrentCount: 1,
		ExpiresAt:    now.Add(48 * time.Hour).Unix(),
	}
	require.NoError(t, DB.Create(order).Error)

	// Add real member
	realMember := &GroupBuyMember{
		GroupBuyId:         order.Id,
		UserId:             realUser.Id,
		OrderId:            1, // real order
		UserSubscriptionId: 0,
		BonusGranted:       false,
	}
	require.NoError(t, DB.Create(realMember).Error)

	// Add ghost member
	err = DB.Transaction(func(tx *gorm.DB) error {
		return AddGhostMemberToNewOrder(tx, order.Id)
	})
	require.NoError(t, err)

	// Verify: order current_count should be 2
	var updatedOrder GroupBuyOrder
	err = DB.Where("id = ?", order.Id).First(&updatedOrder).Error
	require.NoError(t, err)
	assert.Equal(t, 2, updatedOrder.CurrentCount)

	// Verify: should have 2 members total
	var members []GroupBuyMember
	err = DB.Where("group_buy_id = ?", order.Id).Find(&members).Error
	require.NoError(t, err)
	assert.Len(t, members, 2)

	// Verify: one is ghost (order_id=0, bonus_granted=true)
	ghostCount := 0
	for _, member := range members {
		if member.OrderId == 0 && member.BonusGranted {
			ghostCount++
			assert.Contains(t, ghostUserIds, member.UserId)
		}
	}
	assert.Equal(t, 1, ghostCount)
}

func TestEnsureGhostGroupBuys_NoActiveOrders_CreatesTwoGhostOrders(t *testing.T) {
	truncateTables(t)
	ghostUserIds = []int{}
	require.NoError(t, initGhostUsersDB())

	plans := []*SubscriptionPlan{
		{Id: 9931, Title: "Lite月卡", PriceAmount: 29, Currency: "CNY", DurationUnit: SubscriptionDurationMonth, DurationValue: 1, Enabled: true, GroupBuyEnabled: true, GroupBuyBonus2: 20, TotalAmount: int64(common.QuotaPerUnit * 50)},
		{Id: 9932, Title: "Standard月卡", PriceAmount: 59, Currency: "CNY", DurationUnit: SubscriptionDurationMonth, DurationValue: 1, Enabled: true, GroupBuyEnabled: true, GroupBuyBonus2: 20, TotalAmount: int64(common.QuotaPerUnit * 100)},
		{Id: 9933, Title: "Pro月卡", PriceAmount: 99, Currency: "CNY", DurationUnit: SubscriptionDurationMonth, DurationValue: 1, Enabled: true, GroupBuyEnabled: true, GroupBuyBonus2: 20, TotalAmount: int64(common.QuotaPerUnit * 200)},
	}
	for _, p := range plans {
		require.NoError(t, DB.Create(p).Error)
	}

	// No active orders → should create 2 ghost orders
	err := ensureGhostGroupBuysInternal()
	require.NoError(t, err)

	var count int64
	require.NoError(t, DB.Model(&GroupBuyOrder{}).Where("status = ?", GroupBuyStatusPending).Count(&count).Error)
	assert.EqualValues(t, 2, count)

	// Each created order should have exactly 1 ghost member
	var orders []GroupBuyOrder
	require.NoError(t, DB.Where("status = ?", GroupBuyStatusPending).Find(&orders).Error)
	for _, o := range orders {
		assert.Contains(t, ghostUserIds, o.InitiatorId)
		var members []GroupBuyMember
		require.NoError(t, DB.Where("group_buy_id = ?", o.Id).Find(&members).Error)
		assert.Len(t, members, 1)
		assert.Equal(t, 0, members[0].OrderId)
		assert.True(t, members[0].BonusGranted)
	}
}

func TestEnsureGhostGroupBuys_OneActiveOrder_CreatesOneGhostOrder(t *testing.T) {
	truncateTables(t)
	ghostUserIds = []int{}
	require.NoError(t, initGhostUsersDB())

	plans := []*SubscriptionPlan{
		{Id: 9941, Title: "Lite月卡", PriceAmount: 29, Currency: "CNY", DurationUnit: SubscriptionDurationMonth, DurationValue: 1, Enabled: true, GroupBuyEnabled: true, GroupBuyBonus2: 20, TotalAmount: int64(common.QuotaPerUnit * 50)},
		{Id: 9942, Title: "Pro月卡", PriceAmount: 99, Currency: "CNY", DurationUnit: SubscriptionDurationMonth, DurationValue: 1, Enabled: true, GroupBuyEnabled: true, GroupBuyBonus2: 20, TotalAmount: int64(common.QuotaPerUnit * 200)},
	}
	for _, p := range plans {
		require.NoError(t, DB.Create(p).Error)
	}

	// One existing active order for plan 9941
	existing := &GroupBuyOrder{
		Id: 9943, InitiatorId: 1, PlanId: plans[0].Id,
		Status: GroupBuyStatusPending, TargetCount: 5, CurrentCount: 1,
		ExpiresAt: time.Now().Add(48 * time.Hour).Unix(),
	}
	require.NoError(t, DB.Create(existing).Error)

	// 1 active → should create 1 more ghost order
	err := ensureGhostGroupBuysInternal()
	require.NoError(t, err)

	var count int64
	require.NoError(t, DB.Model(&GroupBuyOrder{}).Where("status = ?", GroupBuyStatusPending).Count(&count).Error)
	assert.EqualValues(t, 2, count)
}

func TestEnsureGhostGroupBuys_TwoOrMoreActiveOrders_CreatesNone(t *testing.T) {
	truncateTables(t)
	ghostUserIds = []int{}
	require.NoError(t, initGhostUsersDB())

	plans := []*SubscriptionPlan{
		{Id: 9951, Title: "Lite月卡", PriceAmount: 29, Currency: "CNY", DurationUnit: SubscriptionDurationMonth, DurationValue: 1, Enabled: true, GroupBuyEnabled: true, GroupBuyBonus2: 20, TotalAmount: int64(common.QuotaPerUnit * 50)},
		{Id: 9952, Title: "Pro月卡", PriceAmount: 99, Currency: "CNY", DurationUnit: SubscriptionDurationMonth, DurationValue: 1, Enabled: true, GroupBuyEnabled: true, GroupBuyBonus2: 20, TotalAmount: int64(common.QuotaPerUnit * 200)},
	}
	for _, p := range plans {
		require.NoError(t, DB.Create(p).Error)
	}

	// Two existing active orders
	for i, p := range plans {
		o := &GroupBuyOrder{
			Id: int64(9953 + i), InitiatorId: 1, PlanId: p.Id,
			Status: GroupBuyStatusPending, TargetCount: 5, CurrentCount: 1,
			ExpiresAt: time.Now().Add(48 * time.Hour).Unix(),
		}
		require.NoError(t, DB.Create(o).Error)
	}

	// 2 active → should create 0 ghost orders
	err := ensureGhostGroupBuysInternal()
	require.NoError(t, err)

	var count int64
	require.NoError(t, DB.Model(&GroupBuyOrder{}).Where("status = ?", GroupBuyStatusPending).Count(&count).Error)
	assert.EqualValues(t, 2, count) // unchanged
}

func TestSettleGroupBuyOrder_OnlyOneRealMember_MarkedExpired(t *testing.T) {
	truncateTables(t)
	ghostUserIds = []int{}

	err := initGhostUsersDB()
	require.NoError(t, err)

	// Create plan
	plan := &SubscriptionPlan{
		Id:               9911,
		Title:            "Test月卡",
		PriceAmount:      99,
		Currency:         "CNY",
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

	// Create real user
	realUser := &User{
		Id:       9912,
		Username: "real_user_solo",
		Status:   common.UserStatusEnabled,
		Quota:    1000,
		AffCode:  "RU9912",
	}
	require.NoError(t, DB.Create(realUser).Error)

	// Create subscription
	now := time.Now()
	sub := &UserSubscription{
		Id:           9913,
		UserId:       realUser.Id,
		PlanId:       plan.Id,
		AmountTotal:  plan.TotalAmount,
		AmountUsed:   0,
		PeriodAmount: plan.PeriodAmount,
		PeriodUsed:   0,
		StartTime:    now.Unix(),
		EndTime:      now.Add(30 * 24 * time.Hour).Unix(),
		Status:       "active",
	}
	require.NoError(t, DB.Create(sub).Error)

	// Create order with 1 real + 1 ghost member
	order := &GroupBuyOrder{
		Id:           9914,
		InitiatorId:  realUser.Id,
		PlanId:       plan.Id,
		Status:       GroupBuyStatusPending,
		TargetCount:  5,
		CurrentCount: 2,
		ExpiresAt:    now.Add(-time.Minute).Unix(), // expired
	}
	require.NoError(t, DB.Create(order).Error)

	members := []*GroupBuyMember{
		{
			GroupBuyId:         order.Id,
			UserId:             realUser.Id,
			OrderId:            1,
			UserSubscriptionId: sub.Id,
			BonusGranted:       false,
		},
		{
			GroupBuyId:   order.Id,
			UserId:       ghostUserIds[0],
			OrderId:      0,
			BonusGranted: true,
		},
	}
	for _, member := range members {
		require.NoError(t, DB.Create(member).Error)
	}

	initialTotal := sub.AmountTotal

	// Settle
	err = settleGroupBuyOrder(order.Id)
	require.NoError(t, err)

	// Verify: only 1 real member → expired, no bonus
	var settled GroupBuyOrder
	err = DB.Where("id = ?", order.Id).First(&settled).Error
	require.NoError(t, err)
	assert.Equal(t, GroupBuyStatusExpired, settled.Status)

	// Verify: subscription unchanged (no bonus)
	var updatedSub UserSubscription
	err = DB.Where("id = ?", sub.Id).First(&updatedSub).Error
	require.NoError(t, err)
	assert.Equal(t, initialTotal, updatedSub.AmountTotal)
}

func TestSettleGroupBuyOrder_TwoRealMembers_MarkedCompleted(t *testing.T) {
	truncateTables(t)
	ghostUserIds = []int{}

	err := initGhostUsersDB()
	require.NoError(t, err)

	// Create plan
	plan := &SubscriptionPlan{
		Id:               9921,
		Title:            "Test月卡",
		PriceAmount:      99,
		Currency:         "CNY",
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

	// Create 2 real users
	users := []*User{
		{Id: 9922, Username: "real_user_1", Status: common.UserStatusEnabled, Quota: 1000, AffCode: "RU9922"},
		{Id: 9923, Username: "real_user_2", Status: common.UserStatusEnabled, Quota: 1000, AffCode: "RU9923"},
	}
	for _, user := range users {
		require.NoError(t, DB.Create(user).Error)
	}

	// Create subscriptions
	now := time.Now()
	subs := []*UserSubscription{
		{
			Id: 9924, UserId: users[0].Id, PlanId: plan.Id,
			AmountTotal: plan.TotalAmount, AmountUsed: 0,
			PeriodAmount: plan.PeriodAmount, PeriodUsed: 0,
			StartTime: now.Unix(), EndTime: now.Add(30 * 24 * time.Hour).Unix(),
			Status: "active",
		},
		{
			Id: 9925, UserId: users[1].Id, PlanId: plan.Id,
			AmountTotal: plan.TotalAmount, AmountUsed: 0,
			PeriodAmount: plan.PeriodAmount, PeriodUsed: 0,
			StartTime: now.Unix(), EndTime: now.Add(30 * 24 * time.Hour).Unix(),
			Status: "active",
		},
	}
	for _, sub := range subs {
		require.NoError(t, DB.Create(sub).Error)
	}

	// Create order: 2 real + 1 ghost
	order := &GroupBuyOrder{
		Id:           9926,
		InitiatorId:  users[0].Id,
		PlanId:       plan.Id,
		Status:       GroupBuyStatusPending,
		TargetCount:  5,
		CurrentCount: 3,
		ExpiresAt:    now.Add(-time.Minute).Unix(),
	}
	require.NoError(t, DB.Create(order).Error)

	members := []*GroupBuyMember{
		{GroupBuyId: order.Id, UserId: users[0].Id, OrderId: 1, UserSubscriptionId: subs[0].Id, BonusGranted: false},
		{GroupBuyId: order.Id, UserId: users[1].Id, OrderId: 2, UserSubscriptionId: subs[1].Id, BonusGranted: false},
		{GroupBuyId: order.Id, UserId: ghostUserIds[0], OrderId: 0, BonusGranted: true},
	}
	for _, member := range members {
		require.NoError(t, DB.Create(member).Error)
	}

	initialTotal := subs[0].AmountTotal

	// Settle
	err = settleGroupBuyOrder(order.Id)
	require.NoError(t, err)

	// Verify: 2 real members → completed
	var settled GroupBuyOrder
	err = DB.Where("id = ?", order.Id).First(&settled).Error
	require.NoError(t, err)
	assert.Equal(t, GroupBuyStatusCompleted, settled.Status)

	// Verify: both real users got bonus (2-person tier)
	expectedBonus := int64(common.QuotaPerUnit * 20)
	for _, sub := range subs {
		var updated UserSubscription
		err = DB.Where("id = ?", sub.Id).First(&updated).Error
		require.NoError(t, err)
		assert.Equal(t, initialTotal+expectedBonus, updated.AmountTotal)
	}
}
