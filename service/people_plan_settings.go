package service

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type PeoplePlanSettings struct {
	Enabled         bool                         `json:"enabled"`
	EntryTitle      string                       `json:"entry_title"`
	EntrySubtitle   string                       `json:"entry_subtitle"`
	HeroTitle       string                       `json:"hero_title"`
	HeroSubtitle    string                       `json:"hero_subtitle"`
	HeroDescription string                       `json:"hero_description"`
	TeamRules       PeoplePlanTeamRules          `json:"team_rules"`
	Achievements    []PeoplePlanAchievementRule  `json:"achievements"`
	Monthly         []PeoplePlanAchievementRule  `json:"monthly"`
	Popup           PeoplePlanPopupSettings      `json:"popup"`
	Submissions     PeoplePlanSubmissionSettings `json:"submissions"`
	Risk            PeoplePlanRiskSettings       `json:"risk"`
}

type PeoplePlanRewardTier struct {
	RequiredMembers int   `json:"required_members"`
	Target          int64 `json:"target"`
	RewardPoolUSD   int64 `json:"reward_pool_usd"`
}

type PeoplePlanContributionWeight struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Weight int    `json:"weight"`
}

type PeoplePlanTeamRules struct {
	MinMembers                int                    `json:"min_members"`
	MaxMembers                int                    `json:"max_members"`
	EffectiveInviteRewardUSD  int64                  `json:"effective_invite_reward_usd"`
	EffectiveInviteeGiftUSD   int64                  `json:"effective_invitee_gift_usd"`
	TeamRewardPerMemberUSD    int64                  `json:"team_reward_per_member_usd"`
	CaptainRewardUSD          int64                  `json:"captain_reward_usd"`
	RewardMinContributionBps  int                    `json:"reward_min_contribution_bps"`
	EffectiveMinCalls         int64                  `json:"effective_min_calls"`
	EffectiveMinSpendUSD      int64                  `json:"effective_min_spend_usd"`
	RewardTiers               []PeoplePlanRewardTier `json:"reward_tiers"`
}

type PeoplePlanAchievementRule struct {
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
	RequireManualReview bool                           `json:"require_manual_review"`
	Repeatable          bool                           `json:"repeatable"`
	MaxCompletions      int                            `json:"max_completions"`
	ContributionMode    string                         `json:"contribution_mode"`
	ContributionSummary string                         `json:"contribution_summary"`
	ContributionWeights []PeoplePlanContributionWeight `json:"contribution_weights"`
	RewardTiers         []PeoplePlanRewardTier         `json:"reward_tiers"`
}

type PeoplePlanPopupSettings struct {
	Enabled bool   `json:"enabled"`
	Version string `json:"version"`
	Title   string `json:"title"`
	Body    string `json:"body"`
}

type PeoplePlanSubmissionTaskRule struct {
	Key                 string `json:"key"`
	Type                string `json:"type"`
	Title               string `json:"title"`
	Description         string `json:"description"`
	RewardPoolUSD       int64  `json:"reward_pool_usd"`
	Repeatable          bool   `json:"repeatable"`
	MaxCompletions      int    `json:"max_completions"`
	ContributionSummary string `json:"contribution_summary"`
}

type PeoplePlanSubmissionSettings struct {
	ContentRewardUSD   int64                          `json:"content_reward_usd"`
	ProjectRewardUSD   int64                          `json:"project_reward_usd"`
	CommunityRewardUSD int64                          `json:"community_reward_usd"`
	Tasks              []PeoplePlanSubmissionTaskRule `json:"tasks"`
}

type PeoplePlanRiskSettings struct {
	FreezeDuplicateTeamClaims bool  `json:"freeze_duplicate_team_claims"`
	FreezeLargeManualRewards  bool  `json:"freeze_large_manual_rewards"`
	LargeRewardThresholdUSD   int64 `json:"large_reward_threshold_usd"`
}

