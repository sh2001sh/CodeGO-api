package runtime

import (
	"strconv"
	"sync"
	"time"

	"github.com/samber/hot"
	platformcache "github.com/sh2001sh/new-api/internal/platform/cache"
	"github.com/sh2001sh/new-api/internal/platform/cachex"
)

const (
	ChannelHealthHealthy  = "healthy"
	ChannelHealthDegraded = "degraded"
	ChannelHealthCooling  = "cooling"

	channelHealthFailureThreshold = 3
	channelHealthCooldownDuration = 2 * time.Minute
	channelHealthTTL              = 20 * time.Minute
)

// ChannelHealth captures the shared routing health for one channel/model pair.
// It deliberately excludes provider credentials and other user-visible details.
type ChannelHealth struct {
	ChannelID                    int       `json:"channel_id"`
	Model                        string    `json:"model"`
	State                        string    `json:"state"`
	ConsecutiveRetryableFailures int       `json:"consecutive_retryable_failures"`
	CoolingUntil                 time.Time `json:"cooling_until"`
	SuccessRate5m                float64   `json:"success_rate_5m"`
	SuccessRate15m               float64   `json:"success_rate_15m"`
	TTFTEWMAMilliseconds         float64   `json:"ttft_ewma_ms"`
	LastSuccessAt                time.Time `json:"last_success_at"`
	LastFailureAt                time.Time `json:"last_failure_at"`

	Window5StartedAt  time.Time `json:"window_5_started_at"`
	Window5Requests   int       `json:"window_5_requests"`
	Window5Successes  int       `json:"window_5_successes"`
	Window15StartedAt time.Time `json:"window_15_started_at"`
	Window15Requests  int       `json:"window_15_requests"`
	Window15Successes int       `json:"window_15_successes"`
}

var (
	channelHealthCacheOnce sync.Once
	channelHealthCache     *cachex.HybridCache[ChannelHealth]
	channelHealthLocks     [64]sync.Mutex
)

func channelHealthKey(channelID int, model string) string {
	return strconv.Itoa(channelID) + "\x00" + model
}

func getChannelHealthCache() *cachex.HybridCache[ChannelHealth] {
	channelHealthCacheOnce.Do(func() {
		channelHealthCache = cachex.NewHybridCache[ChannelHealth](cachex.HybridCacheConfig[ChannelHealth]{
			Namespace:  cachex.Namespace("new-api:channel_health:v1"),
			Redis:      platformcache.RDB,
			RedisCodec: cachex.JSONCodec[ChannelHealth]{},
			RedisEnabled: func() bool {
				return platformcache.RedisEnabled && platformcache.RDB != nil
			},
			Memory: func() *hot.HotCache[string, ChannelHealth] {
				return hot.NewHotCache[string, ChannelHealth](hot.LRU, 100_000).
					WithTTL(channelHealthTTL).
					WithJanitor().
					Build()
			},
		})
	})
	return channelHealthCache
}

func channelHealthLock(channelID int) *sync.Mutex {
	return &channelHealthLocks[channelID%len(channelHealthLocks)]
}

// GetChannelHealth returns the last shared health state for a channel/model pair.
func GetChannelHealth(channelID int, model string) (ChannelHealth, bool) {
	if channelID <= 0 || model == "" {
		return ChannelHealth{}, false
	}
	state, found, err := getChannelHealthCache().Get(channelHealthKey(channelID, model))
	return state, found && err == nil
}

// IsChannelCooling reports whether routing must skip the channel/model pair.
func IsChannelCooling(channelID int, model string) bool {
	state, found := GetChannelHealth(channelID, model)
	return found && state.CoolingUntil.After(time.Now())
}

// RecordChannelRetryableFailure advances the shared circuit for a retryable upstream error.
func RecordChannelRetryableFailure(channelID int, model string) {
	if channelID <= 0 || model == "" {
		return
	}
	lock := channelHealthLock(channelID)
	lock.Lock()
	defer lock.Unlock()

	now := time.Now().UTC()
	_ = getChannelHealthCache().UpdateWithTTL(channelHealthKey(channelID, model), channelHealthTTL, func(state ChannelHealth, _ bool) (ChannelHealth, error) {
		state.ChannelID = channelID
		state.Model = model
		state.LastFailureAt = now
		recordChannelHealthWindow(&state, now, false)
		if state.CoolingUntil.After(now) {
			return state, nil
		}
		state.ConsecutiveRetryableFailures++
		if state.ConsecutiveRetryableFailures >= channelHealthFailureThreshold {
			state.ConsecutiveRetryableFailures = 0
			state.CoolingUntil = now.Add(channelHealthCooldownDuration)
			state.State = ChannelHealthCooling
		} else if state.SuccessRate5m > 0 && state.SuccessRate5m < 85 {
			state.State = ChannelHealthDegraded
		} else {
			state.State = ChannelHealthHealthy
		}
		return state, nil
	})
}

// RecordChannelSuccess closes the circuit immediately after the upstream has accepted a request.
func RecordChannelSuccess(channelID int, model string, ttft time.Duration) {
	if channelID <= 0 || model == "" {
		return
	}
	lock := channelHealthLock(channelID)
	lock.Lock()
	defer lock.Unlock()

	now := time.Now().UTC()
	_ = getChannelHealthCache().UpdateWithTTL(channelHealthKey(channelID, model), channelHealthTTL, func(state ChannelHealth, _ bool) (ChannelHealth, error) {
		state.ChannelID = channelID
		state.Model = model
		state.State = ChannelHealthHealthy
		state.ConsecutiveRetryableFailures = 0
		state.CoolingUntil = time.Time{}
		state.LastSuccessAt = now
		recordChannelHealthWindow(&state, now, true)
		if ttft > 0 {
			value := float64(ttft.Milliseconds())
			if state.TTFTEWMAMilliseconds == 0 {
				state.TTFTEWMAMilliseconds = value
			} else {
				state.TTFTEWMAMilliseconds = state.TTFTEWMAMilliseconds*0.8 + value*0.2
			}
		}
		return state, nil
	})
}

func recordChannelHealthWindow(state *ChannelHealth, now time.Time, success bool) {
	if state.Window5StartedAt.IsZero() || now.Sub(state.Window5StartedAt) >= 5*time.Minute {
		state.Window5StartedAt = now
		state.Window5Requests = 0
		state.Window5Successes = 0
	}
	if state.Window15StartedAt.IsZero() || now.Sub(state.Window15StartedAt) >= 15*time.Minute {
		state.Window15StartedAt = now
		state.Window15Requests = 0
		state.Window15Successes = 0
	}
	state.Window5Requests++
	state.Window15Requests++
	if success {
		state.Window5Successes++
		state.Window15Successes++
	}
	state.SuccessRate5m = float64(state.Window5Successes) / float64(state.Window5Requests) * 100
	state.SuccessRate15m = float64(state.Window15Successes) / float64(state.Window15Requests) * 100
}

func resetChannelHealthForTest() error {
	if channelHealthCache != nil {
		if err := channelHealthCache.Purge(); err != nil {
			return err
		}
	}
	channelHealthCacheOnce = sync.Once{}
	channelHealthCache = nil
	return nil
}
