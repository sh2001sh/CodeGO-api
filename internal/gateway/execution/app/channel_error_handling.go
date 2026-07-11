package app

import (
	"fmt"
	httpctx "github.com/sh2001sh/new-api/internal/platform/transport/http/httpctx"
	"strings"
	"time"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/constant"
	auditapp "github.com/sh2001sh/new-api/internal/audit/app"
	gatewayruntime "github.com/sh2001sh/new-api/internal/gateway/runtime"
	gatewaystore "github.com/sh2001sh/new-api/internal/gateway/store"
	"github.com/sh2001sh/new-api/internal/platform/logger"
	platformobservability "github.com/sh2001sh/new-api/internal/platform/observability"
	platformtext "github.com/sh2001sh/new-api/internal/platform/textx"
	"github.com/sh2001sh/new-api/types"
)

// ProcessChannelError applies shared disable/logging behavior for channel failures.
func ProcessChannelError(c *gin.Context, channelError types.ChannelError, err *types.NewAPIError) {
	logger.LogError(c, fmt.Sprintf("channel error (channel #%d, status code: %d): %s", channelError.ChannelId, err.StatusCode, platformtext.LocalLogPreview(err.Error())))

	modelName := c.GetString("original_model")
	if IsModelUnavailableError(err) && modelName != "" {
		group := selectedChannelGroup(c)
		alternative, lookupErr := gatewaystore.HasAlternativeEnabledAbility(channelError.ChannelId, group, modelName)
		if lookupErr != nil {
			platformobservability.SysError(fmt.Sprintf("检查通道「%s」（#%d）的模型 %s 备用路由失败：%v", channelError.ChannelName, channelError.ChannelId, modelName, lookupErr))
		} else if alternative {
			gatewayruntime.MarkChannelModelUnavailable(channelError.ChannelId, modelName)
			c.Set("model_unavailable_with_alternative", true)
			platformobservability.SysLog(fmt.Sprintf("通道「%s」（#%d）的模型 %s 不可用，已临时熔断该模型路由并切换备用渠道", channelError.ChannelName, channelError.ChannelId, modelName))
		} else {
			platformobservability.SysLog(fmt.Sprintf("通道「%s」（#%d）的模型 %s 是唯一可用路由，保留渠道与模型路由", channelError.ChannelName, channelError.ChannelId, modelName))
		}
	} else if ShouldDisableChannel(err) && channelError.AutoBan {
		gopool.Go(func() {
			DisableChannel(channelError, err.ErrorWithStatusCode())
		})
	}
	if isRetryableChannelFailure(err) {
		gatewayruntime.RecordChannelRetryableFailure(channelError.ChannelId, c.GetString("original_model"))
		gatewayruntime.InvalidateChannelAffinityForCurrentRequest(c)
	}

	if constant.ErrorLogEnabled && types.IsRecordErrorLog(err) {
		userID := c.GetInt("id")
		tokenName := c.GetString("token_name")
		modelName := c.GetString("original_model")
		tokenID := c.GetInt("token_id")
		userGroup := c.GetString("group")
		channelID := c.GetInt("channel_id")
		other := make(map[string]interface{})
		if c.Request != nil && c.Request.URL != nil {
			other["request_path"] = c.Request.URL.Path
		}
		other["error_type"] = err.GetErrorType()
		other["error_code"] = err.GetErrorCode()
		other["status_code"] = err.StatusCode
		other["channel_id"] = channelID
		other["channel_name"] = c.GetString("channel_name")
		other["channel_type"] = c.GetInt("channel_type")

		adminInfo := make(map[string]interface{})
		adminInfo["use_channel"] = c.GetStringSlice("use_channel")
		if httpctx.GetContextKeyBool(c, constant.ContextKeyChannelIsMultiKey) {
			adminInfo["is_multi_key"] = true
			adminInfo["multi_key_index"] = httpctx.GetContextKeyInt(c, constant.ContextKeyChannelMultiKeyIndex)
		}
		gatewayruntime.AppendChannelAffinityAdminInfo(c, adminInfo)
		if decision, ok := gatewayruntime.GetRouteDecision(c); ok {
			adminInfo["route_decision"] = decision
		}
		other["admin_info"] = adminInfo

		startTime := httpctx.GetContextKeyTime(c, constant.ContextKeyRequestStartTime)
		if startTime.IsZero() {
			startTime = time.Now()
		}
		useTimeSeconds := int(time.Since(startTime).Seconds())
		auditapp.RecordErrorLog(
			c,
			userID,
			channelID,
			modelName,
			tokenName,
			err.MaskSensitiveErrorWithStatusCode(),
			tokenID,
			useTimeSeconds,
			httpctx.GetContextKeyBool(c, constant.ContextKeyIsStream),
			userGroup,
			other,
		)
	}
}

// IsModelUnavailableError identifies an upstream rejection that applies to
// the requested model rather than to the entire channel credential.
func IsModelUnavailableError(err *types.NewAPIError) bool {
	if err == nil {
		return false
	}
	if err.GetErrorCode() == types.ErrorCodeModelNotFound {
		return true
	}
	if err.StatusCode != 400 && err.StatusCode != 404 {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "model") &&
		(strings.Contains(message, "not found") || strings.Contains(message, "not exist") || strings.Contains(message, "not support") || strings.Contains(message, "unavailable"))
}

func selectedChannelGroup(c *gin.Context) string {
	group := httpctx.GetContextKeyString(c, constant.ContextKeyAutoGroup)
	if group != "" {
		return group
	}
	return httpctx.GetContextKeyString(c, constant.ContextKeyUsingGroup)
}

func isRetryableChannelFailure(err *types.NewAPIError) bool {
	if err == nil || types.IsSkipRetryError(err) {
		return false
	}
	return types.IsChannelError(err) || err.StatusCode == 429 || err.StatusCode >= 500
}
