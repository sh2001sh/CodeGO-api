package model

import (
	"encoding/json"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
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
		&BlindBoxOrder{},
		&BlindBoxCredit{},
		&BlindBoxOpenRecord{},
		&BlindBoxPityState{},
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
		DB.Exec("DELETE FROM subscription_orders")
		DB.Exec("DELETE FROM subscription_plans")
		DB.Exec("DELETE FROM user_subscriptions")
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
