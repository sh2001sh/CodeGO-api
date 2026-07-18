package app

import (
	"testing"
	"time"

	"github.com/glebarez/sqlite"
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
	require.NoError(t, db.AutoMigrate(&identityschema.User{}, &commerceschema.TopUp{}))

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

	first := commerceschema.TopUp{UserId: user.Id, Money: 100, TradeNo: "first-discount-1", Status: "pending"}
	require.NoError(t, db.Transaction(func(tx *gorm.DB) error {
		if err := applyFirstPurchaseDiscountTx(tx, &first, now); err != nil {
			return err
		}
		return tx.Create(&first).Error
	}))
	require.True(t, first.FirstPurchaseDiscountApplied)
	require.InDelta(t, 80, first.Money, 0.001)

	second := commerceschema.TopUp{UserId: user.Id, Money: 100, TradeNo: "first-discount-2", Status: "pending"}
	require.NoError(t, db.Transaction(func(tx *gorm.DB) error {
		if err := applyFirstPurchaseDiscountTx(tx, &second, now); err != nil {
			return err
		}
		return tx.Create(&second).Error
	}))
	require.False(t, second.FirstPurchaseDiscountApplied)
	require.InDelta(t, 100, second.Money, 0.001)
}
