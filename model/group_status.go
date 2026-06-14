package model

import "strings"

type GroupModelStatusSummary struct {
	Group           string `json:"group"`
	Model           string `json:"model"`
	Status          string `json:"status"`
	Channels        int    `json:"-"`
	EnabledChannels int    `json:"-"`
}

type groupModelStatusRow struct {
	Group           string `gorm:"column:group"`
	Model           string `gorm:"column:model"`
	Channels        int    `gorm:"column:channels"`
	EnabledChannels int    `gorm:"column:enabled_channels"`
}

func GetGroupModelStatusSummaries(groups map[string]string) (map[string][]*GroupModelStatusSummary, error) {
	groupNames := make([]string, 0, len(groups))
	for groupName := range groups {
		if strings.TrimSpace(groupName) == "" || groupName == "auto" {
			continue
		}
		groupNames = append(groupNames, groupName)
	}
	if len(groupNames) == 0 {
		return map[string][]*GroupModelStatusSummary{}, nil
	}

	var rows []groupModelStatusRow
	err := DB.Table("abilities").
		Select(commonGroupCol+" as "+commonGroupCol+", model, COUNT(*) as channels, SUM(CASE WHEN enabled THEN 1 ELSE 0 END) as enabled_channels").
		Where(commonGroupCol+" IN ?", groupNames).
		Group(commonGroupCol + ", model").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := make(map[string][]*GroupModelStatusSummary, len(groupNames))
	for _, groupName := range groupNames {
		result[groupName] = []*GroupModelStatusSummary{}
	}

	for _, row := range rows {
		status := "degraded"
		if row.EnabledChannels > 0 {
			status = "healthy"
		}
		result[row.Group] = append(result[row.Group], &GroupModelStatusSummary{
			Group:           row.Group,
			Model:           row.Model,
			Status:          status,
			Channels:        row.Channels,
			EnabledChannels: row.EnabledChannels,
		})
	}

	return result, nil
}
