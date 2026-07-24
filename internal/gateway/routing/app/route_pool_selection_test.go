package app

import (
	"testing"

	gatewayruntime "github.com/sh2001sh/new-api/internal/gateway/runtime"
	gatewayschema "github.com/sh2001sh/new-api/internal/gateway/schema"
	"github.com/stretchr/testify/assert"
)

func TestEffectiveRoutePoolCostPrefersStableChannelOverCheapUnstableChannel(t *testing.T) {
	cheapButUnstable := effectiveRoutePoolCost(gatewayschema.RoutePoolMember{CostMultiplier: 1}, "gpt-test", gatewayruntime.ChannelHealth{
		Window5Requests: 20, SuccessRate5m: 90, State: gatewayruntime.ChannelHealthDegraded, ConsecutiveRetryableFailures: 2,
	})
	stableBackup := effectiveRoutePoolCost(gatewayschema.RoutePoolMember{CostMultiplier: 1.4}, "gpt-test", gatewayruntime.ChannelHealth{
		Window5Requests: 20, SuccessRate5m: 99, State: gatewayruntime.ChannelHealthHealthy,
	})
	assert.Greater(t, cheapButUnstable, stableBackup)
}

func TestRoutePoolModelCostOverridesMemberDefault(t *testing.T) {
	member := gatewayschema.RoutePoolMember{CostMultiplier: 1.2, ModelCostOverrides: `{"gpt-test":0.8}`}
	assert.Equal(t, 0.8, routePoolModelCost(member, "gpt-test"))
	assert.Equal(t, 1.2, routePoolModelCost(member, "other"))
}
