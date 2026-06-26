package service

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
)

func isClaudeBillingRequest(relayInfo *relaycommon.RelayInfo) bool {
	if relayInfo == nil {
		return false
	}
	if relayInfo.ChannelMeta == nil {
		return false
	}
	return relayInfo.ChannelSetting.ClaudeWalletEnabled
}

// BillingSession owns the lifecycle of pre-consume, settle, and refund for
// one relay request.
type BillingSession struct {
	relayInfo        *relaycommon.RelayInfo
	funding          FundingSource
	preConsumedQuota int
	tokenConsumed    int
	extraReserved    int
	trusted          bool
	fundingSettled   bool
	settled          bool
	refunded         bool
	mu               sync.Mutex
}

func (s *BillingSession) Settle(actualQuota int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.settled {
		return nil
	}

	delta := actualQuota - s.preConsumedQuota
	if delta == 0 {
		s.settled = true
		return nil
	}

	if !s.fundingSettled {
		if err := s.funding.Settle(delta); err != nil {
			return err
		}
		s.fundingSettled = true
	}

	var tokenErr error
	if !s.relayInfo.IsPlayground {
		if delta > 0 {
			tokenErr = model.DecreaseTokenQuota(s.relayInfo.TokenId, s.relayInfo.TokenKey, delta)
		} else {
			tokenErr = model.IncreaseTokenQuota(s.relayInfo.TokenId, s.relayInfo.TokenKey, -delta)
		}
		if tokenErr != nil {
			common.SysLog(fmt.Sprintf(
				"error adjusting token quota after funding settled (userId=%d, tokenId=%d, delta=%d): %s",
				s.relayInfo.UserId,
				s.relayInfo.TokenId,
				delta,
				tokenErr.Error(),
			))
		}
	}

	if s.funding.Source() == BillingSourceSubscription {
		s.relayInfo.SubscriptionPostDelta += int64(delta)
	}

	s.settled = true
	return tokenErr
}

func (s *BillingSession) Refund(c *gin.Context) {
	s.mu.Lock()
	if s.settled || s.refunded || !s.needsRefundLocked() {
		s.mu.Unlock()
		return
	}
	s.refunded = true
	s.mu.Unlock()

	logger.LogInfo(c, fmt.Sprintf(
		"user %d request failed, refund pre-consume (token_quota=%s, funding=%s)",
		s.relayInfo.UserId,
		logger.FormatQuota(s.tokenConsumed),
		s.funding.Source(),
	))

	tokenID := s.relayInfo.TokenId
	tokenKey := s.relayInfo.TokenKey
	isPlayground := s.relayInfo.IsPlayground
	tokenConsumed := s.tokenConsumed
	extraReserved := s.extraReserved
	subscriptionID := s.relayInfo.SubscriptionId
	funding := s.funding

	gopool.Go(func() {
		if err := funding.Refund(); err != nil {
			common.SysLog("error refunding billing source: " + err.Error())
		}

		if extraReserved > 0 && funding.Source() == BillingSourceSubscription && subscriptionID > 0 {
			modelName := ""
			if subFunding, ok := funding.(*SubscriptionFunding); ok {
				modelName = subFunding.modelName
			}
			if err := model.PostConsumeUserSubscriptionUsageDelta(subscriptionID, modelName, -int64(extraReserved)); err != nil {
				common.SysLog("error refunding subscription extra reserved quota: " + err.Error())
			}
		}

		if tokenConsumed > 0 && !isPlayground {
			if err := model.IncreaseTokenQuota(tokenID, tokenKey, tokenConsumed); err != nil {
				common.SysLog("error refunding token quota: " + err.Error())
			}
		}
	})
}

