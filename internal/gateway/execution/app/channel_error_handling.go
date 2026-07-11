package app

import (
	"fmt"
	httpctx "github.com/sh2001sh/new-api/internal/platform/transport/http/httpctx"
	"time"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/constant"
	auditapp "github.com/sh2001sh/new-api/internal/audit/app"
	gatewayruntime "github.com/sh2001sh/new-api/internal/gateway/runtime"
	"github.com/sh2001sh/new-api/internal/platform/logger"
	platformtext "github.com/sh2001sh/new-api/internal/platform/textx"
	"github.com/sh2001sh/new-api/types"
)

// ProcessChannelError applies shared disable/logging behavior for channel failures.
func ProcessChannelError(c *gin.Context, channelError types.ChannelError, err *types.NewAPIError) {
	logger.LogError(c, fmt.Sprintf("channel error (channel #%d, status code: %d): %s", channelError.ChannelId, err.StatusCode, platformtext.LocalLogPreview(err.Error())))

	if ShouldDisableChannel(err) && channelError.AutoBan {
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

func isRetryableChannelFailure(err *types.NewAPIError) bool {
	if err == nil || types.IsSkipRetryError(err) {
		return false
	}
	return types.IsChannelError(err) || err.StatusCode == 429 || err.StatusCode >= 500
}
