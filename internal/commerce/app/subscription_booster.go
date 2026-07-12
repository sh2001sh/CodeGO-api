package app

import (
	"errors"
	"fmt"
	"github.com/Calcium-Ion/go-epay/epay"
	"github.com/sh2001sh/new-api/constant"
	commercestore "github.com/sh2001sh/new-api/internal/commerce/paymentsettings"
	platformsecurity "github.com/sh2001sh/new-api/internal/platform/security"
	"github.com/thanhpk/randstr"
	"math"
	"net/url"
	"strconv"
	"strings"
	"time"

	billingdomain "github.com/sh2001sh/new-api/internal/billing/domain"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"gorm.io/gorm"
)

type SubscriptionBoosterPurchaseRequest struct {
	SubscriptionBoosterQuoteRequest
	PaymentMethod string `json:"payment_method"`
}

func createPendingBoosterOrder(userID int, quote *SubscriptionBoosterQuote, method, provider, tradeNo string) (*commerceschema.SubscriptionOrder, error) {
	order := &commerceschema.SubscriptionOrder{UserId: userID, PlanId: quote.PlanID, Money: quote.AmountDue, TradeNo: tradeNo, PaymentMethod: method, PaymentProvider: provider, PurchaseType: commerceschema.SubscriptionPurchaseTypeBooster, TargetSubscriptionId: quote.SubscriptionID, BoosterQuota: quote.Quota, BoosterRate: quote.Rate, BoosterExpiresAt: quote.ExpiresAt, Status: constant.TopUpStatusPending, FulfillmentStatus: commerceschema.SubscriptionOrderFulfillmentPending, CreateTime: time.Now().Unix()}
	if err := platformdb.DB.Create(order).Error; err != nil {
		return nil, err
	}
	return order, nil
}

func CreateSubscriptionBoosterEpayPayment(userID int, req SubscriptionBoosterPurchaseRequest) (*SubscriptionEpayCheckoutPayload, error) {
	if !commercestore.ContainsPayMethod(req.PaymentMethod) {
		return nil, errors.New("payment method is not available")
	}
	quote, err := QuoteSubscriptionBooster(userID, req.SubscriptionBoosterQuoteRequest)
	if err != nil {
		return nil, err
	}
	callback := CallbackAddress()
	returnURL, _ := url.Parse(callback + "/api/subscription/epay/return")
	notifyURL, _ := url.Parse(callback + "/api/subscription/epay/notify")
	tradeNo := fmt.Sprintf("SUBBOOST%dNO%s%d", userID, platformruntime.GetRandomString(6), time.Now().Unix())
	order, err := createPendingBoosterOrder(userID, quote, req.PaymentMethod, commerceschema.PaymentProviderEpay, tradeNo)
	if err != nil {
		return nil, err
	}
	client := GetEpayClient()
	if client == nil {
		return nil, errors.New("payment gateway is not configured")
	}
	uri, params, err := client.Purchase(&epay.PurchaseArgs{Type: req.PaymentMethod, ServiceTradeNo: tradeNo, Name: "BOOST:" + quote.PlanTitle, Money: strconv.FormatFloat(order.Money, 'f', 2, 64), Device: epay.PC, NotifyUrl: notifyURL, ReturnUrl: returnURL})
	if err != nil {
		_ = ExpireSubscriptionOrder(tradeNo, commerceschema.PaymentProviderEpay)
		return nil, err
	}
	return &SubscriptionEpayCheckoutPayload{SubscriptionCheckoutPayload: SubscriptionCheckoutPayload{OrderID: tradeNo, AmountDue: order.Money, Action: "booster"}, Form: params, URL: uri}, nil
}

// CreateSubscriptionBoosterXunhuPayment creates a WeChat checkout for a subscription booster.
func CreateSubscriptionBoosterXunhuPayment(userID int, req SubscriptionBoosterPurchaseRequest) (*SubscriptionXunhuCheckoutPayload, error) {
	quote, err := QuoteSubscriptionBooster(userID, req.SubscriptionBoosterQuoteRequest)
	if err != nil {
		return nil, err
	}
	if commercestore.XunhuMinTopUp > 0 && quote.AmountDue < float64(commercestore.XunhuMinTopUp) {
		return nil, fmt.Errorf("minimum XunhuPay payment is %d CNY", commercestore.XunhuMinTopUp)
	}

	callback := CallbackAddress()
	tradeNo := fmt.Sprintf("SUBBOOST%dNO%s%d", userID, platformruntime.GetRandomString(6), time.Now().Unix())
	order, err := createPendingBoosterOrder(userID, quote, commerceschema.PaymentMethodXunhu, commerceschema.PaymentProviderXunhu, tradeNo)
	if err != nil {
		return nil, err
	}
	payment, err := CreateXunhuOrder(
		tradeNo,
		"BOOST:"+quote.PlanTitle,
		order.Money,
		callback+"/api/subscription/xunhu/notify",
		callback+"/api/subscription/xunhu/return?trade_no="+tradeNo,
	)
	if err != nil {
		_ = ExpireSubscriptionOrder(tradeNo, commerceschema.PaymentProviderXunhu)
		return nil, errors.New(FormatXunhuCreatePaymentError(err))
	}
	return &SubscriptionXunhuCheckoutPayload{
		SubscriptionCheckoutPayload: SubscriptionCheckoutPayload{OrderID: tradeNo, AmountDue: order.Money, Action: "booster"},
		PayURL:                      payment.PayURL,
		QRCodeURL:                   payment.QRCodeURL,
	}, nil
}

