package controller

import (
	"errors"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SubscriptionPlanDTO struct {
	Plan model.SubscriptionPlan `json:"plan"`
}

type BillingPreferenceRequest struct {
	BillingPreference string `json:"billing_preference"`
}

type AdminUpsertSubscriptionPlanRequest struct {
	Plan model.SubscriptionPlan `json:"plan"`
}

type AdminUpdateSubscriptionPlanStatusRequest struct {
	Enabled *bool `json:"enabled"`
}

type AdminBindSubscriptionRequest struct {
	UserId int `json:"user_id"`
	PlanId int `json:"plan_id"`
}

type AdminCreateUserSubscriptionRequest struct {
	PlanId int `json:"plan_id"`
}

type AdminUpdateUserSubscriptionRequest struct {
	StartTime    int64  `json:"start_time"`
	EndTime      int64  `json:"end_time"`
	Status       string `json:"status"`
	AmountTotal  int64  `json:"amount_total"`
	AmountUsed   int64  `json:"amount_used"`
	PeriodAmount int64  `json:"period_amount"`
	PeriodUsed   int64  `json:"period_used"`
	ModelLimits  string `json:"model_limits"`
}

func normalizeSubscriptionCurrency(currency string) string {
	normalized := strings.ToUpper(strings.TrimSpace(currency))
	if normalized == "" {
		return "USD"
	}
	return normalized
}

func normalizeSubscriptionModelLimits(raw string) (string, error) {
	limits, err := model.ParseSubscriptionModelQuotaMap(raw)
	if err != nil {
		return "", err
	}
	return model.EncodeSubscriptionModelQuotaMap(limits)
}

func normalizeAdminUserSubscriptionStatus(status string) (string, bool) {
	switch strings.TrimSpace(status) {
	case "active", "expired", "cancelled":
		return strings.TrimSpace(status), true
	default:
		return "", false
	}
}

func isMonthlySubscriptionPlan(plan *model.SubscriptionPlan) bool {
	if plan == nil {
		return false
	}
	return plan.DurationUnit == model.SubscriptionDurationMonth && plan.DurationValue == 1
}

func validateSubscriptionPlanInput(plan *model.SubscriptionPlan) error {
	if plan == nil {
		return gorm.ErrInvalidData
	}
	if strings.TrimSpace(plan.Title) == "" {
		return errors.New("plan title is required")
	}
	if plan.PriceAmount < 0 || plan.PriceAmount > 9999 {
		return errors.New("plan price is invalid")
	}
	if plan.MaxPurchasePerUser < 0 {
		return errors.New("max_purchase_per_user must be >= 0")
	}
	if plan.TotalAmount < 0 || plan.PeriodAmount < 0 {
		return errors.New("quota values must be >= 0")
	}
	plan.Currency = normalizeSubscriptionCurrency(plan.Currency)
	if plan.DurationUnit == "" {
		plan.DurationUnit = model.SubscriptionDurationMonth
	}
	if plan.DurationValue <= 0 && plan.DurationUnit != model.SubscriptionDurationCustom {
		plan.DurationValue = 1
	}
	normalizedModelLimits, err := normalizeSubscriptionModelLimits(plan.ModelLimits)
	if err != nil {
		return errors.New("model_limits must be a valid JSON object")
	}
	plan.ModelLimits = normalizedModelLimits
	plan.UpgradeGroup = strings.TrimSpace(plan.UpgradeGroup)
	if plan.UpgradeGroup != "" {
		if _, ok := ratio_setting.GetGroupRatioCopy()[plan.UpgradeGroup]; !ok {
			return errors.New("upgrade group does not exist")
		}
	}
	plan.QuotaResetPeriod = model.NormalizeResetPeriod(plan.QuotaResetPeriod)
	if plan.QuotaResetPeriod == model.SubscriptionResetCustom && plan.QuotaResetCustomSeconds <= 0 {
		return errors.New("quota_reset_custom_seconds must be > 0")
	}
	if isMonthlySubscriptionPlan(plan) && plan.QuotaResetPeriod == model.SubscriptionResetWeekly && plan.PeriodAmount > 0 {
		plan.TotalAmount = plan.PeriodAmount * 4
	}
	return nil
}

func GetSubscriptionPlans(c *gin.Context) {
	if !operation_setting.IsPaymentComplianceConfirmed() {
		common.ApiSuccess(c, []SubscriptionPlanDTO{})
		return
	}

	var plans []model.SubscriptionPlan
	if err := model.DB.Where("enabled = ?", true).Order("sort_order desc, id desc").Find(&plans).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	result := make([]SubscriptionPlanDTO, 0, len(plans))
	for _, plan := range plans {
		result = append(result, SubscriptionPlanDTO{Plan: plan})
	}
	common.ApiSuccess(c, result)
}

func GetSubscriptionSelf(c *gin.Context) {
	userId := c.GetInt("id")
	settingMap, _ := model.GetUserSetting(userId, false)
	pref := common.NormalizeBillingPreference(settingMap.BillingPreference)

	allSubscriptions, err := model.GetAllUserSubscriptions(userId)
	if err != nil {
		allSubscriptions = []model.SubscriptionSummary{}
	}
	activeSubscriptions, err := model.GetAllActiveUserSubscriptions(userId)
	if err != nil {
		activeSubscriptions = []model.SubscriptionSummary{}
	}

	common.ApiSuccess(c, gin.H{
		"billing_preference": pref,
		"subscriptions":      activeSubscriptions,
		"all_subscriptions":  allSubscriptions,
	})
}

func UpdateSubscriptionPreference(c *gin.Context) {
	userId := c.GetInt("id")
	var req BillingPreferenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	pref := common.NormalizeBillingPreference(req.BillingPreference)

	user, err := model.GetUserById(userId, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	current := user.GetSetting()
	current.BillingPreference = pref
	user.SetSetting(current)
	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"billing_preference": pref})
}

