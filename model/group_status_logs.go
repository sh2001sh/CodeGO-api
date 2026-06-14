package model

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type GroupModelRequestBucket struct {
	GroupName    string `gorm:"column:group_name"`
	ModelName    string `gorm:"column:model_name"`
	BucketIndex  int64  `gorm:"column:bucket_index"`
	RequestCount int64  `gorm:"column:request_count"`
	SuccessCount int64  `gorm:"column:success_count"`
}

// GetGroupModelRequestBuckets returns grouped request totals for recent logs.
func GetGroupModelRequestBuckets(startTime int64, endTime int64, bucketSize int64, groups []string) ([]GroupModelRequestBucket, error) {
	if endTime <= startTime {
		return []GroupModelRequestBucket{}, nil
	}
	if bucketSize <= 0 {
		bucketSize = 60
	}

	filteredGroups := make([]string, 0, len(groups))
	for _, groupName := range groups {
		groupName = strings.TrimSpace(groupName)
		if groupName == "" || groupName == "auto" {
			continue
		}
		filteredGroups = append(filteredGroups, groupName)
	}

	bucketExpr := logBucketIndexExpr(startTime, bucketSize)
	selectExpr := fmt.Sprintf(
		"%s as group_name, model_name, %s as bucket_index, COUNT(*) as request_count, SUM(CASE WHEN type = %d THEN 1 ELSE 0 END) as success_count",
		logGroupCol,
		bucketExpr,
		LogTypeConsume,
	)

	query := LOG_DB.Table("logs").
		Select(selectExpr).
		Where("created_at >= ? AND created_at < ?", startTime, endTime).
		Where("type IN ?", []int{LogTypeConsume, LogTypeError}).
		Where("model_name <> ''").
		Where(logGroupCol + " <> ''")

	if len(filteredGroups) > 0 {
		query = query.Where(logGroupCol+" IN ?", filteredGroups)
	}

	var rows []GroupModelRequestBucket
	err := query.
		Group(fmt.Sprintf("%s, model_name, %s", logGroupCol, bucketExpr)).
		Order("group_name ASC, model_name ASC, bucket_index ASC").
		Find(&rows).Error
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func logBucketIndexExpr(startTime int64, bucketSize int64) string {
	if common.UsingMySQL {
		return fmt.Sprintf("FLOOR((created_at - %d) / %d)", startTime, bucketSize)
	}
	if common.UsingPostgreSQL {
		return fmt.Sprintf("CAST((created_at - %d) / %d AS BIGINT)", startTime, bucketSize)
	}
	return fmt.Sprintf("CAST((created_at - %d) / %d AS INTEGER)", startTime, bucketSize)
}
