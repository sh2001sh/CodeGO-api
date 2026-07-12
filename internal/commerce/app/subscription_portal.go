package app

import (
	auditschema "github.com/sh2001sh/new-api/internal/audit/schema"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	"strings"
	"time"

	auditapp "github.com/sh2001sh/new-api/internal/audit/app"
	commercedomain "github.com/sh2001sh/new-api/internal/commerce/domain"
	identitydomain "github.com/sh2001sh/new-api/internal/identity/domain"
	identitystore "github.com/sh2001sh/new-api/internal/identity/store"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
)

const starterUpgradeBonusWindow = 72 * time.Hour

var starterUpgradeBonuses = map[string]int{
	"Lite月卡":     10,
	"Standard月卡": 30,
	"Pro月卡":      60,
	"Ultra月卡":    100,
}

// SubscriptionPlanDTO is the public subscription plan payload returned to commerce clients.
type SubscriptionPlanDTO struct {
	Plan           commerceschema.SubscriptionPlan `json:"plan"`
	Action         string                          `json:"action,omitempty"`
	AmountDue      float64                         `json:"amount_due,omitempty"`
	DisabledReason string                          `json:"disabled_reason,omitempty"`
}

// UpdateSubscriptionPreferenceRequest captures user billing and subscription ordering preferences.
type UpdateSubscriptionPreferenceRequest struct {
	BillingPreference    string   `json:"billing_preference"`
	FundingSourceOrder   []string `json:"funding_source_order"`
	SubscriptionOrderIds []int    `json:"subscription_order_ids"`
}

// CreateSubscriptionClaudeConversionRequest requests a quota-to-Claude conversion.
type CreateSubscriptionClaudeConversionRequest struct {
	SubscriptionId int    `json:"subscription_id"`
	SourceQuota    int64  `json:"source_quota"`
	RequestId      string `json:"request_id"`
}

// ListSubscriptionPlans returns enabled public subscription plans with purchase previews when available.
func ListSubscriptionPlans(userID int) ([]SubscriptionPlanDTO, error) {
	if !IsPaymentComplianceConfirmed() {
		return []SubscriptionPlanDTO{}, nil
	}

	var plans []commerceschema.SubscriptionPlan
	if err := platformdb.DB.Where("enabled = ? AND internal_only = ?", true, false).
		Order("sort_order desc, id desc").
		Find(&plans).Error; err != nil {
		return nil, err
	}

	result := make([]SubscriptionPlanDTO, 0, len(plans))
	for _, plan := range plans {
		record := SubscriptionPlanDTO{Plan: plan}
		if userID > 0 {
			preview, err := ResolveSubscriptionPurchasePreview(userID, &plan)
			if err == nil && preview != nil {
				record.Action = preview.Action
				record.AmountDue = preview.AmountDue
				record.DisabledReason = preview.DisabledReason
			}
		}
		result = append(result, record)
	}
	return result, nil
}

// BuildStarterUpgradeBonusPayload returns the starter-upgrade bonus snapshot for the current user.
func BuildStarterUpgradeBonusPayload(userID int) (map[string]any, error) {
	eligible, err := HasStarterPurchaseWithin(userID, starterUpgradeBonusWindow)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"eligible":     eligible,
		"window_hours": int(starterUpgradeBonusWindow.Hours()),
		"bonuses":      cloneStarterUpgradeBonuses(),
	}, nil
}

// BuildSubscriptionOrderStatusPayload returns a user's subscription order status by trade number.
func BuildSubscriptionOrderStatusPayload(userID int, tradeNo string) (map[string]any, error) {
	order, err := GetSubscriptionOrderByTradeNoForUser(strings.TrimSpace(tradeNo), userID)
	if err != nil {
		return nil, err
	}
	planTitle := ""
	if plan, planErr := GetSubscriptionPlanByID(order.PlanId); planErr == nil && plan != nil {
		planTitle = plan.Title
	}
	return map[string]any{
		"trade_no":         order.TradeNo,
		"status":           order.Status,
		"plan_id":          order.PlanId,
		"plan_title":       planTitle,
		"money":            order.Money,
		"payment_method":   order.PaymentMethod,
		"payment_provider": order.PaymentProvider,
		"create_time":      order.CreateTime,
		"complete_time":    order.CompleteTime,
	}, nil
}