func AdminListSubscriptionPlans(c *gin.Context) {
	var plans []model.SubscriptionPlan
	if err := model.DB.Order("sort_order desc, id desc").Find(&plans).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	result := make([]SubscriptionPlanDTO, 0, len(plans))
	for _, plan := range plans {
		result = append(result, SubscriptionPlanDTO{Plan: plan})
	}
	common.ApiSuccess(c, result)
}

func AdminCreateSubscriptionPlan(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}

	var req AdminUpsertSubscriptionPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	req.Plan.Id = 0
	if err := validateSubscriptionPlanInput(&req.Plan); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DB.Create(&req.Plan).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	model.InvalidateSubscriptionPlanCache(req.Plan.Id)
	common.ApiSuccess(c, req.Plan)
}

func AdminUpdateSubscriptionPlan(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}

	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid id")
		return
	}

	var req AdminUpsertSubscriptionPlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	req.Plan.Id = id
	if err := validateSubscriptionPlanInput(&req.Plan); err != nil {
		common.ApiError(c, err)
		return
	}

	err := model.DB.Transaction(func(tx *gorm.DB) error {
		updateMap := map[string]interface{}{
			"title":                      req.Plan.Title,
			"subtitle":                   req.Plan.Subtitle,
			"price_amount":               req.Plan.PriceAmount,
			"currency":                   req.Plan.Currency,
			"duration_unit":              req.Plan.DurationUnit,
			"duration_value":             req.Plan.DurationValue,
			"custom_seconds":             req.Plan.CustomSeconds,
			"enabled":                    req.Plan.Enabled,
			"sort_order":                 req.Plan.SortOrder,
			"stripe_price_id":            req.Plan.StripePriceId,
			"creem_product_id":           req.Plan.CreemProductId,
			"max_purchase_per_user":      req.Plan.MaxPurchasePerUser,
			"total_amount":               req.Plan.TotalAmount,
			"period_amount":              req.Plan.PeriodAmount,
			"model_limits":               req.Plan.ModelLimits,
			"upgrade_group":              req.Plan.UpgradeGroup,
			"quota_reset_period":         req.Plan.QuotaResetPeriod,
			"quota_reset_custom_seconds": req.Plan.QuotaResetCustomSeconds,
			"updated_at":                 common.GetTimestamp(),
		}
		return tx.Model(&model.SubscriptionPlan{}).Where("id = ?", id).Updates(updateMap).Error
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	model.InvalidateSubscriptionPlanCache(id)
	common.ApiSuccess(c, nil)
}

func AdminUpdateSubscriptionPlanStatus(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}

	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid id")
		return
	}
	var req AdminUpdateSubscriptionPlanStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Enabled == nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	if err := model.DB.Model(&model.SubscriptionPlan{}).Where("id = ?", id).Update("enabled", *req.Enabled).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	model.InvalidateSubscriptionPlanCache(id)
	common.ApiSuccess(c, nil)
}

