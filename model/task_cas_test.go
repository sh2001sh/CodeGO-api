package model

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestMain(m *testing.M) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to open test db: " + err.Error())
	}
	DB = db
	LOG_DB = db

	common.UsingSQLite = true
	common.RedisEnabled = false
	common.BatchUpdateEnabled = false
	common.LogConsumeEnabled = true

	sqlDB, err := db.DB()
	if err != nil {
		panic("failed to get sql.DB: " + err.Error())
	}
	sqlDB.SetMaxOpenConns(1)

	if err := db.AutoMigrate(
		&Task{},
		&User{},
		&Token{},
		&Log{},
		&Channel{},
		&Redemption{},
		&TopUp{},
		&SubscriptionPlan{},
		&SubscriptionOrder{},
		&UserSubscription{},
		&SubscriptionClaudeConversion{},
		&BlindBoxOrder{},
		&BlindBoxCredit{},
		&BlindBoxOpenRecord{},
		&BlindBoxPityState{},
		&BlindBoxProp{},
		&UserCompanionPet{},
		&SubscriptionResetOpportunityAccount{},
		&SubscriptionResetOpportunityLedger{},
	); err != nil {
		panic("failed to migrate: " + err.Error())
	}

	os.Exit(m.Run())
}

func truncateTables(t *testing.T) {
	t.Helper()
	t.Cleanup(func() {
		DB.Exec("DELETE FROM tasks")
		DB.Exec("DELETE FROM users")
		DB.Exec("DELETE FROM tokens")
		DB.Exec("DELETE FROM logs")
		DB.Exec("DELETE FROM channels")
		DB.Exec("DELETE FROM redemptions")
		DB.Exec("DELETE FROM top_ups")
		DB.Exec("DELETE FROM blind_box_orders")
		DB.Exec("DELETE FROM blind_box_credits")
		DB.Exec("DELETE FROM blind_box_open_records")
		DB.Exec("DELETE FROM blind_box_pity_states")
		DB.Exec("DELETE FROM user_companion_pets")
		DB.Exec("DELETE FROM subscription_orders")
		DB.Exec("DELETE FROM subscription_plans")
		DB.Exec("DELETE FROM user_subscriptions")
		DB.Exec("DELETE FROM subscription_claude_conversions")
		DB.Exec("DELETE FROM subscription_reset_opportunity_ledgers")
		DB.Exec("DELETE FROM subscription_reset_opportunity_accounts")
	})
}

func insertTask(t *testing.T, task *Task) {
	t.Helper()
	task.CreatedAt = time.Now().Unix()
	task.UpdatedAt = time.Now().Unix()
	require.NoError(t, DB.Create(task).Error)
}

// ---------------------------------------------------------------------------
// Snapshot / Equal — pure logic tests (no DB)
// ---------------------------------------------------------------------------

func TestSnapshotEqual_Same(t *testing.T) {
	s := taskSnapshot{
		Status:     TaskStatusInProgress,
		Progress:   "50%",
		StartTime:  1000,
		FinishTime: 0,
		FailReason: "",
		ResultURL:  "",
		Data:       json.RawMessage(`{"key":"value"}`),
	}
	assert.True(t, s.Equal(s))
}

func TestSnapshotEqual_DifferentStatus(t *testing.T) {
	a := taskSnapshot{Status: TaskStatusInProgress, Data: json.RawMessage(`{}`)}
	b := taskSnapshot{Status: TaskStatusSuccess, Data: json.RawMessage(`{}`)}
	assert.False(t, a.Equal(b))
}

func TestSnapshotEqual_DifferentProgress(t *testing.T) {
	a := taskSnapshot{Status: TaskStatusInProgress, Progress: "30%", Data: json.RawMessage(`{}`)}
	b := taskSnapshot{Status: TaskStatusInProgress, Progress: "60%", Data: json.RawMessage(`{}`)}
	assert.False(t, a.Equal(b))
}

func TestSnapshotEqual_DifferentData(t *testing.T) {
	a := taskSnapshot{Status: TaskStatusInProgress, Data: json.RawMessage(`{"a":1}`)}
	b := taskSnapshot{Status: TaskStatusInProgress, Data: json.RawMessage(`{"a":2}`)}
	assert.False(t, a.Equal(b))
}

