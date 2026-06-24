package service

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJDCardSecretCount(t *testing.T) {
	cases := []struct {
		faceValue int64
		expected  int
	}{
		{faceValue: 5, expected: 1},
		{faceValue: 10, expected: 2},
		{faceValue: 20, expected: 1},
	}
	for _, testCase := range cases {
		count := jdCardSecretCount(model.PointMallProduct{FaceValue: testCase.faceValue})
		if count != testCase.expected {
			t.Fatalf("face value %d should require %d card secret(s), got %d", testCase.faceValue, testCase.expected, count)
		}
	}
}

func migratePointMallDeliveryTables(t *testing.T) {
	t.Helper()
	require.NoError(t, model.DB.AutoMigrate(
		&model.PointMallProduct{},
		&model.PointMallOrder{},
		&model.PointMallCardSecret{},
		&model.BlindBoxOrder{},
		&model.BlindBoxCredit{},
		&model.BlindBoxOpenRecord{},
		&model.BlindBoxPityState{},
	))
	t.Cleanup(func() {
		model.DB.Exec("DELETE FROM point_mall_orders")
		model.DB.Exec("DELETE FROM point_mall_products")
		model.DB.Exec("DELETE FROM point_mall_card_secrets")
		model.DB.Exec("DELETE FROM blind_box_orders")
		model.DB.Exec("DELETE FROM blind_box_credits")
		model.DB.Exec("DELETE FROM blind_box_open_records")
		model.DB.Exec("DELETE FROM blind_box_pity_states")
	})
}

func TestDeliverBlindBoxTicketTx_CreatesBlindBoxOrderAndMarksDelivery(t *testing.T) {
	truncate(t)
	migratePointMallDeliveryTables(t)

	originalSetting := operation_setting.GetBlindBoxSetting()
	t.Cleanup(func() {
		operation_setting.SetBlindBoxSetting(originalSetting)
	})

	setting := originalSetting
	setting.Enabled = true
	setting.SubscriptionPrizeProbability = 0
	setting.PityThreshold = 999
	setting.PityGuaranteeUSD = 0
	setting.LowRewardThresholdUSD = 0
	setting.Tiers = []operation_setting.BlindBoxTierSetting{
		{Name: "quota-tier", MinUSD: 1, MaxUSD: 1, Probability: 1, WalletType: "default"},
	}
	operation_setting.SetBlindBoxSetting(setting)

	plan := &model.SubscriptionPlan{
		Id:               9401,
		Title:            setting.SubscriptionPlanTitle,
		Subtitle:         "盲盒月卡",
		PriceAmount:      99,
		Currency:         "CNY",
		DurationUnit:     model.SubscriptionDurationMonth,
		DurationValue:    1,
		Enabled:          true,
		TotalAmount:      100000,
		PeriodAmount:     100000,
		QuotaResetPeriod: model.SubscriptionResetMonthly,
	}
	require.NoError(t, model.DB.Create(plan).Error)
	t.Cleanup(func() {
		model.DB.Exec("DELETE FROM subscription_plans")
	})

	user := &model.User{
		Id:       9101,
		Username: "point_mall_blind_box_user",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, model.DB.Create(user).Error)

	product := &model.PointMallProduct{
		Id:               9201,
		Name:             "Blind Box Ticket x2",
		Type:             model.PointProductTypeBlindBox,
		BlindBoxQuantity: 2,
		PointsPrice:      100,
		Status:           model.PointProductStatusOn,
	}
	require.NoError(t, model.DB.Create(product).Error)

	order := &model.PointMallOrder{
		Id:          9301,
		UserId:      user.Id,
		ProductId:   product.Id,
		ProductName: product.Name,
		ProductType: product.Type,
		PointsCost:  product.PointsPrice,
		Status:      model.PointOrderStatusPending,
		CreatedAt:   time.Now().Unix(),
	}
	require.NoError(t, model.DB.Create(order).Error)

	require.NoError(t, deliverPointMallOrderTx(model.DB, order, product))

	var savedOrder model.PointMallOrder
	require.NoError(t, model.DB.Where("id = ?", order.Id).First(&savedOrder).Error)
	assert.Equal(t, model.PointOrderStatusSuccess, savedOrder.Status)
	assert.NotZero(t, savedOrder.CompletedAt)
	assert.NotEmpty(t, savedOrder.DeliveryContent)

	var content map[string]any
	require.NoError(t, json.Unmarshal([]byte(savedOrder.DeliveryContent), &content))
	assert.Equal(t, float64(2), content["blind_box_quantity"])
	assert.NotEmpty(t, content["reward_summary"])
	blindBoxOrderID, ok := content["blind_box_order_id"].(float64)
	require.True(t, ok)
	assert.Positive(t, blindBoxOrderID)

	var blindOrder model.BlindBoxOrder
	require.NoError(t, model.DB.Where("id = ?", int(blindBoxOrderID)).First(&blindOrder).Error)
	assert.Equal(t, user.Id, blindOrder.UserId)
	assert.Equal(t, 2, blindOrder.Quantity)
	assert.Equal(t, common.TopUpStatusSuccess, blindOrder.Status)
	assert.Equal(t, "point_mall", blindOrder.PaymentMethod)

	var savedUser model.User
	require.NoError(t, model.DB.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Greater(t, savedUser.Quota, 0)
}