func defaultPeoplePlanSettings() PeoplePlanSettings {
	teamRewardTiers := []PeoplePlanRewardTier{
		{RequiredMembers: 3, Target: 0, RewardPoolUSD: 30},
		{RequiredMembers: 5, Target: 0, RewardPoolUSD: 60},
		{RequiredMembers: 8, Target: 0, RewardPoolUSD: 120},
	}

	return PeoplePlanSettings{
		Enabled:         true,
		EntryTitle:      "人海计划",
		EntrySubtitle:   "组队活动看小队，投稿活动看个人",
		HeroTitle:       "Code Go 人海计划",
		HeroSubtitle:    "先组队，再做任务；完成后按贡献奖励给个人",
		HeroDescription: "组队页会直接写清楚任务和奖励，未组队也能先查看。成团奖励只作为启动奖池，主要奖励来自调用、消费和月度任务。",
		TeamRules: PeoplePlanTeamRules{
			MinMembers:               3,
			MaxMembers:               8,
			EffectiveInviteRewardUSD: 10,
			EffectiveInviteeGiftUSD:  5,
			TeamRewardPerMemberUSD:   20,
			CaptainRewardUSD:         30,
			RewardMinContributionBps: 500,
			EffectiveMinCalls:        50,
			EffectiveMinSpendUSD:     5,
			RewardTiers:              teamRewardTiers,
		},
		Achievements: []PeoplePlanAchievementRule{
			{
				Key:                 "team-formed-3",
				Category:            "long_term",
				Audience:            "team",
				Title:               "3人成团奖励",
				Description:         "达到 3 名有效成员后，发放 1 次启动奖池。",
				Metric:              "effective_members",
				Target:              3,
				RewardType:          "quota",
				RewardQuotaUSD:      30,
				RewardPoolUSD:       30,
				RewardTitle:         "3人成团奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          false,
				MaxCompletions:      1,
				ContributionMode:    "weighted",
				ContributionSummary: "成团奖励只发一次，按有效成员转化、累计调用和本月活跃奖励给个人。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "effective_members", Label: "有效成员转化", Weight: 50},
					{Key: "lifetime_calls", Label: "累计调用", Weight: 30},
					{Key: "current_month_calls", Label: "本月活跃", Weight: 20},
				},
			},
			{
				Key:                 "team-formed-5",
				Category:            "long_term",
				Audience:            "team",
				Title:               "5人成团奖励",
				Description:         "达到 5 名有效成员后，发放 1 次进阶成团奖池。",
				Metric:              "effective_members",
				Target:              5,
				RewardType:          "quota",
				RewardQuotaUSD:      60,
				RewardPoolUSD:       60,
				RewardTitle:         "5人成团奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          false,
				MaxCompletions:      1,
				ContributionMode:    "weighted",
				ContributionSummary: "5人成团奖励不是主奖励，按有效成员转化、累计调用和本月活跃奖励给个人。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "effective_members", Label: "有效成员转化", Weight: 50},
					{Key: "lifetime_calls", Label: "累计调用", Weight: 30},
					{Key: "current_month_calls", Label: "本月活跃", Weight: 20},
				},
			},
			{
				Key:                 "team-formed-8",
				Category:            "long_term",
				Audience:            "team",
				Title:               "8人成团奖励",
				Description:         "达到 8 名有效成员后，发放 1 次高阶成团奖池。",
				Metric:              "effective_members",
				Target:              8,
				RewardType:          "quota",
				RewardQuotaUSD:      120,
				RewardPoolUSD:       120,
				RewardTitle:         "8人成团奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          false,
				MaxCompletions:      1,
				ContributionMode:    "weighted",
				ContributionSummary: "8人成团奖励只发一次，按有效成员转化、累计调用和本月活跃奖励给个人。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "effective_members", Label: "有效成员转化", Weight: 50},
					{Key: "lifetime_calls", Label: "累计调用", Weight: 30},
					{Key: "current_month_calls", Label: "本月活跃", Weight: 20},
				},
			},
			{
				Key:                 "first-2000-calls",
				Category:            "long_term",
				Audience:            "team",
				Title:               "调用冲刺",
				Description:         "小队累计调用达到人均目标后，结算 1 次任务奖池。",
				Metric:              "team_calls",
				Target:              1500,
				RewardType:          "quota",
				RewardQuotaUSD:      48,
				RewardPoolUSD:       48,
				RewardTitle:         "调用冲刺奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          true,
				MaxCompletions:      4,
				ContributionMode:    "weighted",
				ContributionSummary: "调用冲刺是组队主奖励之一，按累计调用为主、累计消费为辅奖励给个人。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "lifetime_calls", Label: "累计调用", Weight: 70},
					{Key: "lifetime_spend", Label: "累计消费", Weight: 30},
				},
				RewardTiers: []PeoplePlanRewardTier{
					{RequiredMembers: 3, Target: 1500, RewardPoolUSD: 48},
					{RequiredMembers: 5, Target: 3000, RewardPoolUSD: 100},
					{RequiredMembers: 8, Target: 5600, RewardPoolUSD: 192},
				},
			},
			{
				Key:                 "team-spend-200",
				Category:            "long_term",
				Audience:            "team",
				Title:               "消费冲刺",
				Description:         "小队累计消费达到人均目标后，结算 1 次任务奖池。",
				Metric:              "team_spend_usd",
				Target:              150,
				RewardType:          "quota",
				RewardQuotaUSD:      36,
				RewardPoolUSD:       36,
				RewardTitle:         "消费冲刺奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          true,
				MaxCompletions:      3,
				ContributionMode:    "weighted",
				ContributionSummary: "消费冲刺按累计消费为主、累计调用为辅奖励给个人。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "lifetime_spend", Label: "累计消费", Weight: 75},
					{Key: "lifetime_calls", Label: "累计调用", Weight: 25},
				},
				RewardTiers: []PeoplePlanRewardTier{
					{RequiredMembers: 3, Target: 150, RewardPoolUSD: 36},
					{RequiredMembers: 5, Target: 300, RewardPoolUSD: 75},
					{RequiredMembers: 8, Target: 560, RewardPoolUSD: 144},
				},
			},
		},
		Monthly: []PeoplePlanAchievementRule{
			{
				Key:                 "monthly-active",
				Category:            "monthly",
				Audience:            "team",
				Title:               "月度活跃",
				Description:         "当月有调用的成员达到目标人数，结算 1 次月度奖池。",
				Metric:              "monthly_active_members",
				Target:              3,
				RewardType:          "quota",
				RewardQuotaUSD:      18,
				RewardPoolUSD:       18,
				RewardTitle:         "月度活跃奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          true,
				MaxCompletions:      1,
				ContributionMode:    "weighted",
				ContributionSummary: "月度活跃奖励按本月调用活跃度奖励给个人。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "current_month_calls", Label: "本月调用", Weight: 100},
				},
				RewardTiers: []PeoplePlanRewardTier{
					{RequiredMembers: 3, Target: 3, RewardPoolUSD: 18},
					{RequiredMembers: 5, Target: 4, RewardPoolUSD: 40},
					{RequiredMembers: 8, Target: 5, RewardPoolUSD: 75},
				},
			},
			{
				Key:                 "monthly-spend-150",
				Category:            "monthly",
				Audience:            "team",
				Title:               "月度消费",
				Description:         "当月小队消费达到人均目标后，结算 1 次月度奖池。",
				Metric:              "monthly_team_spend_usd",
				Target:              90,
				RewardType:          "quota",
				RewardQuotaUSD:      24,
				RewardPoolUSD:       24,
				RewardTitle:         "月度消费奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          true,
				MaxCompletions:      1,
				ContributionMode:    "weighted",
				ContributionSummary: "月度消费奖励按本月消费贡献奖励给个人。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "current_month_spend", Label: "本月消费", Weight: 100},
				},
				RewardTiers: []PeoplePlanRewardTier{
					{RequiredMembers: 3, Target: 90, RewardPoolUSD: 24},
					{RequiredMembers: 5, Target: 175, RewardPoolUSD: 50},
					{RequiredMembers: 8, Target: 320, RewardPoolUSD: 96},
				},
			},
		},
		Popup: PeoplePlanPopupSettings{
			Enabled: true,
			Version: "v1",
			Title:   "Code Go 人海计划已开启",
			Body:    "先查看规则，再进入组队活动或投稿活动。组队页会直接写出任务、奖励和完成条件。",
		},
		Submissions: PeoplePlanSubmissionSettings{
			ContentRewardUSD:   50,
			ProjectRewardUSD:   100,
			CommunityRewardUSD: 150,
			Tasks: []PeoplePlanSubmissionTaskRule{
				{
					Key:                 "content-submission",
					Type:                "content",
					Title:               "内容投稿",
					Description:         "适合教程、案例、评测、使用经验。",
					RewardPoolUSD:       60,
					Repeatable:          true,
					MaxCompletions:      5,
					ContributionSummary: "审核通过后，按内容质量和实际帮助度奖励给投稿人本人。",
				},
				{
					Key:                 "project-integration",
					Type:                "project",
					Title:               "项目接入",
					Description:         "适合线上项目、演示站点、产品接入成果。",
					RewardPoolUSD:       150,
					Repeatable:          true,
					MaxCompletions:      3,
					ContributionSummary: "审核通过后，按接入完整度、可复用性和实际效果奖励给投稿人本人。",
				},
				{
					Key:                 "community-contribution",
					Type:                "community",
					Title:               "社区共建",
					Description:         "适合活动组织、答疑共创、社区联动成果。",
					RewardPoolUSD:       100,
					Repeatable:          true,
					MaxCompletions:      2,
					ContributionSummary: "审核通过后，按组织效果、互动质量和后续转化奖励给投稿人本人。",
				},
			},
		},
		Risk: PeoplePlanRiskSettings{
			FreezeDuplicateTeamClaims: true,
			FreezeLargeManualRewards:  true,
			LargeRewardThresholdUSD:   100,
		},
	}
}

