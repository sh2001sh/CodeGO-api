package main

import (
	"testing"

	"github.com/glebarez/sqlite"
	billingschema "github.com/sh2001sh/new-api/internal/billing/schema"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestApplyBackfillCreatesLedgerAccountsIdempotently(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	originalDB := platformdb.DB
	originalSQLite := platformdb.UsingSQLite
	originalPostgreSQL := platformdb.UsingPostgreSQL
	t.Cleanup(func() {
		platformdb.DB = originalDB
		platformdb.UsingSQLite = originalSQLite
		platformdb.UsingPostgreSQL = originalPostgreSQL
	})
	platformdb.DB = db
	platformdb.UsingSQLite = true
	platformdb.UsingPostgreSQL = false
	require.NoError(t, db.AutoMigrate(&identityschema.User{}, &identityschema.Token{}, &commerceschema.UserSubscription{}, &commerceschema.BlindBoxCredit{}, &commerceschema.BlindBoxOpenRecord{}, &billingschema.BillingAccount{}, &billingschema.BillingBalanceSnapshot{}, &billingschema.BillingLedgerEntry{}, &billingschema.BillingOutboxEvent{}))
	require.NoError(t, db.Create(&identityschema.User{Id: 101, Username: "backfill-user", AffCode: "backfill-101", Quota: 1_000, ClaudeQuota: 250}).Error)
	require.NoError(t, db.Create(&identityschema.Token{Id: 301, UserId: 101, Key: "backfill-token", RemainQuota: 125}).Error)
	require.NoError(t, db.Create(&commerceschema.UserSubscription{Id: 201, UserId: 101, AmountTotal: 900, AmountUsed: 300, Status: "active"}).Error)
	require.NoError(t, db.Create(&identityschema.User{Id: 102, Username: "negative-balance-user", AffCode: "backfill-102", Quota: -100, ClaudeQuota: -25}).Error)
	require.NoError(t, db.Create(&identityschema.Token{Id: 302, UserId: 102, Key: "negative-balance-token", RemainQuota: -50}).Error)

	require.NoError(t, applyBackfill(0))
	require.NoError(t, applyBackfill(0))

	var accounts []billingschema.BillingAccount
	require.NoError(t, db.Order("account_type asc").Find(&accounts).Error)
	require.Len(t, accounts, 7)
	var entries []billingschema.BillingLedgerEntry
	require.NoError(t, db.Find(&entries).Error)
	require.Len(t, entries, 4)
}
