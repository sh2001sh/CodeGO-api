package contracts

import temporal "go.temporal.io/sdk/temporal"

const (
	ErrTypeNotImplemented = "workflow.activity_not_implemented"
)

// NewNotImplementedError returns a non-retryable error for activities that are registered
// as part of the first-cut skeleton but do not yet have production behavior behind them.
func NewNotImplementedError(activityName string) error {
	return temporal.NewNonRetryableApplicationError(activityName+" is not implemented", ErrTypeNotImplemented, nil)
}