func (s *BillingSession) RefundSync(c *gin.Context) error {
	s.mu.Lock()
	if s.settled || s.refunded || !s.needsRefundLocked() {
		s.mu.Unlock()
		return nil
	}
	s.refunded = true
	s.mu.Unlock()

	logger.LogInfo(c, fmt.Sprintf(
		"user %d request failed, refund pre-consume (token_quota=%s, funding=%s)",
		s.relayInfo.UserId,
		logger.FormatQuota(s.tokenConsumed),
		s.funding.Source(),
	))

	tokenID := s.relayInfo.TokenId
	tokenKey := s.relayInfo.TokenKey
	isPlayground := s.relayInfo.IsPlayground
	tokenConsumed := s.tokenConsumed
	extraReserved := s.extraReserved
	subscriptionID := s.relayInfo.SubscriptionId
	funding := s.funding

	var errs []error
	if err := funding.Refund(); err != nil {
		errs = append(errs, fmt.Errorf("refund funding source: %w", err))
	}

	if extraReserved > 0 && funding.Source() == BillingSourceSubscription && subscriptionID > 0 {
		modelName := ""
		if subFunding, ok := funding.(*SubscriptionFunding); ok {
			modelName = subFunding.modelName
		}
		if err := model.PostConsumeUserSubscriptionUsageDelta(subscriptionID, modelName, -int64(extraReserved)); err != nil {
			errs = append(errs, fmt.Errorf("refund subscription extra reserved quota: %w", err))
		}
	}

	if tokenConsumed > 0 && !isPlayground {
		if err := model.IncreaseTokenQuota(tokenID, tokenKey, tokenConsumed); err != nil {
			errs = append(errs, fmt.Errorf("refund token quota: %w", err))
		}
	}

	return errors.Join(errs...)
}

func (s *BillingSession) NeedsRefund() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.needsRefundLocked()
}

func (s *BillingSession) needsRefundLocked() bool {
	if s.settled || s.refunded || s.fundingSettled {
		return false
	}
	if s.tokenConsumed > 0 {
		return true
	}
	if sub, ok := s.funding.(*SubscriptionFunding); ok && sub.preConsumed > 0 {
		return true
	}
	return false
}

func (s *BillingSession) GetPreConsumedQuota() int {
	return s.preConsumedQuota
}

func (s *BillingSession) Reserve(targetQuota int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.settled || s.refunded || s.trusted || targetQuota <= s.preConsumedQuota {
		return nil
	}

	delta := targetQuota - s.preConsumedQuota
	if delta <= 0 {
		return nil
	}

	if err := s.reserveFunding(delta); err != nil {
		return err
	}
	if err := s.reserveToken(delta); err != nil {
		s.rollbackFundingReserve(delta)
		return err
	}

	s.preConsumedQuota += delta
	s.tokenConsumed += delta
	s.extraReserved += delta
	s.syncRelayInfo()
	return nil
}

