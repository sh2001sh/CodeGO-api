package app

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	commercedomain "github.com/sh2001sh/new-api/internal/commerce/domain"
	commercestore "github.com/sh2001sh/new-api/internal/commerce/paymentsettings"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestApplyFirstPurchaseDiscountTxReservesEligibilityOnce(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file:first-purchase-discount?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&identityschema.User{}, &commerceschema.TopUp{}, &commerceschema.SubscriptionOrder{}))

	originalDB := platformdb.DB
	platformdb.DB = db
	t.Cleanup(func() { platformdb.DB = originalDB })

	setting := commercestore.GetPaymentSetting()
	originalEnabled := setting.FirstPurchaseDiscountEnabled
	originalMultiplier := setting.FirstPurchaseDiscountMultiplier
	originalStartAt := setting.FirstPurchaseDiscountStartAt
	originalEndAt := setting.FirstPurchaseDiscountEndAt
	t.Cleanup(func() {
		setting.FirstPurchaseDiscountEnabled = originalEnabled
		setting.FirstPurchaseDiscountMultiplier = originalMultiplier
		setting.FirstPurchaseDiscountStartAt = originalStartAt
		setting.FirstPurchaseDiscountEndAt = originalEndAt
	})

	now := time.Now().UTC()
	setting.FirstPurchaseDiscountEnabled = true
	setting.FirstPurchaseDiscountMultiplier = 0.8
	setting.FirstPurchaseDiscountStartAt = now.Add(-time.Hour).Unix()
	setting.FirstPurchaseDiscountEndAt = now.Add(time.Hour).Unix()

	user := identityschema.User{Username: "first_purchase_user", Password: "password123"}
	require.NoError(t, db.Create(&user).Error)
	require.NoError(t, db.Create(&commerceschema.TopUp{
		UserId:  user.Id,
		Money:   100,
		TradeNo: "wallet-topup-does-not-consume-plan-discount",
		Status:  "success",
	}).Error)

	preview := &commercedomain.SubscriptionPurchasePreview{BaseAmountDue: 100, AmountDue: 100}
	require.NoError(t, applyFirstPurchaseDiscountPreview(db, user.Id, preview, now))
	require.True(t, preview.FirstPurchaseDiscountApplied)
	require.InDelta(t, 80, preview.AmountDue, 0.001)

	first := commerceschema.SubscriptionOrder{
		UserId:       user.Id,
		PlanId:       1,
		Money:        100,
		TradeNo:      "first-discount-1",
		PurchaseType: commerceschema.SubscriptionPurchaseTypeNormal,
		Status:       "pending",
	}
	require.NoError(t, db.Transaction(func(tx *gorm.DB) error {
		if err := applyFirstPurchaseDiscountTx(tx, &first, 100, now); err != nil {
			return err
		}
		return tx.Create(&first).Error
	}))
	require.True(t, first.FirstPurchaseDiscountApplied)
	require.InDelta(t, 80, first.Money, 0.001)

	second := commerceschema.SubscriptionOrder{
		UserId:       user.Id,
		PlanId:       2,
		Money:        100,
		TradeNo:      "first-discount-2",
		PurchaseType: commerceschema.SubscriptionPurchaseTypeNormal,
		Status:       "pending",
	}
	require.NoError(t, db.Transaction(func(tx *gorm.DB) error {
		if err := applyFirstPurchaseDiscountTx(tx, &second, 100, now); err != nil {
			return err
		}
		return tx.Create(&second).Error
	}))
	require.False(t, second.FirstPurchaseDiscountApplied)
	require.InDelta(t, 100, second.Money, 0.001)

	reservedPreview := &commercedomain.SubscriptionPurchasePreview{BaseAmountDue: 100, AmountDue: 100}
	require.NoError(t, applyFirstPurchaseDiscountPreview(db, user.Id, reservedPreview, now))
	require.False(t, reservedPreview.FirstPurchaseDiscountApplied)
	require.InDelta(t, 100, reservedPreview.AmountDue, 0.001)
}