func TestSnapshotEqual_NilVsEmpty(t *testing.T) {
	a := taskSnapshot{Status: TaskStatusInProgress, Data: nil}
	b := taskSnapshot{Status: TaskStatusInProgress, Data: json.RawMessage{}}
	// bytes.Equal(nil, []byte{}) == true
	assert.True(t, a.Equal(b))
}

func TestSnapshot_Roundtrip(t *testing.T) {
	task := &Task{
		Status:     TaskStatusInProgress,
		Progress:   "42%",
		StartTime:  1234,
		FinishTime: 5678,
		FailReason: "timeout",
		PrivateData: TaskPrivateData{
			ResultURL: "https://example.com/result.mp4",
		},
		Data: json.RawMessage(`{"model":"test-model"}`),
	}
	snap := task.Snapshot()
	assert.Equal(t, task.Status, snap.Status)
	assert.Equal(t, task.Progress, snap.Progress)
	assert.Equal(t, task.StartTime, snap.StartTime)
	assert.Equal(t, task.FinishTime, snap.FinishTime)
	assert.Equal(t, task.FailReason, snap.FailReason)
	assert.Equal(t, task.PrivateData.ResultURL, snap.ResultURL)
	assert.JSONEq(t, string(task.Data), string(snap.Data))
}

// ---------------------------------------------------------------------------
// UpdateWithStatus CAS — DB integration tests
// ---------------------------------------------------------------------------

func TestUpdateWithStatus_Win(t *testing.T) {
	truncateTables(t)

	task := &Task{
		TaskID:   "task_cas_win",
		Status:   TaskStatusInProgress,
		Progress: "50%",
		Data:     json.RawMessage(`{}`),
	}
	insertTask(t, task)

	task.Status = TaskStatusSuccess
	task.Progress = "100%"
	won, err := task.UpdateWithStatus(TaskStatusInProgress)
	require.NoError(t, err)
	assert.True(t, won)

	var reloaded Task
	require.NoError(t, DB.First(&reloaded, task.ID).Error)
	assert.EqualValues(t, TaskStatusSuccess, reloaded.Status)
	assert.Equal(t, "100%", reloaded.Progress)
}

func TestUpdateWithStatus_Lose(t *testing.T) {
	truncateTables(t)

	task := &Task{
		TaskID: "task_cas_lose",
		Status: TaskStatusFailure,
		Data:   json.RawMessage(`{}`),
	}
	insertTask(t, task)

	task.Status = TaskStatusSuccess
	won, err := task.UpdateWithStatus(TaskStatusInProgress) // wrong fromStatus
	require.NoError(t, err)
	assert.False(t, won)

	var reloaded Task
	require.NoError(t, DB.First(&reloaded, task.ID).Error)
	assert.EqualValues(t, TaskStatusFailure, reloaded.Status) // unchanged
}

func TestUpdateWithStatus_ConcurrentWinner(t *testing.T) {
	truncateTables(t)

	task := &Task{
		TaskID: "task_cas_race",
		Status: TaskStatusInProgress,
		Quota:  1000,
		Data:   json.RawMessage(`{}`),
	}
	insertTask(t, task)

	const goroutines = 5
	wins := make([]bool, goroutines)
	var wg sync.WaitGroup
	wg.Add(goroutines)

	for i := 0; i < goroutines; i++ {
		go func(idx int) {
			defer wg.Done()
			t := &Task{}
			*t = Task{
				ID:       task.ID,
				TaskID:   task.TaskID,
				Status:   TaskStatusSuccess,
				Progress: "100%",
				Quota:    task.Quota,
				Data:     json.RawMessage(`{}`),
			}
			t.CreatedAt = task.CreatedAt
			t.UpdatedAt = time.Now().Unix()
			won, err := t.UpdateWithStatus(TaskStatusInProgress)
			if err == nil {
				wins[idx] = won
			}
		}(i)
	}
	wg.Wait()

	winCount := 0
	for _, w := range wins {
		if w {
			winCount++
		}
	}
	assert.Equal(t, 1, winCount, "exactly one goroutine should win the CAS")
}

