package model

import (
	"errors"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// AchievementUnlock stores a user's unlocked achievement.
type AchievementUnlock struct {
	Id             int    `json:"id"`
	UserId         int    `json:"user_id" gorm:"index;uniqueIndex:idx_user_achievement_key"`
	AchievementKey string `json:"achievement_key" gorm:"type:varchar(64);not null;uniqueIndex:idx_user_achievement_key"`
	UnlockedAt     int64  `json:"unlocked_at" gorm:"bigint;index"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt      int64  `json:"updated_at" gorm:"bigint"`
}

// DailyMissionReward stores one granted mission reward per user/day/mission.
type DailyMissionReward struct {
	Id           int    `json:"id"`
	UserId       int    `json:"user_id" gorm:"index;uniqueIndex:idx_user_mission_reward"`
	MissionKey   string `json:"mission_key" gorm:"type:varchar(64);not null;uniqueIndex:idx_user_mission_reward"`
	RewardDate   string `json:"reward_date" gorm:"type:varchar(10);not null;uniqueIndex:idx_user_mission_reward"`
	QuotaAwarded int64  `json:"quota_awarded" gorm:"bigint;not null;default:0"`
	CompletedAt  int64  `json:"completed_at" gorm:"bigint"`
	CreatedAt    int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt    int64  `json:"updated_at" gorm:"bigint"`
}

func (AchievementUnlock) TableName() string {
	return "achievement_unlocks"
}

func (DailyMissionReward) TableName() string {
	return "daily_mission_rewards"
}

func (a *AchievementUnlock) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if a.UnlockedAt <= 0 {
		a.UnlockedAt = now
	}
	a.CreatedAt = now
	a.UpdatedAt = now
	return nil
}

func (a *AchievementUnlock) BeforeUpdate(tx *gorm.DB) error {
	a.UpdatedAt = common.GetTimestamp()
	return nil
}

func (r *DailyMissionReward) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	r.CreatedAt = now
	r.UpdatedAt = now
	return nil
}

func (r *DailyMissionReward) BeforeUpdate(tx *gorm.DB) error {
	r.UpdatedAt = common.GetTimestamp()
	return nil
}

// GetAchievementUnlocksByUser returns all unlocked achievements for a user.
func GetAchievementUnlocksByUser(userId int) ([]AchievementUnlock, error) {
	var unlocks []AchievementUnlock
	err := DB.Where("user_id = ?", userId).
		Order("unlocked_at asc, id asc").
		Find(&unlocks).Error
	return unlocks, err
}

// GetDailyMissionRewardsByUser returns today's or historical mission rewards for a user.
func GetDailyMissionRewardsByUser(userId int, rewardDate string) ([]DailyMissionReward, error) {
	var rewards []DailyMissionReward
	query := DB.Where("user_id = ?", userId)
	if rewardDate != "" {
		query = query.Where("reward_date = ?", rewardDate)
	}
	err := query.Order("created_at asc, id asc").Find(&rewards).Error
	return rewards, err
}

// CountConsumeLogsByUser counts consume logs for a user within a time range.
func CountConsumeLogsByUser(userId int, startTime int64, endTime int64) (int64, error) {
	var count int64
	err := LOG_DB.Model(&Log{}).
		Where("user_id = ? AND type = ? AND created_at >= ? AND created_at < ?", userId, LogTypeConsume, startTime, endTime).
		Count(&count).Error
	return count, err
}

// CountBlindBoxOpensByUser counts blind-box opens for a user within a time range.
func CountBlindBoxOpensByUser(userId int, startTime int64, endTime int64) (int64, error) {
	var count int64
	err := DB.Model(&BlindBoxOpenRecord{}).
		Where("user_id = ? AND create_time >= ? AND create_time < ?", userId, startTime, endTime).
		Count(&count).Error
	return count, err
}

// HasBlindBoxRewardAbove checks whether the user has opened a large blind-box reward.
func HasBlindBoxRewardAbove(userId int, minRewardUSD float64) (bool, error) {
	var count int64
	err := DB.Model(&BlindBoxOpenRecord{}).
		Where("user_id = ? AND reward_usd >= ?", userId, minRewardUSD).
		Count(&count).Error
	return count > 0, err
}

// HasSubscriptionHistory checks whether the user has any subscription record.
func HasSubscriptionHistory(userId int) (bool, error) {
	var count int64
	err := DB.Model(&UserSubscription{}).
		Where("user_id = ?", userId).
		Count(&count).Error
	return count > 0, err
}

// HasCheckinToday checks whether the user has checked in today and returns that record.
func HasCheckinToday(userId int) (bool, *Checkin, error) {
	today := time.Now().Format("2006-01-02")
	var checkin Checkin
	err := DB.Where("user_id = ? AND checkin_date = ?", userId, today).
		Order("created_at desc, id desc").
		First(&checkin).Error
	if err == nil {
		return true, &checkin, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil, nil
	}
	return false, nil, err
}

// MaxCheckinStreak returns the user's maximum historical consecutive check-in days.
func MaxCheckinStreak(userId int) (int, error) {
	var records []Checkin
	if err := DB.Where("user_id = ?", userId).
		Order("checkin_date asc").
		Find(&records).Error; err != nil {
		return 0, err
	}
	if len(records) == 0 {
		return 0, nil
	}

	maxStreak := 0
	currentStreak := 0
	var previous time.Time
	for index, record := range records {
		parsed, err := time.ParseInLocation("2006-01-02", record.CheckinDate, time.Local)
		if err != nil {
			continue
		}
		if index == 0 {
			currentStreak = 1
			maxStreak = 1
			previous = parsed
			continue
		}
		diff := int(parsed.Sub(previous).Hours() / 24)
		switch {
		case diff == 0:
			continue
		case diff == 1:
			currentStreak++
		default:
			currentStreak = 1
		}
		if currentStreak > maxStreak {
			maxStreak = currentStreak
		}
		previous = parsed
	}
	return maxStreak, nil
}

// AwardDailyMissionRewardTx creates the reward record and grants quota in one transaction.
func AwardDailyMissionRewardTx(tx *gorm.DB, userId int, missionKey string, rewardDate string, quotaAwarded int64, completedAt int64) (bool, error) {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 || missionKey == "" || rewardDate == "" || quotaAwarded <= 0 {
		return false, errors.New("invalid daily mission reward")
	}

	var existing DailyMissionReward
	err := tx.Where("user_id = ? AND mission_key = ? AND reward_date = ?", userId, missionKey, rewardDate).
		First(&existing).Error
	if err == nil {
		return false, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}

	reward := DailyMissionReward{
		UserId:       userId,
		MissionKey:   missionKey,
		RewardDate:   rewardDate,
		QuotaAwarded: quotaAwarded,
		CompletedAt:  completedAt,
	}
	if err := tx.Create(&reward).Error; err != nil {
		return false, err
	}
	if err := tx.Model(&User{}).
		Where("id = ?", userId).
		Update("quota", gorm.Expr("quota + ?", quotaAwarded)).Error; err != nil {
		return false, err
	}

	go func() {
		_ = cacheIncrUserQuota(userId, quotaAwarded)
	}()
	return true, nil
}
