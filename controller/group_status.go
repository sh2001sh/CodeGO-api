package controller

import (
	"net/http"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

type userGroupModelStatusItem struct {
	Model         string                  `json:"model"`
	Status        string                  `json:"status"`
	SuccessRate   *float64                `json:"success_rate"`
	SampleHours   float64                 `json:"sample_window"`
	SeriesWindow  float64                 `json:"series_window"`
	BucketSeconds int64                   `json:"bucket_seconds"`
	RequestCount  int64                   `json:"request_count"`
	Series        []userGroupStatusBucket `json:"series"`
}

type userGroupStatusItem struct {
	Group        string                     `json:"group"`
	Status       string                     `json:"status"`
	RequestCount int64                      `json:"request_count"`
	Models       []userGroupModelStatusItem `json:"models"`
}

type userGroupStatusBucket struct {
	Ts           int64    `json:"ts"`
	SuccessRate  *float64 `json:"success_rate"`
	RequestCount int64    `json:"request_count"`
}

func GetUserGroupStatus(c *gin.Context) {
	const successSampleMinutes = 30
	const successSegmentCount = 1
	const timelineSampleMinutes = 24 * 60
	const timelineSegmentCount = 48

	pricing := model.GetPricing()
	groupNames, err := resolveVisibleGroupStatusGroups(c, pricing)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	groupSummaries := buildPricingGroupModelSummaries(pricing, groupNames)

	successRates, _, requestCounts, sampleWindowHours, _ := queryGroupModelRecentHealth(groupNames, successSampleMinutes, successSegmentCount)
	_, seriesByModel, _, seriesWindowHours, bucketSeconds := queryGroupModelRecentHealth(groupNames, timelineSampleMinutes, timelineSegmentCount)

	result := make([]userGroupStatusItem, 0, len(groupNames))
	for _, groupName := range groupNames {
		modelSummaries := groupSummaries[groupName]

		modelItems := make([]userGroupModelStatusItem, 0, len(modelSummaries))
		groupStatus := "unknown"
		groupRequestCount := int64(0)

		for _, summary := range modelSummaries {
			key := groupName + "::" + summary.Model
			modelRequestCount := requestCounts[key]
			modelRate := successRates[key]
			modelStatus := resolveGroupModelStatus(summary.Status, modelRate, modelRequestCount)
			if groupStatus == "unknown" || modelStatusWeight(modelStatus) < modelStatusWeight(groupStatus) {
				groupStatus = modelStatus
			}
			groupRequestCount += modelRequestCount

			series := seriesByModel[key]
			if len(series) == 0 {
				series = emptyStatusSeries(timelineSampleMinutes, timelineSegmentCount, bucketSeconds)
			}

			modelItems = append(modelItems, userGroupModelStatusItem{
				Model:         summary.Model,
				Status:        modelStatus,
				SuccessRate:   modelRate,
				SampleHours:   sampleWindowHours,
				SeriesWindow:  seriesWindowHours,
				BucketSeconds: bucketSeconds,
				RequestCount:  modelRequestCount,
				Series:        series,
			})
		}

		sort.Slice(modelItems, func(i, j int) bool {
			if modelItems[i].RequestCount != modelItems[j].RequestCount {
				return modelItems[i].RequestCount > modelItems[j].RequestCount
			}
			left := modelStatusWeight(modelItems[i].Status)
			right := modelStatusWeight(modelItems[j].Status)
			if left != right {
				return left < right
			}
			return modelItems[i].Model < modelItems[j].Model
		})

		result = append(result, userGroupStatusItem{
			Group:        groupName,
			Status:       groupStatus,
			RequestCount: groupRequestCount,
			Models:       modelItems,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].RequestCount == result[j].RequestCount {
			return result[i].Group < result[j].Group
		}
		return result[i].RequestCount > result[j].RequestCount
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}

func resolveVisibleGroupStatusGroups(c *gin.Context, pricing []model.Pricing) ([]string, error) {
	userID := c.GetInt("id")
	if userID <= 0 {
		groups := collectPricingGroups(pricing)
		if len(groups) == 0 {
			return model.ListGroupStatusGroups()
		}
		return groups, nil
	}
	userGroup, err := model.GetUserGroup(userID, false)
	if err != nil {
		return nil, err
	}
	groups := make(map[string]struct{})
	for groupName := range service.GetUserUsableGroups(userGroup) {
		if groupName == "auto" {
			for _, autoGroup := range service.GetUserAutoGroup(userGroup) {
				addGroupStatusName(groups, autoGroup)
			}
			continue
		}
		addGroupStatusName(groups, groupName)
	}
	addGroupStatusName(groups, userGroup)
	if len(groups) == 0 {
		for _, groupName := range collectPricingGroups(pricing) {
			addGroupStatusName(groups, groupName)
		}
	}
	if len(groups) == 0 {
		return model.ListGroupStatusGroups()
	}
	return sortedGroupStatusNames(groups), nil
}

func addGroupStatusName(groups map[string]struct{}, groupName string) {
	groupName = strings.TrimSpace(groupName)
	if groupName == "" || groupName == "auto" {
		return
	}
	groups[groupName] = struct{}{}
}

func sortedGroupStatusNames(groups map[string]struct{}) []string {
	result := make([]string, 0, len(groups))
	for groupName := range groups {
		result = append(result, groupName)
	}
	sort.Strings(result)
	return result
}
