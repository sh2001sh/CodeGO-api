package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

type PeoplePlanAdminStats struct {
	Teams              int64 `json:"teams"`
	ActiveMembers      int64 `json:"active_members"`
	PendingRewards     int64 `json:"pending_rewards"`
	ClaimableRewards   int64 `json:"claimable_rewards"`
	PendingSubmissions int64 `json:"pending_submissions"`
	OpenRiskReviews    int64 `json:"open_risk_reviews"`
}

type PeoplePlanAdminTeamRow struct {
	Id                      int     `json:"id"`
	Name                    string  `json:"name"`
	InviteCode              string  `json:"invite_code"`
	Status                  string  `json:"status"`
	CaptainUserId           int     `json:"captain_user_id"`
	CaptainName             string  `json:"captain_name"`
	CaptainUsername         string  `json:"captain_username"`
	MinMembers              int     `json:"min_members"`
	MaxMembers              int     `json:"max_members"`
	ActiveMembers           int     `json:"active_members"`
	EffectiveMembers        int     `json:"effective_members"`
	FormationRate           float64 `json:"formation_rate"`
	TeamCalls               int64   `json:"team_calls"`
	TeamSpendUSD            int64   `json:"team_spend_usd"`
	MonthlyActiveMembers    int     `json:"monthly_active_members"`
	MonthlyTeamSpendUSD     int64   `json:"monthly_team_spend_usd"`
	RewardCount             int64   `json:"reward_count"`
	PendingRewardCount      int64   `json:"pending_reward_count"`
	ClaimableRewardCount    int64   `json:"claimable_reward_count"`
	ClaimedRewardCount      int64   `json:"claimed_reward_count"`
	RewardQuotaUSD          int64   `json:"reward_quota_usd"`
	TotalRewardQuotaUSD     int64   `json:"total_reward_quota_usd"`
	ClaimableRewardQuotaUSD int64   `json:"claimable_reward_quota_usd"`
	ClaimedRewardQuotaUSD   int64   `json:"claimed_reward_quota_usd"`
	SubmissionCount         int64   `json:"submission_count"`
	PendingSubmissionCount  int64   `json:"pending_submission_count"`
	ApprovedSubmissionCount int64   `json:"approved_submission_count"`
	FormedAt                int64   `json:"formed_at"`
	LockedAt                int64   `json:"locked_at"`
	LastSyncedAt            int64   `json:"last_synced_at"`
	CreatedAt               int64   `json:"created_at"`
	UpdatedAt               int64   `json:"updated_at"`
}

