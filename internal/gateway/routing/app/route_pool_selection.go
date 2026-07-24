package app

import (
	"encoding/json"
	"math"
	"math/rand"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	gatewayruntime "github.com/sh2001sh/new-api/internal/gateway/runtime"
	gatewayschema "github.com/sh2001sh/new-api/internal/gateway/schema"
	gatewaystore "github.com/sh2001sh/new-api/internal/gateway/store"
)

const (
	routePoolExploreRate = 0.08
	routePoolProbeRate   = 0.02
	routePoolContextKey  = "automatic_route_pool_selection"
)

type scoredRoutePoolCandidate struct {
	channel *gatewayschema.Channel
	score   float64
	probe   bool
	cost    float64
}

// RoutePoolSelection is request-local and consumed only by settlement code.
type RoutePoolSelection struct {
	PoolID                    int64
	ProcurementCostMultiplier float64
}

// selectAutomaticPoolChannel returns managed=true when the group has an enabled
// automatic pool. In that case priority and weight are deliberately ignored.
func selectAutomaticPoolChannel(c *gin.Context, group, modelName string) (*gatewayschema.Channel, bool, error) {
	detail, err := gatewaystore.LoadEnabledRoutePool(group)
	if err != nil || detail == nil {
		return nil, detail != nil, err
	}
	candidates, err := gatewaystore.LoadRoutePoolCandidates(group, modelName, detail)
	if err != nil {
		return nil, true, err
	}
	now := time.Now()
	healthy := make([]scoredRoutePoolCandidate, 0, len(candidates))
	probes := make([]scoredRoutePoolCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		if channelAlreadyUsed(c, candidate.Channel.Id) {
			continue
		}
		health, found := gatewayruntime.GetChannelHealth(candidate.Channel.Id, modelName)
		if found && health.State == gatewayruntime.ChannelHealthCooling {
			if health.CoolingUntil.After(now) {
				continue
			}
			cost := routePoolModelCost(candidate.Member, modelName)
			probes = append(probes, scoredRoutePoolCandidate{channel: candidate.Channel, score: effectiveRoutePoolCost(candidate.Member, modelName, health), probe: true, cost: cost})
			continue
		}
		cost := routePoolModelCost(candidate.Member, modelName)
		healthy = append(healthy, scoredRoutePoolCandidate{channel: candidate.Channel, score: effectiveRoutePoolCost(candidate.Member, modelName, health), cost: cost})
	}

	applyRoutePoolTTFTPenalty(healthy, modelName)
	applyRoutePoolTTFTPenalty(probes, modelName)
	if len(healthy) == 0 {
		return selectRoutePoolCandidate(c, detail.Pool.ID, chooseLowestRoutePoolCandidate(probes)), true, nil
	}
	if len(probes) > 0 && rand.Float64() < routePoolProbeRate {
		return selectRoutePoolCandidate(c, detail.Pool.ID, chooseLowestRoutePoolCandidate(probes)), true, nil
	}
	return selectRoutePoolCandidate(c, detail.Pool.ID, chooseRoutePoolHealthyCandidate(healthy)), true, nil
}

func selectRoutePoolCandidate(c *gin.Context, poolID int64, candidate *scoredRoutePoolCandidate) *gatewayschema.Channel {
	if candidate == nil {
		return nil
	}
	if c != nil {
		c.Set(routePoolContextKey, RoutePoolSelection{PoolID: poolID, ProcurementCostMultiplier: candidate.cost})
	}
	return candidate.channel
}

// GetRoutePoolSelection returns the selected procurement snapshot for the request.
func GetRoutePoolSelection(c *gin.Context) (RoutePoolSelection, bool) {
	if c == nil {
		return RoutePoolSelection{}, false
	}
	value, ok := c.Get(routePoolContextKey)
	if !ok {
		return RoutePoolSelection{}, false
	}
	selection, ok := value.(RoutePoolSelection)
	return selection, ok && selection.PoolID > 0 && selection.ProcurementCostMultiplier > 0
}

func chooseRoutePoolHealthyCandidate(candidates []scoredRoutePoolCandidate) *scoredRoutePoolCandidate {
	if len(candidates) == 0 {
		return nil
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].score < candidates[j].score })
	best := candidates[0]
	if len(candidates) == 1 || rand.Float64() >= routePoolExploreRate {
		return &best
	}
	limit := best.score * 1.15
	explorable := make([]scoredRoutePoolCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		if candidate.score <= limit {
			explorable = append(explorable, candidate)
		}
	}
	if len(explorable) == 0 {
		return &best
	}
	selected := explorable[rand.Intn(len(explorable))]
	return &selected
}

func chooseLowestRoutePoolCandidate(candidates []scoredRoutePoolCandidate) *scoredRoutePoolCandidate {
	if len(candidates) == 0 {
		return nil
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].score < candidates[j].score })
	return &candidates[0]
}

func effectiveRoutePoolCost(member gatewayschema.RoutePoolMember, modelName string, health gatewayruntime.ChannelHealth) float64 {
	cost := routePoolModelCost(member, modelName)
	if cost <= 0 {
		cost = 1
	}
	if health.Window5Requests < 20 {
		cost *= 1.10
	}
	if health.Window5Requests >= 5 {
		switch {
		case health.SuccessRate5m >= 98:
		case health.SuccessRate5m >= 95:
			cost *= 1.2
		default:
			cost *= 2.5
		}
	}
	if health.State == gatewayruntime.ChannelHealthDegraded {
		cost *= 1.35
	}
	if health.ConsecutiveRetryableFailures > 0 {
		cost *= math.Pow(1.25, float64(health.ConsecutiveRetryableFailures))
	}
	return cost
}

func routePoolModelCost(member gatewayschema.RoutePoolMember, modelName string) float64 {
	cost := member.CostMultiplier
	var overrides map[string]float64
	if err := json.Unmarshal([]byte(member.ModelCostOverrides), &overrides); err == nil {
		if override, ok := overrides[modelName]; ok && override > 0 {
			cost = override
		}
	}
	return cost
}

func applyRoutePoolTTFTPenalty(candidates []scoredRoutePoolCandidate, modelName string) {
	if len(candidates) < 2 {
		return
	}
	values := make([]float64, 0, len(candidates))
	for _, candidate := range candidates {
		health, found := gatewayruntime.GetChannelHealth(candidate.channel.Id, modelName)
		if found && health.TTFTP95Milliseconds > 0 {
			values = append(values, health.TTFTP95Milliseconds)
		}
	}
	if len(values) == 0 {
		return
	}
	sort.Float64s(values)
	median := values[(len(values)-1)/2]
	if median <= 0 {
		return
	}
	for index := range candidates {
		health, found := gatewayruntime.GetChannelHealth(candidates[index].channel.Id, modelName)
		if !found || health.TTFTP95Milliseconds <= 0 {
			continue
		}
		ratio := health.TTFTP95Milliseconds / median
		switch {
		case ratio > 2.5:
			candidates[index].score *= 1.5
		case ratio > 1.5:
			candidates[index].score *= 1.15
		}
	}
}

func channelAlreadyUsed(c *gin.Context, channelID int) bool {
	if c == nil || channelID <= 0 {
		return false
	}
	needle := strconv.Itoa(channelID)
	for _, used := range c.GetStringSlice("use_channel") {
		if strings.TrimSpace(used) == needle {
			return true
		}
	}
	return false
}
