package service

import (
	"time"

	"github.com/QuantumNous/new-api/model"
)

type FundingSource interface {
	Source() string
	PreConsume(amount int) error
	Settle(delta int) error
	Refund() error
}

type BlindBoxFunding struct {
	requestId   string
	userId      int
	preConsumed int64
}

func (b *BlindBoxFunding) Source() string { return BillingSourceBlindBox }

func (b *BlindBoxFunding) PreConsume(amount int) error {
	if amount <= 0 {
		return nil
	}
	res, err := model.PreConsumeBlindBoxCredits(b.requestId, b.userId, int64(amount))
	if err != nil {
		return err
	}
	b.preConsumed = res.PreConsumed
	return nil
}

func (b *BlindBoxFunding) Settle(delta int) error {
	if delta == 0 {
		return nil
	}
	return model.PostConsumeBlindBoxPreConsumeDelta(b.requestId, int64(delta))
}

func (b *BlindBoxFunding) Refund() error {
	if b.preConsumed <= 0 {
		return nil
	}
	return refundWithRetry(func() error {
		return model.RefundBlindBoxPreConsume(b.requestId)
	})
}

type WalletFunding struct {
	userId   int
	consumed int
}

func (w *WalletFunding) Source() string { return BillingSourceWallet }

func (w *WalletFunding) PreConsume(amount int) error {
	if amount <= 0 {
		return nil
	}
	if err := model.DecreaseUserQuota(w.userId, amount, false); err != nil {
		return err
	}
	w.consumed = amount
	return nil
}

func (w *WalletFunding) Settle(delta int) error {
	if delta == 0 {
		return nil
	}
	if delta > 0 {
		return model.DecreaseUserQuota(w.userId, delta, false)
	}
	return model.IncreaseUserQuota(w.userId, -delta, false)
}

func (w *WalletFunding) Refund() error {
	if w.consumed <= 0 {
		return nil
	}
	return model.IncreaseUserQuota(w.userId, w.consumed, false)
}

type ClaudeWalletFunding struct {
	userId   int
	consumed int
}

func (w *ClaudeWalletFunding) Source() string { return BillingSourceClaudeWallet }

func (w *ClaudeWalletFunding) PreConsume(amount int) error {
	if amount <= 0 {
		return nil
	}
	if err := model.DecreaseUserClaudeQuota(w.userId, amount, false); err != nil {
		return err
	}
	w.consumed = amount
	return nil
}

func (w *ClaudeWalletFunding) Settle(delta int) error {
	if delta == 0 {
		return nil
	}
	if delta > 0 {
		return model.DecreaseUserClaudeQuota(w.userId, delta, false)
	}
	return model.IncreaseUserClaudeQuota(w.userId, -delta, false)
}

func (w *ClaudeWalletFunding) Refund() error {
	if w.consumed <= 0 {
		return nil
	}
	return model.IncreaseUserClaudeQuota(w.userId, w.consumed, false)
}

type SubscriptionFunding struct {
	requestId       string
	userId          int
	modelName       string
	amount          int64
	subscriptionId  int
	preConsumed     int64
	AmountTotal     int64
	AmountUsedAfter int64
	PlanId          int
	PlanTitle       string
}

func (s *SubscriptionFunding) Source() string { return BillingSourceSubscription }

func (s *SubscriptionFunding) PreConsume(_ int) error {
	res, err := model.PreConsumeUserSubscription(s.requestId, s.userId, s.modelName, 0, s.amount)
	if err != nil {
		return err
	}
	s.subscriptionId = res.UserSubscriptionId
	s.preConsumed = res.PreConsumed
	s.AmountTotal = res.AmountTotal
	s.AmountUsedAfter = res.AmountUsedAfter
	if planInfo, err := model.GetSubscriptionPlanInfoByUserSubscriptionId(res.UserSubscriptionId); err == nil && planInfo != nil {
		s.PlanId = planInfo.PlanId
		s.PlanTitle = planInfo.PlanTitle
	}
	return nil
}

func (s *SubscriptionFunding) Settle(delta int) error {
	if delta == 0 {
		return nil
	}
	return model.PostConsumeUserSubscriptionUsageDelta(s.subscriptionId, s.modelName, int64(delta))
}

func (s *SubscriptionFunding) Refund() error {
	if s.preConsumed <= 0 {
		return nil
	}
	return refundWithRetry(func() error {
		return model.RefundSubscriptionPreConsume(s.requestId)
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
