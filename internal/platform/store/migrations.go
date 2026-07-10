package store

import (
	"context"
	"fmt"
	"time"

	billingschema "github.com/sh2001sh/new-api/internal/billing/schema"
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
