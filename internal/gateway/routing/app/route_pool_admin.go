package app

import (
	"errors"
	"strings"

	gatewayruntime "github.com/sh2001sh/new-api/internal/gateway/runtime"
	gatewayschema "github.com/sh2001sh/new-api/internal/gateway/schema"
	gatewaystore "github.com/sh2001sh/new-api/internal/gateway/store"
)

type RoutePoolMetrics struct {
	PoolID  int64                    `json:"pool_id"`
	Group   string                   `json:"group"`
	Model   string                   `json:"model"`
	Members []RoutePoolMemberMetrics `json:"members"`
}

type RoutePoolMemberMetrics struct {
	ChannelID          int                          `json:"channel_id"`
	ChannelName        string                       `json:"channel_name"`
	Enabled            bool                         `json:"enabled"`
	Eligible           bool                         `json:"eligible"`
	CostMultiplier     float64                      `json:"cost_multiplier"`
	ModelCostOverrides string                       `json:"model_cost_overrides"`
	Score              float64                      `json:"score"`
	Health             gatewayruntime.ChannelHealth `json:"health"`
}

func ListRoutePools() ([]gatewaystore.RoutePoolDetail, error) {
	return gatewaystore.ListRoutePools()
}

func SaveRoutePool(pool gatewayschema.RoutePool, members []gatewayschema.RoutePoolMember) (*gatewaystore.RoutePoolDetail, error) {
	return gatewaystore.SaveRoutePool(&pool, members)
}

func DeleteRoutePool(id int64) error {
	return gatewaystore.DeleteRoutePool(id)
}

func GetRoutePoolMetrics(poolID int64, modelName string) (*RoutePoolMetrics, error) {
	modelName = strings.TrimSpace(modelName)
	if poolID <= 0 || modelName == "" {
		return nil, errors.New("route pool id and model are required")
	}
	pools, err := gatewaystore.ListRoutePools()
	if err != nil {
		return nil, err
	}
	var detail *gatewaystore.RoutePoolDetail
	for index := range pools {
		if pools[index].Pool.ID == poolID {
			detail = &pools[index]
			break
		}
	}
	if detail == nil {
		return nil, errors.New("route pool not found")
	}
	metrics := &RoutePoolMetrics{PoolID: detail.Pool.ID, Group: detail.Pool.Group, Model: modelName}
	scored := make([]scoredRoutePoolCandidate, 0, len(detail.Members))
	memberIndexes := make([]int, 0, len(detail.Members))
	for _, member := range detail.Members {
		metric := RoutePoolMemberMetrics{
			ChannelID:          member.ChannelID,
			Enabled:            member.Enabled,
			CostMultiplier:     member.CostMultiplier,
			ModelCostOverrides: member.ModelCostOverrides,
		}
		channel, channelErr := gatewaystore.GetCachedChannel(member.ChannelID)
		if channelErr == nil && channel != nil {
			metric.ChannelName = channel.Name
			metric.Eligible = member.Enabled && gatewaystore.IsChannelEnabledForGroupModel(detail.Pool.Group, modelName, member.ChannelID)
		}
		if health, found := gatewayruntime.GetChannelHealth(member.ChannelID, modelName); found {
			metric.Health = health
		}
		metrics.Members = append(metrics.Members, metric)
		if metric.Eligible {
			scored = append(scored, scoredRoutePoolCandidate{channel: channel, score: effectiveRoutePoolCost(member, modelName, metric.Health)})
			memberIndexes = append(memberIndexes, len(metrics.Members)-1)
		}
	}
	applyRoutePoolTTFTPenalty(scored, modelName)
	for index, candidate := range scored {
		metrics.Members[memberIndexes[index]].Score = candidate.score
	}
	return metrics, nil
}
