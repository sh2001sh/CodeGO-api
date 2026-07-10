package activities

import (
	"context"

	"github.com/sh2001sh/new-api/internal/workflow/temporal/contracts"
)

type OrderActivities struct{}

func (a *OrderActivities) CreateOrderRecord(ctx context.Context, input contracts.OrderFulfillmentWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityCreateOrderRecord)
}

func (a *OrderActivities) ValidatePaymentCallback(ctx context.Context, input contracts.OrderFulfillmentWorkflowInput) (*contracts.OrderCallbackValidationResult, error) {
	return nil, contracts.NewNotImplementedError(contracts.ActivityValidatePaymentCallback)
}

func (a *OrderActivities) MarkOrderPaid(ctx context.Context, input contracts.OrderFulfillmentWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityMarkOrderPaid)
}

func (a *OrderActivities) GrantOrderBenefits(ctx context.Context, input contracts.OrderFulfillmentWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityGrantOrderBenefits)
}

func (a *OrderActivities) PublishOrderPaidEvent(ctx context.Context, input contracts.OrderFulfillmentWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityPublishOrderPaidEvent)
}

func (a *OrderActivities) FindResettableSubscriptions(ctx context.Context, input contracts.SubscriptionResetWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityFindResettableSubs)
}

func (a *OrderActivities) ResetUsageProjection(ctx context.Context, input contracts.SubscriptionResetWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityResetUsageProjection)
}

func (a *OrderActivities) PublishResetAuditEvents(ctx context.Context, input contracts.SubscriptionResetWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityPublishResetAuditEvents)
}
