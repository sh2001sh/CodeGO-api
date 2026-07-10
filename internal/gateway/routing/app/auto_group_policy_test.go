package app

import (
	"testing"
	"time"

	gatewaygroups "github.com/sh2001sh/new-api/internal/gateway/groupsettings"
	gatewaystore "github.com/sh2001sh/new-api/internal/gateway/store"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizeTokenGroupDefaultsToAuto(t *testing.T) {
	assert.Equal(t, AutoGroupName, NormalizeTokenGroup(""))
	assert.Equal(t, AutoGroupName, NormalizeTokenGroup("  "))
	assert.Equal(t, "premium", NormalizeTokenGroup(" premium "))
}

func TestOrderAutoGroupsPrefersLowerRateUntilCooldown(t *testing.T) {
	originalAutoGroups := gatewaygroups.AutoGroups2JsonString()
	originalUsableGroups := gatewaygroups.UserUsableGroups2JSONString()
	originalRatios := gatewaystore.GroupRatio2JSONString()
	t.Cleanup(func() {
		require.NoError(t, gatewaygroups.UpdateAutoGroupsByJsonString(originalAutoGroups))
		require.NoError(t, gatewaygroups.UpdateUserUsableGroupsByJSONString(originalUsableGroups))
		require.NoError(t, gatewaystore.UpdateGroupRatioByJSONString(originalRatios))
		autoGroupCircuits.Lock()
		autoGroupCircuits.items = make(map[string]autoGroupCircuit)
		autoGroupCircuits.Unlock()
	})

	require.NoError(t, gatewaygroups.UpdateAutoGroupsByJsonString(`["low","high"]`))
	require.NoError(t, gatewaygroups.UpdateUserUsableGroupsByJSONString(`{"low":"低费率","high":"高费率"}`))
	require.NoError(t, gatewaystore.UpdateGroupRatioByJSONString(`{"low":0.8,"high":1.2}`))

	assert.Equal(t, []string{"low", "high"}, OrderAutoGroups("default", "gpt-test"))
	for range autoGroupFailureThreshold {
		recordAutoGroupFailure("low", "gpt-test", time.Now())
	}
	assert.Equal(t, []string{"high", "low"}, OrderAutoGroups("default", "gpt-test"))

	recordAutoGroupSuccess("low", "gpt-test")
	assert.Equal(t, []string{"low", "high"}, OrderAutoGroups("default", "gpt-test"))
}
