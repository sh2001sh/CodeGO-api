package store

import (
	"context"
	"testing"

	"github.com/glebarez/sqlite"
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

	require.NoError(t, ApplyV2Migrations(context.Background(), false))
	require.NoError(t, ApplyV2Migrations(context.Background(), false))

	var migrationCount int64
	require.NoError(t, db.Model(&schemaMigration{}).Count(&migrationCount).Error)
	require.Equal(t, int64(2), migrationCount)
	for _, table := range []string{
		"billing_outbox_events",
		"workflow_task_workflows",
		"workflow_task_snapshots",
		"workflow_task_terminal_results",
	} {
		require.True(t, db.Migrator().HasTable(table), table)
	}
}
