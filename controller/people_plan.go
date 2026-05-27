package controller

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type createPeoplePlanTeamRequest struct {
	Name string `json:"name"`
}

type joinPeoplePlanTeamRequest struct {
	InviteCode string `json:"invite_code"`
}

type removePeoplePlanMemberRequest struct {
	MemberUserId int `json:"member_user_id"`
}

type createPeoplePlanSubmissionRequest struct {
	Type          string   `json:"type"`
	Title         string   `json:"title"`
	Summary       string   `json:"summary"`
	Content       string   `json:"content"`
	Attachments   []string `json:"attachments"`
	Contact       string   `json:"contact"`
	PublicDisplay bool     `json:"public_display"`
}

type reviewPeoplePlanRewardRequest struct {
	Action string `json:"action"`
	Notes  string `json:"notes"`
}

type reviewPeoplePlanSubmissionRequest struct {
	Action string `json:"action"`
	Notes  string `json:"notes"`
}

func GetPeoplePlanOverview(c *gin.Context) {
	userId := c.GetInt("id")
	data, err := service.GetPeoplePlanOverview(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func GetPeoplePlanTeam(c *gin.Context) {
	userId := c.GetInt("id")
	data, err := service.GetPeoplePlanTeam(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func CreatePeoplePlanTeam(c *gin.Context) {
	userId := c.GetInt("id")
	var req createPeoplePlanTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	data, err := service.CreatePeoplePlanTeam(userId, service.CreatePeoplePlanTeamInput{
		Name: req.Name,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func JoinPeoplePlanTeam(c *gin.Context) {
	userId := c.GetInt("id")
	var req joinPeoplePlanTeamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	data, err := service.JoinPeoplePlanTeam(userId, service.JoinPeoplePlanTeamInput{
		InviteCode: req.InviteCode,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func LeavePeoplePlanTeam(c *gin.Context) {
	userId := c.GetInt("id")
	if err := service.LeavePeoplePlanTeam(userId); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"left": true})
}

func RemovePeoplePlanMember(c *gin.Context) {
	userId := c.GetInt("id")
	var req removePeoplePlanMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	data, err := service.RemovePeoplePlanMember(userId, service.RemovePeoplePlanMemberInput{
		MemberUserId: req.MemberUserId,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func GetPeoplePlanRewards(c *gin.Context) {
	userId := c.GetInt("id")
	rewards, summary, err := service.ListPeoplePlanRewards(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"summary": summary,
		"items":   rewards,
	})
}

func ClaimPeoplePlanReward(c *gin.Context) {
	userId := c.GetInt("id")
	rewardId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	reward, claimErr := service.ClaimPeoplePlanReward(userId, rewardId)
	if claimErr != nil {
		common.ApiError(c, claimErr)
		return
	}
	common.ApiSuccess(c, reward)
}

func GetPeoplePlanSubmissions(c *gin.Context) {
	userId := c.GetInt("id")
	items, err := service.ListPeoplePlanSubmissions(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, items)
}

func CreatePeoplePlanSubmission(c *gin.Context) {
	userId := c.GetInt("id")
	var req createPeoplePlanSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	data, err := service.CreatePeoplePlanSubmission(userId, service.CreatePeoplePlanSubmissionInput{
		Type:          req.Type,
		Title:         req.Title,
		Summary:       req.Summary,
		Content:       req.Content,
		Attachments:   req.Attachments,
		Contact:       req.Contact,
		PublicDisplay: req.PublicDisplay,
	})
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func GetPeoplePlanAdminStats(c *gin.Context) {
	data, err := service.GetPeoplePlanAdminStats()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func GetPeoplePlanAdminTeams(c *gin.Context) {
	data, err := service.ListPeoplePlanAdminTeams()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func GetPeoplePlanAdminRewards(c *gin.Context) {
	data, err := service.ListPeoplePlanAdminRewards()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func ReviewPeoplePlanReward(c *gin.Context) {
	adminUserId := c.GetInt("id")
	rewardId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var req reviewPeoplePlanRewardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	data, reviewErr := service.ReviewPeoplePlanReward(adminUserId, rewardId, service.ReviewPeoplePlanRewardInput{
		Action: req.Action,
		Notes:  req.Notes,
	})
	if reviewErr != nil {
		common.ApiError(c, reviewErr)
		return
	}
	common.ApiSuccess(c, data)
}

func GetPeoplePlanAdminSubmissions(c *gin.Context) {
	data, err := service.ListPeoplePlanAdminSubmissions()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func ReviewPeoplePlanSubmission(c *gin.Context) {
	adminUserId := c.GetInt("id")
	submissionId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var req reviewPeoplePlanSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	data, reviewErr := service.ReviewPeoplePlanSubmission(adminUserId, submissionId, service.ReviewPeoplePlanSubmissionInput{
		Action: req.Action,
		Notes:  req.Notes,
	})
	if reviewErr != nil {
		common.ApiError(c, reviewErr)
		return
	}
	common.ApiSuccess(c, data)
}