func (s *BillingSession) preConsume(c *gin.Context, quota int) *types.NewAPIError {
	effectiveQuota := quota

	if s.shouldTrust(c) {
		s.trusted = true
		effectiveQuota = 0
		logger.LogInfo(c, fmt.Sprintf(
			"user %d has enough trusted quota, skipping pre-consume (funding=%s)",
			s.relayInfo.UserId,
			s.funding.Source(),
		))
	} else if effectiveQuota > 0 {
		logger.LogInfo(c, fmt.Sprintf(
			"user %d pre-consume %s (funding=%s)",
			s.relayInfo.UserId,
			logger.FormatQuota(effectiveQuota),
			s.funding.Source(),
		))
	}

	if effectiveQuota > 0 {
		if err := PreConsumeTokenQuota(s.relayInfo, effectiveQuota); err != nil {
			return types.NewErrorWithStatusCode(
				err,
				types.ErrorCodePreConsumeTokenQuotaFailed,
				http.StatusForbidden,
				types.ErrOptionWithSkipRetry(),
				types.ErrOptionWithNoRecordErrorLog(),
			)
		}
		s.tokenConsumed = effectiveQuota
	}

	if err := s.funding.PreConsume(effectiveQuota); err != nil {
		if s.tokenConsumed > 0 && !s.relayInfo.IsPlayground {
			if rollbackErr := model.IncreaseTokenQuota(s.relayInfo.TokenId, s.relayInfo.TokenKey, s.tokenConsumed); rollbackErr != nil {
				common.SysLog(fmt.Sprintf(
					"error rolling back token quota (userId=%d, tokenId=%d, amount=%d, fundingErr=%s): %s",
					s.relayInfo.UserId,
					s.relayInfo.TokenId,
					s.tokenConsumed,
					err.Error(),
					rollbackErr.Error(),
				))
			}
			s.tokenConsumed = 0
		}

		if errors.Is(err, model.ErrBlindBoxInsufficientQuota) {
			return types.NewErrorWithStatusCode(
				fmt.Errorf("blind box quota insufficient: %s", err.Error()),
				types.ErrorCodeInsufficientUserQuota,
				http.StatusForbidden,
				types.ErrOptionWithSkipRetry(),
				types.ErrOptionWithNoRecordErrorLog(),
			)
		}

		errMsg := err.Error()
		if strings.Contains(errMsg, "no active subscription") || strings.Contains(errMsg, "subscription quota insufficient") {
			return types.NewErrorWithStatusCode(
				fmt.Errorf("subscription quota insufficient or unavailable: %s", errMsg),
				types.ErrorCodeInsufficientUserQuota,
				http.StatusForbidden,
				types.ErrOptionWithSkipRetry(),
				types.ErrOptionWithNoRecordErrorLog(),
			)
		}

		return types.NewError(err, types.ErrorCodeUpdateDataError, types.ErrOptionWithSkipRetry())
	}

	s.preConsumedQuota = effectiveQuota
	s.syncRelayInfo()
	return nil
}

func (s *BillingSession) reserveFunding(delta int) error {
	switch funding := s.funding.(type) {
	case *WalletFunding:
		if err := model.DecreaseUserQuota(funding.userId, delta, false); err != nil {
			return types.NewError(err, types.ErrorCodeUpdateDataError, types.ErrOptionWithSkipRetry())
		}
		funding.consumed += delta
		return nil
	case *ClaudeWalletFunding:
		if err := model.DecreaseUserClaudeQuota(funding.userId, delta, false); err != nil {
			return types.NewError(err, types.ErrorCodeUpdateDataError, types.ErrOptionWithSkipRetry())
		}
		funding.consumed += delta
		return nil
	case *SubscriptionFunding:
		if err := model.PostConsumeUserSubscriptionUsageDelta(funding.subscriptionId, funding.modelName, int64(delta)); err != nil {
			return types.NewErrorWithStatusCode(
				fmt.Errorf("subscription quota insufficient or unavailable: %s", err.Error()),
				types.ErrorCodeInsufficientUserQuota,
				http.StatusForbidden,
				types.ErrOptionWithSkipRetry(),
				types.ErrOptionWithNoRecordErrorLog(),
			)
		}
		return nil
	default:
		return types.NewError(
			fmt.Errorf("unsupported funding source: %s", s.funding.Source()),
			types.ErrorCodeUpdateDataError,
			types.ErrOptionWithSkipRetry(),
		)
	}
}

func (s *BillingSession) rollbackFundingReserve(delta int) {
	switch funding := s.funding.(type) {
	case *WalletFunding:
		if err := model.IncreaseUserQuota(funding.userId, delta, false); err != nil {
			common.SysLog("error rolling back wallet funding reserve: " + err.Error())
		} else {
			funding.consumed -= delta
		}
	case *ClaudeWalletFunding:
		if err := model.IncreaseUserClaudeQuota(funding.userId, delta, false); err != nil {
			common.SysLog("error rolling back claude wallet funding reserve: " + err.Error())
		} else {
			funding.consumed -= delta
		}
	case *SubscriptionFunding:
		if err := model.PostConsumeUserSubscriptionUsageDelta(funding.subscriptionId, funding.modelName, -int64(delta)); err != nil {
			common.SysLog("error rolling back subscription funding reserve: " + err.Error())
		}
	}
}

