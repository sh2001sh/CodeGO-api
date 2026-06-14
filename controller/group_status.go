package controller

import (
	"net/http"
	"sort"
	"time"

	"github.com/QuantumNous/new-api/model"
	perfmetrics "github.com/QuantumNous/new-api/pkg/perf_metrics"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/perf_metrics_setting"

	"github.com/gin-gonic/gin"
)

type userGroupModelStatusItem struct {
	Model         string                  `json:"model"`
	Status        string                  `json:"status"`
	SuccessRate   *float64                `json:"success_rate"`
	SampleHours   float64                 `json:"sample_window"`
	BucketSeconds int64                   `json:"bucket_seconds"`
	Series        []userGroupStatusBucket `json:"series"`
}

type userGroupStatusItem struct {
	Group  string                     `json:"group"`
	Status string                     `json:"status"`
	Models []userGroupModelStatusItem `json:"models"`
}

type userGroupStatusBucket struct {
	Ts           int64    `json:"ts"`
	SuccessRate  *float64 `json:"success_rate"`
	RequestCount int64    `json:"request_count"`
}

func GetUserGroupStatus(c *gin.Context) {
	const sampleMinutes = 30
	userId := c.GetInt("id")
	userGroup, _ := model.GetUserGroup(userId, false)
	usableGroups := service.GetUserUsableGroups(userGroup)

	groupSummaries, err := model.GetGroupModelStatusSummaries(usableGroups)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	groupNames := make([]string, 0, len(groupSummaries))
	for groupName := range groupSummaries {
		groupNames = append(groupNames, groupName)
	}
	sort.Strings(groupNames)

	successRates, seriesByModel, sampleWindowHours, bucketSeconds := queryGroupModelRecentHealth(groupNames, sampleMinutes)
	result := make([]userGroupStatusItem, 0, len(groupNames))
	for _, groupName := range groupNames {
		modelSummaries := groupSummaries[groupName]
		modelItems := make([]userGroupModelStatusItem, 0, len(modelSummaries))
		groupStatus := "unknown"

		sort.Slice(modelSummaries, func(i, j int) bool {
			left := modelStatusWeight(modelSummaries[i].Status)
			right := modelStatusWeight(modelSummaries[j].Status)
			if left != right {
				return left < right
			}
			return modelSummaries[i].Model < modelSummaries[j].Model
		})

		for _, summary := range modelSummaries {
			if groupStatus == "unknown" || modelStatusWeight(summary.Status) < modelStatusWeight(groupStatus) {
				groupStatus = summary.Status
			}
			key := groupName + "::" + summary.Model
			modelItems = append(modelItems, userGroupModelStatusItem{
				Model:         summary.Model,
				Status:        summary.Status,
				SuccessRate:   successRates[key],
				SampleHours:   sampleWindowHours,
				BucketSeconds: bucketSeconds,
				Series:        seriesByModel[key],
			})
		}

		result = append(result, userGroupStatusItem{
			Group:  groupName,
			Status: groupStatus,
			Models: modelItems,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    result,
	})
}

func queryGroupModelRecentHealth(groupNames []string, sampleMinutes int) (map[string]*float64, map[string][]userGroupStatusBucket, float64, int64) {
	rates := make(map[string]*float64)
	seriesByModel := make(map[string][]userGroupStatusBucket)
	if len(groupNames) == 0 {
		return rates, seriesByModel, 0, perf_metrics_setting.GetBucketSeconds()
	}

	bucketSeconds := perf_metrics_setting.GetBucketSeconds()
	if bucketSeconds <= 0 {
		bucketSeconds = 3600
	}
	windowBuckets := int64((sampleMinutes * 60) / int(bucketSeconds))
	if (sampleMinutes*60)%int(bucketSeconds) != 0 {
		windowBuckets++
	}
	if windowBuckets < 1 {
		windowBuckets = 1
	}
	windowSeconds := windowBuckets * bucketSeconds
	sampleWindowHours := float64(windowSeconds) / 3600

	hoursToQuery := int((windowSeconds + 3599) / 3600)
	if hoursToQuery < 1 {
		hoursToQuery = 1
	}

	summaries, err := perfmetrics.QuerySeriesByGroupModels(hoursToQuery, groupNames)
	if err != nil {
		return rates, seriesByModel, sampleWindowHours, bucketSeconds
	}

	now := time.Now().Unix()
	windowStart := now - windowSeconds
	for _, summary := range summaries {
		key := summary.Group + "::" + summary.ModelName
		recentSeries := make([]userGroupStatusBucket, 0, len(summary.Series))
		weightedSuccess := 0.0
		requestCount := int64(0)
		for _, point := range summary.Series {
			if point.Ts < windowStart {
				continue
			}
			if point.RequestCount > 0 {
				rate := point.SuccessRate
				recentSeries = append(recentSeries, userGroupStatusBucket{
					Ts:           point.Ts,
					SuccessRate:  &rate,
					RequestCount: point.RequestCount,
				})
				requestCount += point.RequestCount
				weightedSuccess += (point.SuccessRate / 100) * float64(point.RequestCount)
				continue
			}
			recentSeries = append(recentSeries, userGroupStatusBucket{
				Ts:           point.Ts,
				SuccessRate:  nil,
				RequestCount: 0,
			})
		}
		seriesByModel[key] = recentSeries
		if requestCount > 0 {
			rate := weightedSuccess / float64(requestCount) * 100
			rates[key] = &rate
		}
	}

	return rates, seriesByModel, sampleWindowHours, bucketSeconds
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
