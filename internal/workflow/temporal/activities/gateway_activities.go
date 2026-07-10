package activities

import (
	"context"

	"github.com/sh2001sh/new-api/internal/workflow/temporal/contracts"
)

type GatewayActivities struct{}

func (a *GatewayActivities) CreateRequestExecution(ctx context.Context, input contracts.RequestSettlementWorkflowInput) (*contracts.RequestExecutionResult, error) {
	return nil, contracts.NewNotImplementedError(contracts.ActivityCreateRequestExecution)
}

func (a *GatewayActivities) ExecuteProviderRequest(ctx context.Context, input contracts.RequestSettlementWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityExecuteProviderRequest)
}

func (a *GatewayActivities) CollectUsageEvidence(ctx context.Context, input contracts.RequestSettlementWorkflowInput) (*contracts.UsageEvidenceResult, error) {
	return nil, contracts.NewNotImplementedError(contracts.ActivityCollectUsageEvidence)
}

func (a *GatewayActivities) PublishRequestSettledEvent(ctx context.Context, input contracts.RequestSettlementWorkflowInput) error {
	return contracts.NewNotImplementedError(contracts.ActivityPublishRequestSettled)
}