func (s *BillingSession) reserveToken(delta int) error {
	if delta <= 0 || s.relayInfo.IsPlayground {
		return nil
	}
	if err := PreConsumeTokenQuota(s.relayInfo, delta); err != nil {
		return types.NewErrorWithStatusCode(
			err,
			types.ErrorCodePreConsumeTokenQuotaFailed,
			http.StatusForbidden,
			types.ErrOptionWithSkipRetry(),
			types.ErrOptionWithNoRecordErrorLog(),
		)
	}
	return nil
}

func (s *BillingSession) shouldTrust(c *gin.Context) bool {
	if s.relayInfo.ForcePreConsume {
		return false
	}

	trustQuota := common.GetTrustQuota()
	if trustQuota <= 0 {
		return false
	}

	tokenTrusted := s.relayInfo.TokenUnlimited
	if !tokenTrusted {
		tokenQuota := c.GetInt("token_quota")
		tokenTrusted = tokenQuota > trustQuota
	}
	if !tokenTrusted {
		return false
	}

	switch s.funding.Source() {
	case BillingSourceWallet:
		return s.relayInfo.UserQuota > trustQuota
	case BillingSourceClaudeWallet:
		return false
	case BillingSourceSubscription:
		return false
	default:
		return false
	}
}

func (s *BillingSession) syncRelayInfo() {
	info := s.relayInfo
	info.FinalPreConsumedQuota = s.preConsumedQuota
	info.BillingSource = s.funding.Source()

	if sub, ok := s.funding.(*SubscriptionFunding); ok {
		info.SubscriptionId = sub.subscriptionId
		info.SubscriptionPreConsumed = sub.preConsumed + int64(s.extraReserved)
		info.SubscriptionPostDelta = 0
		info.SubscriptionAmountTotal = sub.AmountTotal
		info.SubscriptionAmountUsedAfterPreConsume = sub.AmountUsedAfter + int64(s.extraReserved)
		info.SubscriptionPlanId = sub.PlanId
		info.SubscriptionPlanTitle = sub.PlanTitle
	} else {
		info.SubscriptionId = 0
		info.SubscriptionPreConsumed = 0
		info.SubscriptionPostDelta = 0
		info.SubscriptionAmountTotal = 0
		info.SubscriptionAmountUsedAfterPreConsume = 0
		info.SubscriptionPlanId = 0
		info.SubscriptionPlanTitle = ""
	}
	info.BlindBoxRequestId = ""
}

