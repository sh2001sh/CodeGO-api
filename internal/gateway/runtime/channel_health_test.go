package runtime

import (
	"strconv"
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

func TestChannelHealthCoolsForLowShortTermSuccessRate(t *testing.T) {
	require.NoError(t, resetChannelHealthForTest())
	t.Cleanup(func() { require.NoError(t, resetChannelHealthForTest()) })

	RecordChannelRetryableFailure(42, "gpt-test")
	RecordChannelSuccess(42, "gpt-test", 0)
	RecordChannelRetryableFailure(42, "gpt-test")
	RecordChannelRetryableFailure(42, "gpt-test")
	RecordChannelRetryableFailure(42, "gpt-test")

	require.True(t, IsChannelCooling(42, "gpt-test"))
	state, found := GetChannelHealth(42, "gpt-test")
	require.True(t, found)
	require.Equal(t, ChannelHealthCooling, state.State)
	require.Equal(t, 20.0, state.SuccessRate2m)
	require.WithinDuration(t, time.Now().Add(channelHealthCooldownDuration), state.CoolingUntil, time.Second)
}

func TestChannelHealthDoesNotCoolForHealthyShortTermSuccessRate(t *testing.T) {
	require.NoError(t, resetChannelHealthForTest())
	t.Cleanup(func() { require.NoError(t, resetChannelHealthForTest()) })

	RecordChannelRetryableFailure(42, "gpt-test")
	for range 4 {
		RecordChannelSuccess(42, "gpt-test", 0)
	}

	require.False(t, IsChannelCooling(42, "gpt-test"))
	state, found := GetChannelHealth(42, "gpt-test")
	require.True(t, found)
	require.Equal(t, 80.0, state.SuccessRate2m)
}

func TestModelUnavailableCoolsAfterFiveDistinctRequests(t *testing.T) {
	require.NoError(t, resetChannelHealthForTest())
	t.Cleanup(func() { require.NoError(t, resetChannelHealthForTest()) })

	for requestID := 1; requestID < channelHealthFailureThreshold; requestID++ {
		require.False(t, RecordChannelModelUnavailable(42, "gpt-unavailable", strconv.Itoa(requestID)))
	}
	require.False(t, IsChannelCooling(42, "gpt-unavailable"))
	require.True(t, RecordChannelModelUnavailable(42, "gpt-unavailable", "5"))
	require.True(t, IsChannelCooling(42, "gpt-unavailable"))
	require.False(t, IsChannelCooling(42, "gpt-available"))

	state, found := GetChannelHealth(42, "gpt-unavailable")
	require.True(t, found)
	require.Equal(t, ChannelHealthCooling, state.State)
	require.WithinDuration(t, time.Now().Add(channelModelUnavailableTTL), state.CoolingUntil, time.Second)
}

func TestModelUnavailableRetriesWithinOneRequestCountOnce(t *testing.T) {
	require.NoError(t, resetChannelHealthForTest())
	t.Cleanup(func() { require.NoError(t, resetChannelHealthForTest()) })

	for range 3 {
		require.False(t, RecordChannelModelUnavailable(42, "gpt-unavailable", "request-1"))
	}
	state, found := GetChannelHealth(42, "gpt-unavailable")
	require.True(t, found)
	require.Equal(t, 1, state.ConsecutiveRetryableFailures)
}

func TestCoolChannelModelForUpstreamFailureLeavesOtherModelsHealthy(t *testing.T) {
	require.NoError(t, resetChannelHealthForTest())
	t.Cleanup(func() { require.NoError(t, resetChannelHealthForTest()) })

	require.True(t, CoolChannelModelForUpstreamFailure(42, "gpt-unavailable"))
	require.True(t, IsChannelCooling(42, "gpt-unavailable"))
	require.False(t, IsChannelCooling(42, "gpt-available"))

	state, found := GetChannelHealth(42, "gpt-unavailable")
	require.True(t, found)
	require.Equal(t, ChannelHealthCooling, state.State)
	require.WithinDuration(t, time.Now().Add(channelModelUpstreamFailureTTL), state.CoolingUntil, time.Second)
}
