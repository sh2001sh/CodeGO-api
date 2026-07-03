package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/model"
)

func collectPricingGroups(pricing []model.Pricing) []string {
	groups := make(map[string]struct{})
	for _, item := range pricing {
		for _, groupName := range item.EnableGroup {
			groupName = strings.TrimSpace(groupName)
			if groupName == "" || groupName == "auto" || groupName == "all" {
				continue
			}
			groups[groupName] = struct{}{}
		}
	}
	return sortedGroupStatusNames(groups)
}

func buildPricingGroupModelSummaries(
	pricing []model.Pricing,
	groupNames []string,
) map[string][]*model.GroupModelStatusSummary {
	if len(groupNames) == 0 {
		groupNames = collectPricingGroups(pricing)
	}
	summaries := make(map[string][]*model.GroupModelStatusSummary, len(groupNames))
	visibleGroups := make(map[string]struct{}, len(groupNames))
	knownModels := make(map[string]map[string]struct{}, len(groupNames))
	for _, groupName := range groupNames {
		summaries[groupName] = []*model.GroupModelStatusSummary{}
		visibleGroups[groupName] = struct{}{}
		knownModels[groupName] = make(map[string]struct{})
	}

	if len(groupNames) == 0 {
		return summaries
	}

	for _, item := range pricing {
		targetGroups := pricingTargetGroups(item.EnableGroup, groupNames, visibleGroups)
		if len(targetGroups) == 0 {
			continue
		}
		for _, groupName := range targetGroups {
			if _, ok := knownModels[groupName][item.ModelName]; ok {
				continue
			}
			knownModels[groupName][item.ModelName] = struct{}{}
			summaries[groupName] = append(summaries[groupName], &model.GroupModelStatusSummary{
				Group:           groupName,
				Model:           item.ModelName,
				Status:          "healthy",
				Channels:        0,
				EnabledChannels: 0,
			})
		}
	}

	return summaries
}

func pricingTargetGroups(enableGroups []string, groupNames []string, visibleGroups map[string]struct{}) []string {
	targets := make([]string, 0, len(enableGroups))
	seen := make(map[string]struct{}, len(enableGroups))
	allGroups := len(groupNames) > 0
	for _, groupName := range enableGroups {
		groupName = strings.TrimSpace(groupName)
		if groupName == "" || groupName == "auto" {
			continue
		}
		if groupName == "all" {
			if allGroups {
				for _, visibleGroup := range groupNames {
					if _, ok := seen[visibleGroup]; ok {
						continue
					}
					if _, ok := visibleGroups[visibleGroup]; !ok {
						continue
					}
					seen[visibleGroup] = struct{}{}
					targets = append(targets, visibleGroup)
				}
			}
			continue
		}
		if _, ok := visibleGroups[groupName]; !ok {
			continue
		}
		if _, ok := seen[groupName]; ok {
			continue
		}
		seen[groupName] = struct{}{}
		targets = append(targets, groupName)
	}
	return targets
}
