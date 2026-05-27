package service

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

type CreatePeoplePlanTeamInput struct {
	Name string `json:"name"`
}

type JoinPeoplePlanTeamInput struct {
	InviteCode string `json:"invite_code"`
}

type RemovePeoplePlanMemberInput struct {
	MemberUserId int `json:"member_user_id"`
}

type CreatePeoplePlanSubmissionInput struct {
	Type          string   `json:"type"`
	Title         string   `json:"title"`
	Summary       string   `json:"summary"`
	Content       string   `json:"content"`
	Attachments   []string `json:"attachments"`
	Contact       string   `json:"contact"`
	PublicDisplay bool     `json:"public_display"`
}

func GetPeoplePlanOverview(userId int) (*PeoplePlanOverview, error) {
	settings := GetPeoplePlanSettings()
	maxTeamRewardUSD, maxSubmissionUSD, maxTotalRewardUSD := getPeoplePlanTheoreticalMaxRewardUSD(settings)
	overview := &PeoplePlanOverview{
		Enabled:           settings.Enabled,
		EntryTitle:        settings.EntryTitle,
		EntrySubtitle:     settings.EntrySubtitle,
		HeroTitle:         settings.HeroTitle,
		HeroSubtitle:      settings.HeroSubtitle,
		HeroDescription:   settings.HeroDescription,
		MaxTeamRewardUSD:  maxTeamRewardUSD,
		MaxSubmissionUSD:  maxSubmissionUSD,
		MaxTotalRewardUSD: maxTotalRewardUSD,
		Popup: PeoplePlanPopupPayload{
			Enabled: settings.Popup.Enabled,
			Version: settings.Popup.Version,
			Title:   settings.Popup.Title,
			Body:    settings.Popup.Body,
		},
		TeamRules:       settings.TeamRules,
		Achievements:    buildAchievementRefs(settings.Achievements),
		Monthly:         buildAchievementRefs(settings.Monthly),
		TeamTasks:       append(buildAchievementRefs(settings.Achievements), buildAchievementRefs(settings.Monthly)...),
		SubmissionTasks: buildSubmissionTaskRefs(settings.Submissions),
		GeneratedAt:     nowMillis(),
	}
	rewards, _ := model.GetPeoplePlanRewardsByUser(userId, true)
	submissions, _ := model.GetPeoplePlanSubmissionsByUser(userId)
	overview.RecentRewards = truncatePeoplePlanRewards(rewards, 6)
	overview.RecentSubmissions = truncatePeoplePlanSubmissions(submissions, 4)
	overview.RewardSummary = buildPeoplePlanRewardSummary(rewards)

	if !settings.Enabled {
		return overview, nil
	}
	team, member, err := model.GetPeoplePlanTeamByUser(userId)
	if err != nil {
		return nil, err
	}
	if team != nil {
		teamDetail, syncErr := syncPeoplePlanTeam(team, settings)
		if syncErr != nil {
			return nil, syncErr
		}
		if teamDetail != nil && member != nil {
			teamDetail.Membership = *member
			overview.Team = teamDetail
		}
		updatedRewards, _ := model.GetPeoplePlanRewardsByUser(userId, true)
		overview.RecentRewards = truncatePeoplePlanRewards(updatedRewards, 6)
		overview.RewardSummary = buildPeoplePlanRewardSummary(updatedRewards)
	}
	return overview, nil
}

func GetPeoplePlanTeam(userId int) (*PeoplePlanTeamDetail, error) {
	settings, err := ensurePeoplePlanEnabled()
	if err != nil {
		return nil, err
	}
	team, member, err := model.GetPeoplePlanTeamByUser(userId)
	if err != nil {
		return nil, err
	}
	if team == nil || member == nil {
		return nil, nil
	}
	detail, err := syncPeoplePlanTeam(team, settings)
	if err != nil {
		return nil, err
	}
	if detail != nil {
		detail.Membership = *member
	}
	return detail, nil
}

func CreatePeoplePlanTeam(userId int, input CreatePeoplePlanTeamInput) (*PeoplePlanTeamDetail, error) {
	settings, err := ensurePeoplePlanEnabled()
	if err != nil {
		return nil, err
	}
	existingTeam, _, err := model.GetPeoplePlanTeamByUser(userId)
	if err != nil {
		return nil, err
	}
	if existingTeam != nil {
		return nil, errors.New("you are already in an active team")
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("team name is required")
	}
	inviteCode, err := generatePeoplePlanInviteCode()
	if err != nil {
		return nil, err
	}
	team := model.PeoplePlanTeam{
		Name:          name,
		InviteCode:    inviteCode,
		Status:        model.PeoplePlanTeamStatusCollecting,
		CaptainUserId: userId,
		MinMembers:    settings.TeamRules.MinMembers,
		MaxMembers:    settings.TeamRules.MaxMembers,
	}
	member := model.PeoplePlanMember{
		UserId:     userId,
		Role:       model.PeoplePlanMemberRoleCaptain,
		Status:     model.PeoplePlanMemberStatusActive,
		JoinSource: "created",
	}
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&team).Error; err != nil {
			return err
		}
		member.TeamId = team.Id
		return tx.Create(&member).Error
	})
	if err != nil {
		return nil, err
	}
	return GetPeoplePlanTeam(userId)
}