func TestRedeem_BlindBoxCodeCreatesAvailableBlindBoxOrder(t *testing.T) {
	truncateTables(t)

	user := &User{
		Id:       8801,
		Username: "blind_box_redeem_user",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, DB.Create(user).Error)

	redemption := &Redemption{
		Id:               9901,
		Key:              "blind-box-redeem-key",
		Name:             "Blind Box x3",
		Status:           common.RedemptionCodeStatusEnabled,
		RedeemType:       RedemptionTypeBlindBox,
		BlindBoxQuantity: 3,
		CreatedTime:      time.Now().Unix(),
	}
	require.NoError(t, DB.Create(redemption).Error)

	result, err := Redeem(redemption.Key, user.Id)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, RedemptionTypeBlindBox, result.RedeemType)
	assert.Equal(t, 3, result.BlindBoxQuantity)
	assert.NotZero(t, result.BlindBoxOrderId)

	var order BlindBoxOrder
	require.NoError(t, DB.Where("id = ?", result.BlindBoxOrderId).First(&order).Error)
	assert.Equal(t, user.Id, order.UserId)
	assert.Equal(t, 3, order.Quantity)
	assert.Equal(t, 0, order.OpenedCount)
	assert.Equal(t, common.TopUpStatusSuccess, order.Status)
	assert.Equal(t, "redemption", order.PaymentMethod)
	assert.Equal(t, "redemption", order.PaymentProvider)

	overview, err := GetUserBlindBoxOverview(user.Id, 5)
	require.NoError(t, err)
	assert.Equal(t, 3, overview.AvailableBoxes)
	assert.Equal(t, 0, overview.PurchasedToday)
	assert.Equal(t, 0, overview.PurchasedThisMonth)

	eligible, err := IsBlindBoxFirstPurchaseEligible(user.Id)
	require.NoError(t, err)
	assert.True(t, eligible)

	var saved Redemption
	require.NoError(t, DB.Where("id = ?", redemption.Id).First(&saved).Error)
	assert.Equal(t, common.RedemptionCodeStatusUsed, saved.Status)
	assert.Equal(t, user.Id, saved.UsedUserId)
	assert.NotZero(t, saved.RedeemedTime)
}

func TestRedeem_ClaudeQuotaCodeAddsClaudeQuotaOnly(t *testing.T) {
	truncateTables(t)

	user := &User{
		Id:          8802,
		Username:    "claude_quota_redeem_user",
		Status:      common.UserStatusEnabled,
		Quota:       1200,
		ClaudeQuota: 300,
	}
	require.NoError(t, DB.Create(user).Error)

	redemption := &Redemption{
		Id:          9902,
		Key:         "claude-quota-redeem-key",
		Name:        "Claude Quota Pack",
		Status:      common.RedemptionCodeStatusEnabled,
		RedeemType:  RedemptionTypeQuota,
		WalletType:  WalletTypeClaude,
		Quota:       800,
		CreatedTime: time.Now().Unix(),
	}
	require.NoError(t, DB.Create(redemption).Error)

	result, err := Redeem(redemption.Key, user.Id)
	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, RedemptionTypeQuota, result.RedeemType)
	assert.Equal(t, WalletTypeClaude, result.WalletType)
	assert.Equal(t, 800, result.Quota)

	var savedUser User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Equal(t, 1200, savedUser.Quota)
	assert.Equal(t, 1100, savedUser.ClaudeQuota)

	var saved Redemption
	require.NoError(t, DB.Where("id = ?", redemption.Id).First(&saved).Error)
	assert.Equal(t, common.RedemptionCodeStatusUsed, saved.Status)
	assert.Equal(t, user.Id, saved.UsedUserId)
	assert.NotZero(t, saved.RedeemedTime)
}

