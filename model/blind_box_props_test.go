package model

import (
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func migrateBlindBoxPropTables(t *testing.T) {
	t.Helper()
	t.Cleanup(func() {
		DB.Exec("DELETE FROM blind_box_props")
	})
}

func TestActivateBlindBoxProp_AppliesConsumptionDiscount(t *testing.T) {
	truncateTables(t)
	migrateBlindBoxPropTables(t)

	user := &User{
		Id:       8810,
		Username: "blind_box_prop_activation_user",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, DB.Create(user).Error)

	var created *BlindBoxProp
	err := DB.Transaction(func(tx *gorm.DB) error {
		var txErr error
		created, txErr = createBlindBoxPropTx(tx, user.Id, 1, "0.9 倍率卡")
		return txErr
	})
	require.NoError(t, err)
	require.NotNil(t, created)

	assert.Equal(t, 0.0, GetUserBlindBoxConsumptionDiscountRate(user.Id))

	activated, err := ActivateBlindBoxProp(user.Id, created.Id)
	require.NoError(t, err)
	require.NotNil(t, activated)
	assert.Equal(t, BlindBoxPropStatusActive, activated.Status)
	assert.NotZero(t, activated.ActivatedAt)
	assert.Greater(t, activated.ExpiresAt, activated.ActivatedAt)
	assert.InDelta(t, 0.10, activated.DiscountRate, 0.0001)
	assert.InDelta(t, 0.10, GetUserBlindBoxConsumptionDiscountRate(user.Id), 0.0001)

	props, err := ListUserBlindBoxProps(user.Id)
	require.NoError(t, err)
	require.Len(t, props, 1)
	assert.Equal(t, BlindBoxPropStatusActive, props[0].Status)
}

func TestCreatePendingTopUpOrderWithBlindBoxDiscount_ConsumesReservedPropOnComplete(t *testing.T) {
	truncateTables(t)
	migrateBlindBoxPropTables(t)

	user := &User{
		Id:       8811,
		Username: "blind_box_prop_topup_user",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, DB.Create(user).Error)

	var prop *BlindBoxProp
	err := DB.Transaction(func(tx *gorm.DB) error {
		var txErr error
		prop, txErr = createBlindBoxPropTx(tx, user.Id, 2, "充值九折卡")
		return txErr
	})
	require.NoError(t, err)
	require.NotNil(t, prop)

	topUp := &TopUp{
		UserId:     user.Id,
		Amount:     2,
		Money:      100,
		TradeNo:    "blind-box-topup-discount-order",
		Status:     common.TopUpStatusPending,
		CreateTime: time.Now().Unix(),
	}
	appliedRate, err := CreatePendingTopUpOrderWithBlindBoxDiscount(topUp)
	require.NoError(t, err)
	assert.InDelta(t, 0.10, appliedRate, 0.0001)
	assert.Equal(t, 90.0, topUp.Money)

	var reserved BlindBoxProp
	require.NoError(t, DB.Where("id = ?", prop.Id).First(&reserved).Error)
	assert.Equal(t, BlindBoxPropStatusReserved, reserved.Status)
	assert.Equal(t, BlindBoxPropOrderTypeTopup, reserved.ReservedOrderType)
	assert.Equal(t, topUp.TradeNo, reserved.ReservedOrderTradeNo)

	completedTopUp, quotaToAdd, err := CompleteTopUpByTradeNo(topUp.TradeNo, "", PaymentMethodStripe, "", "")
	require.NoError(t, err)
	require.NotNil(t, completedTopUp)
	assert.Equal(t, common.TopUpStatusSuccess, completedTopUp.Status)
	assert.Positive(t, quotaToAdd)

	var used BlindBoxProp
	require.NoError(t, DB.Where("id = ?", prop.Id).First(&used).Error)
	assert.Equal(t, BlindBoxPropStatusUsed, used.Status)
	assert.NotZero(t, used.UsedAt)
	assert.Empty(t, used.ReservedOrderType)
	assert.Empty(t, used.ReservedOrderTradeNo)

	var savedUser User
	require.NoError(t, DB.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Greater(t, savedUser.Quota, 0)
}

func TestCreatePendingSubscriptionOrderWithBlindBoxDiscount_ReleasesReservedPropOnExpire(t *testing.T) {
	truncateTables(t)
	migrateBlindBoxPropTables(t)

	user := &User{
		Id:       8812,
		Username: "blind_box_prop_subscription_user",
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, DB.Create(user).Error)

	var prop *BlindBoxProp
	err := DB.Transaction(func(tx *gorm.DB) error {
		var txErr error
		prop, txErr = createBlindBoxPropTx(tx, user.Id, 3, "套餐九折卡")
		return txErr
	})
	require.NoError(t, err)
	require.NotNil(t, prop)

	order := &SubscriptionOrder{
		UserId:          user.Id,
		PlanId:          9901,
		TradeNo:         "blind-box-subscription-discount-order",
		Money:           100,
		Status:          common.TopUpStatusPending,
		PaymentMethod:   "test",
		PaymentProvider: "test",
		CreateTime:      time.Now().Unix(),
	}
	appliedRate, err := CreatePendingSubscriptionOrderWithBlindBoxDiscount(order, 100)
	require.NoError(t, err)
	assert.InDelta(t, 0.10, appliedRate, 0.0001)
	assert.Equal(t, 90.0, order.Money)

	var reserved BlindBoxProp
	require.NoError(t, DB.Where("id = ?", prop.Id).First(&reserved).Error)
	assert.Equal(t, BlindBoxPropStatusReserved, reserved.Status)
	assert.Equal(t, BlindBoxPropOrderTypeSubscription, reserved.ReservedOrderType)
	assert.Equal(t, order.TradeNo, reserved.ReservedOrderTradeNo)

	require.NoError(t, ExpireSubscriptionOrder(order.TradeNo, "test"))

	var released BlindBoxProp
	require.NoError(t, DB.Where("id = ?", prop.Id).First(&released).Error)
	assert.Equal(t, BlindBoxPropStatusAvailable, released.Status)
	assert.Zero(t, released.ReservedAt)
	assert.Empty(t, released.ReservedOrderType)
	assert.Empty(t, released.ReservedOrderTradeNo)

	var savedOrder SubscriptionOrder
	require.NoError(t, DB.Where("trade_no = ?", order.TradeNo).First(&savedOrder).Error)
	assert.Equal(t, common.TopUpStatusExpired, savedOrder.Status)
}

func TestBuildFirstPurchaseBlindBoxTiers_CapsMonetaryRewardsAndKeepsProps(t *testing.T) {
	tiers := operation_setting.GetBlindBoxSetting().Tiers
	remapped := buildFirstPurchaseBlindBoxTiers(tiers, 20)
	require.Len(t, remapped, len(tiers))

	maxMonetary := 0.0
	propCount := 0
	for _, tier := range remapped {
		switch operation_setting.NormalizeBlindBoxRewardType(tier.RewardType) {
		case BlindBoxRewardTypeProp:
			propCount++
			assert.Equal(t, 0.0, tier.MinUSD)
			assert.Equal(t, 0.0, tier.MaxUSD)
		default:
			if tier.MaxUSD > maxMonetary {
				maxMonetary = tier.MaxUSD
			}
		}
	}

	assert.Equal(t, 4, propCount)
	assert.LessOrEqual(t, maxMonetary, 80.0)
}