func GetPeoplePlanSettings() PeoplePlanSettings {
	defaults := defaultPeoplePlanSettings()
	settings := defaults
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()

	if raw, ok := common.OptionMap["people_plan_setting.enabled"]; ok {
		settings.Enabled = parseBoolOption(raw, settings.Enabled)
	}
	if raw, ok := common.OptionMap["people_plan_setting.entry_title"]; ok && strings.TrimSpace(raw) != "" {
		settings.EntryTitle = raw
	}
	if raw, ok := common.OptionMap["people_plan_setting.entry_subtitle"]; ok && strings.TrimSpace(raw) != "" {
		settings.EntrySubtitle = raw
	}
	if raw, ok := common.OptionMap["people_plan_setting.hero_title"]; ok && strings.TrimSpace(raw) != "" {
		settings.HeroTitle = raw
	}
	if raw, ok := common.OptionMap["people_plan_setting.hero_subtitle"]; ok && strings.TrimSpace(raw) != "" {
		settings.HeroSubtitle = raw
	}
	if raw, ok := common.OptionMap["people_plan_setting.hero_description"]; ok && strings.TrimSpace(raw) != "" {
		settings.HeroDescription = raw
	}
	decodeJSONOption("people_plan_setting.team_rules", &settings.TeamRules)
	decodeJSONOption("people_plan_setting.achievements", &settings.Achievements)
	decodeJSONOption("people_plan_setting.monthly", &settings.Monthly)
	decodeJSONOption("people_plan_setting.popup", &settings.Popup)
	decodeJSONOption("people_plan_setting.submissions", &settings.Submissions)
	decodeJSONOption("people_plan_setting.risk", &settings.Risk)

	settings.TeamRules = normalizePeoplePlanTeamRules(
		settings.TeamRules,
		defaults.TeamRules,
	)
	settings.Achievements = normalizePeoplePlanAchievementRules(
		settings.Achievements,
		defaults.Achievements,
	)
	settings.Monthly = normalizePeoplePlanAchievementRules(
		settings.Monthly,
		defaults.Monthly,
	)
	settings.Submissions = normalizePeoplePlanSubmissionSettings(
		settings.Submissions,
		defaults.Submissions,
	)

	return settings
}

