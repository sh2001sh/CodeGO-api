package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

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
