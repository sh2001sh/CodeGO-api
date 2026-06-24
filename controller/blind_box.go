package controller

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
)

type BlindBoxAmountRequest struct {
	Quantity int `json:"quantity"`
}

type BlindBoxPayRequest struct {
	Quantity      int    `json:"quantity"`
	PaymentMethod string `json:"payment_method"`
}

type BlindBoxOpenRequest struct {
	Count int `json:"count"`
}

func getBlindBoxPropsOrFail(c *gin.Context, userId int) ([]model.BlindBoxProp, bool) {
	props, err := model.ListUserBlindBoxProps(userId)
	if err != nil {
		common.ApiError(c, err)
		return nil, false
	}
	return props, true
}

func getBlindBoxPayMethods(c *gin.Context) []map[string]string {
	if !operation_setting.IsPaymentComplianceConfirmed() {
		return []map[string]string{}
	}
	setting := operation_setting.GetBlindBoxSetting()
	if !setting.Enabled {
		return []map[string]string{}
	}
	payMethods := cloneDisplayedPayMethods(operation_setting.PayMethods, "")
	filtered := make([]map[string]string, 0, len(payMethods))
	for _, method := range payMethods {
		if method["type"] == model.PaymentMethodXunhu {
			continue
		}
		method["min_topup"] = "1"
		filtered = append(filtered, method)
	}
	if isXunhuTopUpEnabled() {
		filtered = cloneDisplayedPayMethods(filtered, "wxpay")
		filtered = append(filtered, map[string]string{
			"name":      "微信支付",
			"type":      model.PaymentMethodXunhu,
			"color":     "rgba(var(--semi-orange-5), 1)",
			"min_topup": "1",
		})
	}
	return filtered
}

func GetBlindBoxSelf(c *gin.Context) {
	setting := operation_setting.GetBlindBoxSetting()
	enabled := operation_setting.IsPaymentComplianceConfirmed() && setting.Enabled
	userId := c.GetInt("id")
	overview, err := model.GetUserBlindBoxOverview(userId, 20)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	firstPurchaseEligible, err := model.IsBlindBoxFirstPurchaseEligible(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	props, ok := getBlindBoxPropsOrFail(c, userId)
	if !ok {
		return
	}
	common.ApiSuccess(c, gin.H{
		"enabled":                           enabled,
		"unit_price":                        setting.UnitPrice,
		"daily_limit":                       setting.DailyLimit,
		"monthly_limit":                     setting.MonthlyLimit,
		"daily_open_limit":                  setting.DailyOpenLimit,
		"first_purchase_guarantee_usd":      setting.FirstPurchaseGuaranteeUSD,
		"first_purchase_guarantee_eligible": firstPurchaseEligible,
		"count_options":                     setting.CountOptions,
		"tiers":                             setting.Tiers,
		"subscription_prize_probability":    setting.SubscriptionPrizeProbability,
		"subscription_plan_title":           setting.SubscriptionPlanTitle,
		"pity_threshold":                    setting.PityThreshold,
		"pity_guarantee_usd":                setting.PityGuaranteeUSD,
		"low_reward_threshold_usd":          setting.LowRewardThresholdUSD,
		"pay_methods":                       getBlindBoxPayMethods(c),
		"overview":                          overview,
		"props":                             props,
	})
}

func AdminGetBlindBoxUserOverview(c *gin.Context) {
	userId, err := strconv.Atoi(c.Param("id"))
	if err != nil || userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	setting := operation_setting.GetBlindBoxSetting()
	enabled := operation_setting.IsPaymentComplianceConfirmed() && setting.Enabled
	overview, err := model.GetUserBlindBoxOverview(userId, 20)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	firstPurchaseEligible, err := model.IsBlindBoxFirstPurchaseEligible(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	props, ok := getBlindBoxPropsOrFail(c, userId)
	if !ok {
		return
	}
	common.ApiSuccess(c, gin.H{
		"enabled":                           enabled,
		"unit_price":                        setting.UnitPrice,
		"daily_limit":                       setting.DailyLimit,
		"monthly_limit":                     setting.MonthlyLimit,
		"daily_open_limit":                  setting.DailyOpenLimit,
		"first_purchase_guarantee_usd":      setting.FirstPurchaseGuaranteeUSD,
		"first_purchase_guarantee_eligible": firstPurchaseEligible,
		"count_options":                     setting.CountOptions,
		"tiers":                             setting.Tiers,
		"subscription_prize_probability":    setting.SubscriptionPrizeProbability,
		"subscription_plan_title":           setting.SubscriptionPlanTitle,
		"pity_threshold":                    setting.PityThreshold,
		"pity_guarantee_usd":                setting.PityGuaranteeUSD,
		"low_reward_threshold_usd":          setting.LowRewardThresholdUSD,
		"overview":                          overview,
		"props":                             props,
	})
}

func UseBlindBoxProp(c *gin.Context) {
	propId, err := strconv.Atoi(c.Param("id"))
	if err != nil || propId <= 0 {
		common.ApiErrorMsg(c, "invalid blind box prop id")
		return
	}
	prop, err := model.ActivateBlindBoxProp(c.GetInt("id"), propId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"prop": prop,
	})
}

func GetBlindBoxOrderStatus(c *gin.Context) {
	tradeNo := c.Param("trade_no")
	userId := c.GetInt("id")
	order, err := model.GetBlindBoxOrderByTradeNoForUser(tradeNo, userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"trade_no":         order.TradeNo,
		"status":           order.Status,
		"quantity":         order.Quantity,
		"opened_count":     order.OpenedCount,
		"money":            order.Money,
		"payment_method":   order.PaymentMethod,
		"payment_provider": order.PaymentProvider,
		"create_time":      order.CreateTime,
		"complete_time":    order.CompleteTime,
	})
}

