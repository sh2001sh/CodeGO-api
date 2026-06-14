package controller

import (
	"net/http"
	"sort"
	"time"

	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

type userGroupModelStatusItem struct {
	Model         string                  `json:"model"`
	Status        string                  `json:"status"`
	SuccessRate   *float64                `json:"success_rate"`
	SampleHours   float64                 `json:"sample_window"`
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
	const sampleMinutes = 30
	const segmentCount = 20
	groupNames, err := model.ListGroupStatusGroups()
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

	successRates, seriesByModel, requestCounts, sampleWindowHours, bucketSeconds := queryGroupModelRecentHealth(groupNames, sampleMinutes, segmentCount)
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
				series = emptyStatusSeries(sampleMinutes, segmentCount, bucketSeconds)
			}
			modelItems = append(modelItems, userGroupModelStatusItem{
				Model:         summary.Model,
				Status:        modelStatus,
				SuccessRate:   modelRate,
				SampleHours:   sampleWindowHours,
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
	rows, err := model.GetGroupModelRequestBuckets(windowStart, now+1, bucketSeconds, groupNames)
	if err != nil {
		return rates, seriesByModel, requestCounts, sampleWindowHours, bucketSeconds
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
		bucket.RequestCount = row.RequestCount
		if row.RequestCount > 0 {
			rate := float64(row.SuccessCount) / float64(row.RequestCount) * 100
			bucket.SuccessRate = &rate
			requestCounts[key] += row.RequestCount
			successCounts[key] += row.SuccessCount
		}
	}

	for key, requestCount := range requestCounts {
		if requestCount > 0 {
			rate := float64(successCounts[key]) / float64(requestCount) * 100
			rates[key] = &rate
		}
	}

	return rates, seriesByModel, requestCounts, sampleWindowHours, bucketSeconds
}

func modelStatusWeight(status string) int {
	switch status {
	case "degraded":
		return 0
	case "unknown":
		return 1
	default:
		return 2
	}
}

func resolveGroupModelStatus(baseStatus string, successRate *float64, requestCount int64) string {
	if baseStatus == "degraded" {
		return "degraded"
	}
	if requestCount <= 0 || successRate == nil {
		return "unknown"
	}
	if *successRate >= 95 {
		return "healthy"
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
