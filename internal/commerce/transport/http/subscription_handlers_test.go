package http

import (
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/constant"
	"github.com/sh2001sh/new-api/dto"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	identitydomain "github.com/sh2001sh/new-api/internal/identity/domain"
	platformencoding "github.com/sh2001sh/new-api/internal/platform/encodingx"
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	stdhttp "net/http"
	"testing"
)

func TestGetSubscriptionPlansReturnsPublicPlans(t *testing.T) {
	db := setupCommerceHTTPTestDB(t)
	confirmTopupComplianceForTest(t)

	if err := db.Create(&commerceschema.SubscriptionPlan{
		Id:            1,
		Title:         "Standard月卡",
		Enabled:       true,
		InternalOnly:  false,
		PriceAmount:   30,
		SortOrder:     10,
		DurationUnit:  commerceschema.SubscriptionDurationMonth,
		DurationValue: 1,
	}).Error; err != nil {
		t.Fatalf("failed to seed subscription plan: %v", err)
	}

	ctx, recorder := newCommerceContext(t, stdhttp.MethodGet, "/api/subscription/plans", nil, 0)
	getSubscriptionPlans(ctx)

	response := decodeCommerceResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected subscription plans success, got %#v", response)
	}

	var payload []map[string]json.RawMessage
	if err := platformencoding.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode plans payload: %v", err)
	}
	if len(payload) != 1 {
		t.Fatalf("expected 1 plan, got %d", len(payload))
	}
}

func TestGetSubscriptionSelfReturnsOverview(t *testing.T) {
	db := setupCommerceHTTPTestDB(t)
	user := &identityschema.User{
		Id:          1,
		Username:    "subscription-self",
		Password:    "password123",
		DisplayName: "Subscription Self",
		Role:        constant.RoleCommonUser,
		Status:      constant.UserStatusEnabled,
		Group:       "default",
		AffCode:     "SS01",
	}
	identitydomain.SetSetting(user, dto.UserSetting{
		BillingPreference:  "subscription_first",
		FundingSourceOrder: []string{"subscription", "wallet"},
	})
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	ctx, recorder := newCommerceContext(t, stdhttp.MethodGet, "/api/subscription/self", nil, user.Id)
	getSubscriptionSelf(ctx)

	response := decodeCommerceResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected subscription self success, got %#v", response)
	}

	var payload struct {
		BillingPreference string `json:"billing_preference"`
		ClaudeQuota       int    `json:"claude_quota"`
	}
	if err := platformencoding.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode self payload: %v", err)
	}
	if payload.BillingPreference != "subscription_first" {
		t.Fatalf("expected subscription_first preference, got %q", payload.BillingPreference)
	}
	if payload.ClaudeQuota != 0 {
		t.Fatalf("expected claude quota 0, got %d", payload.ClaudeQuota)
	}
}

func TestUpdateSubscriptionPreferencePersistsSetting(t *testing.T) {
	db := setupCommerceHTTPTestDB(t)
	user := &identityschema.User{
		Id:          1,
		Username:    "subscription-pref",
		Password:    "password123",
		DisplayName: "Subscription Preference",
		Role:        constant.RoleCommonUser,
		Status:      constant.UserStatusEnabled,
		Group:       "default",
		AffCode:     "SP01",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	ctx, recorder := newCommerceContext(t, stdhttp.MethodPut, "/api/subscription/self/preference", map[string]any{
		"billing_preference":     "wallet_first",
		"funding_source_order":   []string{"wallet", "subscription"},
		"subscription_order_ids": []int{2, 1},
	}, user.Id)
	updateSubscriptionPreference(ctx)

	response := decodeCommerceResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected update subscription preference success, got %#v", response)
	}

	reloaded, err := loadUserByIDForTest(user.Id, true)
	if err != nil {
		t.Fatalf("failed to reload user: %v", err)
	}
	setting := identitydomain.GetSetting(reloaded)
	if setting.BillingPreference != "wallet_first" {
		t.Fatalf("expected wallet_first billing preference, got %q", setting.BillingPreference)
	}
	if len(setting.SubscriptionOrderIds) != 2 || setting.SubscriptionOrderIds[0] != 2 {
		t.Fatalf("unexpected subscription order ids: %#v", setting.SubscriptionOrderIds)
	}
}

