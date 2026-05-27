package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

const (
	peoplePlanSourceTypeAchievement = "achievement"
	peoplePlanSourceTypeSubmission  = "submission"
	peoplePlanReviewStatusAuto      = "auto"
	peoplePlanReviewStatusManual    = "manual"
	peoplePlanRiskStatusClear       = "clear"
	peoplePlanRiskStatusReview      = "review"
)

type PeoplePlanOverview struct {
	Enabled           bool                           `json:"enabled"`
	EntryTitle        string                         `json:"entry_title"`
	EntrySubtitle     string                         `json:"entry_subtitle"`
	HeroTitle         string                         `json:"hero_title"`
	HeroSubtitle      string                         `json:"hero_subtitle"`
	HeroDescription   string                         `json:"hero_description"`
	MaxTeamRewardUSD  int64                          `json:"max_team_reward_usd"`
	MaxSubmissionUSD  int64                          `json:"max_submission_reward_usd"`
	MaxTotalRewardUSD int64                          `json:"max_total_reward_usd"`
	Popup             PeoplePlanPopupPayload         `json:"popup"`
	TeamRules         PeoplePlanTeamRules            `json:"team_rules"`
	Achievements      []PeoplePlanAchievementRef     `json:"achievements"`
	Monthly           []PeoplePlanAchievementRef     `json:"monthly"`
	TeamTasks         []PeoplePlanAchievementRef     `json:"team_tasks"`
	SubmissionTasks   []PeoplePlanSubmissionTaskRef  `json:"submission_tasks"`
	Team              *PeoplePlanTeamDetail          `json:"team"`
	RewardSummary     PeoplePlanRewardSummary        `json:"reward_summary"`
	RecentRewards     []model.PeoplePlanRewardLedger `json:"recent_rewards"`
	RecentSubmissions []model.PeoplePlanSubmission   `json:"recent_submissions"`
	GeneratedAt       int64                          `json:"generated_at"`
}

type PeoplePlanPopupPayload struct {
	Enabled bool   `json:"enabled"`
	Version string `json:"version"`
	Title   string `json:"title"`
	Body    string `json:"body"`
}

type PeoplePlanAchievementRef struct {
	Key                 string                         `json:"key"`
	Category            string                         `json:"category"`
	Audience            string                         `json:"audience"`
	Title               string                         `json:"title"`
	Description         string                         `json:"description"`
	Metric              string                         `json:"metric"`
	Target              int64                          `json:"target"`
	RewardType          string                         `json:"reward_type"`
	RewardQuotaUSD      int64                          `json:"reward_quota_usd"`
	RewardPoolUSD       int64                          `json:"reward_pool_usd"`
	RewardTitle         string                         `json:"reward_title"`
	RewardDescription   string                         `json:"reward_description"`
	CaptainOnly         bool                           `json:"captain_only"`
	Repeatable          bool                           `json:"repeatable"`
	MaxCompletions      int                            `json:"max_completions"`
	ContributionMode    string                         `json:"contribution_mode"`
	ContributionSummary string                         `json:"contribution_summary"`
	ContributionWeights []PeoplePlanContributionWeight `json:"contribution_weights"`
	RewardTiers         []PeoplePlanRewardTier         `json:"reward_tiers"`
}

type PeoplePlanSubmissionTaskRef struct {
	Key                 string `json:"key"`
	Type                string `json:"type"`
	Title               string `json:"title"`
	Description         string `json:"description"`
	RewardPoolUSD       int64  `json:"reward_pool_usd"`
	Repeatable          bool   `json:"repeatable"`
	MaxCompletions      int    `json:"max_completions"`
	ContributionSummary string `json:"contribution_summary"`
}

type PeoplePlanRewardSummary struct {
	Total     int   `json:"total"`
	Claimable int   `json:"claimable"`
	Pending   int   `json:"pending"`
	Frozen    int   `json:"frozen"`
	Claimed   int   `json:"claimed"`
	QuotaUSD  int64 `json:"quota_usd"`
}

type PeoplePlanTeamDetail struct {
	Team         model.PeoplePlanTeam         `json:"team"`
	Membership   model.PeoplePlanMember       `json:"membership"`
	Summary      PeoplePlanTeamSummary        `json:"summary"`
	Members      []PeoplePlanMemberProfile    `json:"members"`
	Achievements []PeoplePlanAchievementState `json:"achievements"`
}

type PeoplePlanTeamSummary struct {
	ActiveMembers        int   `json:"active_members"`
	EffectiveMembers     int   `json:"effective_members"`
	MinMembers           int   `json:"min_members"`
	MaxMembers           int   `json:"max_members"`
	TeamCalls            int64 `json:"team_calls"`
	TeamSpendUSD         int64 `json:"team_spend_usd"`
	TeamInvites          int64 `json:"team_invites"`
	TeamBlindBoxOpens    int64 `json:"team_blind_box_opens"`
	MonthlyActiveMembers int   `json:"monthly_active_members"`
	MonthlyTeamSpendUSD  int64 `json:"monthly_team_spend_usd"`
}

