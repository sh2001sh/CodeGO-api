package app

import (
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	"github.com/sh2001sh/new-api/constant"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"testing"
	"time"
)

func TestCompleteTopUpByTradeNo_CreditsWalletLedgerSnapshot(t *testing.T) {
	db := setupRedemptionTestDB(t)

	user := &identityschema.User{
		Id:       8901,
		Username: "topup_wallet_ledger_user",
		Status:   constant.UserStatusEnabled,
		Quota:    1200,
	}
	require.NoError(t, db.Create(user).Error)

	topUp := &commerceschema.TopUp{
		UserId:          user.Id,
		Amount:          2,
		Money:           30,
		TradeNo:         "topup-wallet-ledger-order",
		PaymentMethod:   commerceschema.PaymentMethodStripe,
		PaymentProvider: commerceschema.PaymentProviderStripe,
		WalletType:      commerceschema.WalletTypeDefault,
		CreateTime:      time.Now().Unix(),
		Status:          constant.TopUpStatusPending,
	}
	require.NoError(t, db.Create(topUp).Error)

	completed, quotaToAdd, err := CompleteTopUpByTradeNo(topUp.TradeNo, commerceschema.PaymentProviderStripe, "", "cus_wallet", "")
	require.NoError(t, err)
	require.NotNil(t, completed)
	assert.Positive(t, quotaToAdd)

	var savedUser identityschema.User
	require.NoError(t, db.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Equal(t, user.Quota+quotaToAdd, savedUser.Quota)
	assert.Equal(t, "cus_wallet", savedUser.StripeCustomer)

	snapshot := loadCommerceBillingSnapshot(t, user.Id, "wallet")
	assert.Equal(t, int64(savedUser.Quota), snapshot.AvailableBalance)
}

func TestConvertSubscriptionQuotaToClaudeQuota_CreditsClaudeLedgerSnapshot(t *testing.T) {
	db := setupRedemptionTestDB(t)

	commerceschema.SubscriptionClaudeConversionEnabled = true
	commerceschema.SubscriptionClaudeConversionRatioNumerator = 1
	commerceschema.SubscriptionClaudeConversionRatioDenominator = 10
	commerceschema.SubscriptionClaudeConversionExcludeDayPass = true

	user := &identityschema.User{
		Id:          8902,
		Username:    "subscription_claude_ledger_user",
		Status:      constant.UserStatusEnabled,
		ClaudeQuota: 90,
	}
	require.NoError(t, db.Create(user).Error)

	plan := &commerceschema.SubscriptionPlan{
		Id:               8903,
		Title:            "Claude Conversion Plan",
		DurationUnit:     commerceschema.SubscriptionDurationMonth,
		DurationValue:    1,
		TotalAmount:      int64(platformruntime.QuotaPerUnit * 4),
		QuotaResetPeriod: commerceschema.SubscriptionResetNever,
	}
	require.NoError(t, db.Create(plan).Error)

	sub := &commerceschema.UserSubscription{
		Id:          8904,
		UserId:      user.Id,
		PlanId:      plan.Id,
		AmountTotal: int64(platformruntime.QuotaPerUnit * 4),
		AmountUsed:  int64(platformruntime.QuotaPerUnit),
		StartTime:   time.Now().Add(-24 * time.Hour).Unix(),
		EndTime:     time.Now().Add(24 * time.Hour).Unix(),
		Status:      "active",
	}
	require.NoError(t, db.Create(sub).Error)

	sourceQuota := int64(platformruntime.QuotaPerUnit)
	result, err := ConvertSubscriptionQuotaToClaudeQuota("subscription-ledger-req", user.Id, sub.Id, sourceQuota)
	require.NoError(t, err)
	require.NotNil(t, result)

	var savedUser identityschema.User
	require.NoError(t, db.Where("id = ?", user.Id).First(&savedUser).Error)
	assert.Equal(t, 90+result.TargetClaudeQuota, savedUser.ClaudeQuota)

	snapshot := loadCommerceBillingSnapshot(t, user.Id, "claude_wallet")
	assert.Equal(t, int64(savedUser.ClaudeQuota), snapshot.AvailableBalance)
}
