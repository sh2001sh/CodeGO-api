package activities

import (
	"context"

	"github.com/sh2001sh/new-api/internal/workflow/temporal/contracts"
)

type BillingActivities struct{}

func (a *BillingActivities) CreateReservation(ctx context.Context, input contracts.RequestSettlementWorkflowInput) (*contracts.ReservationResult, error) {
	return nil, contracts.NewNotImplementedError(contracts.ActivityCreateReservation)
}

func (a *BillingActivities) CreateSettlement(ctx context.Context, input contracts.RequestSettlementWorkflowInput) (*contracts.SettlementResult, error) {
	return nil, contracts.NewNotImplementedError(contracts.ActivityCreateSettlement)
}

func (a *BillingActivities) RefundReference(ctx context.Context, input contracts.AsyncTaskWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityRefundReference)
}

func (a *BillingActivities) CreateResetLedgerEntries(ctx context.Context, input contracts.SubscriptionResetWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityCreateResetLedgerEntries)
}

func (a *BillingActivities) RefreshAccountSnapshot(ctx context.Context, accountID string) error {
	return contracts.NewNotImplementedError(contracts.ActivityRefreshAccountSnapshot)
}
