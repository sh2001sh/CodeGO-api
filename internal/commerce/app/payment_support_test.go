package app

import (
	"testing"

	commercestore "github.com/sh2001sh/new-api/internal/commerce/paymentsettings"
	"github.com/stretchr/testify/require"
)

func confirmPaymentComplianceForTest(t *testing.T) {
	t.Helper()
	paymentSetting := commercestore.GetPaymentSetting()
	originalConfirmed := paymentSetting.ComplianceConfirmed
	originalTermsVersion := paymentSetting.ComplianceTermsVersion
	t.Cleanup(func() {
		paymentSetting.ComplianceConfirmed = originalConfirmed
		paymentSetting.ComplianceTermsVersion = originalTermsVersion
	})
	paymentSetting.ComplianceConfirmed = true
	paymentSetting.ComplianceTermsVersion = commercestore.CurrentComplianceTermsVersion
}

func TestStripeTopUpEnabledRequiresTopUpAndWebhookConfig(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	originalAPISecret := commercestore.StripeApiSecret
	originalWebhookSecret := commercestore.StripeWebhookSecret
	originalPriceID := commercestore.StripePriceId
	t.Cleanup(func() {
		commercestore.StripeApiSecret = originalAPISecret
		commercestore.StripeWebhookSecret = originalWebhookSecret
		commercestore.StripePriceId = originalPriceID
	})

	commercestore.StripeWebhookSecret = ""
	commercestore.StripeApiSecret = "sk_test_123"
	commercestore.StripePriceId = "price_123"
	require.False(t, IsStripeTopUpEnabled())

	commercestore.StripeWebhookSecret = "whsec_test"
	require.True(t, IsStripeTopUpEnabled())

	commercestore.StripePriceId = ""
	require.False(t, IsStripeTopUpEnabled())
}

func TestCreemTopUpEnabledRequiresTopUpConfig(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	originalAPIKey := commercestore.CreemApiKey
	originalProducts := commercestore.CreemProducts
	t.Cleanup(func() {
		commercestore.CreemApiKey = originalAPIKey
		commercestore.CreemProducts = originalProducts
	})

	commercestore.CreemApiKey = "creem_api_key"
	commercestore.CreemProducts = `[{"productId":"prod_123"}]`
	require.True(t, IsCreemTopUpEnabled())

	commercestore.CreemProducts = "[]"
	require.False(t, IsCreemTopUpEnabled())
}

func TestWaffoTopUpEnabledRequiresWebhookConfig(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	originalEnabled := commercestore.WaffoEnabled
	originalSandbox := commercestore.WaffoSandbox
	originalAPIKey := commercestore.WaffoApiKey
	originalPrivateKey := commercestore.WaffoPrivateKey
	originalPublicCert := commercestore.WaffoPublicCert
	originalSandboxAPIKey := commercestore.WaffoSandboxApiKey
	originalSandboxPrivateKey := commercestore.WaffoSandboxPrivateKey
	originalSandboxPublicCert := commercestore.WaffoSandboxPublicCert
	t.Cleanup(func() {
		commercestore.WaffoEnabled = originalEnabled
		commercestore.WaffoSandbox = originalSandbox
		commercestore.WaffoApiKey = originalAPIKey
		commercestore.WaffoPrivateKey = originalPrivateKey
		commercestore.WaffoPublicCert = originalPublicCert
		commercestore.WaffoSandboxApiKey = originalSandboxAPIKey
		commercestore.WaffoSandboxPrivateKey = originalSandboxPrivateKey
		commercestore.WaffoSandboxPublicCert = originalSandboxPublicCert
	})

	commercestore.WaffoEnabled = true
	commercestore.WaffoSandbox = false
	commercestore.WaffoApiKey = ""
	commercestore.WaffoPrivateKey = "private"
	commercestore.WaffoPublicCert = "public"
	require.False(t, IsWaffoTopUpEnabled())

	commercestore.WaffoApiKey = "api"
	require.True(t, IsWaffoTopUpEnabled())

	commercestore.WaffoEnabled = false
	require.False(t, IsWaffoTopUpEnabled())

	commercestore.WaffoEnabled = true
	commercestore.WaffoSandbox = true
	commercestore.WaffoSandboxApiKey = ""
	commercestore.WaffoSandboxPrivateKey = "sandbox_private"
	commercestore.WaffoSandboxPublicCert = "sandbox_public"
	require.False(t, IsWaffoTopUpEnabled())

	commercestore.WaffoSandboxApiKey = "sandbox_api"
	require.True(t, IsWaffoTopUpEnabled())
}

