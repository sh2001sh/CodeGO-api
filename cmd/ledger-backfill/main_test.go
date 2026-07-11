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
	require.NoError(t, db.Create(&identityschema.User{Id: 101, Username: "backfill-user", Quota: 1_000, ClaudeQuota: 250}).Error)
	require.NoError(t, db.Create(&identityschema.Token{Id: 301, UserId: 101, Key: "backfill-token", RemainQuota: 125}).Error)
	require.NoError(t, db.Create(&commerceschema.UserSubscription{Id: 201, UserId: 101, AmountTotal: 900, AmountUsed: 300, Status: "active"}).Error)

	require.NoError(t, applyBackfill(0))
	require.NoError(t, applyBackfill(0))

	var accounts []billingschema.BillingAccount
	require.NoError(t, db.Order("account_type asc").Find(&accounts).Error)
	require.Len(t, accounts, 4)
	var entries []billingschema.BillingLedgerEntry
	require.NoError(t, db.Find(&entries).Error)
	require.Len(t, entries, 4)
}