func TestGetSubscriptionOrderStatusReturnsOrderPayload(t *testing.T) {
	db := setupCommerceHTTPTestDB(t)
	user := &identityschema.User{
		Id:          1,
		Username:    "subscription-order",
		Password:    "password123",
		DisplayName: "Subscription Order",
		Role:        constant.RoleCommonUser,
		Status:      constant.UserStatusEnabled,
		Group:       "default",
		AffCode:     "SO01",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	if err := db.Create(&commerceschema.SubscriptionPlan{
		Id:            1,
		Title:         "Pro月卡",
		Enabled:       true,
		PriceAmount:   60,
		DurationUnit:  commerceschema.SubscriptionDurationMonth,
		DurationValue: 1,
	}).Error; err != nil {
		t.Fatalf("failed to seed subscription plan: %v", err)
	}
	order := &commerceschema.SubscriptionOrder{
		Id:              1,
		UserId:          user.Id,
		PlanId:          1,
		Money:           60,
		TradeNo:         "sub-order-1",
		PaymentMethod:   commerceschema.PaymentMethodStripe,
		PaymentProvider: commerceschema.PaymentProviderStripe,
		Status:          constant.TopUpStatusSuccess,
		CreateTime:      platformruntime.GetTimestamp(),
		CompleteTime:    platformruntime.GetTimestamp(),
	}
	if err := db.Create(order).Error; err != nil {
		t.Fatalf("failed to seed subscription order: %v", err)
	}

	ctx, recorder := newCommerceContext(t, stdhttp.MethodGet, "/api/subscription/orders/sub-order-1", nil, user.Id)
	ctx.Params = gin.Params{{Key: "trade_no", Value: order.TradeNo}}
	getSubscriptionOrderStatus(ctx)

	response := decodeCommerceResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected order status success, got %#v", response)
	}

	var payload struct {
		TradeNo   string `json:"trade_no"`
		PlanTitle string `json:"plan_title"`
	}
	if err := platformencoding.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode order payload: %v", err)
	}
	if payload.TradeNo != order.TradeNo || payload.PlanTitle != "Pro月卡" {
		t.Fatalf("unexpected order payload: %#v", payload)
	}
}

func TestListSubscriptionClaudeConversionsReturnsItems(t *testing.T) {
	db := setupCommerceHTTPTestDB(t)
	user := &identityschema.User{
		Id:          1,
		Username:    "subscription-conversions",
		Password:    "password123",
		DisplayName: "Subscription Conversions",
		Role:        constant.RoleCommonUser,
		Status:      constant.UserStatusEnabled,
		Group:       "default",
		AffCode:     "SC01",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	if err := db.Create(&commerceschema.SubscriptionClaudeConversion{
		Id:                 1,
		UserId:             user.Id,
		UserSubscriptionId: 9,
		RequestId:          "conv-list-1",
		Status:             commerceschema.SubscriptionClaudeConversionStatusCompleted,
		SourceQuota:        100,
		TargetClaudeQuota:  10,
		RatioNumerator:     1,
		RatioDenominator:   10,
	}).Error; err != nil {
		t.Fatalf("failed to seed subscription conversion: %v", err)
	}

	ctx, recorder := newCommerceContext(t, stdhttp.MethodGet, "/api/subscription/self/claude-conversions", nil, user.Id)
	listSubscriptionClaudeConversions(ctx)

	response := decodeCommerceResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected conversions success, got %#v", response)
	}

	var payload struct {
		Items []commerceschema.SubscriptionClaudeConversion `json:"items"`
	}
	if err := platformencoding.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode conversions payload: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0].RequestId != "conv-list-1" {
		t.Fatalf("unexpected conversions payload: %#v", payload)
	}
}

