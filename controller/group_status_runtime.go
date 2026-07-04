package controller

import (
	"math"
	"time"

	"github.com/QuantumNous/new-api/model"
	perfmetrics "github.com/QuantumNous/new-api/pkg/perf_metrics"
)

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
	requestedBucketSeconds := windowSeconds / int64(segmentCount)
	if windowSeconds%int64(segmentCount) != 0 {
		requestedBucketSeconds++
	}
	if requestedBucketSeconds < 60 {
		requestedBucketSeconds = 60
	}

	sampleWindowHours := float64(windowSeconds) / 3600
	now := time.Now().Unix()
	windowStart, windowEnd, alignedSegments := buildAlignedStatusWindow(now, windowSeconds, requestedBucketSeconds)

	if shouldPreferLogHealth(windowSeconds, requestedBucketSeconds) &&
		fillGroupModelLogHealth(rates, seriesByModel, requestCounts, windowStart, windowEnd, requestedBucketSeconds, alignedSegments, groupNames) {
		return rates, seriesByModel, requestCounts, sampleWindowHours, requestedBucketSeconds
	}

	if actualBucketSeconds, ok := fillGroupModelPerfHealth(
		rates,
		seriesByModel,
		requestCounts,
		windowStart,
		windowEnd,
		requestedBucketSeconds,
		alignedSegments,
		groupNames,
	); ok {
		return rates, seriesByModel, requestCounts, sampleWindowHours, actualBucketSeconds
	}

	fillGroupModelLogHealth(rates, seriesByModel, requestCounts, windowStart, windowEnd, requestedBucketSeconds, alignedSegments, groupNames)
	return rates, seriesByModel, requestCounts, sampleWindowHours, requestedBucketSeconds
}

func shouldPreferLogHealth(_ int64, bucketSeconds int64) bool {
	return bucketSeconds < 3600
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
) (int64, bool) {
	hours := int(math.Ceil(float64(windowEnd-windowStart) / 3600))
	if hours <= 0 {
		hours = 1
	}

	summaryRows, err := perfmetrics.QuerySummaryByGroupModels(hours, groupNames)
	if err != nil {
		return bucketSeconds, false
	}
	seriesRows, err := perfmetrics.QuerySeriesByGroupModels(hours, groupNames)
	if err != nil && len(summaryRows) == 0 {
		return bucketSeconds, false
	}
	if len(summaryRows) == 0 && len(seriesRows) == 0 {
		return bucketSeconds, false
	}

	for _, row := range summaryRows {
		if row.RequestCount <= 0 {
			continue
		}
		key := row.Group + "::" + row.ModelName
		requestCounts[key] += row.RequestCount
		rate := row.SuccessRate
		rates[key] = &rate
	}

	actualBucketSeconds := detectBucketSecondsFromSeries(seriesRows)
	if actualBucketSeconds <= 0 {
		actualBucketSeconds = bucketSeconds
	}

	alignedStart, _, alignedSegments := buildAlignedStatusWindow(windowEnd-1, windowEnd-windowStart, actualBucketSeconds)
	for _, row := range seriesRows {
		key := row.Group + "::" + row.ModelName
		if _, ok := seriesByModel[key]; !ok {
			seriesByModel[key] = buildStatusSeries(alignedStart, alignedSegments, actualBucketSeconds)
		}
		for _, point := range row.Series {
			bucketIndex := (point.Ts - alignedStart) / actualBucketSeconds
			if bucketIndex < 0 || bucketIndex >= int64(alignedSegments) {
				continue
			}
			bucket := &seriesByModel[key][bucketIndex]
			bucket.RequestCount += point.RequestCount
			if point.RequestCount > 0 {
				rate := point.SuccessRate
				bucket.SuccessRate = &rate
			}
		}
	}

	return actualBucketSeconds, len(requestCounts) > 0 || len(seriesByModel) > 0
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
) bool {
	rows, err := model.GetGroupModelRequestBuckets(windowStart, windowEnd, bucketSeconds, groupNames)
	if err != nil {
		return false
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
	return len(requestCounts) > 0 || len(seriesByModel) > 0
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

func buildAlignedStatusWindow(now int64, windowSeconds int64, bucketSeconds int64) (int64, int64, int) {
	if bucketSeconds <= 0 {
		bucketSeconds = 60
	}
	if windowSeconds <= 0 {
		windowSeconds = bucketSeconds
	}
	segmentCount := int((windowSeconds + bucketSeconds - 1) / bucketSeconds)
	if segmentCount <= 0 {
		segmentCount = 1
	}
	currentBucketStart := now - (now % bucketSeconds)
	windowEnd := currentBucketStart + bucketSeconds
	windowStart := windowEnd - int64(segmentCount)*bucketSeconds
	return windowStart, windowEnd, segmentCount
}

func detectBucketSecondsFromSeries(rows []perfmetrics.GroupModelSeries) int64 {
	for _, row := range rows {
		for index := 1; index < len(row.Series); index++ {
			diff := row.Series[index].Ts - row.Series[index-1].Ts
			if diff > 0 {
				return diff
			}
		}
	}
	return 0
}

func emptyStatusSeries(sampleMinutes int, segmentCount int, bucketSeconds int64) []userGroupStatusBucket {
	windowStart, _, alignedSegments := buildAlignedStatusWindow(time.Now().Unix(), int64(sampleMinutes*60), bucketSeconds)
	return buildStatusSeries(windowStart, alignedSegments, bucketSeconds)
}