func NewBillingSession(c *gin.Context, relayInfo *relaycommon.RelayInfo, preConsumedQuota int) (*BillingSession, *types.NewAPIError) {
	if relayInfo == nil {
		return nil, types.NewError(
			fmt.Errorf("relayInfo is nil"),
			types.ErrorCodeInvalidRequest,
			types.ErrOptionWithSkipRetry(),
		)
	}

	pref := common.NormalizeBillingPreference(relayInfo.UserSetting.BillingPreference)
	fundingSourceOrder := common.NormalizeFundingSourceOrder(
		relayInfo.UserSetting.FundingSourceOrder,
		pref,
	)

	tryWallet := func() (*BillingSession, *types.NewAPIError) {
		userQuota, err := model.GetUserQuota(relayInfo.UserId, false)
		if err != nil {
			return nil, types.NewError(err, types.ErrorCodeQueryDataError, types.ErrOptionWithSkipRetry())
		}
		if userQuota <= 0 {
			return nil, types.NewErrorWithStatusCode(
				fmt.Errorf("user quota insufficient, remain: %s", logger.FormatQuota(userQuota)),
				types.ErrorCodeInsufficientUserQuota,
				http.StatusForbidden,
				types.ErrOptionWithSkipRetry(),
				types.ErrOptionWithNoRecordErrorLog(),
			)
		}
		if userQuota-preConsumedQuota < 0 {
			return nil, types.NewErrorWithStatusCode(
				fmt.Errorf(
					"pre-consume failed, user quota remain: %s, required: %s",
					logger.FormatQuota(userQuota),
					logger.FormatQuota(preConsumedQuota),
				),
				types.ErrorCodeInsufficientUserQuota,
				http.StatusForbidden,
				types.ErrOptionWithSkipRetry(),
				types.ErrOptionWithNoRecordErrorLog(),
			)
		}

		relayInfo.UserQuota = userQuota
		session := &BillingSession{
			relayInfo: relayInfo,
			funding:   &WalletFunding{userId: relayInfo.UserId},
		}
		if apiErr := session.preConsume(c, preConsumedQuota); apiErr != nil {
			return nil, apiErr
		}
		return session, nil
	}

	tryClaudeWallet := func() (*BillingSession, *types.NewAPIError) {
		claudeQuota, err := model.GetUserClaudeQuota(relayInfo.UserId, false)
		if err != nil {
			return nil, types.NewError(err, types.ErrorCodeQueryDataError, types.ErrOptionWithSkipRetry())
		}
		if claudeQuota <= 0 {
			return nil, types.NewErrorWithStatusCode(
				fmt.Errorf("claude quota insufficient, remain: %s", logger.FormatQuota(claudeQuota)),
				types.ErrorCodeInsufficientUserQuota,
				http.StatusForbidden,
				types.ErrOptionWithSkipRetry(),
				types.ErrOptionWithNoRecordErrorLog(),
			)
		}
		if claudeQuota-preConsumedQuota < 0 {
			return nil, types.NewErrorWithStatusCode(
				fmt.Errorf(
					"pre-consume failed, claude quota remain: %s, required: %s",
					logger.FormatQuota(claudeQuota),
					logger.FormatQuota(preConsumedQuota),
				),
				types.ErrorCodeInsufficientUserQuota,
				http.StatusForbidden,
				types.ErrOptionWithSkipRetry(),
				types.ErrOptionWithNoRecordErrorLog(),
			)
		}

		relayInfo.UserQuota = claudeQuota
		session := &BillingSession{
			relayInfo: relayInfo,
			funding:   &ClaudeWalletFunding{userId: relayInfo.UserId},
		}
		if apiErr := session.preConsume(c, preConsumedQuota); apiErr != nil {
			return nil, apiErr
		}
		return session, nil
	}

	trySubscription := func() (*BillingSession, *types.NewAPIError) {
		subConsume := int64(preConsumedQuota)
		if subConsume <= 0 {
			subConsume = 1
		}

		session := &BillingSession{
			relayInfo: relayInfo,
			funding: &SubscriptionFunding{
				requestId: relayInfo.RequestId,
				userId:    relayInfo.UserId,
				modelName: relayInfo.OriginModelName,
				amount:    subConsume,
			},
		}
		if apiErr := session.preConsume(c, int(subConsume)); apiErr != nil {
			return nil, apiErr
		}
		return session, nil
	}

	if isClaudeBillingRequest(relayInfo) {
		return tryClaudeWallet()
	}

	var lastInsufficientErr *types.NewAPIError
	for _, source := range fundingSourceOrder {
		var (
			session *BillingSession
			apiErr  *types.NewAPIError
		)

		switch source {
		case BillingSourceSubscription:
			session, apiErr = trySubscription()
		case BillingSourceWallet:
			session, apiErr = tryWallet()
		default:
			continue
		}

		if apiErr != nil {
			if apiErr.GetErrorCode() == types.ErrorCodeInsufficientUserQuota {
				lastInsufficientErr = apiErr
				continue
			}
			return nil, apiErr
		}
		if session != nil {
			return session, nil
		}
	}

	if lastInsufficientErr != nil {
		return nil, lastInsufficientErr
	}
	return nil, types.NewErrorWithStatusCode(
		fmt.Errorf("no available funding source"),
		types.ErrorCodeInsufficientUserQuota,
		http.StatusForbidden,
		types.ErrOptionWithSkipRetry(),
		types.ErrOptionWithNoRecordErrorLog(),
	)
}