func JoinPeoplePlanTeam(userId int, input JoinPeoplePlanTeamInput) (*PeoplePlanTeamDetail, error) {
	if _, err := ensurePeoplePlanEnabled(); err != nil {
		return nil, err
	}
	existingTeam, _, err := model.GetPeoplePlanTeamByUser(userId)
	if err != nil {
		return nil, err
	}
	if existingTeam != nil {
		return nil, errors.New("you are already in an active team")
	}
	inviteCode := strings.TrimSpace(strings.ToUpper(input.InviteCode))
	if inviteCode == "" {
		return nil, errors.New("invite code is required")
	}
	var team model.PeoplePlanTeam
	if err := model.DB.Where("invite_code = ?", inviteCode).First(&team).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("team not found")
		}
		return nil, err
	}
	if team.Status == model.PeoplePlanTeamStatusLocked {
		return nil, errors.New("team is locked")
	}
	activeCount, err := model.CountActivePeoplePlanMembers(team.Id)
	if err != nil {
		return nil, err
	}
	if int(activeCount) >= team.MaxMembers {
		return nil, errors.New("team is full")
	}
	member := model.PeoplePlanMember{
		TeamId:          team.Id,
		UserId:          userId,
		Role:            model.PeoplePlanMemberRoleMember,
		Status:          model.PeoplePlanMemberStatusActive,
		JoinSource:      "invite_code",
		InvitedByUserId: team.CaptainUserId,
	}
	if err := model.DB.Create(&member).Error; err != nil {
		return nil, err
	}
	return GetPeoplePlanTeam(userId)
}

func LeavePeoplePlanTeam(userId int) error {
	team, member, err := model.GetPeoplePlanTeamByUser(userId)
	if err != nil {
		return err
	}
	if team == nil || member == nil {
		return errors.New("team not found")
	}
	activeCount, err := model.CountActivePeoplePlanMembers(team.Id)
	if err != nil {
		return err
	}
	if member.Role == model.PeoplePlanMemberRoleCaptain && activeCount > 1 {
		return errors.New("captain cannot leave while the team still has members")
	}
	return model.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.PeoplePlanMember{}).Where("id = ?", member.Id).Updates(map[string]any{
			"status": model.PeoplePlanMemberStatusLeft,
		}).Error; err != nil {
			return err
		}
		if member.Role == model.PeoplePlanMemberRoleCaptain {
			return tx.Model(&model.PeoplePlanTeam{}).Where("id = ?", team.Id).Updates(map[string]any{
				"status":    model.PeoplePlanTeamStatusLocked,
				"locked_at": nowMillis(),
			}).Error
		}
		return nil
	})
}

func RemovePeoplePlanMember(captainUserId int, input RemovePeoplePlanMemberInput) (*PeoplePlanTeamDetail, error) {
	settings, err := ensurePeoplePlanEnabled()
	if err != nil {
		return nil, err
	}
	if input.MemberUserId <= 0 {
		return nil, errors.New("member user id is required")
	}
	team, member, err := model.GetPeoplePlanTeamByUser(captainUserId)
	if err != nil {
		return nil, err
	}
	if team == nil || member == nil {
		return nil, errors.New("team not found")
	}
	if member.Role != model.PeoplePlanMemberRoleCaptain {
		return nil, errors.New("only captain can remove members")
	}
	if input.MemberUserId == captainUserId {
		return nil, errors.New("captain cannot remove self")
	}

	detail, err := syncPeoplePlanTeam(team, settings)
	if err != nil {
		return nil, err
	}
	if detail == nil {
		return nil, errors.New("team not found")
	}
	if detail.Team.Status == model.PeoplePlanTeamStatusLocked {
		return nil, errors.New("team is locked")
	}

	var targetProfile *PeoplePlanMemberProfile
	for i := range detail.Members {
		if detail.Members[i].UserId == input.MemberUserId {
			targetProfile = &detail.Members[i]
			break
		}
	}
	if targetProfile == nil {
		return nil, errors.New("member not found")
	}
	if targetProfile.Role == model.PeoplePlanMemberRoleCaptain {
		return nil, errors.New("captain cannot be removed")
	}
	if detail.Team.Status == model.PeoplePlanTeamStatusFormed && targetProfile.CountsAsEffectiveMember {
		return nil, errors.New("effective members cannot be removed after the team is formed")
	}

	if err := model.DB.Transaction(func(tx *gorm.DB) error {
		return tx.Model(&model.PeoplePlanMember{}).
			Where("team_id = ? AND user_id = ? AND status = ?", detail.Team.Id, input.MemberUserId, model.PeoplePlanMemberStatusActive).
			Updates(map[string]any{
				"status": model.PeoplePlanMemberStatusLeft,
			}).Error
	}); err != nil {
		return nil, err
	}

	model.RecordLog(captainUserId, model.LogTypeSystem, fmt.Sprintf("removed people plan member %d from team %d", input.MemberUserId, detail.Team.Id))
	return GetPeoplePlanTeam(captainUserId)
}

