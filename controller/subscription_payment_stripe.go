package controller

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/thanhpk/randstr"
)

type SubscriptionStripePayRequest struct {
	PlanId       int    `json:"plan_id"`
	PurchaseType string `json:"purchase_type"`
	GroupBuyId   int64  `json:"group_buy_id"`
}

func SubscriptionRequestStripePay(c *gin.Context) {
	if !requirePaymentCompliance(c) {
		return
	}

	var req SubscriptionStripePayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
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
	if !strings.HasPrefix(setting.StripeApiSecret, "sk_") && !strings.HasPrefix(setting.StripeApiSecret, "rk_") {
		common.ApiErrorMsg(c, "Stripe is not configured correctly")
		return
	}
	if setting.StripeWebhookSecret == "" {
		common.ApiErrorMsg(c, "Stripe webhook is not configured")
		return
	}

	userId := c.GetInt("id")
	purchaseType, groupBuyId, err := normalizeSubscriptionPurchaseFields(userId, subscriptionPurchaseFields{
		PlanId:       req.PlanId,
		PurchaseType: req.PurchaseType,
		GroupBuyId:   req.GroupBuyId,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	preview, err := model.ResolveSubscriptionPurchasePreview(userId, plan)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if preview.Action == model.SubscriptionPurchaseActionDisabled {
		common.ApiErrorMsg(c, preview.DisabledReason)
		return
	}
	if preview.Action == model.SubscriptionPurchaseActionUpgrade && preview.AmountDue != plan.PriceAmount {
		common.ApiErrorMsg(c, "subscription upgrades are currently supported via WeChat Pay only")
		return
	}

	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user == nil {
		common.ApiErrorMsg(c, "user not found")
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

	reference := fmt.Sprintf("sub-stripe-ref-%d-%d-%s", user.Id, time.Now().UnixMilli(), randstr.String(4))
	referenceId := "sub_ref_" + common.Sha1([]byte(reference))

	order := &model.SubscriptionOrder{
		UserId:          userId,
		PlanId:          plan.Id,
		Money:           preview.AmountDue,
		TradeNo:         referenceId,
		PaymentMethod:   model.PaymentMethodStripe,
		PaymentProvider: model.PaymentProviderStripe,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	writeSubscriptionPurchaseFields(order, purchaseType, groupBuyId)
	if _, err := model.CreatePendingSubscriptionOrderWithBlindBoxDiscount(order, preview.BaseAmountDue); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to create order"})
		return
	}
	payLink, err := genStripeSubscriptionLink(referenceId, user.StripeCustomer, user.Email, plan.Title, order.Money)
	if err != nil {
		_ = model.ExpireSubscriptionOrder(referenceId, model.PaymentProviderStripe)
		logger.LogError(c.Request.Context(), fmt.Sprintf("Stripe subscription checkout creation failed trade_no=%s plan_id=%d error=%q", referenceId, plan.Id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "failed to create payment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"pay_link":   payLink,
			"order_id":   referenceId,
			"amount_due": preview.AmountDue,
			"action":     preview.Action,
		},
	})
}

func genStripeSubscriptionLink(referenceId string, customerId string, email string, productName string, amountDue float64) (string, error) {
	stripe.Key = setting.StripeApiSecret
	unitAmount := stripeMoneyToMinorUnits(amountDue)
	if unitAmount < 1 {
		return "", fmt.Errorf("invalid stripe amount")
	}

	params := &stripe.CheckoutSessionParams{
		ClientReferenceID: stripe.String(referenceId),
		SuccessURL:        stripe.String(paymentReturnPath("/packages")),
		CancelURL:         stripe.String(paymentReturnPath("/packages")),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Quantity: stripe.Int64(1),
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency:   stripe.String("usd"),
					UnitAmount: stripe.Int64(unitAmount),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(productName),
					},
				},
			},
		},
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
	}

	if customerId == "" {
		if email != "" {
			params.CustomerEmail = stripe.String(email)
		}
		params.CustomerCreation = stripe.String(string(stripe.CheckoutSessionCustomerCreationAlways))
	} else {
		params.Customer = stripe.String(customerId)
	}

	result, err := session.New(params)
	if err != nil {
		return "", err
	}
	return result.URL, nil
}