func TestRedeemReturnsSpecificBusinessErrors(t *testing.T) {
	truncateTables(t)

	user := &User{
		Id:       8810,
		Username: "redeem_error_user",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, DB.Create(user).Error)

	tests := []struct {
		name       string
		key        string
		redemption Redemption
		wantErr    error
	}{
		{
			name: "invalid code",
			key:  "missing-code",
			redemption: Redemption{
				Id:          9910,
				Key:         "invalid-code",
				Name:        "Invalid",
				Status:      common.RedemptionCodeStatusEnabled,
				CreatedTime: time.Now().Unix(),
			},
			wantErr: ErrRedemptionInvalid,
		},
		{
			name: "used code",
			redemption: Redemption{
				Id:           9911,
				Key:          "used-code",
				Name:         "Used",
				Status:       common.RedemptionCodeStatusUsed,
				CreatedTime:  time.Now().Unix(),
				RedeemedTime: time.Now().Unix(),
				UsedUserId:   user.Id,
			},
			wantErr: ErrRedemptionUsed,
		},
		{
			name: "expired code",
			redemption: Redemption{
				Id:          9912,
				Key:         "expired-code",
				Name:        "Expired",
				Status:      common.RedemptionCodeStatusEnabled,
				ExpiredTime: time.Now().Add(-time.Hour).Unix(),
				CreatedTime: time.Now().Unix(),
			},
			wantErr: ErrRedemptionExpired,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.NoError(t, DB.Create(&tt.redemption).Error)
			redeemKey := tt.redemption.Key
			if tt.key != "" {
				redeemKey = tt.key
			}
			_, err := Redeem(redeemKey, user.Id)
			require.Error(t, err)
			assert.ErrorIs(t, err, tt.wantErr)
		})
	}
}

func TestOpenBlindBoxes_AddsQuotaToDefaultAndClaudeWallets(t *testing.T) {
	truncateTables(t)

	setting := operation_setting.GetBlindBoxSetting()
	originalSetting := setting
	setting.Enabled = true
	setting.SubscriptionPrizeProbability = 0
	setting.PityThreshold = 999
	setting.PityGuaranteeUSD = 0
	setting.LowRewardThresholdUSD = 0
	setting.FirstPurchaseGuaranteeUSD = 0
	t.Cleanup(func() {
		operation_setting.SetBlindBoxSetting(originalSetting)
	})

	plan := &SubscriptionPlan{
		Id:               9509,
		Title:            setting.SubscriptionPlanTitle,
		Subtitle:         "盲盒月卡",
		PriceAmount:      99,
		Currency:         "CNY",
		DurationUnit:     SubscriptionDurationMonth,
		DurationValue:    1,
		Enabled:          true,
		TotalAmount:      100000,
		PeriodAmount:     100000,
		QuotaResetPeriod: SubscriptionResetMonthly,
	}
	require.NoError(t, DB.Create(plan).Error)
	t.Cleanup(func() {
		DB.Exec("DELETE FROM subscription_plans")
	})

	testCases := []struct {
		name           string
		userId         int
		username       string
		tradeNo        string
		rewardUSD      float64
		walletType     string
		expectedLabel  string
		expectedWallet BlindBoxRewardWalletType
	}{
		{
			name:           "default wallet reward",
			userId:         8803,
			username:       "blind_box_default_wallet_user",
			tradeNo:        "blind-box-default-wallet-order",
			rewardUSD:      1,
			walletType:     "default",
			expectedLabel:  "钱包：额度",
			expectedWallet: BlindBoxRewardWalletTypeDefault,
		},
		{
			name:           "claude wallet reward",
			userId:         8804,
			username:       "blind_box_claude_wallet_user",
			tradeNo:        "blind-box-claude-wallet-order",
			rewardUSD:      2,
			walletType:     "claude",
			expectedLabel:  "钱包：Claude额度",
			expectedWallet: BlindBoxRewardWalletTypeClaude,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			caseSetting := setting
			caseSetting.Tiers = []operation_setting.BlindBoxTierSetting{
				{Name: tc.name, MinUSD: tc.rewardUSD, MaxUSD: tc.rewardUSD, Probability: 1, WalletType: tc.walletType},
			}
			operation_setting.SetBlindBoxSetting(caseSetting)

			user := &User{
				Id:          tc.userId,
				Username:    tc.username,
				Status:      common.UserStatusEnabled,
				Quota:       100,
				ClaudeQuota: 200,
			}
			require.NoError(t, DB.Create(user).Error)

			order := &BlindBoxOrder{
				UserId:          user.Id,
				Quantity:        1,
				Money:           5,
				TradeNo:         tc.tradeNo,
				PaymentMethod:   "test",
				PaymentProvider: "test",
				Status:          common.TopUpStatusSuccess,
				CreateTime:      time.Now().Unix(),
			}
			require.NoError(t, DB.Create(order).Error)

			records, err := OpenBlindBoxOrderByTradeNo(order.TradeNo)
			require.NoError(t, err)
			require.Len(t, records, 1)
			assert.Equal(t, string(tc.expectedWallet), records[0].RewardWalletType)

			expectedCredit := int(math.Round(tc.rewardUSD * common.QuotaPerUnit))
			var savedUser User
			require.NoError(t, DB.Where("id = ?", user.Id).First(&savedUser).Error)
			if tc.expectedWallet == BlindBoxRewardWalletTypeClaude {
				assert.Equal(t, 100, savedUser.Quota)
				assert.Equal(t, 200+expectedCredit, savedUser.ClaudeQuota)
			} else {
				assert.Equal(t, 100+expectedCredit, savedUser.Quota)
				assert.Equal(t, 200, savedUser.ClaudeQuota)
			}

			var logs []Log
			require.NoError(t, DB.Where("user_id = ? AND type = ?", user.Id, LogTypeTopup).Order("id asc").Find(&logs).Error)
			require.Len(t, logs, 1)
			assert.Contains(t, logs[0].Content, "盲盒开奖到账")
			assert.Contains(t, logs[0].Content, tc.expectedLabel)
			assert.Contains(t, logs[0].Content, fmt.Sprintf("开奖记录ID：%d", records[0].Id))
		})
	}
}

