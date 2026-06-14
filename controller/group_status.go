package controller

import (
	"net/http"
	"sort"

	"github.com/QuantumNous/new-api/model"
	perfmetrics "github.com/QuantumNous/new-api/pkg/perf_metrics"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

type userGroupModelStatusItem struct {
	Model       string   `json:"model"`
	Status      string   `json:"status"`
	SuccessRate *float64 `json:"success_rate"`
	SampleHours int      `json:"sample_window"`
}

type userGroupStatusItem struct {
	Group  string                     `json:"group"`
	Status string                     `json:"status"`
	Models []userGroupModelStatusItem `json:"models"`
}

func GetUserGroupStatus(c *gin.Context) {
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

	successRates := queryGroupModelSuccessRates(groupNames)
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
				Model:       summary.Model,
				Status:      summary.Status,
				SuccessRate: successRates[key],
				SampleHours: 24,
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

func queryGroupModelSuccessRates(groupNames []string) map[string]*float64 {
	rates := make(map[string]*float64)
	if len(groupNames) == 0 {
		return rates
	}

	summaries, err := perfmetrics.QuerySummaryByGroupModels(24, groupNames)
	if err != nil {
		return rates
	}

	for _, summary := range summaries {
		rate := summary.SuccessRate
		rates[summary.Group+"::"+summary.ModelName] = &rate
	}

	return rates
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
