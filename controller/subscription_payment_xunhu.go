package controller

import (
	"fmt"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type SubscriptionXunhuPayRequest struct {
	PlanId int `json:"plan_id"`
}

func requestSubscriptionXunhuPay(c *gin.Context, planId int) {
	plan, err := model.GetSubscriptionPlanById(planId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !plan.Enabled {
		common.ApiErrorMsg(c, "plan is disabled")
		return
	}
	if plan.InternalOnly {
		common.ApiErrorMsg(c, "internal plan cannot be purchased")
		return
	}
	userId := c.GetInt("id")
	preview, err := model.ResolveSubscriptionPurchasePreview(userId, plan)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if preview.Action == model.SubscriptionPurchaseActionDisabled {
		common.ApiErrorMsg(c, preview.DisabledReason)
		return
	}
	if preview.AmountDue < 0.01 {
		common.ApiErrorMsg(c, "plan amount is too low")
		return
	}
	if plan.MaxPurchasePerUser > 0 {
		count, err := model.CountUserSubscriptionsByPlan(userId, plan.Id)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if count >= int64(plan.MaxPurchasePerUser) {
			common.ApiErrorMsg(c, "purchase limit reached")
			return
		}
	}

	callbackAddress := service.GetCallbackAddress()
	tradeNo := fmt.Sprintf("SUBUSR%dNO%s%d", userId, common.GetRandomString(6), time.Now().Unix())
	notifyURL := callbackAddress + "/api/subscription/xunhu/notify"
	returnURL := callbackAddress + "/api/subscription/xunhu/return?trade_no=" + tradeNo

	order := &model.SubscriptionOrder{
		UserId:          userId,
		PlanId:          plan.Id,
		Money:           preview.AmountDue,
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

	payResult, err := createXunhuOrder(tradeNo, fmt.Sprintf("SUB:%s", plan.Title), preview.AmountDue, notifyURL, returnURL)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("xunhu create subscription order failed user_id=%d trade_no=%s plan_id=%d error=%q", userId, tradeNo, plan.Id, err.Error()))
		_ = model.ExpireSubscriptionOrder(tradeNo, model.PaymentProviderXunhu)
		common.ApiErrorMsg(c, formatXunhuCreatePaymentError(err))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"pay_url":    payResult.PayURL,
			"qrcode_url": payResult.QRCodeURL,
			"order_id":   tradeNo,
			"amount_due": preview.AmountDue,
			"action":     preview.Action,
		},
	})
}

func SubscriptionRequestXunhuPay(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}

	var req SubscriptionXunhuPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	requestSubscriptionXunhuPay(c, req.PlanId)
}

func SubscriptionXunhuNotify(c *gin.Context) {
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

	if err := model.CompleteSubscriptionOrder(tradeNo, common.GetJsonString(params), model.PaymentProviderXunhu, model.PaymentMethodXunhu); err != nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	_, _ = c.Writer.Write([]byte("success"))
}

func SubscriptionXunhuReturn(c *gin.Context) {
	tradeNo := c.Query("trade_no")
	order := model.GetSubscriptionOrderByTradeNo(tradeNo)
	if order != nil && order.Status == common.TopUpStatusSuccess {
		c.Redirect(http.StatusFound, paymentReturnPath("/packages?pay=success"))
		return
	}
	c.Redirect(http.StatusFound, paymentReturnPath("/packages?pay=pending"))
}
