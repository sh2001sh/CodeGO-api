package app

import (
	"testing"
	"time"

	"github.com/sh2001sh/new-api/constant"
	billingschema "github.com/sh2001sh/new-api/internal/billing/schema"
	commercestore "github.com/sh2001sh/new-api/internal/commerce/paymentsettings"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestQuoteSubscriptionBoosterValidatesMonthlySubscriptionAndStep(t *testing.T) {
	db := setupRedemptionTestDB(t)
	original := *commercestore.GetPaymentSetting()
	t.Cleanup(func() { *commercestore.GetPaymentSetting() = original })
	setting := commercestore.GetPaymentSetting()
	setting.SubscriptionBoosterEnabled = true
	setting.SubscriptionBoosterRate = 0.2
	setting.SubscriptionBoosterMinQuota = int64(platformruntime.QuotaPerUnit)
	setting.SubscriptionBoosterMaxQuota = int64(platformruntime.QuotaPerUnit * 100)
	setting.SubscriptionBoosterQuotaStep = int64(platformruntime.QuotaPerUnit)
	setting.SubscriptionBoosterDailyLimit = 10
	plan := &commerceschema.SubscriptionPlan{Id: 9101, Title: "Standard 月卡", PlanType: commerceschema.SubscriptionPlanTypeMonthly, DurationUnit: commerceschema.SubscriptionDurationMonth, DurationValue: 1}
	require.NoError(t, db.Create(plan).Error)
	sub := &commerceschema.UserSubscription{Id: 9102, UserId: 9103, PlanId: plan.Id, AmountTotal: 2_000_000, StartTime: time.Now().Add(-time.Hour).Unix(), EndTime: time.Now().Add(24 * time.Hour).Unix(), Status: "active"}
	require.NoError(t, db.Create(sub).Error)

	quote, err := QuoteSubscriptionBooster(sub.UserId, SubscriptionBoosterQuoteRequest{SubscriptionID: sub.Id, Quota: int64(platformruntime.QuotaPerUnit)})
	require.NoError(t, err)
	assert.Equal(t, sub.EndTime, quote.ExpiresAt)
	assert.Equal(t, 0.2, quote.Rate)
	assert.Equal(t, 0.2, quote.AmountDue)

	_, err = QuoteSubscriptionBooster(sub.UserId, SubscriptionBoosterQuoteRequest{SubscriptionID: sub.Id, Quota: int64(platformruntime.QuotaPerUnit) + 1})
	assert.ErrorIs(t, err, ErrSubscriptionBoosterUnavailable)
	db.Model(sub).Update("end_time", time.Now().Add(-time.Minute).Unix())
	_, err = QuoteSubscriptionBooster(sub.UserId, SubscriptionBoosterQuoteRequest{SubscriptionID: sub.Id, Quota: int64(platformruntime.QuotaPerUnit)})
	assert.ErrorIs(t, err, ErrSubscriptionBoosterUnavailable)
}

func TestFulfillPaidSubscriptionOrderBoosterIsIdempotentAndPreservesExpiry(t *testing.T) {
	db := setupRedemptionTestDB(t)
	plan := &commerceschema.SubscriptionPlan{Id: 9201, Title: "Pro 月卡", PlanType: commerceschema.SubscriptionPlanTypeMonthly, DurationUnit: commerceschema.SubscriptionDurationMonth, DurationValue: 1}
	require.NoError(t, db.Create(plan).Error)
	expiresAt := time.Now().Add(72 * time.Hour).Unix()
	sub := &commerceschema.UserSubscription{Id: 9202, UserId: 9203, PlanId: plan.Id, AmountTotal: 3_000_000, PeriodAmount: 3_000_000, StartTime: time.Now().Add(-time.Hour).Unix(), EndTime: expiresAt, Status: "active"}
	require.NoError(t, db.Create(sub).Error)
	order := &commerceschema.SubscriptionOrder{UserId: sub.UserId, PlanId: plan.Id, Money: 0.12, TradeNo: "booster-idempotent-order", PurchaseType: commerceschema.SubscriptionPurchaseTypeBooster, TargetSubscriptionId: sub.Id, BoosterQuota: int64(platformruntime.QuotaPerUnit), BoosterRate: 0.12, BoosterExpiresAt: expiresAt, Status: constant.TopUpStatusSuccess, FulfillmentStatus: commerceschema.SubscriptionOrderFulfillmentPending, CreateTime: time.Now().Unix()}
	require.NoError(t, db.Create(order).Error)

	require.NoError(t, FulfillPaidSubscriptionOrder(order.TradeNo))
	require.NoError(t, FulfillPaidSubscriptionOrder(order.TradeNo))

	var saved commerceschema.UserSubscription
	require.NoError(t, db.First(&saved, sub.Id).Error)
	assert.Equal(t, int64(3_000_000)+int64(platformruntime.QuotaPerUnit), saved.AmountTotal)
	assert.Equal(t, int64(3_000_000)+int64(platformruntime.QuotaPerUnit), saved.PeriodAmount)
	assert.Equal(t, expiresAt, saved.EndTime)
	var entries []billingschema.BillingLedgerEntry
	require.NoError(t, db.Where("reference_type = ?", "subscription_booster_order").Find(&entries).Error)
	require.Len(t, entries, 1)
	assert.Equal(t, order.TradeNo, entries[0].ReferenceID)
	assert.Equal(t, int64(platformruntime.QuotaPerUnit), entries[0].Amount)
	var savedOrder commerceschema.SubscriptionOrder
	require.NoError(t, db.First(&savedOrder, order.Id).Error)
	assert.Equal(t, commerceschema.SubscriptionOrderFulfillmentCompleted, savedOrder.FulfillmentStatus)
}