func TestCreateSubscriptionClaudeConversionConsumesQuota(t *testing.T) {
	db := setupCommerceHTTPTestDB(t)
	user := &identityschema.User{
		Id:          1,
		Username:    "subscription-convert",
		Password:    "password123",
		DisplayName: "Subscription Convert",
		Role:        constant.RoleCommonUser,
		Status:      constant.UserStatusEnabled,
		Group:       "default",
		AffCode:     "CV01",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	if err := db.Create(&commerceschema.SubscriptionPlan{
		Id:            1,
		Title:         "Standard月卡",
		Enabled:       true,
		PriceAmount:   30,
		DurationUnit:  commerceschema.SubscriptionDurationMonth,
		DurationValue: 1,
		TotalAmount:   100,
	}).Error; err != nil {
		t.Fatalf("failed to seed subscription plan: %v", err)
	}
	if err := db.Create(&commerceschema.UserSubscription{
		Id:          1,
		UserId:      user.Id,
		PlanId:      1,
		AmountTotal: 100,
		StartTime:   platformruntime.GetTimestamp() - 60,
		EndTime:     platformruntime.GetTimestamp() + 3600,
		Status:      "active",
	}).Error; err != nil {
		t.Fatalf("failed to seed user subscription: %v", err)
	}

	ctx, recorder := newCommerceContext(t, stdhttp.MethodPost, "/api/subscription/self/claude-conversions", map[string]any{
		"subscription_id": 1,
		"source_quota":    10,
		"request_id":      "conv-create-1",
	}, user.Id)
	createSubscriptionClaudeConversion(ctx)

	response := decodeCommerceResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected create conversion success, got %#v", response)
	}

	reloaded, err := loadUserByIDForTest(user.Id, true)
	if err != nil {
		t.Fatalf("failed to reload user: %v", err)
	}
	if reloaded.ClaudeQuota != 1 {
		t.Fatalf("expected claude quota 1, got %d", reloaded.ClaudeQuota)
	}
}

func TestUseSubscriptionResetOpportunityResetsUsage(t *testing.T) {
	db := setupCommerceHTTPTestDB(t)
	user := &identityschema.User{
		Id:          1,
		Username:    "subscription-reset",
		Password:    "password123",
		DisplayName: "Subscription Reset",
		Role:        constant.RoleCommonUser,
		Status:      constant.UserStatusEnabled,
		Group:       "default",
		AffCode:     "SR01",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	if err := db.Create(&commerceschema.SubscriptionPlan{
		Id:            1,
		Title:         "Standard月卡",
		Enabled:       true,
		PriceAmount:   30,
		DurationUnit:  commerceschema.SubscriptionDurationMonth,
		DurationValue: 1,
		TotalAmount:   100,
	}).Error; err != nil {
		t.Fatalf("failed to seed subscription plan: %v", err)
	}
	if err := db.Create(&commerceschema.UserSubscription{
		Id:          1,
		UserId:      user.Id,
		PlanId:      1,
		AmountTotal: 100,
		AmountUsed:  20,
		PeriodUsed:  10,
		StartTime:   platformruntime.GetTimestamp() - 60,
		EndTime:     platformruntime.GetTimestamp() + 3600,
		Status:      "active",
	}).Error; err != nil {
		t.Fatalf("failed to seed user subscription: %v", err)
	}
	if err := db.Create(&commerceschema.SubscriptionResetOpportunityAccount{
		Id:             1,
		UserId:         user.Id,
		EarnedTotal:    1,
		AvailableTotal: 1,
	}).Error; err != nil {
		t.Fatalf("failed to seed reset opportunity account: %v", err)
	}

	ctx, recorder := newCommerceContext(t, stdhttp.MethodPost, "/api/subscription/self/reset-opportunity/use", map[string]any{}, user.Id)
	useSubscriptionResetOpportunity(ctx)

	response := decodeCommerceResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected reset opportunity success, got %#v", response)
	}

	var sub commerceschema.UserSubscription
	if err := db.Where("id = ?", 1).First(&sub).Error; err != nil {
		t.Fatalf("failed to reload subscription: %v", err)
	}
	if sub.AmountUsed != 0 || sub.PeriodUsed != 0 {
		t.Fatalf("expected subscription usage reset, got amount=%d period=%d", sub.AmountUsed, sub.PeriodUsed)
	}
}