func ListPeoplePlanRewards(userId int) ([]model.PeoplePlanRewardLedger, PeoplePlanRewardSummary, error) {
	team, _, err := model.GetPeoplePlanTeamByUser(userId)
	if err != nil {
		return nil, PeoplePlanRewardSummary{}, err
	}
	if team != nil {
		settings := GetPeoplePlanSettings()
		if settings.Enabled {
			if _, err := syncPeoplePlanTeam(team, settings); err != nil {
				return nil, PeoplePlanRewardSummary{}, err
			}
		}
	}
	rewards, err := model.GetPeoplePlanRewardsByUser(userId, true)
	if err != nil {
		return nil, PeoplePlanRewardSummary{}, err
	}
	return rewards, buildPeoplePlanRewardSummary(rewards), nil
}

func ClaimPeoplePlanReward(userId int, rewardId int) (*model.PeoplePlanRewardLedger, error) {
	var reward model.PeoplePlanRewardLedger
	if err := model.DB.Where("id = ? AND user_id = ?", rewardId, userId).First(&reward).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("reward not found")
		}
		return nil, err
	}
	err := model.DB.Transaction(func(tx *gorm.DB) error {
		return model.ClaimPeoplePlanQuotaRewardTx(tx, &reward, nowMillis())
	})
	if err != nil {
		return nil, err
	}
	if err := model.DB.Where("id = ?", rewardId).First(&reward).Error; err != nil {
		return nil, err
	}
	model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("claimed people plan reward: %s", reward.Title))
	return &reward, nil
}

func ListPeoplePlanSubmissions(userId int) ([]model.PeoplePlanSubmission, error) {
	return model.GetPeoplePlanSubmissionsByUser(userId)
}

func CreatePeoplePlanSubmission(userId int, input CreatePeoplePlanSubmissionInput) (*model.PeoplePlanSubmission, error) {
	settings, err := ensurePeoplePlanEnabled()
	if err != nil {
		return nil, err
	}
	allowedTypes := map[string]bool{
		"content":   true,
		"project":   true,
		"community": true,
	}
	submissionType := strings.TrimSpace(strings.ToLower(input.Type))
	if !allowedTypes[submissionType] {
		return nil, errors.New("invalid submission type")
	}
	title := strings.TrimSpace(input.Title)
	content := strings.TrimSpace(input.Content)
	if title == "" || content == "" {
		return nil, errors.New("title and content are required")
	}
	team, _, teamErr := model.GetPeoplePlanTeamByUser(userId)
	if teamErr != nil {
		return nil, teamErr
	}
	attachments := make([]string, 0, len(input.Attachments))
	for _, item := range input.Attachments {
		value := strings.TrimSpace(item)
		if value != "" {
			attachments = append(attachments, value)
		}
	}
	submission := model.PeoplePlanSubmission{
		UserId:        userId,
		Type:          submissionType,
		Title:         title,
		Summary:       strings.TrimSpace(input.Summary),
		Content:       content,
		Attachments:   marshalPeoplePlanSnapshot(attachments),
		Contact:       strings.TrimSpace(input.Contact),
		PublicDisplay: input.PublicDisplay,
		Status:        model.PeoplePlanSubmissionStatusPending,
	}
	if team != nil {
		submission.TeamId = team.Id
	}
	if err := model.DB.Create(&submission).Error; err != nil {
		return nil, err
	}
	_ = settings
	return &submission, nil
}

func buildPeoplePlanRewardSummary(rewards []model.PeoplePlanRewardLedger) PeoplePlanRewardSummary {
	summary := PeoplePlanRewardSummary{Total: len(rewards)}
	for _, reward := range rewards {
		switch reward.Status {
		case model.PeoplePlanRewardStatusClaimable:
			summary.Claimable++
			summary.QuotaUSD += int64(float64(reward.QuotaDelta) / common.QuotaPerUnit)
		case model.PeoplePlanRewardStatusPending:
			summary.Pending++
		case model.PeoplePlanRewardStatusFrozen:
			summary.Frozen++
		case model.PeoplePlanRewardStatusClaimed:
			summary.Claimed++
		}
	}
	return summary
}

func truncatePeoplePlanRewards(rewards []model.PeoplePlanRewardLedger, limit int) []model.PeoplePlanRewardLedger {
	if len(rewards) <= limit {
		return rewards
	}
	return rewards[:limit]
}

func truncatePeoplePlanSubmissions(submissions []model.PeoplePlanSubmission, limit int) []model.PeoplePlanSubmission {
	if len(submissions) <= limit {
		return submissions
	}
	return submissions[:limit]
}

func generatePeoplePlanInviteCode() (string, error) {
	for i := 0; i < 10; i++ {
		code := strings.ToUpper(common.GetRandomString(8))
		var count int64
		if err := model.DB.Model(&model.PeoplePlanTeam{}).Where("invite_code = ?", code).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return code, nil
		}
	}
	return "", errors.New("failed to generate invite code")
}
