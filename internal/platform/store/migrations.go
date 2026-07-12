package store

import (
	"context"
	"fmt"
	"time"

	billingschema "github.com/sh2001sh/new-api/internal/billing/schema"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	gatewayschema "github.com/sh2001sh/new-api/internal/gateway/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	workflowschema "github.com/sh2001sh/new-api/internal/workflow/schema"
	"gorm.io/gorm"
)

type schemaMigration struct {
	ID        string `gorm:"primaryKey;size:128"`
	AppliedAt time.Time
}

func (schemaMigration) TableName() string {
	if platformdb.UsingPostgreSQL {
		return "platform.schema_migrations"
	}
	return "platform_schema_migrations"
}

type schemaMigrationStep struct {
	ID  string
	Run func(*gorm.DB) error
}

// V2MigrationIDs returns the ordered migration contract required by CodeGo v2.
// Deployment verification uses this list without changing database state.
func V2MigrationIDs() []string {
	return []string{
		"20260710_billing_core",
		"20260710_workflow_core",
		"20260711_subscription_core",
		"20260711_subscription_order_fulfillment",
		"20260711_gateway_execution_core",
		"20260711_gateway_execution_trace",
		"20260712_remove_pet_gamification",
		"20260712_subscription_booster_columns",
	}
}

// ApplyV2Migrations applies only v2-owned tables and records every completed step.
// It deliberately excludes legacy table AutoMigrate calls that are unsafe on old SQLite DDL.
func ApplyV2Migrations(ctx context.Context, dryRun bool) error {
	if platformdb.DB == nil {
		return fmt.Errorf("primary database is not initialized")
	}
	if err := ensureCodeGoSchemas(); err != nil {
		return err
	}
	db := platformdb.DB.WithContext(ctx)
	if err := db.AutoMigrate(&schemaMigration{}); err != nil {
		return err
	}

	steps := []schemaMigrationStep{
		{ID: "20260710_billing_core", Run: func(tx *gorm.DB) error {
			return tx.AutoMigrate(&billingschema.BillingAccount{}, &billingschema.BillingBalanceSnapshot{}, &billingschema.BillingLedgerEntry{}, &billingschema.BillingReservation{}, &billingschema.BillingSettlement{}, &billingschema.BillingOutboxEvent{})
		}},
		{ID: "20260710_workflow_core", Run: func(tx *gorm.DB) error {
			return tx.AutoMigrate(&workflowschema.WorkflowTaskWorkflow{}, &workflowschema.WorkflowTaskSnapshot{}, &workflowschema.WorkflowTaskTerminalResult{})
		}},
		{ID: "20260711_subscription_core", Run: func(tx *gorm.DB) error {
			return migrateSubscriptionCore(tx)
		}},
		{ID: "20260711_subscription_order_fulfillment", Run: func(tx *gorm.DB) error {
			if err := migrateSubscriptionOrder(tx); err != nil {
				return err
			}
			return tx.Model(&commerceschema.SubscriptionOrder{}).
				Where("status = ? AND (fulfillment_status = '' OR fulfillment_status IS NULL)", "success").
				Update("fulfillment_status", commerceschema.SubscriptionOrderFulfillmentCompleted).Error
		}},
		{ID: "20260711_gateway_execution_core", Run: func(tx *gorm.DB) error {
			return tx.AutoMigrate(
				&gatewayschema.RequestExecution{},
				&gatewayschema.GatewayRoutePlan{},
				&gatewayschema.ExecutionAttempt{},
				&gatewayschema.UsageEvidence{},
			)
		}},
		{ID: "20260711_gateway_execution_trace", Run: func(tx *gorm.DB) error {
			return tx.AutoMigrate(
				&gatewayschema.RequestExecution{},
				&gatewayschema.GatewayRoutePlan{},
				&gatewayschema.ExecutionAttempt{},
				&gatewayschema.UsageEvidence{},
			)
		}},
		{ID: "20260712_remove_pet_gamification", Run: func(tx *gorm.DB) error {
			for _, tableName := range []string{
				"user_companion_pets",
				"daily_mission_rewards",
				"achievement_unlocks",
			} {
				if tx.Migrator().HasTable(tableName) {
					if err := tx.Migrator().DropTable(tableName); err != nil {
						return err
					}
				}
			}
			return nil
		}},
		{ID: "20260712_subscription_booster_columns", Run: migrateSubscriptionOrder},
	}
	for _, step := range steps {
		var applied schemaMigration
		err := db.Where("id = ?", step.ID).First(&applied).Error
		if err == nil {
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return err
		}
		if dryRun {
			continue
		}
		if err := db.Transaction(func(tx *gorm.DB) error {
			if err := step.Run(tx); err != nil {
				return err
			}
			return tx.Create(&schemaMigration{ID: step.ID}).Error
		}); err != nil {
			return fmt.Errorf("apply migration %s: %w", step.ID, err)
		}
	}
	return nil
}

func migrateSubscriptionCore(tx *gorm.DB) error {
	if !platformdb.UsingSQLite {
		return tx.AutoMigrate(
			&commerceschema.SubscriptionPlan{},
			&commerceschema.SubscriptionOrder{},
			&commerceschema.UserSubscription{},
			&commerceschema.SubscriptionPreConsumeRecord{},
		)
	}
	if err := migrateSubscriptionPlan(tx); err != nil {
		return err
	}
	if err := migrateSubscriptionOrder(tx); err != nil {
		return err
	}
	if err := migrateUserSubscription(tx); err != nil {
		return err
	}
	return tx.AutoMigrate(&commerceschema.SubscriptionPreConsumeRecord{})
}

func migrateSubscriptionPlan(tx *gorm.DB) error {
	if !tx.Migrator().HasTable(&commerceschema.SubscriptionPlan{}) {
		return tx.AutoMigrate(&commerceschema.SubscriptionPlan{})
	}
	return ensureSubscriptionPlanTableSQLiteTx(tx)
}

func migrateSubscriptionOrder(tx *gorm.DB) error {
	if !platformdb.UsingSQLite || !tx.Migrator().HasTable(&commerceschema.SubscriptionOrder{}) {
		return tx.AutoMigrate(&commerceschema.SubscriptionOrder{})
	}
	return ensureSubscriptionOrderTableSQLiteTx(tx)
}

func migrateUserSubscription(tx *gorm.DB) error {
	if !tx.Migrator().HasTable(&commerceschema.UserSubscription{}) {
		return tx.AutoMigrate(&commerceschema.UserSubscription{})
	}
	return ensureUserSubscriptionTableSQLiteTx(tx)
}
