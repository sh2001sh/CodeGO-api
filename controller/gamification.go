package controller

import (
	"math"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type companionPetActionRequest struct {
	AchievementKey string `json:"achievement_key" binding:"required"`
}

type companionPetFeedRequest struct {
	AchievementKey string  `json:"achievement_key" binding:"required"`
	FeedUSD        float64 `json:"feed_usd" binding:"required"`
}

// GetGamificationDashboard returns the workshop overview data for the current user.
func GetGamificationDashboard(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}
	data, err := service.GetGamificationDashboard(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

// GetGamificationAchievements returns the user's achievement list.
func GetGamificationAchievements(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}
	data, err := service.GetAchievements(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

// GetGamificationHallOfFame returns the leaderboard data for the workshop.
func GetGamificationHallOfFame(c *gin.Context) {
	data, err := service.GetHallOfFame()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

// ClaimGamificationShareLink marks today's invite-link sharing mission as completed.
func ClaimGamificationShareLink(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "无效的用户 ID")
		return
	}
	granted, err := service.ClaimShareLinkMission(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"claimed":    granted,
		"reward_usd": 0.2,
	})
}

func EquipGamificationCompanionPet(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	var req companionPetActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	data, err := service.EquipCompanionPet(userId, req.AchievementKey)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func UpgradeGamificationCompanionPet(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	var req companionPetActionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	data, err := service.UpgradeCompanionPet(userId, req.AchievementKey)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func FeedGamificationCompanionPet(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	var req companionPetFeedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.FeedUSD <= 0 {
		common.ApiErrorMsg(c, "feed_usd must be greater than 0")
		return
	}
	feedQuota := int64(math.Round(req.FeedUSD * common.QuotaPerUnit))
	if feedQuota <= 0 {
		common.ApiErrorMsg(c, "feed_usd is too small")
		return
	}
	data, err := service.FeedCompanionPet(userId, req.AchievementKey, feedQuota)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}
