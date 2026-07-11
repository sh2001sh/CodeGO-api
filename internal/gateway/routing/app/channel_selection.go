package app

import (
	"errors"
	httpctx "github.com/sh2001sh/new-api/internal/platform/transport/http/httpctx"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/constant"
	gatewaygroups "github.com/sh2001sh/new-api/internal/gateway/groupsettings"
	gatewayruntime "github.com/sh2001sh/new-api/internal/gateway/runtime"
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
	if channel, selectGroup, ok := takeCoolingModelProbe(param, selectGroup); ok {
		gatewayruntime.SelectRouteDecisionCandidate(param.Ctx, selectGroup, channel.Id, false)
		return channel, selectGroup, nil
	}

	if param.TokenGroup == AutoGroupName {
		if len(gatewaygroups.GetAutoGroups()) == 0 {
			return nil, selectGroup, errors.New("auto groups is not enabled")
		}
		autoGroups := OrderAutoGroups(userGroup, param.ModelName)
		gatewayruntime.UpdateRouteDecisionCandidates(param.Ctx, len(autoGroups))

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

			channel, _ = getHealthySatisfiedChannel(autoGroup, param.ModelName, priorityRetry)
			if channel == nil {
				gatewayruntime.ExcludeRouteDecisionCandidate(param.Ctx, "no_healthy_channel")
				logger.LogDebug(param.Ctx, "No available channel in group %s for model %s at priorityRetry %d, trying next group", autoGroup, param.ModelName, priorityRetry)
				httpctx.SetContextKey(param.Ctx, constant.ContextKeyAutoGroupIndex, i+1)
				httpctx.SetContextKey(param.Ctx, constant.ContextKeyAutoGroupRetryIndex, 0)
				param.SetRetry(0)
				continue
			}
			httpctx.SetContextKey(param.Ctx, constant.ContextKeyAutoGroup, autoGroup)
			selectGroup = autoGroup
			gatewayruntime.SelectRouteDecisionCandidate(param.Ctx, autoGroup, channel.Id, false)
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
		channel, err = getHealthySatisfiedChannel(param.TokenGroup, param.ModelName, param.GetRetry())
		if channel != nil {
			gatewayruntime.SelectRouteDecisionCandidate(param.Ctx, param.TokenGroup, channel.Id, false)
		}
		if err != nil {
			return nil, param.TokenGroup, err
		}
	}
	return channel, selectGroup, nil
}

func takeCoolingModelProbe(param *RetryParam, selectedGroup string) (*gatewayschema.Channel, string, bool) {
	probeChannelID := param.Ctx.GetInt("model_probe_channel_id")
	probeGroup := param.Ctx.GetString("model_probe_group")
	if probeChannelID <= 0 || probeGroup == "" {
		return nil, selectedGroup, false
	}
	if selectedGroup != AutoGroupName && selectedGroup != probeGroup {
		return nil, selectedGroup, false
	}
	param.Ctx.Set("model_probe_channel_id", 0)
	param.Ctx.Set("model_probe_group", "")
	channel, err := gatewaystore.GetCachedChannel(probeChannelID)
	if err != nil || channel == nil || channel.Status != constant.ChannelStatusEnabled {
		return nil, selectedGroup, false
	}
	if !gatewaystore.IsChannelEnabledForGroupModel(probeGroup, param.ModelName, probeChannelID) {
		return nil, selectedGroup, false
	}
	return channel, probeGroup, true
}

func getHealthySatisfiedChannel(group string, modelName string, retry int) (*gatewayschema.Channel, error) {
	const maxSelectionAttempts = 16
	var degradedCandidate *gatewayschema.Channel
	for attempt := 0; attempt < maxSelectionAttempts; attempt++ {
		channel, err := gatewaystore.GetRandomSatisfiedChannel(group, modelName, retry)
		if err != nil || channel == nil {
			if degradedCandidate != nil && err == nil {
				return degradedCandidate, nil
			}
			return channel, err
		}
		health, found := gatewayruntime.GetChannelHealth(channel.Id, modelName)
		if found && health.State == gatewayruntime.ChannelHealthCooling && health.CoolingUntil.After(time.Now()) {
			continue
		}
		if found && health.State == gatewayruntime.ChannelHealthDegraded {
			if degradedCandidate == nil {
				degradedCandidate = channel
			}
			continue
		}
		return channel, nil
	}
	return degradedCandidate, nil
}
