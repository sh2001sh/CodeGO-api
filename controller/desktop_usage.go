package controller

import (
	"sort"
	"strconv"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type desktopUsageTrendItem struct {
	Date      string  `json:"date"`
	Timestamp int64   `json:"timestamp"`
	Requests  int64   `json:"requests"`
	Quota     int64   `json:"quota"`
	TokenUsed int64   `json:"token_used"`
	QuotaUSD  float64 `json:"quota_usd"`
}

type desktopUsageTrendResponse struct {
	Days  int                     `json:"days"`
	Trend []desktopUsageTrendItem `json:"trend"`
}

func getDesktopTrendDays(c *gin.Context, fallback int) int {
	days, _ := strconv.Atoi(c.Query("days"))
	if days <= 0 {
		days = fallback
	}
	if days <= 0 {
		days = 7
	}
	if days > 30 {
		days = 30
	}
	return days
}

func buildDesktopUsageTrend(userID int, days int) ([]desktopUsageTrendItem, error) {
	now := time.Now().In(time.Local)
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	start := dayStart.AddDate(0, 0, -(days - 1))

	rows, err := model.GetQuotaDataByUserId(userID, start.Unix(), now.Unix())
	if err != nil {
		return nil, err
	}

	result := make([]desktopUsageTrendItem, 0, days)
	indexByDate := make(map[string]int, days)
	for i := 0; i < days; i++ {
		current := start.AddDate(0, 0, i)
		key := current.Format("2006-01-02")
		indexByDate[key] = len(result)
		result = append(result, desktopUsageTrendItem{
			Date:      key,
			Timestamp: current.Unix(),
		})
	}

	for _, row := range rows {
		if row == nil {
			continue
		}
		key := time.Unix(row.CreatedAt, 0).In(time.Local).Format("2006-01-02")
		index, ok := indexByDate[key]
		if !ok {
			continue
		}
		result[index].Requests += int64(row.Count)
		result[index].Quota += int64(row.Quota)
		result[index].TokenUsed += int64(row.TokenUsed)
	}

	for index := range result {
		result[index].QuotaUSD = quotaToOpenAIUSD(int(result[index].Quota))
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Timestamp < result[j].Timestamp
	})
	return result, nil
}

// GetDesktopUsageTrends returns 7/30-day aggregated usage data for the desktop dashboard.
func GetDesktopUsageTrends(c *gin.Context) {
	userID := c.GetInt("id")
	days := getDesktopTrendDays(c, 7)

	trend, err := buildDesktopUsageTrend(userID, days)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, desktopUsageTrendResponse{
		Days:  days,
		Trend: trend,
	})
}
