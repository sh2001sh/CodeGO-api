package runtime

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestChannelHealthCoolingAndRecovery(t *testing.T) {
	require.NoError(t, resetChannelHealthForTest())
	t.Cleanup(func() { require.NoError(t, resetChannelHealthForTest()) })

	for range channelHealthFailureThreshold {
		RecordChannelRetryableFailure(42, "gpt-test")
	}
	require.True(t, IsChannelCooling(42, "gpt-test"))

	RecordChannelSuccess(42, "gpt-test", 120*time.Millisecond)
	require.False(t, IsChannelCooling(42, "gpt-test"))
	state, found := GetChannelHealth(42, "gpt-test")
	require.True(t, found)
	require.Equal(t, ChannelHealthHealthy, state.State)
	require.Equal(t, 0, state.ConsecutiveRetryableFailures)
	require.Greater(t, state.TTFTEWMAMilliseconds, float64(0))
}

func TestMarkChannelModelUnavailableOnlyCoolsTargetModel(t *testing.T) {
	require.NoError(t, resetChannelHealthForTest())
	t.Cleanup(func() { require.NoError(t, resetChannelHealthForTest()) })

	MarkChannelModelUnavailable(42, "gpt-unavailable")
	require.True(t, IsChannelCooling(42, "gpt-unavailable"))
	require.False(t, IsChannelCooling(42, "gpt-available"))

	state, found := GetChannelHealth(42, "gpt-unavailable")
	require.True(t, found)
	require.Equal(t, ChannelHealthCooling, state.State)
	require.WithinDuration(t, time.Now().Add(channelModelUnavailableTTL), state.CoolingUntil, time.Second)
}