func BlindBoxRequestAmount(c *gin.Context) {
	var req BlindBoxAmountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	amount, err := model.ValidateBlindBoxPurchase(c.GetInt("id"), req.Quantity)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, fmt.Sprintf("%.2f", amount))
}

func BlindBoxRequestPay(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}
	var req BlindBoxPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Quantity <= 0 {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	if req.PaymentMethod == model.PaymentMethodXunhu {
		requestBlindBoxXunhuPay(c, req.Quantity)
		return
	}
	if !operation_setting.ContainsPayMethod(req.PaymentMethod) {
		common.ApiErrorMsg(c, "payment method is not available")
		return
	}
	userId := c.GetInt("id")
	amountDue, err := model.ValidateBlindBoxPurchase(userId, req.Quantity)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	callBackAddress := service.GetCallbackAddress()
	returnUrl, err := url.Parse(paymentReturnPath("/blind-box?pay=pending"))
	if err != nil {
		common.ApiErrorMsg(c, "payment callback address is invalid")
		return
	}
	notifyUrl, err := url.Parse(callBackAddress + "/api/blind-box/epay/notify")
	if err != nil {
		common.ApiErrorMsg(c, "payment callback address is invalid")
		return
	}
	tradeNo := fmt.Sprintf("BBUSR%dNO%s%d", userId, common.GetRandomString(6), time.Now().Unix())
	client := GetEpayClient()
	if client == nil {
		common.ApiErrorMsg(c, "payment gateway is not configured")
		return
	}
	order := &model.BlindBoxOrder{
		UserId:          userId,
		Quantity:        req.Quantity,
		Money:           amountDue,
		TradeNo:         tradeNo,
		PaymentMethod:   req.PaymentMethod,
		PaymentProvider: model.PaymentProviderEpay,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := order.Insert(); err != nil {
		common.ApiErrorMsg(c, "failed to create order")
		return
	}
	uri, params, err := client.Purchase(&epay.PurchaseArgs{
		Type:           req.PaymentMethod,
		ServiceTradeNo: tradeNo,
		Name:           fmt.Sprintf("BlindBox:%d", req.Quantity),
		Money:          strconv.FormatFloat(amountDue, 'f', 2, 64),
		Device:         epay.PC,
		NotifyUrl:      notifyUrl,
		ReturnUrl:      returnUrl,
	})
	if err != nil {
		_ = model.ExpireBlindBoxOrder(tradeNo, model.PaymentProviderEpay)
		common.ApiErrorMsg(c, "failed to create payment")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"form":       params,
			"order_id":   tradeNo,
			"amount_due": amountDue,
			"quantity":   req.Quantity,
		},
		"url": uri,
	})
}

func requestBlindBoxXunhuPay(c *gin.Context, quantity int) {
	if !isXunhuTopUpEnabled() {
		common.ApiErrorMsg(c, "payment method is not available")
		return
	}
	userId := c.GetInt("id")
	amountDue, err := model.ValidateBlindBoxPurchase(userId, quantity)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	callbackAddress := service.GetCallbackAddress()
	tradeNo := fmt.Sprintf("BBUSR%dNO%s%d", userId, common.GetRandomString(6), time.Now().Unix())
	notifyURL := callbackAddress + "/api/blind-box/xunhu/notify"
	returnURL := callbackAddress + "/api/blind-box/xunhu/return?trade_no=" + tradeNo
	order := &model.BlindBoxOrder{
		UserId:          userId,
		Quantity:        quantity,
		Money:           amountDue,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodXunhu,
		PaymentProvider: model.PaymentProviderXunhu,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := order.Insert(); err != nil {
		common.ApiErrorMsg(c, "failed to create order")
		return
	}
	payResult, err := createXunhuOrder(tradeNo, fmt.Sprintf("BlindBox:%d", quantity), amountDue, notifyURL, returnURL)
	if err != nil {
		_ = model.ExpireBlindBoxOrder(tradeNo, model.PaymentProviderXunhu)
		common.ApiErrorMsg(c, formatXunhuCreatePaymentError(err))
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"pay_url":    payResult.PayURL,
			"qrcode_url": payResult.QRCodeURL,
			"order_id":   tradeNo,
			"amount_due": amountDue,
			"quantity":   quantity,
		},
	})
}

