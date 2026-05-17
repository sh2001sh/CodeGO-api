package controller

import (
	"fmt"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

func requestXunhuPayment(c *gin.Context, req EpayRequest) {
	minTopup := getMinTopup()
	if req.Amount < minTopup {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("minimum top-up is %d", minTopup)})
		return
	}

	userId := c.GetInt("id")
	group, err := model.GetUserGroup(userId, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to get user group"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney < 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "payment amount is too low"})
		return
	}
	if setting.XunhuMinTopUp > 0 && payMoney < float64(setting.XunhuMinTopUp) {
		c.JSON(http.StatusOK, gin.H{
			"message": "error",
			"data":    fmt.Sprintf("minimum XunhuPay payment is %d CNY", setting.XunhuMinTopUp),
		})
		return
	}

	callbackAddress := service.GetCallbackAddress()
	tradeNo := fmt.Sprintf("USR%dNO%s%d", userId, common.GetRandomString(6), time.Now().Unix())
	notifyURL := callbackAddress + "/api/user/xunhu/notify"
	returnURL := callbackAddress + "/api/user/xunhu/return?trade_no=" + tradeNo

	order, err := createXunhuOrder(tradeNo, fmt.Sprintf("TUC%d", req.Amount), payMoney, notifyURL, returnURL)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("xunhu create topup order failed user_id=%d trade_no=%s error=%q", userId, tradeNo, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": formatXunhuCreatePaymentError(err)})
		return
	}

	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(int64(amount))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		amount = dAmount.Div(dQuotaPerUnit).IntPart()
	}
	topup := &model.TopUp{
		UserId:          userId,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodXunhu,
		PaymentProvider: model.PaymentProviderXunhu,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topup.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("xunhu create topup db order failed user_id=%d trade_no=%s error=%q", userId, tradeNo, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to create order"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"pay_url":    order.PayURL,
			"qrcode_url": order.QRCodeURL,
			"order_id":   tradeNo,
		},
	})
}

func XunhuNotify(c *gin.Context) {
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

	topup := model.GetTopUpByTradeNo(tradeNo)
	if topup == nil || topup.PaymentProvider != model.PaymentProviderXunhu {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if topup.Status == common.TopUpStatusSuccess {
		_, _ = c.Writer.Write([]byte("success"))
		return
	}

	dAmount := decimal.NewFromInt(topup.Amount)
	dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
	quotaToAdd := int(dAmount.Mul(dQuotaPerUnit).IntPart())
	if quotaToAdd <= 0 {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	topup.Status = common.TopUpStatusSuccess
	topup.CompleteTime = common.GetTimestamp()
	if err := topup.Update(); err != nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if err := model.IncreaseUserQuota(topup.UserId, quotaToAdd, true); err != nil {
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	model.RecordTopupLog(topup.UserId, fmt.Sprintf("xunhu top-up success, quota: %v, paid: %.2f", logger.LogQuota(quotaToAdd), topup.Money), c.ClientIP(), topup.PaymentMethod, model.PaymentProviderXunhu)
	_, _ = c.Writer.Write([]byte("success"))
}

func XunhuReturn(c *gin.Context) {
	tradeNo := c.Query("trade_no")
	topup := model.GetTopUpByTradeNo(tradeNo)
	if topup != nil && topup.Status == common.TopUpStatusSuccess {
		c.Redirect(http.StatusFound, paymentReturnPath("/console/topup?pay=success&show_history=true"))
		return
	}
	c.Redirect(http.StatusFound, paymentReturnPath("/console/topup?pay=pending&show_history=true"))
}
