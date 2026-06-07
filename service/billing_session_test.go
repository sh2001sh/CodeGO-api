package service

import (
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestIsClaudeBillingRequestUsesChannelSettingOnly(t *testing.T) {
	info := &relaycommon.RelayInfo{
		OriginModelName: "claude-3-7-sonnet",
		RelayFormat:     types.RelayFormatClaude,
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelSetting: dto.ChannelSettings{},
		},
	}

	require.False(t, isClaudeBillingRequest(info))

	info.ChannelSetting.ClaudeWalletEnabled = true
	require.True(t, isClaudeBillingRequest(info))
}

func TestBillingSessionRefundSyncRestoresWalletAndTokenPreConsume(t *testing.T) {
	truncate(t)
	seedUser(t, 1001, 10000)
	seedToken(t, 2001, 1001, "sk-refund", 10000)

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	info := &relaycommon.RelayInfo{
		UserId:          1001,
		UserQuota:       10000,
		TokenId:         2001,
		TokenKey:        "sk-refund",
		OriginModelName: "gpt-5",
		RequestId:       "req-refund",
		IsPlayground:    true,
		ForcePreConsume: true,
		UserSetting: dto.UserSetting{
			BillingPreference: "wallet_only",
		},
	}

	session, apiErr := NewBillingSession(ctx, info, 3000)
	require.Nil(t, apiErr)
	require.Equal(t, 3000, session.GetPreConsumedQuota())

	userQuota, err := model.GetUserQuota(1001, false)
	require.NoError(t, err)
	require.Equal(t, 7000, userQuota)

	require.NoError(t, session.RefundSync(ctx))

	userQuota, err = model.GetUserQuota(1001, false)
	require.NoError(t, err)
	require.Equal(t, 10000, userQuota)
}

func TestBillingSessionSettleAdjustsWalletAndTokenToActualUsage(t *testing.T) {
	truncate(t)
	seedUser(t, 1002, 10000)
	seedToken(t, 2002, 1002, "sk-settle", 10000)

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	info := &relaycommon.RelayInfo{
		UserId:          1002,
		UserQuota:       10000,
		TokenId:         2002,
		TokenKey:        "sk-settle",
		OriginModelName: "gpt-5",
		RequestId:       "req-settle",
		IsPlayground:    true,
		ForcePreConsume: true,
		UserSetting: dto.UserSetting{
			BillingPreference: "wallet_only",
		},
	}

	session, apiErr := NewBillingSession(ctx, info, 3000)
	require.Nil(t, apiErr)

	require.NoError(t, session.Settle(4500))

	userQuota, err := model.GetUserQuota(1002, false)
	require.NoError(t, err)
	require.Equal(t, 5500, userQuota)
	require.NoError(t, session.RefundSync(ctx))
	userQuota, err = model.GetUserQuota(1002, false)
	require.NoError(t, err)
	require.Equal(t, 5500, userQuota)
}