func normalizePeoplePlanTeamRules(
	current PeoplePlanTeamRules,
	defaults PeoplePlanTeamRules,
) PeoplePlanTeamRules {
	if current.MinMembers <= 0 {
		current.MinMembers = defaults.MinMembers
	}
	if current.MaxMembers <= 0 {
		current.MaxMembers = defaults.MaxMembers
	}
	if len(current.RewardTiers) == 0 {
		current.RewardTiers = defaults.RewardTiers
	}
	return current
}

func normalizePeoplePlanAchievementRules(
	current []PeoplePlanAchievementRule,
	defaults []PeoplePlanAchievementRule,
) []PeoplePlanAchievementRule {
	if len(current) == 0 {
		return defaults
	}
	defaultMap := make(map[string]PeoplePlanAchievementRule, len(defaults))
	for _, rule := range defaults {
		defaultMap[rule.Key] = rule
	}
	hasNewKeys := false
	for _, rule := range current {
		if _, ok := defaultMap[rule.Key]; ok {
			hasNewKeys = true
		}
	}
	if !hasNewKeys {
		return defaults
	}

	normalized := make([]PeoplePlanAchievementRule, 0, len(current))
	for _, rule := range current {
		def, ok := defaultMap[rule.Key]
		if !ok {
			continue
		}
		if rule.Title == "" {
			rule.Title = def.Title
		}
		if rule.Description == "" {
			rule.Description = def.Description
		}
		if rule.Audience == "" {
			rule.Audience = def.Audience
		}
		if rule.RewardTitle == "" {
			rule.RewardTitle = def.RewardTitle
		}
		if rule.RewardDescription == "" {
			rule.RewardDescription = def.RewardDescription
		}
		if rule.MaxCompletions <= 0 {
			rule.MaxCompletions = def.MaxCompletions
		}
		if rule.ContributionMode == "" {
			rule.ContributionMode = def.ContributionMode
		}
		if rule.ContributionSummary == "" {
			rule.ContributionSummary = def.ContributionSummary
		}
		if len(rule.ContributionWeights) == 0 {
			rule.ContributionWeights = def.ContributionWeights
		}
		if len(rule.RewardTiers) == 0 {
			rule.RewardTiers = def.RewardTiers
		}
		if rule.RewardPoolUSD <= 0 {
			rule.RewardPoolUSD = def.RewardPoolUSD
		}
		if rule.RewardQuotaUSD <= 0 {
			rule.RewardQuotaUSD = def.RewardQuotaUSD
		}
		normalized = append(normalized, rule)
	}
	if len(normalized) == 0 {
		return defaults
	}
	return normalized
}