func TestOpenBlindBoxOrderByTradeNo_DoesNotDoubleCreditQuota(t *testing.T) {
	truncateTables(t)

	setting := operation_setting.GetBlindBoxSetting()
	originalSetting := setting
	setting.Enabled = true
	setting.SubscriptionPrizeProbability = 0
	setting.PityThreshold = 999
	setting.PityGuaranteeUSD = 0
	setting.LowRewardThresholdUSD = 0
	setting.FirstPurchaseGuaranteeUSD = 0
	setting.Tiers = []operation_setting.BlindBoxTierSetting{
		{Name: "quota-tier", MinUSD: 1, MaxUSD: 1, Probability: 1, WalletType: "default"},
	}
	operation_setting.SetBlindBoxSetting(setting)
	t.Cleanup(func() {
		operation_setting.SetBlindBoxSetting(originalSetting)
	})

	plan := &SubscriptionPlan{
		Id:               9510,
		Title:            setting.SubscriptionPlanTitle,
		Subtitle:         "盲盒月卡",
		PriceAmount:      99,
		Currency:         "CNY",
		DurationUnit:     SubscriptionDurationMonth,
		DurationValue:    1,
		Enabled:          true,
		TotalAmount:      100000,
		PeriodAmount:     100000,
		QuotaResetPeriod: SubscriptionResetMonthly,
	}
	require.NoError(t, DB.Create(plan).Error)
	t.Cleanup(func() {
		DB.Exec("DELETE FROM subscription_plans")
	})

	user := &User{
		Id:       8813,
		Username: "blind_box_double_credit_user",
		Status:   common.UserStatusEnabled,
		Quota:    100,
	}
	require.NoError(t, DB.Create(user).Error)

	order := &BlindBoxOrder{
		UserId:          user.Id,
		Quantity:        1,
		OpenedCount:     0,
		Money:           5,
		TradeNo:         "blind-box-double-credit-order",
		PaymentMethod:   "test",
		PaymentProvider: "test",
		Status:          common.TopUpStatusSuccess,
		CreateTime:      time.Now().Unix(),
		CompleteTime:    time.Now().Unix(),
	}
	require.NoError(t, DB.Create(order).Error)

	beforeQuota := user.Quota
	records1, err := OpenBlindBoxOrderByTradeNo(order.TradeNo)
	require.NoError(t, err)
	require.Len(t, records1, 1)

	var afterFirst User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&afterFirst).Error)
	assert.Greater(t, afterFirst.Quota, beforeQuota)

	records2, err := OpenBlindBoxOrderByTradeNo(order.TradeNo)
	require.NoError(t, err)
	assert.Len(t, records2, 0)

	var afterSecond User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&afterSecond).Error)
	assert.Equal(t, afterFirst.Quota, afterSecond.Quota)

	var savedOrder BlindBoxOrder
	require.NoError(t, DB.Where("id = ?", order.Id).First(&savedOrder).Error)
	assert.Equal(t, 1, savedOrder.OpenedCount)

	var logs []Log
	require.NoError(t, DB.Where("user_id = ? AND type = ?", user.Id, LogTypeTopup).Find(&logs).Error)
	require.Len(t, logs, 1)
	assert.Contains(t, logs[0].Content, "盲盒开奖到账")
}

