package service

import (
	"testing"

	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
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
