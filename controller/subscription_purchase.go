package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type subscriptionPurchaseFields struct {
	PlanId        int    `json:"plan_id"`
	PaymentMethod string `json:"payment_method"`
	PurchaseType  string `json:"purchase_type"`
	GroupBuyId    int64  `json:"group_buy_id"`
}

func normalizeSubscriptionPurchaseFields(userId int, req subscriptionPurchaseFields) (string, int64, error) {
	purchaseType := model.NormalizeSubscriptionPurchaseType(req.PurchaseType)
	groupBuyId := req.GroupBuyId
	if purchaseType != model.SubscriptionPurchaseTypeJoinGroup {
		groupBuyId = 0
	}
	if err := model.ValidateGroupBuyPurchase(userId, req.PlanId, purchaseType, groupBuyId); err != nil {
		return "", 0, err
	}
	return purchaseType, groupBuyId, nil
}

func writeSubscriptionPurchaseFields(order *model.SubscriptionOrder, purchaseType string, groupBuyId int64) {
	if order == nil {
		return
	}
	order.PurchaseType = model.NormalizeSubscriptionPurchaseType(purchaseType)
	order.GroupBuyId = groupBuyId
}

func bindPackagePurchaseRequest(c *gin.Context) (subscriptionPurchaseFields, bool) {
	var req subscriptionPurchaseFields
	if err := common.UnmarshalBodyReusable(c, &req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "invalid request")
		return req, false
	}
	return req, true
}

func PurchasePackage(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}
	req, ok := bindPackagePurchaseRequest(c)
	if !ok {
		return
	}
	switch strings.ToLower(strings.TrimSpace(req.PaymentMethod)) {
	case model.PaymentMethodStripe:
		SubscriptionRequestStripePay(c)
	case model.PaymentMethodCreem:
		SubscriptionRequestCreemPay(c)
	case model.PaymentMethodXunhu, "wxpay":
		SubscriptionRequestXunhuPay(c)
	default:
		SubscriptionRequestEpay(c)
	}
}

func UpgradePackage(c *gin.Context) {
	PurchasePackage(c)
}

func RenewPackage(c *gin.Context) {
	PurchasePackage(c)
}
