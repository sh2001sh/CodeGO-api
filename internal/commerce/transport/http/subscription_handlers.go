package http

import (
	httpapi "github.com/sh2001sh/new-api/internal/platform/transport/http/httpapi"
	"strings"

	"github.com/gin-gonic/gin"
	commerceapp "github.com/sh2001sh/new-api/internal/commerce/app"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
)

func quoteSubscriptionBooster(c *gin.Context) {
	var req commerceapp.SubscriptionBoosterQuoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpapi.ApiErrorMsg(c, "invalid request")
		return
	}
	payload, err := commerceapp.QuoteSubscriptionBooster(c.GetInt("id"), req)
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func purchaseSubscriptionBooster(c *gin.Context) {
	var req commerceapp.SubscriptionBoosterPurchaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpapi.ApiErrorMsg(c, "invalid request")
		return
	}
	if req.PaymentMethod == commerceschema.PaymentMethodStripe {
		payload, err := commerceapp.CreateSubscriptionBoosterStripePayment(c.GetInt("id"), req)
		if err != nil {
			httpapi.ApiError(c, err)
			return
		}
		httpapi.ApiSuccess(c, payload)
		return
	}
	payload, err := commerceapp.CreateSubscriptionBoosterEpayPayment(c.GetInt("id"), req)
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	c.JSON(200, gin.H{"success": true, "data": payload, "url": payload.URL})
}

func getSubscriptionBoosterOrder(c *gin.Context) {
	payload, err := commerceapp.BuildSubscriptionBoosterOrderStatusPayload(c.GetInt("id"), c.Param("id"))
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func getSubscriptionPlans(c *gin.Context) {
	payload, err := commerceapp.ListSubscriptionPlans(c.GetInt("id"))
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func getPublicPackages(c *gin.Context) {
	getSubscriptionPlans(c)
}

func getStarterUpgradeBonus(c *gin.Context) {
	payload, err := commerceapp.BuildStarterUpgradeBonusPayload(c.GetInt("id"))
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func getSubscriptionOrderStatus(c *gin.Context) {
	tradeNo := strings.TrimSpace(c.Param("trade_no"))
	if tradeNo == "" {
		httpapi.ApiErrorMsg(c, "invalid trade no")
		return
	}
	payload, err := commerceapp.BuildSubscriptionOrderStatusPayload(c.GetInt("id"), tradeNo)
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func getSubscriptionSelf(c *gin.Context) {
	payload, err := commerceapp.BuildSubscriptionSelfPayload(c.GetInt("id"))
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func useSubscriptionResetOpportunity(c *gin.Context) {
	payload, err := commerceapp.UseSubscriptionResetOpportunity(c.GetInt("id"))
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func listSubscriptionClaudeConversions(c *gin.Context) {
	payload, err := commerceapp.BuildSubscriptionClaudeConversionsPayload(c.GetInt("id"))
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func createSubscriptionClaudeConversion(c *gin.Context) {
	var req commerceapp.CreateSubscriptionClaudeConversionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpapi.ApiErrorMsg(c, "invalid request")
		return
	}
	payload, err := commerceapp.CreateSubscriptionClaudeConversion(c.GetInt("id"), req)
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}

func updateSubscriptionPreference(c *gin.Context) {
	var req commerceapp.UpdateSubscriptionPreferenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpapi.ApiErrorMsg(c, "invalid request")
		return
	}
	payload, err := commerceapp.UpdateSubscriptionPreference(c.GetInt("id"), req)
	if err != nil {
		httpapi.ApiError(c, err)
		return
	}
	httpapi.ApiSuccess(c, payload)
}