func AdminDeleteSubscriptionPlan(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}

	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid id")
		return
	}
	msg, err := model.AdminDeleteSubscriptionPlan(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if msg != "" {
		common.ApiSuccess(c, gin.H{"message": msg})
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminBindSubscription(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}

	var req AdminBindSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.UserId <= 0 || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	msg, err := model.AdminBindSubscription(req.UserId, req.PlanId, "")
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if msg != "" {
		common.ApiSuccess(c, gin.H{"message": msg})
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminListUserSubscriptions(c *gin.Context) {
	userId, _ := strconv.Atoi(c.Param("id"))
	if userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	subs, err := model.GetAllUserSubscriptions(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, subs)
}

func AdminCreateUserSubscription(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}

	userId, _ := strconv.Atoi(c.Param("id"))
	if userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	var req AdminCreateUserSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	msg, err := model.AdminBindSubscription(userId, req.PlanId, "")
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if msg != "" {
		common.ApiSuccess(c, gin.H{"message": msg})
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminUpdateUserSubscription(c *gin.Context) {
	subId, _ := strconv.Atoi(c.Param("id"))
	if subId <= 0 {
		common.ApiErrorMsg(c, "invalid subscription id")
		return
	}

	var req AdminUpdateUserSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	if req.StartTime <= 0 || req.EndTime <= 0 || req.EndTime <= req.StartTime {
		common.ApiErrorMsg(c, "invalid subscription time range")
		return
	}
	if req.AmountTotal < 0 || req.AmountUsed < 0 || req.PeriodAmount < 0 || req.PeriodUsed < 0 {
		common.ApiErrorMsg(c, "quota values must be >= 0")
		return
	}
	if req.AmountTotal > 0 && req.AmountUsed > req.AmountTotal {
		common.ApiErrorMsg(c, "amount_used cannot exceed amount_total")
		return
	}
	if req.PeriodAmount > 0 && req.PeriodUsed > req.PeriodAmount {
		common.ApiErrorMsg(c, "period_used cannot exceed period_amount")
		return
	}
	status, ok := normalizeAdminUserSubscriptionStatus(req.Status)
	if !ok {
		common.ApiErrorMsg(c, "invalid subscription status")
		return
	}
	modelLimits, err := normalizeSubscriptionModelLimits(req.ModelLimits)
	if err != nil {
		common.ApiErrorMsg(c, "model_limits must be a valid JSON object")
		return
	}

	msg, err := model.AdminUpdateUserSubscription(subId, model.AdminUpdateUserSubscriptionInput{
		StartTime:    req.StartTime,
		EndTime:      req.EndTime,
		Status:       status,
		AmountTotal:  req.AmountTotal,
		AmountUsed:   req.AmountUsed,
		PeriodAmount: req.PeriodAmount,
		PeriodUsed:   req.PeriodUsed,
		ModelLimits:  modelLimits,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if msg != "" {
		common.ApiSuccess(c, gin.H{"message": msg})
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminInvalidateUserSubscription(c *gin.Context) {
	subId, _ := strconv.Atoi(c.Param("id"))
	if subId <= 0 {
		common.ApiErrorMsg(c, "invalid subscription id")
		return
	}
	msg, err := model.AdminInvalidateUserSubscription(subId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if msg != "" {
		common.ApiSuccess(c, gin.H{"message": msg})
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminDeleteUserSubscription(c *gin.Context) {
	subId, _ := strconv.Atoi(c.Param("id"))
	if subId <= 0 {
		common.ApiErrorMsg(c, "invalid subscription id")
		return
	}
	msg, err := model.AdminDeleteUserSubscription(subId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if msg != "" {
		common.ApiSuccess(c, gin.H{"message": msg})
		return
	}
	common.ApiSuccess(c, nil)
}
