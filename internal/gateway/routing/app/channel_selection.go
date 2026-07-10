package app

import (
	"errors"
	httpctx "github.com/sh2001sh/new-api/internal/platform/transport/http/httpctx"

	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/constant"
	gatewaygroups "github.com/sh2001sh/new-api/internal/gateway/groupsettings"
	gatewayschema "github.com/sh2001sh/new-api/internal/gateway/schema"
	gatewaystore "github.com/sh2001sh/new-api/internal/gateway/store"
	platformconfig "github.com/sh2001sh/new-api/internal/platform/config"
	"github.com/sh2001sh/new-api/internal/platform/logger"
)

// RetryParam carries group/model selection state across relay retries.
type RetryParam struct {
	Ctx          *gin.Context
	TokenGroup   string
	ModelName    string
	Retry        *int
	resetNextTry bool
}

func (p *RetryParam) GetRetry() int {
	if p.Retry == nil {
		return 0
	}
	return *p.Retry
}

func (p *RetryParam) SetRetry(retry int) {
	p.Retry = &retry
}

func (p *RetryParam) IncreaseRetry() {
	if p.resetNextTry {
		p.resetNextTry = false
		return
	}
	if p.Retry == nil {
		p.Retry = new(int)
	}
	*p.Retry++
}

func (p *RetryParam) ResetRetryNextTry() {
	p.resetNextTry = true
}

// CacheGetRandomSatisfiedChannel selects an available channel for the current retry round.
func CacheGetRandomSatisfiedChannel(param *RetryParam) (*gatewayschema.Channel, string, error) {
	var channel *gatewayschema.Channel
	var err error
	selectGroup := param.TokenGroup
	userGroup := httpctx.GetContextKeyString(param.Ctx, constant.ContextKeyUserGroup)

	if param.TokenGroup == AutoGroupName {
		if len(gatewaygroups.GetAutoGroups()) == 0 {
			return nil, selectGroup, errors.New("auto groups is not enabled")
		}
		autoGroups := OrderAutoGroups(userGroup, param.ModelName)

		startGroupIndex := 0
		crossGroupRetry := httpctx.GetContextKeyBool(param.Ctx, constant.ContextKeyTokenCrossGroupRetry)

		if lastGroupIndex, exists := httpctx.GetContextKey(param.Ctx, constant.ContextKeyAutoGroupIndex); exists {
			if idx, ok := lastGroupIndex.(int); ok {
				startGroupIndex = idx
			}
		}

		for i := startGroupIndex; i < len(autoGroups); i++ {
			autoGroup := autoGroups[i]
			priorityRetry := param.GetRetry()
			if i > startGroupIndex {
				priorityRetry = 0
			}
			logger.LogDebug(param.Ctx, "Auto selecting group: %s, priorityRetry: %d", autoGroup, priorityRetry)

			channel, _ = gatewaystore.GetRandomSatisfiedChannel(autoGroup, param.ModelName, priorityRetry)
			if channel == nil {
				logger.LogDebug(param.Ctx, "No available channel in group %s for model %s at priorityRetry %d, trying next group", autoGroup, param.ModelName, priorityRetry)
				httpctx.SetContextKey(param.Ctx, constant.ContextKeyAutoGroupIndex, i+1)
				httpctx.SetContextKey(param.Ctx, constant.ContextKeyAutoGroupRetryIndex, 0)
				param.SetRetry(0)
				continue
			}
			httpctx.SetContextKey(param.Ctx, constant.ContextKeyAutoGroup, autoGroup)
			selectGroup = autoGroup
			logger.LogDebug(param.Ctx, "Auto selected group: %s", autoGroup)

			if crossGroupRetry && priorityRetry >= platformconfig.RetryTimes {
				logger.LogDebug(param.Ctx, "Current group %s retries exhausted (priorityRetry=%d >= RetryTimes=%d), preparing switch to next group for next retry", autoGroup, priorityRetry, platformconfig.RetryTimes)
				httpctx.SetContextKey(param.Ctx, constant.ContextKeyAutoGroupIndex, i+1)
				param.SetRetry(0)
				param.ResetRetryNextTry()
			} else {
				httpctx.SetContextKey(param.Ctx, constant.ContextKeyAutoGroupIndex, i)
			}
			break
		}
	} else {
		channel, err = gatewaystore.GetRandomSatisfiedChannel(param.TokenGroup, param.ModelName, param.GetRetry())
		if err != nil {
			return nil, param.TokenGroup, err
		}
	}
	return channel, selectGroup, nil
}
