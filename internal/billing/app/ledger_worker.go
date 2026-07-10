package app

import (
	"context"
	"fmt"
	"time"

	billingschema "github.com/sh2001sh/new-api/internal/billing/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	platformobservability "github.com/sh2001sh/new-api/internal/platform/observability"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	ledgerWorkerBatchSize = 100
	ledgerWorkerInterval  = 15 * time.Second
)

// StartLedgerWorker begins asynchronous outbox processing for the ledger runtime.
func StartLedgerWorker(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(ledgerWorkerInterval)
		defer ticker.Stop()
		for {
			if _, err := RunLedgerWorkerBatch(ctx, ledgerWorkerBatchSize); err != nil {
				platformobservability.SysError("ledger worker batch failed: " + err.Error())
			}
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
			}
		}
	}()
}

// RunLedgerWorkerBatch publishes pending ledger events and rebuilds affected snapshots.
func RunLedgerWorkerBatch(ctx context.Context, limit int) (int, error) {
	if platformdb.DB == nil {
		return 0, fmt.Errorf("primary database is not initialized")
	}
	if limit <= 0 {
		limit = ledgerWorkerBatchSize
	}

	var events []billingschema.BillingOutboxEvent
	if err := platformdb.DB.WithContext(ctx).
		Where("status = ?", billingschema.BillingOutboxStatusPending).
		Order("created_at asc, event_id asc").
		Limit(limit).
		Find(&events).Error; err != nil {
		return 0, err
	}

	processed := 0
	for _, event := range events {
		if err := processLedgerOutboxEvent(ctx, event.EventID); err != nil {
			if markErr := markLedgerOutboxFailure(ctx, event.EventID, err); markErr != nil {
				return processed, fmt.Errorf("process ledger event: %w; mark failure: %v", err, markErr)
			}
			continue
		}
		processed++
	}
	return processed, nil
}

func processLedgerOutboxEvent(ctx context.Context, eventID string) error {
	return platformdb.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var event billingschema.BillingOutboxEvent
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("event_id = ?", eventID).
			First(&event).Error; err != nil {
			return err
		}
		if event.Status == billingschema.BillingOutboxStatusPublished {
			return nil
		}
		if err := rebuildBalanceSnapshotTx(tx, event.AccountID); err != nil {
			return err
		}
		now := time.Now().UTC()
		return tx.Model(&event).Updates(map[string]any{
			"status":       billingschema.BillingOutboxStatusPublished,
			"published_at": &now,
			"last_error":   "",
		}).Error
	})
}

func markLedgerOutboxFailure(ctx context.Context, eventID string, cause error) error {
	return platformdb.DB.WithContext(ctx).Model(&billingschema.BillingOutboxEvent{}).
		Where("event_id = ?", eventID).
		Updates(map[string]any{
			"attempts":   gorm.Expr("attempts + ?", 1),
			"last_error": cause.Error(),
		}).Error
}

func rebuildBalanceSnapshotTx(tx *gorm.DB, accountID string) error {
	var account billingschema.BillingAccount
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("account_id = ?", accountID).
		First(&account).Error; err != nil {
		return err
	}

	var entries []billingschema.BillingLedgerEntry
	if err := tx.Where("account_id = ?", accountID).Order("created_at asc, entry_id asc").Find(&entries).Error; err != nil {
		return err
	}
	var settlements []billingschema.BillingSettlement
	if err := tx.Joins("JOIN "+billingschema.BillingReservation{}.TableName()+" ON "+billingschema.BillingReservation{}.TableName()+".reservation_id = "+billingschema.BillingSettlement{}.TableName()+".reservation_id").
		Where(billingschema.BillingReservation{}.TableName()+".account_id = ? AND "+billingschema.BillingSettlement{}.TableName()+".status = ?", accountID, billingschema.BillingSettlementStatusCompleted).
		Find(&settlements).Error; err != nil {
		return err
	}
	var openReserved int64
	if err := tx.Model(&billingschema.BillingReservation{}).
		Where("account_id = ? AND status = ?", accountID, billingschema.BillingReservationStatusOpen).
		Select("COALESCE(SUM(reserved_amount), 0)").
		Scan(&openReserved).Error; err != nil {
		return err
	}

	snapshot := billingschema.BillingBalanceSnapshot{AccountID: accountID, ReservedBalance: openReserved}
	for _, entry := range entries {
		switch entry.EntryType {
		case "grant_credit":
			snapshot.AvailableBalance += entry.Amount
			snapshot.GrantedTotal += entry.Amount
		case "reserve_hold", "settle_debit":
			snapshot.AvailableBalance -= entry.Amount
		case "reserve_release", "settle_credit":
			snapshot.AvailableBalance += entry.Amount
		}
	}
	for _, settlement := range settlements {
		snapshot.ConsumedTotal += settlement.ActualAmount
		if settlement.DeltaAmount < 0 {
			snapshot.RefundedTotal += -settlement.DeltaAmount
		}
	}

	return tx.Save(&snapshot).Error
}