func normalizePeoplePlanSubmissionSettings(
	current PeoplePlanSubmissionSettings,
	defaults PeoplePlanSubmissionSettings,
) PeoplePlanSubmissionSettings {
	if current.ContentRewardUSD <= 0 {
		current.ContentRewardUSD = defaults.ContentRewardUSD
	}
	if current.ProjectRewardUSD <= 0 {
		current.ProjectRewardUSD = defaults.ProjectRewardUSD
	}
	if current.CommunityRewardUSD <= 0 {
		current.CommunityRewardUSD = defaults.CommunityRewardUSD
	}
	if len(current.Tasks) == 0 {
		current.Tasks = defaults.Tasks
		return current
	}

	defaultMap := make(map[string]PeoplePlanSubmissionTaskRule, len(defaults.Tasks))
	for _, task := range defaults.Tasks {
		defaultMap[task.Key] = task
	}
	normalized := make([]PeoplePlanSubmissionTaskRule, 0, len(current.Tasks))
	for _, task := range current.Tasks {
		def, ok := defaultMap[task.Key]
		if !ok {
			continue
		}
		if task.Title == "" {
			task.Title = def.Title
		}
		if task.Description == "" {
			task.Description = def.Description
		}
		if task.RewardPoolUSD <= 0 {
			task.RewardPoolUSD = def.RewardPoolUSD
		}
		if task.MaxCompletions <= 0 {
			task.MaxCompletions = def.MaxCompletions
		}
		if task.ContributionSummary == "" {
			task.ContributionSummary = def.ContributionSummary
		}
		normalized = append(normalized, task)
	}
	if len(normalized) == 0 {
		current.Tasks = defaults.Tasks
		return current
	}
	current.Tasks = normalized
	return current
}

func parseBoolOption(value string, fallback bool) bool {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true":
		return true
	case "0", "false":
		return false
	default:
		return fallback
	}
}

func decodeJSONOption(key string, target any) {
	raw, ok := common.OptionMap[key]
	if !ok || strings.TrimSpace(raw) == "" {
		return
	}
	_ = json.Unmarshal([]byte(raw), target)
}

func QuotaFromUSDInt(amount int64) int64 {
	if amount <= 0 {
		return 0
	}
	return int64(float64(amount) * common.QuotaPerUnit)
}

func GetPeoplePlanSettingsDefaultsForAdmin() map[string]string {
	settings := defaultPeoplePlanSettings()
	return map[string]string{
		"people_plan_setting.enabled":          strconv.FormatBool(settings.Enabled),
		"people_plan_setting.entry_title":      settings.EntryTitle,
		"people_plan_setting.entry_subtitle":   settings.EntrySubtitle,
		"people_plan_setting.hero_title":       settings.HeroTitle,
		"people_plan_setting.hero_subtitle":    settings.HeroSubtitle,
		"people_plan_setting.hero_description": settings.HeroDescription,
		"people_plan_setting.team_rules":       mustJSON(settings.TeamRules),
		"people_plan_setting.achievements":     mustJSON(settings.Achievements),
		"people_plan_setting.monthly":          mustJSON(settings.Monthly),
		"people_plan_setting.popup":            mustJSON(settings.Popup),
		"people_plan_setting.submissions":      mustJSON(settings.Submissions),
		"people_plan_setting.risk":             mustJSON(settings.Risk),
	}
}

func mustJSON(value any) string {
	data, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(data)
}