func TestMigrateBlindBoxLegacyCredits_TerminatesToMatchingWalletsAndCleansRows(t *testing.T) {
	truncateTables(t)

	users := []*User{
		{Id: 8804, Username: "legacy_wallet_user", AffCode: "legacy-wallet-user", Status: common.UserStatusEnabled, Quota: 100, ClaudeQuota: 200},
		{Id: 8805, Username: "legacy_claude_user", AffCode: "legacy-claude-user", Status: common.UserStatusEnabled, Quota: 300, ClaudeQuota: 400},
	}
	for _, user := range users {
		require.NoError(t, DB.Create(user).Error)
	}

	records := []*BlindBoxOpenRecord{
		{Id: 9901, UserId: users[0].Id, RewardType: BlindBoxRewardTypeQuota, RewardWalletType: string(BlindBoxRewardWalletTypeDefault)},
		{Id: 9902, UserId: users[1].Id, RewardType: BlindBoxRewardTypeClaudeQuota, RewardWalletType: string(BlindBoxRewardWalletTypeClaude)},
	}
	for _, record := range records {
		require.NoError(t, DB.Create(record).Error)
	}

	credits := []*BlindBoxCredit{
		{UserId: users[0].Id, OpenRecordId: records[0].Id, OriginalAmount: 120, RemainingAmount: 120, RewardUSD: 1.2, ExpiresAt: time.Now().Add(24 * time.Hour).Unix(), Status: BlindBoxCreditStatusActive},
		{UserId: users[1].Id, OpenRecordId: records[1].Id, OriginalAmount: 80, RemainingAmount: 80, RewardUSD: 0.8, ExpiresAt: time.Now().Add(24 * time.Hour).Unix(), Status: BlindBoxCreditStatusActive},
	}
	for _, credit := range credits {
		require.NoError(t, DB.Create(credit).Error)
	}

	require.NoError(t, MigrateBlindBoxLegacyCredits())

	var afterUsers []*User
	require.NoError(t, DB.Order("id asc").Find(&afterUsers).Error)
	require.Len(t, afterUsers, 2)
	assert.Equal(t, 220, afterUsers[0].Quota)
	assert.Equal(t, 200, afterUsers[0].ClaudeQuota)
	assert.Equal(t, 300, afterUsers[1].Quota)
	assert.Equal(t, 480, afterUsers[1].ClaudeQuota)

	var afterCredits []BlindBoxCredit
	require.NoError(t, DB.Order("id asc").Find(&afterCredits).Error)
	require.Len(t, afterCredits, 0)

	require.NoError(t, MigrateBlindBoxLegacyCredits())

	var finalUsers []*User
	require.NoError(t, DB.Order("id asc").Find(&finalUsers).Error)
	require.Len(t, finalUsers, 2)
	assert.Equal(t, 220, finalUsers[0].Quota)
	assert.Equal(t, 200, finalUsers[0].ClaudeQuota)
	assert.Equal(t, 300, finalUsers[1].Quota)
	assert.Equal(t, 480, finalUsers[1].ClaudeQuota)
}

