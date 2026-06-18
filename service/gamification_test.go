package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/stretchr/testify/require"
)

func TestGamificationIgnoresZeroQuotaConsumeLogsForCallAchievements(t *testing.T) {
	truncate(t)
	userID := 9101
	seedUser(t, userID, int(common.QuotaPerUnit))

	require.NoError(t, model.LOG_DB.Create(&model.Log{
		UserId:    userID,
		Username:  "test_user",
		CreatedAt: common.GetTimestamp(),
		Type:      model.LogTypeConsume,
		Quota:     0,
		ModelName: "free-model",
		Group:     "free",
	}).Error)

	achievements, err := GetAchievements(userID)
	require.NoError(t, err)
	require.False(t, achievementUnlockedForTest(achievements, "first-call"))

	require.NoError(t, model.LOG_DB.Create(&model.Log{
		UserId:    userID,
		Username:  "test_user",
		CreatedAt: common.GetTimestamp(),
		Type:      model.LogTypeConsume,
		Quota:     1,
		ModelName: "paid-model",
		Group:     "default",
	}).Error)

	achievements, err = GetAchievements(userID)
	require.NoError(t, err)
	require.True(t, achievementUnlockedForTest(achievements, "first-call"))
}

func TestUpdateUserUsedQuotaAndRequestCountIgnoresZeroQuota(t *testing.T) {
	truncate(t)
	userID := 9102
	seedUser(t, userID, int(common.QuotaPerUnit))

	model.UpdateUserUsedQuotaAndRequestCount(userID, 0)

	var user model.User
	require.NoError(t, model.DB.Select("used_quota", "request_count").Where("id = ?", userID).First(&user).Error)
	require.Equal(t, 0, user.UsedQuota)
	require.Equal(t, 0, user.RequestCount)

	model.UpdateUserUsedQuotaAndRequestCount(userID, 7)

	require.NoError(t, model.DB.Select("used_quota", "request_count").Where("id = ?", userID).First(&user).Error)
	require.Equal(t, 7, user.UsedQuota)
	require.Equal(t, 1, user.RequestCount)
}

func achievementUnlockedForTest(achievements []AchievementItem, key string) bool {
	for _, achievement := range achievements {
		if achievement.Key == key {
			return achievement.Unlocked
		}
	}
	return false
}