func BlindBoxOpen(c *gin.Context) {
	var req BlindBoxOpenRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Count <= 0 {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	records, err := model.OpenBlindBoxes(c.GetInt("id"), req.Count)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	overview, overviewErr := model.GetUserBlindBoxOverview(c.GetInt("id"), 20)
	if overviewErr != nil {
		common.ApiError(c, overviewErr)
		return
	}
	common.ApiSuccess(c, gin.H{
		"records":    records,
		"overview":   overview,
		"open_count": req.Count,
	})
}

func BlindBoxEpayNotify(c *gin.Context) {
	var params map[string]string
	if c.Request.Method == "POST" {
		if err := c.Request.ParseForm(); err != nil {
			_, _ = c.Writer.Write([]byte("fail"))
			return
		}
		params = lo.Reduce(lo.Keys(c.Request.PostForm), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.PostForm.Get(t)
			return r
		}, map[string]string{})
	} else {
		params = lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.URL.Query().Get(t)
			return r
		}, map[string]string{})
	}
	if len(params) == 0 {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	client := GetEpayClient()
	if client == nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	verifyInfo, err := client.Verify(params)
	if err != nil || !verifyInfo.VerifyStatus || verifyInfo.TradeStatus != epay.StatusTradeSuccess {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	LockOrder(verifyInfo.ServiceTradeNo)
	defer UnlockOrder(verifyInfo.ServiceTradeNo)
	if err := model.CompleteBlindBoxOrder(verifyInfo.ServiceTradeNo, common.GetJsonString(verifyInfo), model.PaymentProviderEpay, verifyInfo.Type); err != nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	_, _ = c.Writer.Write([]byte("success"))
}

func BlindBoxEpayReturn(c *gin.Context) {
	var params map[string]string
	if c.Request.Method == "POST" {
		if err := c.Request.ParseForm(); err != nil {
			c.Redirect(http.StatusFound, paymentReturnPath("/blind-box?pay=fail"))
			return
		}
		params = lo.Reduce(lo.Keys(c.Request.PostForm), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.PostForm.Get(t)
			return r
		}, map[string]string{})
	} else {
		params = lo.Reduce(lo.Keys(c.Request.URL.Query()), func(r map[string]string, t string, i int) map[string]string {
			r[t] = c.Request.URL.Query().Get(t)
			return r
		}, map[string]string{})
	}
	client := GetEpayClient()
	if client == nil {
		c.Redirect(http.StatusFound, paymentReturnPath("/blind-box?pay=fail"))
		return
	}
	verifyInfo, err := client.Verify(params)
	if err != nil || !verifyInfo.VerifyStatus {
		c.Redirect(http.StatusFound, paymentReturnPath("/blind-box?pay=fail"))
		return
	}
	if verifyInfo.TradeStatus == epay.StatusTradeSuccess {
		LockOrder(verifyInfo.ServiceTradeNo)
		defer UnlockOrder(verifyInfo.ServiceTradeNo)
		if err := model.CompleteBlindBoxOrder(verifyInfo.ServiceTradeNo, common.GetJsonString(verifyInfo), model.PaymentProviderEpay, verifyInfo.Type); err != nil {
			c.Redirect(http.StatusFound, paymentReturnPath("/blind-box?pay=fail"))
			return
		}
		c.Redirect(http.StatusFound, paymentReturnPath("/blind-box?pay=success"))
		return
	}
	c.Redirect(http.StatusFound, paymentReturnPath("/blind-box?pay=pending"))
}

func BlindBoxXunhuNotify(c *gin.Context) {
	if !isXunhuWebhookEnabled() {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if err := c.Request.ParseForm(); err != nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	params := map[string]string{}
	for key := range c.Request.Form {
		params[key] = c.Request.Form.Get(key)
	}
	if !verifyXunhuHash(params) {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if params["status"] != "OD" {
		_, _ = c.Writer.Write([]byte("success"))
		return
	}
	tradeNo := params["trade_order_id"]
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	if err := model.CompleteBlindBoxOrder(tradeNo, common.GetJsonString(params), model.PaymentProviderXunhu, model.PaymentMethodXunhu); err != nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	_, _ = c.Writer.Write([]byte("success"))
}

func BlindBoxXunhuReturn(c *gin.Context) {
	tradeNo := c.Query("trade_no")
	order := model.GetBlindBoxOrderByTradeNo(tradeNo)
	if order != nil && order.Status == common.TopUpStatusSuccess {
		c.Redirect(http.StatusFound, paymentReturnPath("/blind-box?pay=success"))
		return
	}
	c.Redirect(http.StatusFound, paymentReturnPath("/blind-box?pay=pending"))
}
