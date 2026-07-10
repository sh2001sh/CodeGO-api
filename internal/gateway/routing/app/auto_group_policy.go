package app

import (
	"sort"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/constant"
	platformhttpctx "github.com/sh2001sh/new-api/internal/platform/transport/http/httpctx"
)

const (
	autoGroupFailureThreshold = 3
	autoGroupCooldownDuration = 2 * time.Minute
)

type autoGroupCircuit struct {
	consecutiveFailures int
	cooldownUntil       time.Time
}

var autoGroupCircuits = struct {
	sync.RWMutex
	items map[string]autoGroupCircuit
}{items: make(map[string]autoGroupCircuit)}

func autoGroupCircuitKey(group string, model string) string {
	return group + "\x00" + model
}

func isAutoGroupCooling(group string, model string, now time.Time) bool {
	autoGroupCircuits.RLock()
	defer autoGroupCircuits.RUnlock()
	return autoGroupCircuits.items[autoGroupCircuitKey(group, model)].cooldownUntil.After(now)
}

func recordAutoGroupSuccess(group string, model string) {
	if group == "" || model == "" {
		return
	}
	autoGroupCircuits.Lock()
	delete(autoGroupCircuits.items, autoGroupCircuitKey(group, model))
	autoGroupCircuits.Unlock()
}

func recordAutoGroupFailure(group string, model string, now time.Time) {
	if group == "" || model == "" {
		return
	}

	key := autoGroupCircuitKey(group, model)
	autoGroupCircuits.Lock()
	defer autoGroupCircuits.Unlock()

	state := autoGroupCircuits.items[key]
	if state.cooldownUntil.After(now) {
		return
	}
	state.consecutiveFailures++
	if state.consecutiveFailures >= autoGroupFailureThreshold {
		state.consecutiveFailures = 0
		state.cooldownUntil = now.Add(autoGroupCooldownDuration)
	}
	autoGroupCircuits.items[key] = state
}

// OrderAutoGroups returns permitted auto groups ordered by availability policy.
// Lower effective user pricing is preferred unless that group/model is cooling.
func OrderAutoGroups(userGroup string, model string) []string {
	groups := GetUserAutoGroup(userGroup)
	now := time.Now()
	sort.SliceStable(groups, func(i, j int) bool {
		leftCooling := isAutoGroupCooling(groups[i], model, now)
		rightCooling := isAutoGroupCooling(groups[j], model, now)
		if leftCooling != rightCooling {
			return !leftCooling
		}
		return GetUserGroupRatio(userGroup, groups[i]) < GetUserGroupRatio(userGroup, groups[j])
	})
	return groups
}

func selectedAutoGroup(ctx *gin.Context) string {
	if ctx == nil || platformhttpctx.GetContextKeyString(ctx, constant.ContextKeyTokenGroup) != AutoGroupName {
		return ""
	}
	return platformhttpctx.GetContextKeyString(ctx, constant.ContextKeyAutoGroup)
}

// RecordAutoGroupSuccess closes the model-specific circuit after a successful relay.
func RecordAutoGroupSuccess(ctx *gin.Context, model string) {
	recordAutoGroupSuccess(selectedAutoGroup(ctx), model)
}

// RecordAutoGroupFailure advances the model-specific circuit after a retryable relay failure.
func RecordAutoGroupFailure(ctx *gin.Context, model string) {
	recordAutoGroupFailure(selectedAutoGroup(ctx), model, time.Now())
}
