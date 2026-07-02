package controller

import (
	"net/http"
	"sort"
	"strings"
	"time"

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
	const successSampleMinutes = 60
	const successSegmentCount = 1
	const timelineSampleMinutes = 24 * 60
	const timelineSegmentCount = 24
	groupNames, err := resolveVisibleGroupStatusGroups(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	groupSummaries, err := model.GetGroupModelStatusSummaries(groupNames)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	successRates, _, requestCounts, sampleWindowHours, _ := queryGroupModelRecentHealth(groupNames, successSampleMinutes, successSegmentCount)
	_, seriesByModel, _, seriesWindowHours, bucketSeconds := queryGroupModelRecentHealth(groupNames, timelineSampleMinutes, timelineSegmentCount)
	ensureObservedModelsInSummaries(groupSummaries, groupNames, requestCounts, seriesByModel)
	result := make([]userGroupStatusItem, 0, len(groupNames))
	for _, groupName := range groupNames {
		modelSummaries := groupSummaries[groupName]
		modelItems := make([]userGroupModelStatusItem, 0, len(modelSummaries))
		groupStatus := "unknown"
		groupRequestCount := int64(0)

		sort.Slice(modelSummaries, func(i, j int) bool {
			left := modelStatusWeight(modelSummaries[i].Status)
			right := modelStatusWeight(modelSummaries[j].Status)
			if left != right {
				return left < right
			}
			return modelSummaries[i].Model < modelSummaries[j].Model
		})

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

func resolveVisibleGroupStatusGroups(c *gin.Context) ([]string, error) {
	userID := c.GetInt("id")
	if userID <= 0 {
		return model.ListGroupStatusGroups()
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

func ensureObservedModelsInSummaries(
	summaries map[string][]*model.GroupModelStatusSummary,
	groupNames []string,
	requestCounts map[string]int64,
	seriesByModel map[string][]userGroupStatusBucket,
) {
	visibleGroups := make(map[string]struct{}, len(groupNames))
	knownModels := make(map[string]map[string]struct{}, len(groupNames))
	for _, groupName := range groupNames {
		visibleGroups[groupName] = struct{}{}
		knownModels[groupName] = make(map[string]struct{})
		for _, summary := range summaries[groupName] {
			knownModels[groupName][summary.Model] = struct{}{}
		}
	}
	for key := range seriesByModel {
		addObservedModelSummary(summaries, visibleGroups, knownModels, key)
	}
	for key := range requestCounts {
		addObservedModelSummary(summaries, visibleGroups, knownModels, key)
	}
}

func addObservedModelSummary(
	summaries map[string][]*model.GroupModelStatusSummary,
	visibleGroups map[string]struct{},
	knownModels map[string]map[string]struct{},
	key string,
) {
	parts := strings.SplitN(key, "::", 2)
	if len(parts) != 2 {
		return
	}
	groupName, modelName := strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
	if groupName == "" || modelName == "" {
		return
	}
	if _, ok := visibleGroups[groupName]; !ok {
		return
	}
	if _, ok := knownModels[groupName][modelName]; ok {
		return
	}
	knownModels[groupName][modelName] = struct{}{}
	summaries[groupName] = append(summaries[groupName], &model.GroupModelStatusSummary{
		Group:           groupName,
		Model:           modelName,
		Status:          "healthy",
		Channels:        0,
		EnabledChannels: 0,
	})
}

func queryGroupModelRecentHealth(groupNames []string, sampleMinutes int, segmentCount int) (map[string]*float64, map[string][]userGroupStatusBucket, map[string]int64, float64, int64) {
	rates := make(map[string]*float64)
	seriesByModel := make(map[string][]userGroupStatusBucket)
	requestCounts := make(map[string]int64)
	if len(groupNames) == 0 {
		return rates, seriesByModel, requestCounts, 0, 60
	}
	if segmentCount <= 0 {
		segmentCount = 20
	}
	windowSeconds := int64(sampleMinutes * 60)
	bucketSeconds := windowSeconds / int64(segmentCount)
	if windowSeconds%int64(segmentCount) != 0 {
		bucketSeconds++
	}
	if bucketSeconds < 60 {
		bucketSeconds = 60
	}
	sampleWindowHours := float64(windowSeconds) / 3600
	now := time.Now().Unix()
	windowStart := now - windowSeconds
	if fillGroupModelPerfHealth(rates, seriesByModel, requestCounts, windowStart, now+1, bucketSeconds, segmentCount, groupNames) {
		return rates, seriesByModel, requestCounts, sampleWindowHours, bucketSeconds
	}
	fillGroupModelLogHealth(rates, seriesByModel, requestCounts, windowStart, now+1, bucketSeconds, segmentCount, groupNames)
	return rates, seriesByModel, requestCounts, sampleWindowHours, bucketSeconds
}

func fillGroupModelPerfHealth(
	rates map[string]*float64,
	seriesByModel map[string][]userGroupStatusBucket,
	requestCounts map[string]int64,
	windowStart int64,
	windowEnd int64,
	bucketSeconds int64,
	segmentCount int,
	groupNames []string,
) bool {
	rows, err := model.GetPerfMetricsBucketsByGroups(windowStart, windowEnd, groupNames)
	if err != nil || len(rows) == 0 {
		return false
	}

	successCounts := make(map[string]int64)
	for _, row := range rows {
		bucketIndex := (row.BucketTs - windowStart) / bucketSeconds
		if bucketIndex < 0 || bucketIndex >= int64(segmentCount) {
			continue
		}
		key := row.Group + "::" + row.ModelName
		if _, ok := seriesByModel[key]; !ok {
			seriesByModel[key] = buildStatusSeries(windowStart, segmentCount, bucketSeconds)
		}
		bucket := &seriesByModel[key][bucketIndex]
		bucket.RequestCount += row.RequestCount
		if row.RequestCount > 0 {
			rate := float64(row.SuccessCount) / float64(row.RequestCount) * 100
			bucket.SuccessRate = &rate
			requestCounts[key] += row.RequestCount
			successCounts[key] += row.SuccessCount
		}
	}
	applyGroupModelRates(rates, requestCounts, successCounts)
	return len(requestCounts) > 0
}

func fillGroupModelLogHealth(
	rates map[string]*float64,
	seriesByModel map[string][]userGroupStatusBucket,
	requestCounts map[string]int64,
	windowStart int64,
	windowEnd int64,
	bucketSeconds int64,
	segmentCount int,
	groupNames []string,
) {
	rows, err := model.GetGroupModelRequestBuckets(windowStart, windowEnd, bucketSeconds, groupNames)
	if err != nil {
		return
	}

	successCounts := make(map[string]int64)
	for _, row := range rows {
		if row.BucketIndex < 0 || row.BucketIndex >= int64(segmentCount) {
			continue
		}
		key := row.GroupName + "::" + row.ModelName
		if _, ok := seriesByModel[key]; !ok {
			seriesByModel[key] = buildStatusSeries(windowStart, segmentCount, bucketSeconds)
		}
		bucket := &seriesByModel[key][row.BucketIndex]
		bucket.RequestCount += row.RequestCount
		if row.RequestCount > 0 {
			rate := float64(row.SuccessCount) / float64(row.RequestCount) * 100
			bucket.SuccessRate = &rate
			requestCounts[key] += row.RequestCount
			successCounts[key] += row.SuccessCount
		}
	}
	applyGroupModelRates(rates, requestCounts, successCounts)
}

func applyGroupModelRates(rates map[string]*float64, requestCounts map[string]int64, successCounts map[string]int64) {
	for key, requestCount := range requestCounts {
		if requestCount > 0 {
			rate := float64(successCounts[key]) / float64(requestCount) * 100
			rates[key] = &rate
		}
	}
}

func modelStatusWeight(status string) int {
	switch status {
	case "degraded":
		return 0
	case "slow":
		return 1
	case "unknown":
		return 2
	default:
		return 3
	}
}

func resolveGroupModelStatus(baseStatus string, successRate *float64, requestCount int64) string {
	if baseStatus == "degraded" {
		return "degraded"
	}
	if requestCount <= 0 || successRate == nil {
		return "unknown"
	}
	if *successRate >= 85 {
		return "healthy"
	}
	if *successRate >= 30 {
		return "slow"
	}
	return "degraded"
}

func buildStatusSeries(windowStart int64, segmentCount int, bucketSeconds int64) []userGroupStatusBucket {
	series := make([]userGroupStatusBucket, 0, segmentCount)
	for index := 0; index < segmentCount; index++ {
		series = append(series, userGroupStatusBucket{
			Ts:           windowStart + int64(index)*bucketSeconds,
			SuccessRate:  nil,
			RequestCount: 0,
		})
	}
	return series
}

func emptyStatusSeries(sampleMinutes int, segmentCount int, bucketSeconds int64) []userGroupStatusBucket {
	windowStart := time.Now().Unix() - int64(sampleMinutes*60)
	return buildStatusSeries(windowStart, segmentCount, bucketSeconds)
}