type PeoplePlanAdminRewardRow struct {
	Id           int    `json:"id"`
	UserId       int    `json:"user_id"`
	UserName     string `json:"user_name"`
	Username     string `json:"username"`
	TeamId       int    `json:"team_id"`
	TeamName     string `json:"team_name"`
	TeamStatus   string `json:"team_status"`
	SourceType   string `json:"source_type"`
	SourceKey    string `json:"source_key"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	RewardType   string `json:"reward_type"`
	QuotaDelta   int64  `json:"quota_delta"`
	QuotaUSD     int64  `json:"quota_usd"`
	Status       string `json:"status"`
	ReviewStatus string `json:"review_status"`
	RiskStatus   string `json:"risk_status"`
	ClaimableAt  int64  `json:"claimable_at"`
	ReviewedBy   int    `json:"reviewed_by"`
	ReviewedAt   int64  `json:"reviewed_at"`
	ReviewNotes  string `json:"review_notes"`
	CreatedAt    int64  `json:"created_at"`
	UpdatedAt    int64  `json:"updated_at"`
}

type PeoplePlanAdminSubmissionRow struct {
	Id            int    `json:"id"`
	UserId        int    `json:"user_id"`
	UserName      string `json:"user_name"`
	Username      string `json:"username"`
	TeamId        int    `json:"team_id"`
	TeamName      string `json:"team_name"`
	TeamStatus    string `json:"team_status"`
	Type          string `json:"type"`
	Title         string `json:"title"`
	Summary       string `json:"summary"`
	Contact       string `json:"contact"`
	PublicDisplay bool   `json:"public_display"`
	Status        string `json:"status"`
	ReviewNotes   string `json:"review_notes"`
	ReviewedBy    int    `json:"reviewed_by"`
	ReviewedAt    int64  `json:"reviewed_at"`
	CreatedAt     int64  `json:"created_at"`
	UpdatedAt     int64  `json:"updated_at"`
}

type ReviewPeoplePlanRewardInput struct {
	Action string `json:"action"`
	Notes  string `json:"notes"`
}

type ReviewPeoplePlanSubmissionInput struct {
	Action string `json:"action"`
	Notes  string `json:"notes"`
}

func GetPeoplePlanAdminStats() (*PeoplePlanAdminStats, error) {
	stats := &PeoplePlanAdminStats{}
	if err := model.DB.Model(&model.PeoplePlanTeam{}).Count(&stats.Teams).Error; err != nil {
		return nil, err
	}
	if err := model.DB.Model(&model.PeoplePlanMember{}).Where("status = ?", model.PeoplePlanMemberStatusActive).Count(&stats.ActiveMembers).Error; err != nil {
		return nil, err
	}
	if err := model.DB.Model(&model.PeoplePlanRewardLedger{}).Where("status = ?", model.PeoplePlanRewardStatusPending).Count(&stats.PendingRewards).Error; err != nil {
		return nil, err
	}
	if err := model.DB.Model(&model.PeoplePlanRewardLedger{}).Where("status = ?", model.PeoplePlanRewardStatusClaimable).Count(&stats.ClaimableRewards).Error; err != nil {
		return nil, err
	}
	if err := model.DB.Model(&model.PeoplePlanSubmission{}).Where("status = ?", model.PeoplePlanSubmissionStatusPending).Count(&stats.PendingSubmissions).Error; err != nil {
		return nil, err
	}
	if err := model.DB.Model(&model.PeoplePlanRiskReview{}).Where("status = ?", model.PeoplePlanRiskStatusOpen).Count(&stats.OpenRiskReviews).Error; err != nil {
		return nil, err
	}
	return stats, nil
}

type peoplePlanAdminRewardAgg struct {
	TeamID               int
	RewardCount          int64
	PendingRewardCount   int64
	ClaimableRewardCount int64
	ClaimedRewardCount   int64
	TotalRewardQuota     int64
	ClaimableRewardQuota int64
	ClaimedRewardQuota   int64
}

type peoplePlanAdminSubmissionAgg struct {
	TeamID                  int
	SubmissionCount         int64
	PendingSubmissionCount  int64
	ApprovedSubmissionCount int64
}

type peoplePlanAdminMemberAgg struct {
	TeamID               int
	ActiveMembers        int
	EffectiveMembers     int
	TeamCalls            int64
	TeamSpendUSD         int64
	MonthlyActiveMembers int
	MonthlyTeamSpendUSD  int64
}

func buildPeoplePlanAdminTeamSummary(team model.PeoplePlanTeam, memberAgg peoplePlanAdminMemberAgg) PeoplePlanTeamSummary {
	summary := PeoplePlanTeamSummary{
		MinMembers: team.MinMembers,
		MaxMembers: team.MaxMembers,
	}
	if strings.TrimSpace(team.Snapshot) != "" {
		_ = json.Unmarshal([]byte(team.Snapshot), &summary)
	}
	if summary.MinMembers <= 0 {
		summary.MinMembers = team.MinMembers
	}
	if summary.MaxMembers <= 0 {
		summary.MaxMembers = team.MaxMembers
	}

	// Membership counts should reflect the latest member rows even when the
	// heavier progress snapshot has not been regenerated yet.
	summary.ActiveMembers = memberAgg.ActiveMembers
	summary.EffectiveMembers = memberAgg.EffectiveMembers
	if summary.TeamCalls == 0 {
		summary.TeamCalls = memberAgg.TeamCalls
	}
	if summary.TeamSpendUSD == 0 {
		summary.TeamSpendUSD = memberAgg.TeamSpendUSD
	}
	if summary.MonthlyActiveMembers == 0 {
		summary.MonthlyActiveMembers = memberAgg.MonthlyActiveMembers
	}
	if summary.MonthlyTeamSpendUSD == 0 {
		summary.MonthlyTeamSpendUSD = memberAgg.MonthlyTeamSpendUSD
	}
	return summary
}

func loadPeoplePlanAdminMemberAggMap(teamIDs []int) (map[int]peoplePlanAdminMemberAgg, error) {
	memberAggs := make([]peoplePlanAdminMemberAgg, 0)
	if err := model.DB.Model(&model.PeoplePlanMember{}).
		Select(
			"team_id as team_id, "+
				"COUNT(*) as active_members, "+
				"SUM(CASE WHEN effective_at > 0 THEN 1 ELSE 0 END) as effective_members, "+
				"COALESCE(SUM(lifetime_calls), 0) as team_calls, "+
				"COALESCE(SUM(lifetime_spend), 0) as team_spend_usd, "+
				"SUM(CASE WHEN current_month_calls > 0 OR current_month_spend > 0 THEN 1 ELSE 0 END) as monthly_active_members, "+
				"COALESCE(SUM(current_month_spend), 0) as monthly_team_spend_usd",
		).
		Where("team_id IN ? AND status = ?", teamIDs, model.PeoplePlanMemberStatusActive).
		Group("team_id").
		Scan(&memberAggs).Error; err != nil {
		return nil, err
	}
	result := make(map[int]peoplePlanAdminMemberAgg, len(memberAggs))
	for _, agg := range memberAggs {
		result[agg.TeamID] = agg
	}
	return result, nil
}

func loadPeoplePlanAdminRewardAggMap(teamIDs []int) (map[int]peoplePlanAdminRewardAgg, error) {
	rewardAggs := make([]peoplePlanAdminRewardAgg, 0)
	if err := model.DB.Model(&model.PeoplePlanRewardLedger{}).
		Select(
			"team_id as team_id, "+
				"COUNT(*) as reward_count, "+
				"SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_reward_count, "+
				"SUM(CASE WHEN status = 'claimable' THEN 1 ELSE 0 END) as claimable_reward_count, "+
				"SUM(CASE WHEN status = 'claimed' THEN 1 ELSE 0 END) as claimed_reward_count, "+
				"COALESCE(SUM(quota_delta), 0) as total_reward_quota, "+
				"COALESCE(SUM(CASE WHEN status = 'claimable' THEN quota_delta ELSE 0 END), 0) as claimable_reward_quota, "+
				"COALESCE(SUM(CASE WHEN status = 'claimed' THEN quota_delta ELSE 0 END), 0) as claimed_reward_quota",
		).
		Where("team_id IN ?", teamIDs).
		Group("team_id").
		Scan(&rewardAggs).Error; err != nil {
		return nil, err
	}
	result := make(map[int]peoplePlanAdminRewardAgg, len(rewardAggs))
	for _, agg := range rewardAggs {
		result[agg.TeamID] = agg
	}
	return result, nil
}

func loadPeoplePlanAdminSubmissionAggMap(teamIDs []int) (map[int]peoplePlanAdminSubmissionAgg, error) {
	submissionAggs := make([]peoplePlanAdminSubmissionAgg, 0)
	if err := model.DB.Model(&model.PeoplePlanSubmission{}).
		Select(
			"team_id as team_id, "+
				"COUNT(*) as submission_count, "+
				"SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_submission_count, "+
				"SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_submission_count",
		).
		Where("team_id IN ?", teamIDs).
		Group("team_id").
		Scan(&submissionAggs).Error; err != nil {
		return nil, err
	}
	result := make(map[int]peoplePlanAdminSubmissionAgg, len(submissionAggs))
	for _, agg := range submissionAggs {
		result[agg.TeamID] = agg
	}
	return result, nil
}

func ListPeoplePlanAdminTeams() ([]PeoplePlanAdminTeamRow, error) {
	var teams []model.PeoplePlanTeam
	if err := model.DB.Order("updated_at desc, id desc").Find(&teams).Error; err != nil {
		return nil, err
	}
	if len(teams) == 0 {
		return []PeoplePlanAdminTeamRow{}, nil
	}

	teamIDs := make([]int, 0, len(teams))
	captainIDs := make([]int, 0, len(teams))
	for i := range teams {
		teamIDs = append(teamIDs, teams[i].Id)
		captainIDs = append(captainIDs, teams[i].CaptainUserId)
	}

	userMap, err := loadPeoplePlanUserMap(captainIDs)
	if err != nil {
		return nil, err
	}

	memberAggMap, err := loadPeoplePlanAdminMemberAggMap(teamIDs)
	if err != nil {
		return nil, err
	}

	rewardAggMap, err := loadPeoplePlanAdminRewardAggMap(teamIDs)
	if err != nil {
		return nil, err
	}

	submissionAggMap, err := loadPeoplePlanAdminSubmissionAggMap(teamIDs)
	if err != nil {
		return nil, err
	}

	rows := make([]PeoplePlanAdminTeamRow, 0, len(teams))
	for _, team := range teams {
		summary := buildPeoplePlanAdminTeamSummary(team, memberAggMap[team.Id])
		rewardAgg := rewardAggMap[team.Id]
		submissionAgg := submissionAggMap[team.Id]
		captain := userMap[team.CaptainUserId]

		formationRate := 0.0
		if summary.MinMembers > 0 {
			formationRate = math.Min(
				1,
				float64(summary.EffectiveMembers)/float64(summary.MinMembers),
			)
		}

		rows = append(rows, PeoplePlanAdminTeamRow{
			Id:                      team.Id,
			Name:                    team.Name,
			InviteCode:              team.InviteCode,
			Status:                  team.Status,
			CaptainUserId:           team.CaptainUserId,
			CaptainName:             captain.DisplayName,
			CaptainUsername:         captain.Username,
			MinMembers:              summary.MinMembers,
			MaxMembers:              summary.MaxMembers,
			ActiveMembers:           summary.ActiveMembers,
			EffectiveMembers:        summary.EffectiveMembers,
			FormationRate:           formationRate,
			TeamCalls:               summary.TeamCalls,
			TeamSpendUSD:            summary.TeamSpendUSD,
			MonthlyActiveMembers:    summary.MonthlyActiveMembers,
			MonthlyTeamSpendUSD:     summary.MonthlyTeamSpendUSD,
			RewardCount:             rewardAgg.RewardCount,
			PendingRewardCount:      rewardAgg.PendingRewardCount,
			ClaimableRewardCount:    rewardAgg.ClaimableRewardCount,
			ClaimedRewardCount:      rewardAgg.ClaimedRewardCount,
			RewardQuotaUSD:          int64(math.Round(float64(rewardAgg.ClaimedRewardQuota) / common.QuotaPerUnit)),
			TotalRewardQuotaUSD:     int64(math.Round(float64(rewardAgg.TotalRewardQuota) / common.QuotaPerUnit)),
			ClaimableRewardQuotaUSD: int64(math.Round(float64(rewardAgg.ClaimableRewardQuota) / common.QuotaPerUnit)),
			ClaimedRewardQuotaUSD:   int64(math.Round(float64(rewardAgg.ClaimedRewardQuota) / common.QuotaPerUnit)),
			SubmissionCount:         submissionAgg.SubmissionCount,
			PendingSubmissionCount:  submissionAgg.PendingSubmissionCount,
			ApprovedSubmissionCount: submissionAgg.ApprovedSubmissionCount,
			FormedAt:                team.FormedAt,
			LockedAt:                team.LockedAt,
			LastSyncedAt:            team.LastSyncedAt,
			CreatedAt:               team.CreatedAt,
			UpdatedAt:               team.UpdatedAt,
		})
	}
	return rows, nil
}

func ListPeoplePlanAdminRewards() ([]PeoplePlanAdminRewardRow, error) {
	rewards, err := model.GetPendingPeoplePlanRewards()
	if err != nil {
		return nil, err
	}
	return buildPeoplePlanAdminRewardRows(rewards)
}

func ReviewPeoplePlanReward(adminUserId int, rewardId int, input ReviewPeoplePlanRewardInput) (*model.PeoplePlanRewardLedger, error) {
	action := strings.TrimSpace(strings.ToLower(input.Action))
	if action != "approve" && action != "reject" && action != "freeze" {
		return nil, errors.New("invalid action")
	}
	var reward model.PeoplePlanRewardLedger
	if err := model.DB.Where("id = ?", rewardId).First(&reward).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("reward not found")
		}
		return nil, err
	}
	status := reward.Status
	reviewStatus := peoplePlanReviewStatusManual
	switch action {
	case "approve":
		status = model.PeoplePlanRewardStatusClaimable
	case "reject":
		status = model.PeoplePlanRewardStatusRejected
	case "freeze":
		status = model.PeoplePlanRewardStatusFrozen
	}
	err := model.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Model(&model.PeoplePlanRewardLedger{}).Where("id = ?", reward.Id).Updates(map[string]any{
			"status":        status,
			"review_status": reviewStatus,
			"review_notes":  strings.TrimSpace(input.Notes),
			"reviewed_by":   adminUserId,
			"reviewed_at":   nowMillis(),
		}).Error
	})
	if err != nil {
		return nil, err
	}
	if err := model.DB.Where("id = ?", reward.Id).First(&reward).Error; err != nil {
		return nil, err
	}
	return &reward, nil
}

func ListPeoplePlanAdminSubmissions() ([]PeoplePlanAdminSubmissionRow, error) {
	submissions, err := model.GetPendingPeoplePlanSubmissions()
	if err != nil {
		return nil, err
	}
	return buildPeoplePlanAdminSubmissionRows(submissions)
}

func ReviewPeoplePlanSubmission(adminUserId int, submissionId int, input ReviewPeoplePlanSubmissionInput) (*model.PeoplePlanSubmission, error) {
	settings, err := ensurePeoplePlanEnabled()
	if err != nil {
		return nil, err
	}
	action := strings.TrimSpace(strings.ToLower(input.Action))
	if action != "approve" && action != "reject" {
		return nil, errors.New("invalid action")
	}
	var submission model.PeoplePlanSubmission
	if err := model.DB.Where("id = ?", submissionId).First(&submission).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("submission not found")
		}
		return nil, err
	}
	status := model.PeoplePlanSubmissionStatusRejected
	if action == "approve" {
		status = model.PeoplePlanSubmissionStatusApproved
	}
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.PeoplePlanSubmission{}).Where("id = ?", submission.Id).Updates(map[string]any{
			"status":       status,
			"review_notes": strings.TrimSpace(input.Notes),
			"reviewed_by":  adminUserId,
			"reviewed_at":  nowMillis(),
		}).Error; err != nil {
			return err
		}
		if action != "approve" {
			return nil
		}
		rewardUSD := getPeoplePlanSubmissionRewardUSD(settings, submission.Type)
		reward := model.PeoplePlanRewardLedger{
			UserId:        submission.UserId,
			TeamId:        submission.TeamId,
			SourceType:    peoplePlanSourceTypeSubmission,
			SourceKey:     fmt.Sprintf("submission:%d", submission.Id),
			Title:         submission.Title,
			Description:   submission.Summary,
			RewardType:    "quota",
			QuotaDelta:    QuotaFromUSDInt(rewardUSD),
			RewardPayload: marshalPeoplePlanSnapshot(map[string]any{"submission_type": submission.Type}),
			Status:        model.PeoplePlanRewardStatusClaimable,
			ReviewStatus:  peoplePlanReviewStatusManual,
			RiskStatus:    peoplePlanRiskStatusClear,
			ClaimableAt:   nowMillis(),
			ReviewedBy:    adminUserId,
			ReviewedAt:    nowMillis(),
			ReviewNotes:   strings.TrimSpace(input.Notes),
		}
		if settings.Risk.FreezeLargeManualRewards && rewardUSD >= settings.Risk.LargeRewardThresholdUSD {
			reward.Status = model.PeoplePlanRewardStatusFrozen
			reward.RiskStatus = peoplePlanRiskStatusReview
		}
		if err := model.CreatePeoplePlanRewardTx(tx, &reward); err != nil {
			return err
		}
		if reward.Id > 0 && reward.Status == model.PeoplePlanRewardStatusClaimable {
			claimedAt := nowMillis()
			if err := model.ClaimPeoplePlanQuotaRewardTx(tx, &reward, claimedAt); err != nil {
				return err
			}
			reward.Status = model.PeoplePlanRewardStatusClaimed
			reward.ClaimedAt = claimedAt
		}
		if reward.Id > 0 && reward.Status == model.PeoplePlanRewardStatusFrozen {
			return createPeoplePlanRiskReviewTx(tx, reward.UserId, reward.TeamId, reward.Id, "submission_reward", "large manual reward requires review")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	if err := model.DB.Where("id = ?", submission.Id).First(&submission).Error; err != nil {
		return nil, err
	}
	return &submission, nil
}

func getPeoplePlanSubmissionRewardUSD(settings PeoplePlanSettings, submissionType string) int64 {
	switch strings.TrimSpace(strings.ToLower(submissionType)) {
	case "project":
		return settings.Submissions.ProjectRewardUSD
	case "community":
		return settings.Submissions.CommunityRewardUSD
	default:
		return settings.Submissions.ContentRewardUSD
	}
}

func buildPeoplePlanAdminRewardRows(rewards []model.PeoplePlanRewardLedger) ([]PeoplePlanAdminRewardRow, error) {
	if len(rewards) == 0 {
		return []PeoplePlanAdminRewardRow{}, nil
	}
	userIDs := make([]int, 0, len(rewards))
	teamIDs := make([]int, 0, len(rewards))
	for _, reward := range rewards {
		userIDs = append(userIDs, reward.UserId)
		if reward.TeamId > 0 {
			teamIDs = append(teamIDs, reward.TeamId)
		}
	}
	userMap, err := loadPeoplePlanUserMap(userIDs)
	if err != nil {
		return nil, err
	}
	teamMap, err := loadPeoplePlanAdminTeamMap(teamIDs)
	if err != nil {
		return nil, err
	}

	rows := make([]PeoplePlanAdminRewardRow, 0, len(rewards))
	for _, reward := range rewards {
		user := userMap[reward.UserId]
		team := teamMap[reward.TeamId]
		rows = append(rows, PeoplePlanAdminRewardRow{
			Id:           reward.Id,
			UserId:       reward.UserId,
			UserName:     user.DisplayName,
			Username:     user.Username,
			TeamId:       reward.TeamId,
			TeamName:     team.Name,
			TeamStatus:   team.Status,
			SourceType:   reward.SourceType,
			SourceKey:    reward.SourceKey,
			Title:        reward.Title,
			Description:  reward.Description,
			RewardType:   reward.RewardType,
			QuotaDelta:   reward.QuotaDelta,
			QuotaUSD:     int64(math.Round(float64(reward.QuotaDelta) / common.QuotaPerUnit)),
			Status:       reward.Status,
			ReviewStatus: reward.ReviewStatus,
			RiskStatus:   reward.RiskStatus,
			ClaimableAt:  reward.ClaimableAt,
			ReviewedBy:   reward.ReviewedBy,
			ReviewedAt:   reward.ReviewedAt,
			ReviewNotes:  reward.ReviewNotes,
			CreatedAt:    reward.CreatedAt,
			UpdatedAt:    reward.UpdatedAt,
		})
	}
	return rows, nil
}

func buildPeoplePlanAdminSubmissionRows(submissions []model.PeoplePlanSubmission) ([]PeoplePlanAdminSubmissionRow, error) {
	if len(submissions) == 0 {
		return []PeoplePlanAdminSubmissionRow{}, nil
	}
	userIDs := make([]int, 0, len(submissions))
	teamIDs := make([]int, 0, len(submissions))
	for _, submission := range submissions {
		userIDs = append(userIDs, submission.UserId)
		if submission.TeamId > 0 {
			teamIDs = append(teamIDs, submission.TeamId)
		}
	}
	userMap, err := loadPeoplePlanUserMap(userIDs)
	if err != nil {
		return nil, err
	}
	teamMap, err := loadPeoplePlanAdminTeamMap(teamIDs)
	if err != nil {
		return nil, err
	}

	rows := make([]PeoplePlanAdminSubmissionRow, 0, len(submissions))
	for _, submission := range submissions {
		user := userMap[submission.UserId]
		team := teamMap[submission.TeamId]
		rows = append(rows, PeoplePlanAdminSubmissionRow{
			Id:            submission.Id,
			UserId:        submission.UserId,
			UserName:      user.DisplayName,
			Username:      user.Username,
			TeamId:        submission.TeamId,
			TeamName:      team.Name,
			TeamStatus:    team.Status,
			Type:          submission.Type,
			Title:         submission.Title,
			Summary:       submission.Summary,
			Contact:       submission.Contact,
			PublicDisplay: submission.PublicDisplay,
			Status:        submission.Status,
			ReviewNotes:   submission.ReviewNotes,
			ReviewedBy:    submission.ReviewedBy,
			ReviewedAt:    submission.ReviewedAt,
			CreatedAt:     submission.CreatedAt,
			UpdatedAt:     submission.UpdatedAt,
		})
	}
	return rows, nil
}

func loadPeoplePlanAdminTeamMap(teamIDs []int) (map[int]model.PeoplePlanTeam, error) {
	if len(teamIDs) == 0 {
		return map[int]model.PeoplePlanTeam{}, nil
	}
	var teams []model.PeoplePlanTeam
	if err := model.DB.Where("id IN ?", teamIDs).Find(&teams).Error; err != nil {
		return nil, err
	}
	result := make(map[int]model.PeoplePlanTeam, len(teams))
	for _, team := range teams {
		result[team.Id] = team
	}
	return result, nil
}