// BuildSubscriptionSelfPayload returns the user's subscription overview and preference state.
func BuildSubscriptionSelfPayload(userID int) (map[string]any, error) {
	settingMap, _ := identitystore.LoadUserSetting(userID, false)
	preference := commercedomain.NormalizeBillingPreference(settingMap.BillingPreference)
	fundingSourceOrder := commercedomain.NormalizeFundingSourceOrder(settingMap.FundingSourceOrder, preference)
	preference = commercedomain.BillingPreferenceFromFundingSourceOrder(fundingSourceOrder)

	allSubscriptions, err := GetAllUserSubscriptions(userID)
	if err != nil {
		allSubscriptions = []commercedomain.SubscriptionSummary{}
	}
	activeSubscriptions, err := GetAllActiveUserSubscriptions(userID)
	if err != nil {
		activeSubscriptions = []commercedomain.SubscriptionSummary{}
	}

	resetOpportunity, err := GetUserSubscriptionResetOpportunity(userID)
	if err != nil {
		return nil, err
	}
	claudeQuota, err := GetUserClaudeQuota(userID)
	if err != nil {
		return nil, err
	}
	recentConversions, err := ListRecentSubscriptionClaudeConversions(userID, 10)
	if err != nil {
		return nil, err
	}

	activeSubscriptionIDs := make([]int, 0, len(activeSubscriptions))
	activeSubscriptionSet := make(map[int]struct{}, len(activeSubscriptions))
	for _, item := range activeSubscriptions {
		if item.Subscription == nil || item.Subscription.Id <= 0 {
			continue
		}
		if plan, planErr := GetSubscriptionPlanByID(item.Subscription.PlanId); planErr == nil && plan != nil {
			preview := BuildSubscriptionClaudeConversionPreview(plan, item.Subscription)
			item.Subscription.ConversionPreview = &preview
		}
		activeSubscriptionIDs = append(activeSubscriptionIDs, item.Subscription.Id)
		activeSubscriptionSet[item.Subscription.Id] = struct{}{}
	}

	orderedIDs := make([]int, 0, len(activeSubscriptionIDs))
	for _, id := range commercedomain.NormalizePositiveIntSlice(settingMap.SubscriptionOrderIds) {
		if _, ok := activeSubscriptionSet[id]; !ok {
			continue
		}
		orderedIDs = append(orderedIDs, id)
		delete(activeSubscriptionSet, id)
	}
	for _, id := range activeSubscriptionIDs {
		if _, ok := activeSubscriptionSet[id]; !ok {
			continue
		}
		orderedIDs = append(orderedIDs, id)
		delete(activeSubscriptionSet, id)
	}

	return map[string]any{
		"billing_preference":     preference,
		"funding_source_order":   fundingSourceOrder,
		"subscription_order_ids": orderedIDs,
		"subscriptions":          activeSubscriptions,
		"all_subscriptions":      allSubscriptions,
		"reset_opportunity":      resetOpportunity,
		"claude_quota":           claudeQuota,
		"conversion_config":      GetSubscriptionClaudeConversionConfig(),
		"recent_conversions":     recentConversions,
		"booster_config": map[string]any{
			"enabled": currentSubscriptionBoosterConfig().Enabled,
		},
	}, nil
}

// UseSubscriptionResetOpportunity resets the current user's active subscription usage.
func UseSubscriptionResetOpportunity(userID int) (map[string]any, error) {
	result, err := UseUserSubscriptionResetOpportunity(userID)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"reset_opportunity":   result.ResetOpportunity,
		"subscription_id":     result.UserSubscriptionId,
		"amount_used_before":  result.AmountUsedBefore,
		"amount_used_after":   result.AmountUsedAfter,
		"period_used_before":  result.PeriodUsedBefore,
		"period_used_after":   result.PeriodUsedAfter,
		"cleared_used_amount": result.ClearedUsedAmount,
	}, nil
}

// BuildSubscriptionClaudeConversionsPayload returns recent conversion records and the active config.
func BuildSubscriptionClaudeConversionsPayload(userID int) (map[string]any, error) {
	items, err := ListRecentSubscriptionClaudeConversions(userID, 20)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"items":  items,
		"config": GetSubscriptionClaudeConversionConfig(),
	}, nil
}

// CreateSubscriptionClaudeConversion converts subscription quota into Claude quota for the current user.
func CreateSubscriptionClaudeConversion(userID int, req CreateSubscriptionClaudeConversionRequest) (map[string]any, error) {
	result, err := ConvertSubscriptionQuotaToClaudeQuota(req.RequestId, userID, req.SubscriptionId, req.SourceQuota)
	if err != nil {
		return nil, err
	}
	if planInfo, planErr := GetSubscriptionPlanInfoByUserSubscriptionID(req.SubscriptionId); planErr == nil && planInfo != nil {
		auditapp.RecordLog(userID, auditschema.LogTypeTopup, BuildSubscriptionClaudeConversionLog(planInfo.PlanTitle, result.SourceQuota, result.TargetClaudeQuota))
	}
	return map[string]any{
		"subscription_id":     result.SubscriptionId,
		"source_quota":        result.SourceQuota,
		"target_claude_quota": result.TargetClaudeQuota,
		"claude_quota_after":  result.ClaudeQuotaAfter,
		"amount_used_after":   result.AmountUsedAfter,
		"period_used_after":   result.PeriodUsedAfter,
		"conversion":          result.Conversion,
		"config":              result.Config,
	}, nil
}

// UpdateSubscriptionPreference persists the user's billing preference and active subscription ordering.
func UpdateSubscriptionPreference(userID int, req UpdateSubscriptionPreferenceRequest) (map[string]any, error) {
	preference := commercedomain.NormalizeBillingPreference(req.BillingPreference)
	fundingSourceOrder := commercedomain.NormalizeFundingSourceOrder(req.FundingSourceOrder, preference)
	preference = commercedomain.BillingPreferenceFromFundingSourceOrder(fundingSourceOrder)
	orderIDs := commercedomain.NormalizePositiveIntSlice(req.SubscriptionOrderIds)

	user, err := loadCommerceUserByID(userID, true)
	if err != nil {
		return nil, err
	}
	current := identitydomain.GetSetting(user)
	current.BillingPreference = preference
	current.FundingSourceOrder = fundingSourceOrder
	if req.SubscriptionOrderIds != nil {
		current.SubscriptionOrderIds = orderIDs
	}
	identitydomain.SetSetting(user, current)
	if err := identitystore.UpdateUser(user, false); err != nil {
		return nil, err
	}

	return map[string]any{
		"billing_preference":     preference,
		"funding_source_order":   current.FundingSourceOrder,
		"subscription_order_ids": current.SubscriptionOrderIds,
	}, nil
}

func cloneStarterUpgradeBonuses() map[string]int {
	cloned := make(map[string]int, len(starterUpgradeBonuses))
	for key, value := range starterUpgradeBonuses {
		cloned[key] = value
	}
	return cloned
}