func CreateSubscriptionBoosterStripePayment(userID int, req SubscriptionBoosterPurchaseRequest) (*SubscriptionStripeCheckoutPayload, error) {
	quote, err := QuoteSubscriptionBooster(userID, req.SubscriptionBoosterQuoteRequest)
	if err != nil {
		return nil, err
	}
	if !strings.HasPrefix(commercestore.StripeApiSecret, "sk_") && !strings.HasPrefix(commercestore.StripeApiSecret, "rk_") {
		return nil, errors.New("Stripe is not configured correctly")
	}
	user, err := loadCommerceUserByID(userID, false)
	if err != nil {
		return nil, err
	}
	referenceID := "sub_boost_ref_" + platformsecurity.Sha1([]byte(fmt.Sprintf("%d-%d-%s", userID, time.Now().UnixMilli(), randstr.String(4))))
	order, err := createPendingBoosterOrder(userID, quote, commerceschema.PaymentMethodStripe, commerceschema.PaymentProviderStripe, referenceID)
	if err != nil {
		return nil, err
	}
	link, err := genStripeSubscriptionLink(referenceID, user.StripeCustomer, user.Email, "BOOST:"+quote.PlanTitle, order.Money)
	if err != nil {
		_ = ExpireSubscriptionOrder(referenceID, commerceschema.PaymentProviderStripe)
		return nil, err
	}
	return &SubscriptionStripeCheckoutPayload{SubscriptionCheckoutPayload: SubscriptionCheckoutPayload{OrderID: referenceID, AmountDue: order.Money, Action: "booster"}, PayLink: link}, nil
}

var ErrSubscriptionBoosterUnavailable = errors.New("subscription booster unavailable")

type subscriptionBoosterConfig struct {
	Enabled    bool
	Rate       float64
	MinQuota   int64
	MaxQuota   int64
	QuotaStep  int64
	DailyLimit int
}

func currentSubscriptionBoosterConfig() subscriptionBoosterConfig {
	setting := commercestore.GetPaymentSetting()
	return subscriptionBoosterConfig{
		Enabled:    setting.SubscriptionBoosterEnabled,
		Rate:       setting.SubscriptionBoosterRate,
		MinQuota:   setting.SubscriptionBoosterMinQuota,
		MaxQuota:   setting.SubscriptionBoosterMaxQuota,
		QuotaStep:  setting.SubscriptionBoosterQuotaStep,
		DailyLimit: setting.SubscriptionBoosterDailyLimit,
	}
}

type SubscriptionBoosterQuoteRequest struct {
	SubscriptionID int   `json:"subscription_id"`
	Quota          int64 `json:"quota"`
}

type SubscriptionBoosterQuote struct {
	SubscriptionID int     `json:"subscription_id"`
	PlanID         int     `json:"plan_id"`
	PlanTitle      string  `json:"plan_title"`
	Quota          int64   `json:"quota"`
	Rate           float64 `json:"rate"`
	AmountDue      float64 `json:"amount_due"`
	ExpiresAt      int64   `json:"expires_at"`
	MinQuota       int64   `json:"min_quota"`
	MaxQuota       int64   `json:"max_quota"`
	QuotaStep      int64   `json:"quota_step"`
	QuotaPerUnit   int64   `json:"quota_per_unit"`
}

