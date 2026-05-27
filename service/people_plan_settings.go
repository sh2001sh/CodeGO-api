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
	MinMembers               int                    `json:"min_members"`
	MaxMembers               int                    `json:"max_members"`
	EffectiveInviteRewardUSD int64                  `json:"effective_invite_reward_usd"`
	EffectiveInviteeGiftUSD  int64                  `json:"effective_invitee_gift_usd"`
	TeamRewardPerMemberUSD   int64                  `json:"team_reward_per_member_usd"`
	CaptainRewardUSD         int64                  `json:"captain_reward_usd"`
	RewardMinContributionBps int                    `json:"reward_min_contribution_bps"`
	EffectiveMinCalls        int64                  `json:"effective_min_calls"`
	EffectiveMinSpendUSD     int64                  `json:"effective_min_spend_usd"`
	MonthlyActiveMinCalls    int64                  `json:"monthly_active_min_calls"`
	RewardTiers              []PeoplePlanRewardTier `json:"reward_tiers"`
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
		EntrySubtitle:   "强裂变活动，组队活动与投稿活动同步进行",
		HeroTitle:       "Code Go 人海计划",
		HeroSubtitle:    "强裂变组队 + 个人投稿双线并行，进入后直接查看任务、奖励和完成条件",
		HeroDescription: "成团奖励按有效成员平分，其它组队任务按贡献分配，投稿奖励审核通过后直接发给投稿人本人。",
		TeamRules: PeoplePlanTeamRules{
			MinMembers:               3,
			MaxMembers:               8,
			EffectiveInviteRewardUSD: 10,
			EffectiveInviteeGiftUSD:  5,
			TeamRewardPerMemberUSD:   20,
			CaptainRewardUSD:         30,
			RewardMinContributionBps: 300,
			EffectiveMinCalls:        30,
			EffectiveMinSpendUSD:     3,
			MonthlyActiveMinCalls:    30,
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
				RewardQuotaUSD:      48,
				RewardPoolUSD:       48,
				RewardTitle:         "3人成团奖励",
				RewardDescription:   "完成后按当次有效成员人数平分。",
				Repeatable:          false,
				MaxCompletions:      1,
				ContributionMode:    "equal",
				ContributionSummary: "3人成团后按当次有效成员人数平分；同一档成团奖励每人全活动期只发一次。",
				ContributionWeights: []PeoplePlanContributionWeight{},
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
				RewardQuotaUSD:      108,
				RewardPoolUSD:       108,
				RewardTitle:         "5人成团奖励",
				RewardDescription:   "完成后按当次有效成员人数平分。",
				Repeatable:          false,
				MaxCompletions:      1,
				ContributionMode:    "equal",
				ContributionSummary: "5人成团后按当次有效成员人数平分；同一档成团奖励每人全活动期只发一次。",
				ContributionWeights: []PeoplePlanContributionWeight{},
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
				RewardQuotaUSD:      192,
				RewardPoolUSD:       192,
				RewardTitle:         "8人成团奖励",
				RewardDescription:   "完成后按当次有效成员人数平分。",
				Repeatable:          false,
				MaxCompletions:      1,
				ContributionMode:    "equal",
				ContributionSummary: "8人成团后按当次有效成员人数平分；同一档成团奖励每人全活动期只发一次。",
				ContributionWeights: []PeoplePlanContributionWeight{},
			},
			{
				Key:                 "team-spend-200",
				Category:            "long_term",
				Audience:            "team",
				Title:               "消费冲刺",
				Description:         "小队累计消费达到目标后结算奖池。目标按小队人数自动调整，人越多目标越高。",
				Metric:              "team_spend_usd",
				Target:              75,
				RewardType:          "quota",
				RewardQuotaUSD:      42,
				RewardPoolUSD:       42,
				RewardTitle:         "消费冲刺奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          true,
				MaxCompletions:      3,
				ContributionMode:    "weighted",
				ContributionSummary: "消费冲刺按累计消费贡献奖励给个人。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "lifetime_spend", Label: "累计消费", Weight: 100},
				},
				RewardTiers: []PeoplePlanRewardTier{
					{RequiredMembers: 3, Target: 75, RewardPoolUSD: 42},
					{RequiredMembers: 5, Target: 200, RewardPoolUSD: 110},
					{RequiredMembers: 8, Target: 440, RewardPoolUSD: 272},
				},
			},
			{
				Key:                 "team-invite-sprint",
				Category:            "long_term",
				Audience:            "team",
				Title:               "邀请冲刺",
				Description:         "小队累计邀请达到目标人数后，结算 1 次邀请任务总奖池。",
				Metric:              "team_invites",
				Target:              3,
				RewardType:          "quota",
				RewardQuotaUSD:      24,
				RewardPoolUSD:       24,
				RewardTitle:         "邀请冲刺奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          true,
				MaxCompletions:      2,
				ContributionMode:    "weighted",
				ContributionSummary: "邀请冲刺按累计邀请贡献奖励给个人。人数越多，人均邀请门槛也会同步提高。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "lifetime_invites", Label: "累计邀请", Weight: 100},
				},
				RewardTiers: []PeoplePlanRewardTier{
					{RequiredMembers: 3, Target: 3, RewardPoolUSD: 24},
					{RequiredMembers: 5, Target: 8, RewardPoolUSD: 80},
					{RequiredMembers: 8, Target: 16, RewardPoolUSD: 208},
				},
			},
			{
				Key:                 "team-blind-box-sprint",
				Category:            "long_term",
				Audience:            "team",
				Title:               "盲盒冲刺",
				Description:         "小队累计开启盲盒达到目标次数后，结算 1 次盲盒任务总奖池。",
				Metric:              "team_blind_box_opens",
				Target:              6,
				RewardType:          "quota",
				RewardQuotaUSD:      18,
				RewardPoolUSD:       18,
				RewardTitle:         "盲盒冲刺奖励",
				RewardDescription:   "完成后按贡献奖励给个人。",
				Repeatable:          true,
				MaxCompletions:      2,
				ContributionMode:    "weighted",
				ContributionSummary: "盲盒冲刺按累计开启盲盒为主，兼顾累计消费。人数越多，人均开启次数门槛也会同步提高。",
				ContributionWeights: []PeoplePlanContributionWeight{
					{Key: "lifetime_blind_box_opens", Label: "累计盲盒", Weight: 70},
					{Key: "lifetime_spend", Label: "累计消费", Weight: 30},
				},
				RewardTiers: []PeoplePlanRewardTier{
					{RequiredMembers: 3, Target: 6, RewardPoolUSD: 18},
					{RequiredMembers: 5, Target: 16, RewardPoolUSD: 60},
					{RequiredMembers: 8, Target: 36, RewardPoolUSD: 160},
				},
			},
		},
		Monthly: []PeoplePlanAchievementRule{
			{
				Key:                 "monthly-spend-150",
				Category:            "monthly",
				Audience:            "team",
				Title:               "月度消费",
				Description:         "当月小队消费达到目标后结算月度奖池。目标按小队人数自动调整。",
				Metric:              "monthly_team_spend_usd",
				Target:              60,
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
					{RequiredMembers: 3, Target: 60, RewardPoolUSD: 24},
					{RequiredMembers: 5, Target: 180, RewardPoolUSD: 68},
					{RequiredMembers: 8, Target: 400, RewardPoolUSD: 168},
				},
			},
		},
		Popup: PeoplePlanPopupSettings{
			Enabled: true,
			Version: "v1",
			Title:   "Code Go 人海计划已开启",
			Body:    "本期活动已开启。先查看规则，再进入组队活动或投稿活动。",
		},
		Submissions: PeoplePlanSubmissionSettings{
			ContentRewardUSD:   88,
			ProjectRewardUSD:   188,
			CommunityRewardUSD: 288,
			Tasks: []PeoplePlanSubmissionTaskRule{
				{
					Key:                 "content-submission",
					Type:                "content",
					Title:               "内容投稿",
					Description:         "适合教程、案例、评测、使用经验。",
					RewardPoolUSD:       88,
					Repeatable:          true,
					MaxCompletions:      5,
					ContributionSummary: "审核通过后，按内容质量和实际帮助度奖励给投稿人本人。",
				},
				{
					Key:                 "project-integration",
					Type:                "project",
					Title:               "项目接入",
					Description:         "适合线上项目、演示站点、产品接入成果。",
					RewardPoolUSD:       188,
					Repeatable:          true,
					MaxCompletions:      3,
					ContributionSummary: "审核通过后，按接入完整度、可复用性和实际效果奖励给投稿人本人。",
				},
				{
					Key:                 "community-contribution",
					Type:                "community",
					Title:               "社区共建",
					Description:         "适合活动组织、答疑共创、社区联动成果。",
					RewardPoolUSD:       288,
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