func TestMigrateBlindBoxLegacyCredits_SkipsCacheInvalidationWhenRedisClientNotReady(t *testing.T) {
	truncateTables(t)

	originalRedisEnabled := common.RedisEnabled
	originalRDB := common.RDB
	common.RedisEnabled = true
	common.RDB = nil
	t.Cleanup(func() {
		common.RedisEnabled = originalRedisEnabled
		common.RDB = originalRDB
	})

	user := &User{Id: 8807, Username: "legacy_no_redis_client", Status: common.UserStatusEnabled, Quota: 100, ClaudeQuota: 50}
	require.NoError(t, DB.Create(user).Error)

	record := &BlindBoxOpenRecord{
		Id:               9904,
		UserId:           user.Id,
		RewardType:       BlindBoxRewardTypeQuota,
		RewardWalletType: string(BlindBoxRewardWalletTypeDefault),
	}
	require.NoError(t, DB.Create(record).Error)

	credit := &BlindBoxCredit{
		UserId:          user.Id,
		OpenRecordId:    record.Id,
		OriginalAmount:  75,
		RemainingAmount: 75,
		RewardUSD:       0.75,
		ExpiresAt:       time.Now().Add(24 * time.Hour).Unix(),
		Status:          BlindBoxCreditStatusActive,
	}
	require.NoError(t, DB.Create(credit).Error)

	require.NotPanics(t, func() {
		require.NoError(t, MigrateBlindBoxLegacyCredits())
	})

	var savedUser User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Equal(t, 175, savedUser.Quota)
	assert.Equal(t, 50, savedUser.ClaudeQuota)

	var savedCredit BlindBoxCredit
	assert.ErrorIs(t, gorm.ErrRecordNotFound, DB.Where("id = ?", credit.Id).First(&savedCredit).Error)
}

func TestMigrateBlindBoxLegacyCredits_DeletesExpiredCreditsWithoutWalletMigration(t *testing.T) {
	truncateTables(t)

	user := &User{Id: 8806, Username: "expired_legacy_user", Status: common.UserStatusEnabled, Quota: 100, ClaudeQuota: 200}
	require.NoError(t, DB.Create(user).Error)

	record := &BlindBoxOpenRecord{
		Id:               9903,
		UserId:           user.Id,
		RewardType:       BlindBoxRewardTypeQuota,
		RewardWalletType: string(BlindBoxRewardWalletTypeDefault),
	}
	require.NoError(t, DB.Create(record).Error)

	credit := &BlindBoxCredit{
		UserId:          user.Id,
		OpenRecordId:    record.Id,
		OriginalAmount:  90,
		RemainingAmount: 90,
		RewardUSD:       0.9,
		ExpiresAt:       time.Now().Add(-time.Hour).Unix(),
		Status:          BlindBoxCreditStatusActive,
	}
	require.NoError(t, DB.Create(credit).Error)

	require.NoError(t, MigrateBlindBoxLegacyCredits())

	var savedUser User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Equal(t, 100, savedUser.Quota)
	assert.Equal(t, 200, savedUser.ClaudeQuota)

	var savedCredit BlindBoxCredit
	assert.ErrorIs(t, gorm.ErrRecordNotFound, DB.Where("id = ?", credit.Id).First(&savedCredit).Error)
}

func TestMigrateBlindBoxLegacyCredits_DeletesExhaustedCredits(t *testing.T) {
	truncateTables(t)

	user := &User{Id: 8808, Username: "exhausted_legacy_user", Status: common.UserStatusEnabled, Quota: 500, ClaudeQuota: 600}
	require.NoError(t, DB.Create(user).Error)

	record := &BlindBoxOpenRecord{
		Id:               9905,
		UserId:           user.Id,
		RewardType:       BlindBoxRewardTypeQuota,
		RewardWalletType: string(BlindBoxRewardWalletTypeDefault),
	}
	require.NoError(t, DB.Create(record).Error)

	credit := &BlindBoxCredit{
		UserId:          user.Id,
		OpenRecordId:    record.Id,
		OriginalAmount:  100,
		RemainingAmount: 0,
		RewardUSD:       1.0,
		ExpiresAt:       time.Now().Add(24 * time.Hour).Unix(),
		Status:          BlindBoxCreditStatusExhausted,
	}
	require.NoError(t, DB.Create(credit).Error)

	require.NoError(t, MigrateBlindBoxLegacyCredits())

	var savedUser User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Equal(t, 500, savedUser.Quota)
	assert.Equal(t, 600, savedUser.ClaudeQuota)

	var savedCredit BlindBoxCredit
	assert.ErrorIs(t, gorm.ErrRecordNotFound, DB.Where("id = ?", credit.Id).First(&savedCredit).Error)
}