type PeoplePlanMemberProfile struct {
	UserId                  int    `json:"user_id"`
	Username                string `json:"username"`
	DisplayName             string `json:"display_name"`
	Role                    string `json:"role"`
	Status                  string `json:"status"`
	JoinSource              string `json:"join_source"`
	VerifiedAt              int64  `json:"verified_at"`
	FirstApiKeyAt           int64  `json:"first_api_key_at"`
	FirstCallAt             int64  `json:"first_call_at"`
	FirstTopupAt            int64  `json:"first_topup_at"`
	EffectiveAt             int64  `json:"effective_at"`
	CurrentMonthSpend       int64  `json:"current_month_spend"`
	CurrentMonthCalls       int64  `json:"current_month_calls"`
	LifetimeSpend           int64  `json:"lifetime_spend"`
	LifetimeCalls           int64  `json:"lifetime_calls"`
	LifetimeInvites         int64  `json:"lifetime_invites"`
	LifetimeBlindBoxOpens   int64  `json:"lifetime_blind_box_opens"`
	CountsAsEffectiveMember bool   `json:"counts_as_effective_member"`
}

type PeoplePlanAchievementState struct {
	Key             string `json:"key"`
	Category        string `json:"category"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	Metric          string `json:"metric"`
	PeriodKey       string `json:"period_key"`
	CurrentValue    int64  `json:"current_value"`
	TargetValue     int64  `json:"target_value"`
	Status          string `json:"status"`
	LastReachedAt   int64  `json:"last_reached_at"`
	CompletionCount int    `json:"completion_count"`
	RewardLedgerId  int    `json:"reward_ledger_id"`
}

type peoplePlanUserLite struct {
	Id          int
	Username    string
	DisplayName string
	Email       string
	GitHubId    string
	DiscordId   string
	OidcId      string
	WeChatId    string
	TelegramId  string
	LinuxDOId   string
	LastLoginAt int64
	CreatedAt   int64
}

type peoplePlanMemberStats struct {
	verifiedAt            int64
	firstAPIKeyAt         int64
	firstCallAt           int64
	firstTopupAt          int64
	effectiveAt           int64
	lastActiveAt          int64
	currentMonthSpend     int64
	currentMonthCalls     int64
	lifetimeSpend         int64
	lifetimeCalls         int64
	lifetimeInvites       int64
	lifetimeBlindBoxOpens int64
}

type peoplePlanMemberSnapshot struct {
	DisplayName             string `json:"display_name"`
	Username                string `json:"username"`
	Effective               bool   `json:"effective"`
	LifetimeInvites         int64  `json:"lifetime_invites"`
	LifetimeBlindBoxOpens   int64  `json:"lifetime_blind_box_opens"`
	CountsAsEffectiveMember bool   `json:"counts_as_effective_member"`
}

func buildAchievementRefs(rules []PeoplePlanAchievementRule) []PeoplePlanAchievementRef {
	items := make([]PeoplePlanAchievementRef, 0, len(rules))
	for _, rule := range rules {
		items = append(items, PeoplePlanAchievementRef{
			Key:                 rule.Key,
			Category:            rule.Category,
			Audience:            rule.Audience,
			Title:               rule.Title,
			Description:         rule.Description,
			Metric:              rule.Metric,
			Target:              rule.Target,
			RewardType:          rule.RewardType,
			RewardQuotaUSD:      rule.RewardQuotaUSD,
			RewardPoolUSD:       rule.RewardPoolUSD,
			RewardTitle:         rule.RewardTitle,
			RewardDescription:   rule.RewardDescription,
			CaptainOnly:         rule.CaptainOnly,
			Repeatable:          rule.Repeatable,
			MaxCompletions:      rule.MaxCompletions,
			ContributionMode:    rule.ContributionMode,
			ContributionSummary: rule.ContributionSummary,
			ContributionWeights: rule.ContributionWeights,
			RewardTiers:         rule.RewardTiers,
		})
	}
	return items
}

func buildSubmissionTaskRefs(settings PeoplePlanSubmissionSettings) []PeoplePlanSubmissionTaskRef {
	rules := settings.Tasks
	items := make([]PeoplePlanSubmissionTaskRef, 0, len(rules))
	for _, rule := range rules {
		items = append(items, PeoplePlanSubmissionTaskRef{
			Key:                 rule.Key,
			Type:                rule.Type,
			Title:               rule.Title,
			Description:         rule.Description,
			RewardPoolUSD:       getPeoplePlanSubmissionRewardUSD(PeoplePlanSettings{Submissions: settings}, rule.Type),
			Repeatable:          rule.Repeatable,
			MaxCompletions:      rule.MaxCompletions,
			ContributionSummary: rule.ContributionSummary,
		})
	}
	return items
}

func getPeoplePlanMaxRewardPoolUSD(rule PeoplePlanAchievementRule) int64 {
	maxRewardUSD := rule.RewardPoolUSD
	if maxRewardUSD <= 0 {
		maxRewardUSD = rule.RewardQuotaUSD
	}
	for _, tier := range rule.RewardTiers {
		if tier.RewardPoolUSD > maxRewardUSD {
			maxRewardUSD = tier.RewardPoolUSD
		}
	}
	return maxRewardUSD
}

func getPeoplePlanContributionWeightTotal(rule PeoplePlanAchievementRule) int64 {
	total := int64(0)
	for _, weight := range rule.ContributionWeights {
		if weight.Weight > 0 {
			total += int64(weight.Weight)
		}
	}
	if total <= 0 {
		return 100
	}
	return total
}

func estimatePeoplePlanPersonalRewardUSD(rule PeoplePlanAchievementRule, rewardUSD int64, requiredMembers int) int64 {
	if rewardUSD <= 0 {
		return 0
	}
	if requiredMembers <= 0 {
		requiredMembers = 1
	}
	if rule.ContributionMode == "equal" {
		return int64(math.Round(float64(rewardUSD) / float64(requiredMembers)))
	}
	weightTotal := getPeoplePlanContributionWeightTotal(rule)
	maxRatio := float64(weightTotal+1) / float64(weightTotal+int64(requiredMembers))
	return int64(math.Round(float64(rewardUSD) * maxRatio))
}

func getPeoplePlanTheoreticalPersonalAchievementRewardUSD(
	settings PeoplePlanSettings,
	rule PeoplePlanAchievementRule,
) int64 {
	bestRewardUSD := estimatePeoplePlanPersonalRewardUSD(
		rule,
		getPeoplePlanMaxRewardPoolUSD(rule),
		max(settings.TeamRules.MinMembers, 1),
	)
	for _, tier := range rule.RewardTiers {
		tierRewardUSD := tier.RewardPoolUSD
		if tierRewardUSD <= 0 {
			tierRewardUSD = rule.RewardPoolUSD
		}
		if tierRewardUSD <= 0 {
			tierRewardUSD = rule.RewardQuotaUSD
		}
		shareUSD := estimatePeoplePlanPersonalRewardUSD(
			rule,
			tierRewardUSD,
			max(tier.RequiredMembers, 1),
		)
		if shareUSD > bestRewardUSD {
			bestRewardUSD = shareUSD
		}
	}
	if rule.Metric == "effective_members" && rule.Target > 0 {
		shareUSD := estimatePeoplePlanPersonalRewardUSD(
			rule,
			getPeoplePlanMaxRewardPoolUSD(rule),
			int(rule.Target),
		)
		if shareUSD > bestRewardUSD {
			bestRewardUSD = shareUSD
		}
	}
	return bestRewardUSD
}

func getPeoplePlanTheoreticalMaxRewardUSD(settings PeoplePlanSettings) (int64, int64, int64) {
	teamMaxUSD := int64(0)
	for _, rule := range append(append([]PeoplePlanAchievementRule{}, settings.Achievements...), settings.Monthly...) {
		rewardUSD := getPeoplePlanTheoreticalPersonalAchievementRewardUSD(settings, rule)
		if rewardUSD <= 0 {
			continue
		}
		completionLimit := 1
		if rule.Repeatable && rule.MaxCompletions > 0 {
			completionLimit = rule.MaxCompletions
		}
		teamMaxUSD += rewardUSD * int64(completionLimit)
	}

	submissionMaxUSD := int64(0)
	for _, task := range settings.Submissions.Tasks {
		rewardUSD := getPeoplePlanSubmissionRewardUSD(settings, task.Type)
		if rewardUSD <= 0 {
			rewardUSD = task.RewardPoolUSD
		}
		if rewardUSD <= 0 {
			continue
		}
		completionLimit := 1
		if task.Repeatable && task.MaxCompletions > 0 {
			completionLimit = task.MaxCompletions
		}
		submissionMaxUSD += rewardUSD * int64(completionLimit)
	}

	return teamMaxUSD, submissionMaxUSD, teamMaxUSD + submissionMaxUSD
}

func ensurePeoplePlanEnabled() (PeoplePlanSettings, error) {
	settings := GetPeoplePlanSettings()
	if !settings.Enabled {
		return settings, errors.New("people plan is disabled")
	}
	return settings, nil
}

func nowMillis() int64 {
	return time.Now().UnixMilli()
}

func currentMonthInfo() (string, int64, int64) {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)
	return start.Format("2006-01"), start.Unix(), end.Unix()
}

func marshalPeoplePlanSnapshot(value any) string {
	data, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(data)
}

func pickTimestamp(values ...int64) int64 {
	result := int64(0)
	for _, value := range values {
		if value > result {
			result = value
		}
	}
	return result
}

func parsePeoplePlanMemberSnapshot(snapshot string) peoplePlanMemberSnapshot {
	var result peoplePlanMemberSnapshot
	if strings.TrimSpace(snapshot) == "" {
		return result
	}
	_ = json.Unmarshal([]byte(snapshot), &result)
	return result
}

func countsPeoplePlanEffectiveMember(member model.PeoplePlanMember, rules PeoplePlanTeamRules) bool {
	if member.Status != model.PeoplePlanMemberStatusActive {
		return false
	}
	if member.VerifiedAt <= 0 || member.FirstApiKeyAt <= 0 {
		return false
	}
	return member.LifetimeCalls >= rules.EffectiveMinCalls || member.LifetimeSpend >= rules.EffectiveMinSpendUSD
}

func isPeoplePlanFormationRule(rule PeoplePlanAchievementRule) bool {
	return rule.Metric == "effective_members" && strings.HasPrefix(rule.Key, "team-formed-")
}

func hasPeoplePlanFormationRewardByRuleTx(tx *gorm.DB, userId int, ruleKey string) (bool, error) {
	if userId <= 0 || strings.TrimSpace(ruleKey) == "" {
		return false, nil
	}
	var count int64
	query := tx.Model(&model.PeoplePlanRewardLedger{}).
		Where("user_id = ? AND source_type = ?", userId, peoplePlanSourceTypeAchievement).
		Where("source_key LIKE ?", "%:"+ruleKey+":%")
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func loadPeoplePlanUserMap(userIds []int) (map[int]peoplePlanUserLite, error) {
	if len(userIds) == 0 {
		return map[int]peoplePlanUserLite{}, nil
	}
	var users []peoplePlanUserLite
	err := model.DB.Model(&model.User{}).
		Select("id, username, display_name, email, github_id, discord_id, oidc_id, wechat_id, telegram_id, linux_do_id, last_login_at, created_at").
		Where("id IN ?", userIds).
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	result := make(map[int]peoplePlanUserLite, len(users))
	for _, user := range users {
		result[user.Id] = user
	}
	return result, nil
}

func computePeoplePlanMemberStats(userId int, user peoplePlanUserLite) (peoplePlanMemberStats, error) {
	var stats peoplePlanMemberStats
	monthKey, monthStart, monthEnd := currentMonthInfo()
	_ = monthKey

	stats.verifiedAt = pickTimestamp(user.LastLoginAt, user.CreatedAt)

	model.DB.Model(&model.Token{}).
		Where("user_id = ?", userId).
		Select("COALESCE(MIN(created_time), 0)").
		Scan(&stats.firstAPIKeyAt)

	model.DB.Model(&model.Log{}).
		Where("user_id = ? AND type = ?", userId, model.LogTypeConsume).
		Select("COALESCE(MIN(created_at), 0)").
		Scan(&stats.firstCallAt)

	model.DB.Model(&model.Log{}).
		Where("user_id = ? AND type = ?", userId, model.LogTypeConsume).
		Count(&stats.lifetimeCalls)

	model.DB.Model(&model.Log{}).
		Where("user_id = ? AND type = ? AND created_at >= ? AND created_at < ?", userId, model.LogTypeConsume, monthStart, monthEnd).
		Count(&stats.currentMonthCalls)

	model.DB.Model(&model.User{}).
		Where("inviter_id = ?", userId).
		Count(&stats.lifetimeInvites)

	var firstTopup int64
	model.DB.Model(&model.TopUp{}).
		Where("user_id = ? AND status = ?", userId, common.TopUpStatusSuccess).
		Select("COALESCE(MIN(CASE WHEN complete_time > 0 THEN complete_time ELSE create_time END), 0)").
		Scan(&firstTopup)
	stats.firstTopupAt = firstTopup

	var lifetimeSpend float64
	model.DB.Model(&model.TopUp{}).
		Where("user_id = ? AND status = ?", userId, common.TopUpStatusSuccess).
		Select("COALESCE(SUM(money), 0)").
		Scan(&lifetimeSpend)
	stats.lifetimeSpend = int64(math.Round(lifetimeSpend))

	var monthSpend float64
	model.DB.Model(&model.TopUp{}).
		Where("user_id = ? AND status = ? AND create_time >= ? AND create_time < ?", userId, common.TopUpStatusSuccess, monthStart, monthEnd).
		Select("COALESCE(SUM(money), 0)").
		Scan(&monthSpend)
	stats.currentMonthSpend = int64(math.Round(monthSpend))

	model.DB.Model(&model.BlindBoxOpenRecord{}).
		Where("user_id = ?", userId).
		Count(&stats.lifetimeBlindBoxOpens)

	stats.lastActiveAt = pickTimestamp(user.LastLoginAt, stats.firstCallAt, stats.firstTopupAt)
	return stats, nil
}

func syncPeoplePlanTeamByID(teamId int, settings PeoplePlanSettings) (*PeoplePlanTeamDetail, error) {
	if teamId <= 0 {
		return nil, nil
	}
	var team model.PeoplePlanTeam
	if err := model.DB.Where("id = ?", teamId).First(&team).Error; err != nil {
		return nil, err
	}
	return syncPeoplePlanTeam(&team, settings)
}

func syncPeoplePlanTeam(team *model.PeoplePlanTeam, settings PeoplePlanSettings) (*PeoplePlanTeamDetail, error) {
	if team == nil {
		return nil, nil
	}
	var activeMembers []model.PeoplePlanMember
	if err := model.DB.Where("team_id = ? AND status = ?", team.Id, model.PeoplePlanMemberStatusActive).Order("id asc").Find(&activeMembers).Error; err != nil {
		return nil, err
	}
	userIds := make([]int, 0, len(activeMembers))
	for _, member := range activeMembers {
		userIds = append(userIds, member.UserId)
	}
	userMap, err := loadPeoplePlanUserMap(userIds)
	if err != nil {
		return nil, err
	}

	memberUpdates := make([]model.PeoplePlanMember, 0, len(activeMembers))
	summary := PeoplePlanTeamSummary{
		MinMembers: team.MinMembers,
		MaxMembers: team.MaxMembers,
	}
	memberProfiles := make([]PeoplePlanMemberProfile, 0, len(activeMembers))

	for _, member := range activeMembers {
		user := userMap[member.UserId]
		stats, statsErr := computePeoplePlanMemberStats(member.UserId, user)
		if statsErr != nil {
			return nil, statsErr
		}
		member.VerifiedAt = stats.verifiedAt
		member.FirstApiKeyAt = stats.firstAPIKeyAt
		member.FirstCallAt = stats.firstCallAt
		member.FirstTopupAt = stats.firstTopupAt
		member.LastActiveAt = stats.lastActiveAt
		member.CurrentMonthSpend = stats.currentMonthSpend
		member.CurrentMonthCalls = stats.currentMonthCalls
		member.LifetimeSpend = stats.lifetimeSpend
		member.LifetimeCalls = stats.lifetimeCalls
		member.EffectiveAt = 0
		if countsPeoplePlanEffectiveMember(member, settings.TeamRules) {
			member.EffectiveAt = pickTimestamp(
				member.VerifiedAt,
				member.FirstApiKeyAt,
				member.FirstCallAt,
				member.FirstTopupAt,
			)
		}
		countsAsEffectiveMember := countsPeoplePlanEffectiveMember(member, settings.TeamRules)
		member.Snapshot = marshalPeoplePlanSnapshot(map[string]any{
			"display_name":               user.DisplayName,
			"username":                   user.Username,
			"effective":                  member.EffectiveAt > 0,
			"lifetime_invites":           stats.lifetimeInvites,
			"lifetime_blind_box_opens":   stats.lifetimeBlindBoxOpens,
			"counts_as_effective_member": countsAsEffectiveMember,
		})
		memberUpdates = append(memberUpdates, member)
		summary.ActiveMembers++
		summary.TeamCalls += member.LifetimeCalls
		summary.TeamSpendUSD += member.LifetimeSpend
		summary.TeamInvites += stats.lifetimeInvites
		summary.TeamBlindBoxOpens += stats.lifetimeBlindBoxOpens
		summary.MonthlyTeamSpendUSD += member.CurrentMonthSpend
		if member.CurrentMonthCalls >= settings.TeamRules.MonthlyActiveMinCalls {
			summary.MonthlyActiveMembers++
		}
		memberProfiles = append(memberProfiles, PeoplePlanMemberProfile{
			UserId:                  member.UserId,
			Username:                user.Username,
			DisplayName:             user.DisplayName,
			Role:                    member.Role,
			Status:                  member.Status,
			JoinSource:              member.JoinSource,
			VerifiedAt:              member.VerifiedAt,
			FirstApiKeyAt:           member.FirstApiKeyAt,
			FirstCallAt:             member.FirstCallAt,
			FirstTopupAt:            member.FirstTopupAt,
			EffectiveAt:             member.EffectiveAt,
			CurrentMonthSpend:       member.CurrentMonthSpend,
			CurrentMonthCalls:       member.CurrentMonthCalls,
			LifetimeSpend:           member.LifetimeSpend,
			LifetimeCalls:           member.LifetimeCalls,
			LifetimeInvites:         stats.lifetimeInvites,
			LifetimeBlindBoxOpens:   stats.lifetimeBlindBoxOpens,
			CountsAsEffectiveMember: countsAsEffectiveMember,
		})
	}

	for _, member := range memberUpdates {
		if countsPeoplePlanEffectiveMember(member, settings.TeamRules) {
			summary.EffectiveMembers++
		}
	}

	team.MinMembers = settings.TeamRules.MinMembers
	team.MaxMembers = settings.TeamRules.MaxMembers
	team.Status = model.PeoplePlanTeamStatusCollecting
	if summary.ActiveMembers >= settings.TeamRules.MinMembers && summary.EffectiveMembers >= settings.TeamRules.MinMembers {
		team.Status = model.PeoplePlanTeamStatusFormed
		if team.FormedAt <= 0 {
			team.FormedAt = nowMillis()
		}
	}
	team.LastSyncedAt = nowMillis()
	team.Snapshot = marshalPeoplePlanSnapshot(summary)

	progressList := make([]model.PeoplePlanAchievementProgress, 0)
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		for _, member := range memberUpdates {
			if err := tx.Model(&model.PeoplePlanMember{}).Where("id = ?", member.Id).Updates(map[string]any{
				"verified_at":         member.VerifiedAt,
				"first_api_key_at":    member.FirstApiKeyAt,
				"first_call_at":       member.FirstCallAt,
				"first_topup_at":      member.FirstTopupAt,
				"effective_at":        member.EffectiveAt,
				"last_active_at":      member.LastActiveAt,
				"current_month_spend": member.CurrentMonthSpend,
				"current_month_calls": member.CurrentMonthCalls,
				"lifetime_spend":      member.LifetimeSpend,
				"lifetime_calls":      member.LifetimeCalls,
				"snapshot":            member.Snapshot,
			}).Error; err != nil {
				return err
			}
		}
		if err := tx.Model(&model.PeoplePlanTeam{}).Where("id = ?", team.Id).Updates(map[string]any{
			"status":         team.Status,
			"formed_at":      team.FormedAt,
			"min_members":    team.MinMembers,
			"max_members":    team.MaxMembers,
			"last_synced_at": team.LastSyncedAt,
			"snapshot":       team.Snapshot,
		}).Error; err != nil {
			return err
		}
		var syncErr error
		progressList, syncErr = reconcilePeoplePlanAchievementsTx(tx, *team, memberUpdates, summary, settings)
		return syncErr
	})
	if err != nil {
		return nil, err
	}

	var membership model.PeoplePlanMember
	for _, member := range memberUpdates {
		if member.UserId == team.CaptainUserId {
			membership = member
			break
		}
	}
	achievementViews := make([]PeoplePlanAchievementState, 0, len(progressList))
	for _, progress := range progressList {
		var snapshot struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Metric      string `json:"metric"`
		}
		_ = json.Unmarshal([]byte(progress.Snapshot), &snapshot)
		achievementViews = append(achievementViews, PeoplePlanAchievementState{
			Key:             progress.AchievementKey,
			Category:        progress.Category,
			Title:           snapshot.Title,
			Description:     snapshot.Description,
			Metric:          snapshot.Metric,
			PeriodKey:       progress.PeriodKey,
			CurrentValue:    progress.CurrentValue,
			TargetValue:     progress.TargetValue,
			Status:          progress.Status,
			LastReachedAt:   progress.LastReachedAt,
			CompletionCount: progress.CompletionCount,
			RewardLedgerId:  progress.RewardLedgerId,
		})
	}

	return &PeoplePlanTeamDetail{
		Team:         *team,
		Membership:   membership,
		Summary:      summary,
		Members:      memberProfiles,
		Achievements: achievementViews,
	}, nil
}

func reconcilePeoplePlanAchievementsTx(
	tx *gorm.DB,
	team model.PeoplePlanTeam,
	members []model.PeoplePlanMember,
	summary PeoplePlanTeamSummary,
	settings PeoplePlanSettings,
) ([]model.PeoplePlanAchievementProgress, error) {
	now := nowMillis()
	monthKey, _, _ := currentMonthInfo()
	rules := append([]PeoplePlanAchievementRule{}, settings.Achievements...)
	rules = append(rules, settings.Monthly...)
	progressList := make([]model.PeoplePlanAchievementProgress, 0, len(rules))

	for _, rule := range rules {
		periodKey := "all-time"
		if rule.Category == "monthly" {
			periodKey = monthKey
		}
		currentValue := computePeoplePlanMetricValue(rule.Metric, summary)
		var progress model.PeoplePlanAchievementProgress
		err := tx.Where("team_id = ? AND achievement_key = ? AND period_key = ?", team.Id, rule.Key, periodKey).First(&progress).Error
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			progress = model.PeoplePlanAchievementProgress{
				TeamId:         team.Id,
				AchievementKey: rule.Key,
				Category:       rule.Category,
				PeriodKey:      periodKey,
			}
		}
		effectiveTarget := resolvePeoplePlanTarget(rule, summary.EffectiveMembers)
		progress.CurrentValue = currentValue
		progress.TargetValue = effectiveTarget
		progress.Status = "tracking"
		if currentValue >= effectiveTarget {
			progress.Status = "reached"
			if progress.LastReachedAt <= 0 {
				progress.LastReachedAt = now
			}
		}
		progress.Snapshot = marshalPeoplePlanSnapshot(map[string]any{
			"title":       rule.Title,
			"description": rule.Description,
			"metric":      rule.Metric,
		})
		if progress.Id == 0 {
			if err := tx.Create(&progress).Error; err != nil {
				return nil, err
			}
		} else {
			if err := tx.Model(&model.PeoplePlanAchievementProgress{}).Where("id = ?", progress.Id).Updates(map[string]any{
				"current_value":   progress.CurrentValue,
				"target_value":    progress.TargetValue,
				"status":          progress.Status,
				"last_reached_at": progress.LastReachedAt,
				"snapshot":        progress.Snapshot,
			}).Error; err != nil {
				return nil, err
			}
		}
		eligibleCount := computePeoplePlanCompletionCount(rule, currentValue, summary.EffectiveMembers)
		if eligibleCount > progress.CompletionCount {
			firstRewardID, err := issuePeoplePlanAchievementRewardsTx(
				tx,
				team,
				members,
				rule,
				periodKey,
				eligibleCount,
				progress.CompletionCount,
				summary,
				settings,
			)
			if err != nil {
				return nil, err
			}
			progress.CompletionCount = eligibleCount
			updates := map[string]any{
				"completion_count": progress.CompletionCount,
			}
			if firstRewardID > 0 && progress.RewardLedgerId == 0 {
				progress.RewardLedgerId = firstRewardID
				updates["reward_ledger_id"] = firstRewardID
			}
			if err := tx.Model(&model.PeoplePlanAchievementProgress{}).Where("id = ?", progress.Id).Updates(updates).Error; err != nil {
				return nil, err
			}
		}
		progressList = append(progressList, progress)
	}
	return progressList, nil
}

func computePeoplePlanCompletionCount(rule PeoplePlanAchievementRule, currentValue int64, effectiveMembers int) int {
	effectiveTarget := resolvePeoplePlanTarget(rule, effectiveMembers)
	if effectiveTarget <= 0 {
		return 0
	}
	if !rule.Repeatable {
		if currentValue >= effectiveTarget {
			return 1
		}
		return 0
	}
	maxCompletions := rule.MaxCompletions
	if maxCompletions <= 0 {
		maxCompletions = 1
	}
	count := int(currentValue / effectiveTarget)
	if count > maxCompletions {
		return maxCompletions
	}
	return count
}

func computePeoplePlanMetricValue(metric string, summary PeoplePlanTeamSummary) int64 {
	switch metric {
	case "effective_members":
		return int64(summary.EffectiveMembers)
	case "team_calls":
		return summary.TeamCalls
	case "team_spend_usd":
		return summary.TeamSpendUSD
	case "team_invites":
		return summary.TeamInvites
	case "team_blind_box_opens":
		return summary.TeamBlindBoxOpens
	case "monthly_active_members":
		return int64(summary.MonthlyActiveMembers)
	case "monthly_team_spend_usd":
		return summary.MonthlyTeamSpendUSD
	default:
		return 0
	}
}

func resolvePeoplePlanTarget(rule PeoplePlanAchievementRule, effectiveMembers int) int64 {
	if len(rule.RewardTiers) == 0 {
		return rule.Target
	}
	for _, tier := range rule.RewardTiers {
		if effectiveMembers >= tier.RequiredMembers && tier.Target > 0 {
			return tier.Target
		}
	}
	return rule.Target
}

func resolvePeoplePlanRewardPoolUSD(rule PeoplePlanAchievementRule, effectiveMembers int) int64 {
	if len(rule.RewardTiers) == 0 {
		return rule.RewardPoolUSD
	}
	selected := rule.RewardPoolUSD
	for _, tier := range rule.RewardTiers {
		if effectiveMembers >= tier.RequiredMembers && tier.RewardPoolUSD > 0 {
			selected = tier.RewardPoolUSD
		}
	}
	if selected > 0 {
		return selected
	}
	return rule.RewardPoolUSD
}

func getPeoplePlanContributionMetricValue(key string, member model.PeoplePlanMember) int64 {
	snapshot := parsePeoplePlanMemberSnapshot(member.Snapshot)
	switch key {
	case "effective_members":
		if snapshot.CountsAsEffectiveMember {
			return 1
		}
		return 0
	case "current_month_calls":
		return member.CurrentMonthCalls
	case "current_month_spend":
		return member.CurrentMonthSpend
	case "lifetime_calls":
		return member.LifetimeCalls
	case "lifetime_spend":
		return member.LifetimeSpend
	case "lifetime_invites":
		return snapshot.LifetimeInvites
	case "lifetime_blind_box_opens":
		return snapshot.LifetimeBlindBoxOpens
	default:
		return 0
	}
}

func buildPeoplePlanContributionScores(
	rule PeoplePlanAchievementRule,
	members []model.PeoplePlanMember,
) map[int]float64 {
	scores := make(map[int]float64, len(members))
	eligibleMembers := make([]model.PeoplePlanMember, 0, len(members))
	for _, member := range members {
		if member.Status != model.PeoplePlanMemberStatusActive {
			continue
		}
		eligibleMembers = append(eligibleMembers, member)
	}
	if len(eligibleMembers) == 0 {
		return scores
	}
	for _, member := range eligibleMembers {
		scores[member.UserId] = 1
	}

	if rule.ContributionMode == "equal" {
		return scores
	}

	if len(rule.ContributionWeights) == 0 {
		return scores
	}

	for _, weight := range rule.ContributionWeights {
		if weight.Weight <= 0 {
			continue
		}
		total := int64(0)
		values := make(map[int]int64, len(eligibleMembers))
		for _, member := range eligibleMembers {
			value := getPeoplePlanContributionMetricValue(weight.Key, member)
			values[member.UserId] = value
			total += value
		}
		if total <= 0 {
			equalShare := float64(weight.Weight) / float64(len(eligibleMembers))
			for _, member := range eligibleMembers {
				scores[member.UserId] += equalShare
			}
			continue
		}
		for _, member := range eligibleMembers {
			scores[member.UserId] += (float64(values[member.UserId]) / float64(total)) * float64(weight.Weight)
		}
	}
	return scores
}

func allocatePeoplePlanRewardShares(totalPoolUSD int64, scores map[int]float64) map[int]int64 {
	allocation := make(map[int]int64, len(scores))
	if totalPoolUSD <= 0 || len(scores) == 0 {
		return allocation
	}
	totalScore := 0.0
	for _, score := range scores {
		if score > 0 {
			totalScore += score
		}
	}
	if totalScore <= 0 {
		equalAmount := totalPoolUSD / int64(len(scores))
		remainder := totalPoolUSD % int64(len(scores))
		index := 0
		for userId := range scores {
			allocation[userId] = equalAmount
			if int64(index) < remainder {
				allocation[userId]++
			}
			index++
		}
		return allocation
	}

	type remainderItem struct {
		userId    int
		remainder float64
	}

	remainders := make([]remainderItem, 0, len(scores))
	assigned := int64(0)
	for userId, score := range scores {
		raw := (score / totalScore) * float64(totalPoolUSD)
		base := int64(math.Floor(raw))
		allocation[userId] = base
		assigned += base
		remainders = append(remainders, remainderItem{
			userId:    userId,
			remainder: raw - float64(base),
		})
	}
	left := totalPoolUSD - assigned
	for left > 0 {
		bestIndex := 0
		for index := 1; index < len(remainders); index++ {
			if remainders[index].remainder > remainders[bestIndex].remainder {
				bestIndex = index
			}
		}
		allocation[remainders[bestIndex].userId]++
		remainders[bestIndex].remainder = 0
		left--
	}
	return allocation
}

func issuePeoplePlanAchievementRewardsTx(
	tx *gorm.DB,
	team model.PeoplePlanTeam,
	members []model.PeoplePlanMember,
	rule PeoplePlanAchievementRule,
	periodKey string,
	eligibleCount int,
	completedCount int,
	summary PeoplePlanTeamSummary,
	settings PeoplePlanSettings,
) (int, error) {
	firstRewardID := 0

	eligibleMembers := make([]model.PeoplePlanMember, 0, len(members))
	for _, member := range members {
		if member.Status != model.PeoplePlanMemberStatusActive {
			continue
		}
		if rule.CaptainOnly && member.UserId != team.CaptainUserId {
			continue
		}
		if !rule.CaptainOnly && !countsPeoplePlanEffectiveMember(member, settings.TeamRules) {
			continue
		}
		eligibleMembers = append(eligibleMembers, member)
	}
	if isPeoplePlanFormationRule(rule) {
		filteredMembers := make([]model.PeoplePlanMember, 0, len(eligibleMembers))
		for _, member := range eligibleMembers {
			claimed, err := hasPeoplePlanFormationRewardByRuleTx(tx, member.UserId, rule.Key)
			if err != nil {
				return 0, err
			}
			if claimed {
				continue
			}
			filteredMembers = append(filteredMembers, member)
		}
		eligibleMembers = filteredMembers
	}
	if len(eligibleMembers) == 0 {
		return 0, nil
	}

	scores := buildPeoplePlanContributionScores(rule, eligibleMembers)

	rewardPoolUSD := resolvePeoplePlanRewardPoolUSD(rule, summary.EffectiveMembers)
	if rewardPoolUSD <= 0 {
		rewardPoolUSD = rule.RewardPoolUSD
	}
	if rewardPoolUSD <= 0 {
		rewardPoolUSD = rule.RewardQuotaUSD
	}

	for completionIndex := completedCount + 1; completionIndex <= eligibleCount; completionIndex++ {
		filteredScores := make(map[int]float64, len(eligibleMembers))
		for _, member := range eligibleMembers {
			filteredScores[member.UserId] = scores[member.UserId]
		}
		shares := allocatePeoplePlanRewardShares(rewardPoolUSD, filteredScores)
		filteredTotalScore := 0.0
		for _, score := range filteredScores {
			filteredTotalScore += score
		}
		for _, member := range eligibleMembers {
			shareUSD := shares[member.UserId]
			scoreRatio := 0.0
			if filteredTotalScore > 0 {
				scoreRatio = scores[member.UserId] / filteredTotalScore
			}
			reward := model.PeoplePlanRewardLedger{
				UserId:      member.UserId,
				TeamId:      team.Id,
				SourceType:  peoplePlanSourceTypeAchievement,
				SourceKey:   fmt.Sprintf("achievement:%d:%s:%s:%d:%d", team.Id, rule.Key, periodKey, completionIndex, member.UserId),
				Title:       rule.RewardTitle,
				Description: rule.RewardDescription,
				RewardType:  rule.RewardType,
				QuotaDelta:  QuotaFromUSDInt(shareUSD),
				RewardPayload: marshalPeoplePlanSnapshot(map[string]any{
					"rule_key":         rule.Key,
					"category":         rule.Category,
					"completion_index": completionIndex,
					"reward_pool_usd":  rewardPoolUSD,
					"share_usd":        shareUSD,
					"share_ratio":      scoreRatio,
				}),
				Status:       model.PeoplePlanRewardStatusClaimable,
				ReviewStatus: peoplePlanReviewStatusAuto,
				RiskStatus:   peoplePlanRiskStatusClear,
				ClaimableAt:  nowMillis(),
			}
			if rule.RequireManualReview {
				reward.Status = model.PeoplePlanRewardStatusPending
				reward.ReviewStatus = peoplePlanReviewStatusManual
			}
			if settings.Risk.FreezeLargeManualRewards && shareUSD >= settings.Risk.LargeRewardThresholdUSD {
				reward.Status = model.PeoplePlanRewardStatusFrozen
				reward.RiskStatus = peoplePlanRiskStatusReview
			}
			if err := model.CreatePeoplePlanRewardTx(tx, &reward); err != nil {
				return 0, err
			}
			if reward.Id > 0 && firstRewardID == 0 {
				firstRewardID = reward.Id
			}
		}
	}
	return firstRewardID, nil
}

func createPeoplePlanRiskReviewTx(tx *gorm.DB, userId int, teamId int, rewardLedgerId int, ruleKey string, reason string) error {
	review := model.PeoplePlanRiskReview{
		UserId:         userId,
		TeamId:         teamId,
		RewardLedgerId: rewardLedgerId,
		RuleKey:        ruleKey,
		RiskLevel:      "medium",
		HitReason:      reason,
		Status:         model.PeoplePlanRiskStatusOpen,
	}
	return tx.Create(&review).Error
}
