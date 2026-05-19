package service

import (
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

// GamificationDashboard is the overview payload for the workshop dashboard.
type GamificationDashboard struct {
	Companion        CompanionSummary     `json:"companion"`
	AchievementStats AchievementStats     `json:"achievement_stats"`
	Achievements     []AchievementItem    `json:"achievements"`
	DailyMissions    []DailyMissionItem   `json:"daily_missions"`
	HallOfFame       []HallOfFameCategory `json:"hall_of_fame"`
	GeneratedAt      int64                `json:"generated_at"`
}

// CompanionSummary describes the current workshop companion progression.
type CompanionSummary struct {
	Name             string             `json:"name"`
	Title            string             `json:"title"`
	Flavor           string             `json:"flavor"`
	Level            int                `json:"level"`
	UnlockedCount    int                `json:"unlocked_count"`
	TotalCount       int                `json:"total_count"`
	ProgressCurrent  int                `json:"progress_current"`
	ProgressTarget   int                `json:"progress_target"`
	MaxLevel         int                `json:"max_level"`
	OnlyOneEquipRule string             `json:"only_one_equip_rule"`
	FeedingRule      string             `json:"feeding_rule"`
	UpgradeRule      string             `json:"upgrade_rule"`
	DailyMissionRule string             `json:"daily_mission_rule"`
	BuffRule         string             `json:"buff_rule"`
	EquippedPet      *CompanionPetView  `json:"equipped_pet,omitempty"`
	ActiveBuff       *CompanionBuffView `json:"active_buff,omitempty"`
}

// AchievementStats summarizes unlocked achievements.
type AchievementStats struct {
	UnlockedCount int              `json:"unlocked_count"`
	TotalCount    int              `json:"total_count"`
	Latest        *AchievementItem `json:"latest,omitempty"`
}

// AchievementItem is the frontend-friendly achievement view.
type AchievementItem struct {
	Key               string            `json:"key"`
	Name              string            `json:"name"`
	Description       string            `json:"description"`
	Hint              string            `json:"hint"`
	Icon              string            `json:"icon"`
	Tier              string            `json:"tier"`
	Unlocked          bool              `json:"unlocked"`
	UnlockedAt        int64             `json:"unlocked_at,omitempty"`
	RewardUSD         float64           `json:"reward_usd"`
	RewardQuota       int64             `json:"reward_quota"`
	RewardTitle       string            `json:"reward_title"`
	RewardDescription string            `json:"reward_description"`
	RewardClaimed     bool              `json:"reward_claimed"`
	RewardClaimedAt   int64             `json:"reward_claimed_at,omitempty"`
	Pet               *CompanionPetView `json:"pet,omitempty"`
	PreviewBuff       CompanionBuffView `json:"preview_buff"`
	MaxBuff           CompanionBuffView `json:"max_buff"`
}

// DailyMissionItem is the frontend-friendly mission view.
type DailyMissionItem struct {
	Key          string  `json:"key"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Icon         string  `json:"icon"`
	RewardUSD    float64 `json:"reward_usd"`
	RewardQuota  int64   `json:"reward_quota"`
	PetExpReward int64   `json:"pet_exp_reward"`
	Current      int64   `json:"current"`
	Target       int64   `json:"target"`
	Completed    bool    `json:"completed"`
	Claimed      bool    `json:"claimed"`
	CompletedAt  int64   `json:"completed_at,omitempty"`
}

type CompanionBuffView struct {
	Type        string `json:"type"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ValueText   string `json:"value_text"`
}

type CompanionPetView struct {
	AchievementKey   string            `json:"achievement_key"`
	Level            int               `json:"level"`
	MaxLevel         int               `json:"max_level"`
	Experience       int64             `json:"experience"`
	CurrentLevelExp  int64             `json:"current_level_exp"`
	NextLevelExp     int64             `json:"next_level_exp"`
	CanUpgrade       bool              `json:"can_upgrade"`
	IsMaxLevel       bool              `json:"is_max_level"`
	Equipped         bool              `json:"equipped"`
	UpgradeCostQuota int64             `json:"upgrade_cost_quota"`
	UpgradeCostUSD   float64           `json:"upgrade_cost_usd"`
	FeedExpPerUSD    int64             `json:"feed_exp_per_usd"`
	Buff             CompanionBuffView `json:"buff"`
}

type CompanionFeedResult struct {
	Pet           *CompanionPetView `json:"pet"`
	ConsumedQuota int64             `json:"consumed_quota"`
	ConsumedUSD   float64           `json:"consumed_usd"`
	GainedExp     int64             `json:"gained_exp"`
	FundingSource string            `json:"funding_source"`
}

// HallOfFameResponse is the full leaderboard response.
type HallOfFameResponse struct {
	Categories  []HallOfFameCategory `json:"categories"`
	GeneratedAt int64                `json:"generated_at"`
}

// HallOfFameCategory represents one leaderboard category.
type HallOfFameCategory struct {
	Key     string            `json:"key"`
	Title   string            `json:"title"`
	Metric  string            `json:"metric"`
	Window  string            `json:"window"`
	Entries []HallOfFameEntry `json:"entries"`
}

// HallOfFameEntry is a single leaderboard row.
type HallOfFameEntry struct {
	Rank        int    `json:"rank"`
	UserId      int    `json:"user_id"`
	DisplayName string `json:"display_name"`
	Score       int64  `json:"score"`
	Subtitle    string `json:"subtitle"`
}

type gamificationContext struct {
	user               *model.User
	now                time.Time
	startOfDay         int64
	endOfDay           int64
	today              string
	unlockMap          map[string]model.AchievementUnlock
	todayRewardMap     map[string]model.DailyMissionReward
	latestUnlock       *model.AchievementUnlock
	consumeTodayCount  int64
	blindBoxTodayCount int64
	totalBlindBoxOpens int64
	hasSubscription    bool
	subscriptionCount  int64
	hasBlindBoxJackpot bool
	companionPets      []model.UserCompanionPet
	companionPetMap    map[string]model.UserCompanionPet
	equippedPet        *model.UserCompanionPet
	activeBonus        *model.CompanionAppliedBonus
}

type leaderboardScoreRow struct {
	UserId      int
	Username    string
	DisplayName string
	Score       int64
}

// GetGamificationDashboard returns the full dashboard gamification payload.
func GetGamificationDashboard(userId int) (*GamificationDashboard, error) {
	ctx, err := buildGamificationContext(userId)
	if err != nil {
		return nil, err
	}
	if err := ensureAchievementUnlocks(ctx); err != nil {
		return nil, err
	}
	if err := ensureCompanionPets(ctx); err != nil {
		return nil, err
	}
	if err := ensureDailyMissionRewards(ctx); err != nil {
		return nil, err
	}
	if err := refreshCompanionState(ctx); err != nil {
		return nil, err
	}

	achievements := buildAchievementItems(ctx)
	missions := buildMissionItems(ctx)
	hallOfFame, err := buildHallOfFame(5)
	if err != nil {
		return nil, err
	}

	return &GamificationDashboard{
		Companion:        buildCompanionSummary(ctx),
		AchievementStats: buildAchievementStats(ctx, achievements),
		Achievements:     achievements,
		DailyMissions:    missions,
		HallOfFame:       hallOfFame.Categories,
		GeneratedAt:      common.GetTimestamp(),
	}, nil
}

// GetAchievements returns the detailed achievement list for a user.
func GetAchievements(userId int) ([]AchievementItem, error) {
	ctx, err := buildGamificationContext(userId)
	if err != nil {
		return nil, err
	}
	if err := ensureAchievementUnlocks(ctx); err != nil {
		return nil, err
	}
	if err := ensureCompanionPets(ctx); err != nil {
		return nil, err
	}
	if err := refreshCompanionState(ctx); err != nil {
		return nil, err
	}
	return buildAchievementItems(ctx), nil
}

// GetHallOfFame returns the workshop hall of fame leaderboards.
func GetHallOfFame() (*HallOfFameResponse, error) {
	return buildHallOfFame(10)
}

// ClaimShareLinkMission marks today's invite-link sharing mission as completed.
func ClaimShareLinkMission(userId int) (bool, error) {
	mission, ok := findMissionDefinition("daily-share-link")
	if !ok {
		return false, fmt.Errorf("daily mission not found")
	}
	today := time.Now().In(time.Local).Format("2006-01-02")
	completedAt := common.GetTimestamp()
	granted := false
	ctx, err := buildGamificationContext(userId)
	if err != nil {
		return false, err
	}
	if err := ensureAchievementUnlocks(ctx); err != nil {
		return false, err
	}
	if err := ensureCompanionPets(ctx); err != nil {
		return false, err
	}
	rewardQuota := missionRewardQuotaWithBonus(ctx, mission.RewardUSD)
	petExperienceAwarded := missionPetExperienceWithBonus(ctx, mission.PetExpReward)
	petAchievementKey := ""
	if ctx.equippedPet != nil {
		petAchievementKey = ctx.equippedPet.AchievementKey
	}
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		var txErr error
		granted, txErr = model.AwardDailyMissionRewardTx(
			tx,
			userId,
			mission.Key,
			today,
			rewardQuota,
			completedAt,
			petExperienceAwarded,
			petAchievementKey,
		)
		return txErr
	})
	if err != nil {
		return false, err
	}
	if granted {
		model.RecordLog(
			userId,
			model.LogTypeSystem,
			fmt.Sprintf("daily mission reward granted: %s -> %.1f USD quota", mission.Name, mission.RewardUSD),
		)
	}
	return granted, nil
}

