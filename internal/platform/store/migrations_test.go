package store

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/sh2001sh/new-api/constant"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestApplyV2MigrationsIsIdempotent(t *testing.T) {
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
	for _, tableName := range []string{
		"user_companion_pets",
		"daily_mission_rewards",
		"achievement_unlocks",
	} {
		require.NoError(t, db.Exec("CREATE TABLE "+tableName+" (id integer primary key)").Error)
	}

	require.NoError(t, ApplyV2Migrations(context.Background(), false))
	require.NoError(t, ApplyV2Migrations(context.Background(), false))

	var migrationCount int64
	require.NoError(t, db.Model(&schemaMigration{}).Count(&migrationCount).Error)
	require.Equal(t, int64(len(V2MigrationIDs())), migrationCount)
	for _, table := range []string{
		"billing_outbox_events",
		"workflow_task_workflows",
		"workflow_task_snapshots",
		"workflow_task_terminal_results",
		"subscription_plans",
		"subscription_orders",
		"user_subscriptions",
		"subscription_pre_consume_records",
		"gateway_request_executions",
		"gateway_route_plans",
		"gateway_execution_attempts",
		"gateway_usage_evidence",
	} {
		require.True(t, db.Migrator().HasTable(table), table)
	}
	for _, tableName := range []string{
		"user_companion_pets",
		"daily_mission_rewards",
		"achievement_unlocks",
	} {
		require.False(t, db.Migrator().HasTable(tableName), tableName)
	}
}

func TestSubscriptionFulfillmentMigrationMarksHistoricalSuccessCompleted(t *testing.T) {
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

	require.NoError(t, db.AutoMigrate(&commerceschema.SubscriptionOrder{}))
	require.NoError(t, db.Create(&commerceschema.SubscriptionOrder{Id: 1, UserId: 1, PlanId: 1, Status: constant.TopUpStatusSuccess, TradeNo: "historic-success"}).Error)
	require.NoError(t, db.Create(&commerceschema.SubscriptionOrder{Id: 2, UserId: 2, PlanId: 2, Status: constant.TopUpStatusPending, TradeNo: "historic-pending"}).Error)
	require.NoError(t, db.Model(&commerceschema.SubscriptionOrder{}).Where("id IN ?", []int{1, 2}).Update("fulfillment_status", "").Error)

	// Mark the preceding migration steps as already applied to simulate a
	// production database upgraded from the prior v2 revision.
	require.NoError(t, db.AutoMigrate(&schemaMigration{}))
	for _, migrationID := range []string{"20260710_billing_core", "20260710_workflow_core", "20260711_subscription_core", "20260711_gateway_execution_core"} {
		require.NoError(t, db.Create(&schemaMigration{ID: migrationID}).Error)
	}

	require.NoError(t, ApplyV2Migrations(context.Background(), false))
	var completed commerceschema.SubscriptionOrder
	require.NoError(t, db.Where("id = ?", 1).First(&completed).Error)
	require.Equal(t, commerceschema.SubscriptionOrderFulfillmentCompleted, completed.FulfillmentStatus)
	var pending commerceschema.SubscriptionOrder
	require.NoError(t, db.Where("id = ?", 2).First(&pending).Error)
	require.Empty(t, pending.FulfillmentStatus)
}

func TestSubscriptionBoosterMigrationRestoresMissingOrderColumns(t *testing.T) {
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

	require.NoError(t, db.Exec(`CREATE TABLE subscription_orders (
		id integer primary key,
		user_id integer,
		plan_id integer,
		money real,
		trade_no text,
		payment_method text,
		payment_provider text,
		purchase_type text DEFAULT 'normal',
		group_buy_id bigint DEFAULT 0,
		status text,
		fulfillment_status text DEFAULT 'completed',
		create_time bigint,
		complete_time bigint,
		provider_payload text
	)`).Error)
	require.NoError(t, db.AutoMigrate(&schemaMigration{}))
	for _, migrationID := range V2MigrationIDs()[:len(V2MigrationIDs())-1] {
		require.NoError(t, db.Create(&schemaMigration{ID: migrationID}).Error)
	}

	require.NoError(t, ApplyV2Migrations(context.Background(), false))
	for _, column := range []string{"target_subscription_id", "booster_quota", "booster_rate", "booster_expires_at"} {
		require.True(t, db.Migrator().HasColumn(&commerceschema.SubscriptionOrder{}, column), column)
	}
}

func TestBootstrapPrimarySchemaThenApplyV2Migrations(t *testing.T) {
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

	require.NoError(t, BootstrapPrimarySchema())
	require.NoError(t, ApplyV2Migrations(context.Background(), false))
	require.NoError(t, ApplyV2Migrations(context.Background(), false))
	for _, table := range []string{
		"subscription_plans",
		"subscription_orders",
		"user_subscriptions",
		"subscription_pre_consume_records",
		"gateway_request_executions",
	} {
		require.True(t, db.Migrator().HasTable(table), table)
	}
}
