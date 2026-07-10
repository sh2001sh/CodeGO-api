package app

import (
	"errors"
	"time"
)

type SubscriptionFundingPreConsumeResult struct {
	UserSubscriptionID int
	PreConsumed        int64
	AmountTotal        int64
	AmountUsedAfter    int64
}

type SubscriptionFundingPlanInfo struct {
	PlanID    int
	PlanTitle string
}

type SubscriptionFundingHooks struct {
	PreConsume              func(requestID string, userID int, modelName string, amount int64) (*SubscriptionFundingPreConsumeResult, error)
	GetPlanInfo             func(userSubscriptionID int) (*SubscriptionFundingPlanInfo, error)
	PostConsumeDelta        func(subscriptionID int, modelName string, delta int64) error
	RefundPreConsume        func(requestID string) error
	GetBlindBoxDiscountRate func(userID int) float64
}

var subscriptionFundingHooks SubscriptionFundingHooks

func RegisterSubscriptionFundingHooks(hooks SubscriptionFundingHooks) {
	subscriptionFundingHooks = hooks
}

func postSubscriptionUsageDelta(subscriptionID int, modelName string, delta int64) error {
	if delta == 0 {
		return nil
	}
	if subscriptionFundingHooks.PostConsumeDelta == nil {
		return errors.New("subscription funding settle hook is not registered")
	}
	return subscriptionFundingHooks.PostConsumeDelta(subscriptionID, modelName, delta)
}

func getBlindBoxConsumptionDiscountRate(userID int) float64 {
	if userID <= 0 || subscriptionFundingHooks.GetBlindBoxDiscountRate == nil {
		return 0
	}
	return subscriptionFundingHooks.GetBlindBoxDiscountRate(userID)
}

type FundingSource interface {
	Source() string
	PreConsume(amount int) error
	Settle(delta int) error
	Refund() error
}

type WalletFunding struct {
	userID   int
	consumed int
}

func (w *WalletFunding) Source() string { return BillingSourceWallet }

func (w *WalletFunding) PreConsume(amount int) error {
	if amount <= 0 {
		return nil
	}
	if err := AdjustWalletQuota(w.userID, amount); err != nil {
		return err
	}
	w.consumed = amount
	return nil
}

func (w *WalletFunding) Settle(delta int) error {
	return AdjustWalletQuota(w.userID, delta)
}

func (w *WalletFunding) Refund() error {
	if w.consumed <= 0 {
		return nil
	}
	return AdjustWalletQuota(w.userID, -w.consumed)
}

type ClaudeWalletFunding struct {
	userID   int
	consumed int
}

func (w *ClaudeWalletFunding) Source() string { return BillingSourceClaudeWallet }

func (w *ClaudeWalletFunding) PreConsume(amount int) error {
	if amount <= 0 {
		return nil
	}
	if err := AdjustClaudeWalletQuota(w.userID, amount); err != nil {
		return err
	}
	w.consumed = amount
	return nil
}

func (w *ClaudeWalletFunding) Settle(delta int) error {
	return AdjustClaudeWalletQuota(w.userID, delta)
}

func (w *ClaudeWalletFunding) Refund() error {
	if w.consumed <= 0 {
		return nil
	}
	return AdjustClaudeWalletQuota(w.userID, -w.consumed)
}

type SubscriptionFunding struct {
	requestID       string
	userID          int
	modelName       string
	amount          int64
	subscriptionID  int
	preConsumed     int64
	AmountTotal     int64
	AmountUsedAfter int64
	PlanId          int
	PlanTitle       string
}

func (s *SubscriptionFunding) Source() string { return BillingSourceSubscription }

func (s *SubscriptionFunding) PreConsume(_ int) error {
	if subscriptionFundingHooks.PreConsume == nil {
		return errors.New("subscription funding pre-consume hook is not registered")
	}
	res, err := subscriptionFundingHooks.PreConsume(s.requestID, s.userID, s.modelName, s.amount)
	if err != nil {
		return err
	}
	s.subscriptionID = res.UserSubscriptionID
	s.preConsumed = res.PreConsumed
	s.AmountTotal = res.AmountTotal
	s.AmountUsedAfter = res.AmountUsedAfter
	if subscriptionFundingHooks.GetPlanInfo != nil {
		if planInfo, err := subscriptionFundingHooks.GetPlanInfo(res.UserSubscriptionID); err == nil && planInfo != nil {
			s.PlanId = planInfo.PlanID
			s.PlanTitle = planInfo.PlanTitle
		}
	}
	return nil
}

func (s *SubscriptionFunding) Settle(delta int) error {
	return postSubscriptionUsageDelta(s.subscriptionID, s.modelName, int64(delta))
}

func (s *SubscriptionFunding) Refund() error {
	if s.preConsumed <= 0 {
		return nil
	}
	if subscriptionFundingHooks.RefundPreConsume == nil {
		return errors.New("subscription funding refund hook is not registered")
	}
	return refundWithRetry(func() error {
		return subscriptionFundingHooks.RefundPreConsume(s.requestID)
	})
}

func refundWithRetry(fn func() error) error {
	if fn == nil {
		return nil
	}
	const maxAttempts = 3
	var lastErr error
	for i := 0; i < maxAttempts; i++ {
		if err := fn(); err == nil {
			return nil
		} else {
			lastErr = err
		}
		if i < maxAttempts-1 {
			time.Sleep(time.Duration(200*(i+1)) * time.Millisecond)
		}
	}
	return lastErr
}