func buildGamificationContext(userId int) (*gamificationContext, error) {
	user, err := model.GetUserById(userId, false)
	if err != nil {
		return nil, err
	}
	now := time.Now().In(time.Local)
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	endOfDay := startOfDay + 24*3600

	unlocks, err := model.GetAchievementUnlocksByUser(userId)
	if err != nil {
		return nil, err
	}
	unlockMap := make(map[string]model.AchievementUnlock, len(unlocks))
	var latestUnlock *model.AchievementUnlock
	for index := range unlocks {
		unlock := unlocks[index]
		unlockMap[unlock.AchievementKey] = unlock
		if latestUnlock == nil || unlock.UnlockedAt > latestUnlock.UnlockedAt {
			copyUnlock := unlock
			latestUnlock = &copyUnlock
		}
	}

	rewards, err := model.GetDailyMissionRewardsByUser(userId, now.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	todayRewardMap := make(map[string]model.DailyMissionReward, len(rewards))
	for _, reward := range rewards {
		todayRewardMap[reward.MissionKey] = reward
	}

	consumeTodayCount, err := model.CountConsumeLogsByUser(userId, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}
	blindBoxTodayCount, err := model.CountBlindBoxOpensByUser(userId, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}
	totalBlindBoxOpens, err := model.CountBlindBoxOpenRecordsByUser(userId)
	if err != nil {
		return nil, err
	}
	hasSubscription, err := model.HasSubscriptionHistory(userId)
	if err != nil {
		return nil, err
	}
	subscriptionCount, err := model.CountUserSubscriptions(userId)
	if err != nil {
		return nil, err
	}
	hasBlindBoxJackpot, err := model.HasBlindBoxRewardAbove(userId, 30)
	if err != nil {
		return nil, err
	}
	activeBonus, err := model.GetUserCompanionAppliedBonus(userId)
	if err != nil {
		return nil, err
	}
	var equippedPet *model.UserCompanionPet
	if activeBonus != nil && activeBonus.Pet != nil {
		equippedPet = activeBonus.Pet
	}

	return &gamificationContext{
		user:               user,
		now:                now,
		startOfDay:         startOfDay,
		endOfDay:           endOfDay,
		today:              now.Format("2006-01-02"),
		unlockMap:          unlockMap,
		todayRewardMap:     todayRewardMap,
		latestUnlock:       latestUnlock,
		consumeTodayCount:  consumeTodayCount,
		blindBoxTodayCount: blindBoxTodayCount,
		totalBlindBoxOpens: totalBlindBoxOpens,
		hasSubscription:    hasSubscription,
		subscriptionCount:  subscriptionCount,
		hasBlindBoxJackpot: hasBlindBoxJackpot,
		equippedPet:        equippedPet,
		activeBonus:        activeBonus,
	}, nil
}

func ensureAchievementUnlocks(ctx *gamificationContext) error {
	for _, achievement := range achievementCatalog {
		unlocked := false
		switch achievement.Key {
		case "first-call":
			unlocked = ctx.user.RequestCount > 0
		case "ten-calls":
			unlocked = ctx.user.RequestCount >= 10
		case "hundred-calls":
			unlocked = ctx.user.RequestCount >= 100
		case "thousand-calls":
			unlocked = ctx.user.RequestCount >= 1000
		case "quota-scout":
			unlocked = int64(ctx.user.UsedQuota) >= quotaUnitsFromUSD(50)
		case "quota-smith":
			unlocked = int64(ctx.user.UsedQuota) >= quotaUnitsFromUSD(300)
		case "thousand-forge":
			unlocked = int64(ctx.user.UsedQuota) >= quotaUnitsFromUSD(1000)
		case "contract-power":
			unlocked = ctx.hasSubscription
		case "plan-collector":
			unlocked = ctx.subscriptionCount >= 3
		case "blind-box-rookie":
			unlocked = ctx.totalBlindBoxOpens >= 1
		case "blind-box-regular":
			unlocked = ctx.totalBlindBoxOpens >= 10
		case "lucky-star":
			unlocked = ctx.hasBlindBoxJackpot
		case "social-crafter":
			unlocked = ctx.user.AffCount >= 3
		case "community-core":
			unlocked = ctx.user.AffCount >= 10
		case "seven-day-streak":
			unlocked = ctx.consumeTodayCount >= 30
		case "month-streak":
			unlocked = int64(ctx.user.UsedQuota) >= quotaUnitsFromUSD(2000)
		}
		if !unlocked {
			continue
		}

		var unlock model.AchievementUnlock
		result := model.DB.Where("user_id = ? AND achievement_key = ?", ctx.user.Id, achievement.Key).
			Attrs(model.AchievementUnlock{
				UserId:         ctx.user.Id,
				AchievementKey: achievement.Key,
				UnlockedAt:     common.GetTimestamp(),
			}).
			FirstOrCreate(&unlock)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected > 0 {
			model.RecordLog(
				ctx.user.Id,
				model.LogTypeSystem,
				fmt.Sprintf("achievement unlocked: %s", achievement.Name),
			)
		}

		if achievement.RewardUSD > 0 &&
			unlock.RewardClaimedAt <= 0 &&
			unlock.RewardQuotaAwarded <= 0 {
			rewardQuota := achievementRewardQuotaWithBonus(ctx, achievement.RewardUSD)
			granted := false
			err := model.DB.Transaction(func(tx *gorm.DB) error {
				var txErr error
				granted, txErr = model.GrantAchievementRewardTx(
					tx,
					ctx.user.Id,
					achievement.Key,
					rewardQuota,
					unlock.UnlockedAt,
				)
				return txErr
			})
			if err != nil {
				return err
			}
			if granted {
				unlock.RewardQuotaAwarded = rewardQuota
				unlock.RewardClaimedAt = unlock.UnlockedAt
				model.RecordLog(
					ctx.user.Id,
					model.LogTypeSystem,
					fmt.Sprintf("achievement reward granted: %s -> %.1f USD quota", achievement.Name, achievement.RewardUSD),
				)
			} else {
				refreshed, err := model.GetAchievementUnlockByUserAndKey(ctx.user.Id, achievement.Key)
				if err == nil && refreshed != nil {
					unlock = *refreshed
				}
			}
		}

		ctx.unlockMap[achievement.Key] = unlock
		if ctx.latestUnlock == nil || unlock.UnlockedAt >= ctx.latestUnlock.UnlockedAt {
			copyUnlock := unlock
			ctx.latestUnlock = &copyUnlock
		}
	}
	return nil
}

func ensureDailyMissionRewards(ctx *gamificationContext) error {
	for _, mission := range missionCatalog {
		current, completedAt := missionProgress(ctx, mission)
		if current < mission.Target {
			continue
		}
		if _, ok := ctx.todayRewardMap[mission.Key]; ok {
			continue
		}

		rewardQuota := missionRewardQuotaWithBonus(ctx, mission.RewardUSD)
		petExpReward := missionPetExperienceWithBonus(ctx, mission.PetExpReward)
		granted := false
		err := model.DB.Transaction(func(tx *gorm.DB) error {
			var txErr error
			petAchievementKey := ""
			if ctx.equippedPet != nil {
				petAchievementKey = ctx.equippedPet.AchievementKey
			}
			granted, txErr = model.AwardDailyMissionRewardTx(
				tx,
				ctx.user.Id,
				mission.Key,
				ctx.today,
				rewardQuota,
				completedAt,
				petExpReward,
				petAchievementKey,
			)
			return txErr
		})
		if err != nil {
			return err
		}
		if granted {
			model.RecordLog(
				ctx.user.Id,
				model.LogTypeSystem,
				fmt.Sprintf("daily mission reward granted: %s -> %.1f USD quota", mission.Name, mission.RewardUSD),
			)
		}

		reward := model.DailyMissionReward{
			UserId:               ctx.user.Id,
			MissionKey:           mission.Key,
			RewardDate:           ctx.today,
			QuotaAwarded:         rewardQuota,
			PetExperienceAwarded: missionPetExperienceWithBonus(ctx, mission.PetExpReward),
			CompletedAt:          completedAt,
		}
		if ctx.equippedPet != nil {
			reward.PetAchievementKey = ctx.equippedPet.AchievementKey
		}
		ctx.todayRewardMap[mission.Key] = reward
	}
	return nil
}

func buildAchievementStats(ctx *gamificationContext, achievements []AchievementItem) AchievementStats {
	stats := AchievementStats{
		UnlockedCount: len(ctx.unlockMap),
		TotalCount:    len(achievementCatalog),
	}
	if ctx.latestUnlock == nil {
		return stats
	}
	for _, item := range achievements {
		if item.Key == ctx.latestUnlock.AchievementKey {
			copyItem := item
			stats.Latest = &copyItem
			break
		}
	}
	return stats
}

func missionProgress(ctx *gamificationContext, mission missionDefinition) (int64, int64) {
	switch mission.Key {
	case "daily-share-link":
		if reward, ok := ctx.todayRewardMap[mission.Key]; ok {
			return 1, reward.CompletedAt
		}
		return 0, 0
	case "daily-calls":
		return ctx.consumeTodayCount, ctx.now.Unix()
	case "daily-blind-box":
		return ctx.blindBoxTodayCount, ctx.now.Unix()
	default:
		return 0, 0
	}
}

func findMissionDefinition(key string) (missionDefinition, bool) {
	for _, mission := range missionCatalog {
		if mission.Key == key {
			return mission, true
		}
	}
	return missionDefinition{}, false
}

func buildHallOfFame(limit int) (*HallOfFameResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	now := time.Now().In(time.Local)
	weekStart := beginningOfWeek(now)

	usageRows, err := queryUsageLeaderboard(weekStart.Unix(), now.Unix(), limit)
	if err != nil {
		return nil, err
	}
	inviteRows, err := queryInviteLeaderboard(limit)
	if err != nil {
		return nil, err
	}
	achievementRows, err := queryAchievementLeaderboard(limit)
	if err != nil {
		return nil, err
	}

	return &HallOfFameResponse{
		Categories: []HallOfFameCategory{
			{
				Key:     "weekly-usage",
				Title:   "本周消耗榜",
				Metric:  "额度消耗",
				Window:  fmt.Sprintf("%s 至今", weekStart.Format("01-02")),
				Entries: buildHallOfFameEntries(usageRows, "本周累计消耗"),
			},
			{
				Key:     "invite-masters",
				Title:   "邀请达人榜",
				Metric:  "邀请人数",
				Window:  "总榜",
				Entries: buildHallOfFameEntries(inviteRows, "累计邀请伙伴"),
			},
			{
				Key:     "achievement-collectors",
				Title:   "图鉴收集榜",
				Metric:  "点亮数量",
				Window:  "总榜",
				Entries: buildHallOfFameEntries(achievementRows, "已点亮伙伴"),
			},
		},
		GeneratedAt: common.GetTimestamp(),
	}, nil
}

func queryUsageLeaderboard(startTime int64, endTime int64, limit int) ([]leaderboardScoreRow, error) {
	type usageRow struct {
		UserId   int
		Username string
		Score    int64
	}
	var rows []usageRow
	err := model.LOG_DB.Table("logs").
		Select("user_id, MAX(username) AS username, COALESCE(SUM(quota), 0) AS score").
		Where("type = ? AND created_at >= ? AND created_at < ?", model.LogTypeConsume, startTime, endTime).
		Group("user_id").
		Order("score DESC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := make([]leaderboardScoreRow, 0, len(rows))
	for _, row := range rows {
		result = append(result, leaderboardScoreRow{
			UserId:      row.UserId,
			Username:    row.Username,
			DisplayName: maskedDisplayName("", row.Username),
			Score:       row.Score,
		})
	}
	return fillUserDisplayNames(result)
}

func queryInviteLeaderboard(limit int) ([]leaderboardScoreRow, error) {
	var users []model.User
	err := model.DB.Select("id, username, display_name, aff_count").
		Where("aff_count > 0").
		Order("aff_count DESC, id ASC").
		Limit(limit).
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	rows := make([]leaderboardScoreRow, 0, len(users))
	for _, user := range users {
		rows = append(rows, leaderboardScoreRow{
			UserId:      user.Id,
			Username:    user.Username,
			DisplayName: maskedDisplayName(user.DisplayName, user.Username),
			Score:       int64(user.AffCount),
		})
	}
	return rows, nil
}

func queryAchievementLeaderboard(limit int) ([]leaderboardScoreRow, error) {
	type row struct {
		UserId int
		Score  int64
	}
	var rows []row
	err := model.DB.Table("achievement_unlocks").
		Select("user_id, COUNT(*) AS score").
		Group("user_id").
		Order("score DESC, user_id ASC").
		Limit(limit).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	leaderboard := make([]leaderboardScoreRow, 0, len(rows))
	for _, row := range rows {
		leaderboard = append(leaderboard, leaderboardScoreRow{
			UserId: row.UserId,
			Score:  row.Score,
		})
	}
	return fillUserDisplayNames(leaderboard)
}

func fillUserDisplayNames(rows []leaderboardScoreRow) ([]leaderboardScoreRow, error) {
	if len(rows) == 0 {
		return rows, nil
	}
	userIds := make([]int, 0, len(rows))
	for _, row := range rows {
		if row.UserId > 0 {
			userIds = append(userIds, row.UserId)
		}
	}
	if len(userIds) == 0 {
		return rows, nil
	}
	var users []model.User
	if err := model.DB.Select("id, username, display_name").
		Where("id IN ?", userIds).
		Find(&users).Error; err != nil {
		return nil, err
	}
	userMap := make(map[int]model.User, len(users))
	for _, user := range users {
		userMap[user.Id] = user
	}
	for index := range rows {
		if user, ok := userMap[rows[index].UserId]; ok {
			rows[index].Username = user.Username
			rows[index].DisplayName = maskedDisplayName(user.DisplayName, user.Username)
		}
		if rows[index].DisplayName == "" {
			rows[index].DisplayName = maskedDisplayName("", rows[index].Username)
		}
	}
	return rows, nil
}

func buildHallOfFameEntries(rows []leaderboardScoreRow, subtitlePrefix string) []HallOfFameEntry {
	entries := make([]HallOfFameEntry, 0, len(rows))
	for index, row := range rows {
		entries = append(entries, HallOfFameEntry{
			Rank:        index + 1,
			UserId:      row.UserId,
			DisplayName: row.DisplayName,
			Score:       row.Score,
			Subtitle:    fmt.Sprintf("%s %s", subtitlePrefix, formatCompactScore(row.Score)),
		})
	}
	return entries
}

func maskedDisplayName(displayName string, username string) string {
	name := strings.TrimSpace(displayName)
	if name == "" {
		name = strings.TrimSpace(username)
	}
	if name == "" {
		return "匿名训练师"
	}
	runes := []rune(name)
	switch len(runes) {
	case 1:
		return string(runes)
	case 2:
		return string(runes[0]) + "*"
	default:
		return string(runes[0]) + strings.Repeat("*", len(runes)-2) + string(runes[len(runes)-1])
	}
}

func formatCompactScore(value int64) string {
	if value >= 100000000 {
		return fmt.Sprintf("%.1f亿", float64(value)/100000000)
	}
	if value >= 10000 {
		return fmt.Sprintf("%.1f万", float64(value)/10000)
	}
	return fmt.Sprintf("%d", value)
}

func beginningOfWeek(now time.Time) time.Time {
	weekday := int(now.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return time.Date(
		now.Year(),
		now.Month(),
		now.Day()-(weekday-1),
		0,
		0,
		0,
		0,
		now.Location(),
	)
}

func quotaUnitsFromUSD(amount float64) int64 {
	if amount <= 0 {
		return 0
	}
	return int64(math.Round(amount * common.QuotaPerUnit))
}

func maxInt64(left int64, right int64) int64 {
	if left > right {
		return left
	}
	return right
}

func minInt64(left int64, right int64) int64 {
	if left < right {
		return left
	}
	return right
}