func TestWaffoPancakeTopUpEnabledRequiresWebhookConfig(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	originalEnabled := commercestore.WaffoPancakeEnabled
	originalSandbox := commercestore.WaffoPancakeSandbox
	originalMerchantID := commercestore.WaffoPancakeMerchantID
	originalPrivateKey := commercestore.WaffoPancakePrivateKey
	originalWebhookPublicKey := commercestore.WaffoPancakeWebhookPublicKey
	originalWebhookTestKey := commercestore.WaffoPancakeWebhookTestKey
	originalStoreID := commercestore.WaffoPancakeStoreID
	originalProductID := commercestore.WaffoPancakeProductID
	t.Cleanup(func() {
		commercestore.WaffoPancakeEnabled = originalEnabled
		commercestore.WaffoPancakeSandbox = originalSandbox
		commercestore.WaffoPancakeMerchantID = originalMerchantID
		commercestore.WaffoPancakePrivateKey = originalPrivateKey
		commercestore.WaffoPancakeWebhookPublicKey = originalWebhookPublicKey
		commercestore.WaffoPancakeWebhookTestKey = originalWebhookTestKey
		commercestore.WaffoPancakeStoreID = originalStoreID
		commercestore.WaffoPancakeProductID = originalProductID
	})

	commercestore.WaffoPancakeEnabled = true
	commercestore.WaffoPancakeSandbox = false
	commercestore.WaffoPancakeMerchantID = "merchant"
	commercestore.WaffoPancakePrivateKey = "private"
	commercestore.WaffoPancakeStoreID = "store"
	commercestore.WaffoPancakeProductID = "product"
	commercestore.WaffoPancakeWebhookPublicKey = ""
	require.False(t, IsWaffoPancakeTopUpEnabled())

	commercestore.WaffoPancakeWebhookPublicKey = "public"
	require.True(t, IsWaffoPancakeTopUpEnabled())

	commercestore.WaffoPancakeEnabled = false
	require.False(t, IsWaffoPancakeTopUpEnabled())

	commercestore.WaffoPancakeEnabled = true
	commercestore.WaffoPancakeSandbox = true
	commercestore.WaffoPancakeWebhookTestKey = ""
	require.False(t, IsWaffoPancakeTopUpEnabled())

	commercestore.WaffoPancakeWebhookTestKey = "test_public"
	require.True(t, IsWaffoPancakeTopUpEnabled())
}

func TestEpayWebhookEnabledRequiresTopUpAndWebhookConfig(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	originalPayAddress := commercestore.PayAddress
	originalEpayID := commercestore.EpayId
	originalEpayKey := commercestore.EpayKey
	originalPayMethods := commercestore.PayMethods
	t.Cleanup(func() {
		commercestore.PayAddress = originalPayAddress
		commercestore.EpayId = originalEpayID
		commercestore.EpayKey = originalEpayKey
		commercestore.PayMethods = originalPayMethods
	})

	commercestore.PayAddress = "https://pay.example.com"
	commercestore.EpayId = "epay_id"
	commercestore.EpayKey = ""
	commercestore.PayMethods = []map[string]string{{"type": "alipay"}}
	require.False(t, IsEpayWebhookEnabled())

	commercestore.EpayKey = "epay_key"
	require.True(t, IsEpayWebhookEnabled())

	commercestore.PayMethods = nil
	require.False(t, IsEpayWebhookEnabled())
}