func QuoteSubscriptionBooster(userID int, req SubscriptionBoosterQuoteRequest) (*SubscriptionBoosterQuote, error) {
	config := currentSubscriptionBoosterConfig()
	if !config.Enabled || config.Rate <= 0 || config.MinQuota <= 0 || config.MaxQuota < config.MinQuota || config.QuotaStep <= 0 {
		return nil, ErrSubscriptionBoosterUnavailable
	}
	if userID <= 0 || req.SubscriptionID <= 0 || req.Quota < config.MinQuota || req.Quota > config.MaxQuota || req.Quota%config.QuotaStep != 0 {
		return nil, ErrSubscriptionBoosterUnavailable
	}
	if config.DailyLimit > 0 {
		startOfDay := time.Now().Truncate(24 * time.Hour).Unix()
		var count int64
		if err := platformdb.DB.Model(&commerceschema.SubscriptionOrder{}).Where("user_id = ? AND purchase_type = ? AND create_time >= ? AND status <> ?", userID, commerceschema.SubscriptionPurchaseTypeBooster, startOfDay, constant.TopUpStatusExpired).Count(&count).Error; err != nil || count >= int64(config.DailyLimit) {
			return nil, ErrSubscriptionBoosterUnavailable
		}
	}
	var sub commerceschema.UserSubscription
	if err := platformdb.DB.Where("id = ? AND user_id = ?", req.SubscriptionID, userID).First(&sub).Error; err != nil {
		return nil, ErrSubscriptionBoosterUnavailable
	}
	if sub.Status != "active" || sub.EndTime <= platformruntime.GetTimestamp() {
		return nil, ErrSubscriptionBoosterUnavailable
	}
	plan, err := GetSubscriptionPlanByID(sub.PlanId)
	if err != nil || plan == nil || plan.PlanType != commerceschema.SubscriptionPlanTypeMonthly {
		return nil, ErrSubscriptionBoosterUnavailable
	}
	units := float64(req.Quota) / float64(platformruntime.QuotaPerUnit)
	amount := math.Round(units*config.Rate*100) / 100
	return &SubscriptionBoosterQuote{SubscriptionID: sub.Id, PlanID: plan.Id, PlanTitle: plan.Title, Quota: req.Quota, Rate: config.Rate, AmountDue: amount, ExpiresAt: sub.EndTime, MinQuota: config.MinQuota, MaxQuota: config.MaxQuota, QuotaStep: config.QuotaStep, QuotaPerUnit: int64(platformruntime.QuotaPerUnit)}, nil
}

func fulfillSubscriptionBoosterTx(tx *gorm.DB, order *commerceschema.SubscriptionOrder) error {
	if tx == nil || order == nil || order.PurchaseType != commerceschema.SubscriptionPurchaseTypeBooster || order.TargetSubscriptionId <= 0 || order.BoosterQuota <= 0 {
		return ErrSubscriptionBoosterUnavailable
	}
	var sub commerceschema.UserSubscription
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ? AND user_id = ?", order.TargetSubscriptionId, order.UserId).First(&sub).Error; err != nil {
		return ErrSubscriptionBoosterUnavailable
	}
	now := platformruntime.GetTimestamp()
	if sub.Status != "active" || sub.EndTime <= now || sub.EndTime != order.BoosterExpiresAt {
		return ErrSubscriptionBoosterUnavailable
	}
	account, err := billingdomain.EnsureBillingAccountTx(tx, billingdomain.EnsureAccountParams{AccountType: "subscription", OwnerType: "user_subscription", OwnerID: int64(sub.Id), QuotaUnit: "quota"})
	if err != nil {
		return err
	}
	if _, err := billingdomain.CreditAccountTx(tx, billingdomain.CreditAccountParams{AccountID: account.AccountID, Amount: order.BoosterQuota, IdempotencyKey: "subscription-booster:" + order.TradeNo, ReasonCode: "subscription_booster", ReferenceType: "subscription_booster_order", ReferenceID: order.TradeNo, OperatorType: "commerce", OperatorID: fmt.Sprintf("%d", order.Id)}); err != nil {
		return err
	}
	return tx.Model(&commerceschema.UserSubscription{}).Where("id = ?", sub.Id).Updates(map[string]any{"amount_total": gorm.Expr("amount_total + ?", order.BoosterQuota), "period_amount": gorm.Expr("CASE WHEN period_amount > 0 THEN period_amount + ? ELSE period_amount END", order.BoosterQuota)}).Error
}

func BuildSubscriptionBoosterOrderStatusPayload(userID int, tradeNo string) (map[string]any, error) {
	order, err := GetSubscriptionOrderByTradeNoForUser(strings.TrimSpace(tradeNo), userID)
	if err != nil || order.PurchaseType != commerceschema.SubscriptionPurchaseTypeBooster {
		return nil, ErrSubscriptionBoosterUnavailable
	}
	return map[string]any{"id": order.Id, "trade_no": order.TradeNo, "status": order.Status, "fulfillment_status": order.FulfillmentStatus, "subscription_id": order.TargetSubscriptionId, "quota": order.BoosterQuota, "rate": order.BoosterRate, "amount_due": order.Money, "expires_at": order.BoosterExpiresAt}, nil
}
