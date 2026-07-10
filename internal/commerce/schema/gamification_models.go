package schema

import (
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"gorm.io/gorm"
)

type AchievementUnlock struct {
	Id                 int    `json:"id"`
	UserId             int    `json:"user_id" gorm:"index;uniqueIndex:idx_user_achievement_key"`
	AchievementKey     string `json:"achievement_key" gorm:"type:varchar(64);not null;uniqueIndex:idx_user_achievement_key"`
	UnlockedAt         int64  `json:"unlocked_at" gorm:"bigint;index"`
	RewardQuotaAwarded int64  `json:"reward_quota_awarded" gorm:"bigint;not null;default:0"`
	RewardClaimedAt    int64  `json:"reward_claimed_at" gorm:"bigint;default:0"`
	CreatedAt          int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt          int64  `json:"updated_at" gorm:"bigint"`
}

type DailyMissionReward struct {
	Id                   int    `json:"id"`
	UserId               int    `json:"user_id" gorm:"index;uniqueIndex:idx_user_mission_reward"`
	MissionKey           string `json:"mission_key" gorm:"type:varchar(64);not null;uniqueIndex:idx_user_mission_reward"`
	RewardDate           string `json:"reward_date" gorm:"type:varchar(10);not null;uniqueIndex:idx_user_mission_reward"`
	QuotaAwarded         int64  `json:"quota_awarded" gorm:"bigint;not null;default:0"`
	PetExperienceAwarded int64  `json:"pet_experience_awarded" gorm:"bigint;not null;default:0"`
	PetAchievementKey    string `json:"pet_achievement_key" gorm:"type:varchar(64);default:''"`
	CompletedAt          int64  `json:"completed_at" gorm:"bigint"`
	CreatedAt            int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt            int64  `json:"updated_at" gorm:"bigint"`
}

func (AchievementUnlock) TableName() string {
	return "achievement_unlocks"
}

func (DailyMissionReward) TableName() string {
	return "daily_mission_rewards"
}

func (a *AchievementUnlock) BeforeCreate(tx *gorm.DB) error {
	now := platformruntime.GetTimestamp()
	if a.UnlockedAt <= 0 {
		a.UnlockedAt = now
	}
	a.CreatedAt = now
	a.UpdatedAt = now
	return nil
}

func (a *AchievementUnlock) BeforeUpdate(tx *gorm.DB) error {
	a.UpdatedAt = platformruntime.GetTimestamp()
	return nil
}

func (r *DailyMissionReward) BeforeCreate(tx *gorm.DB) error {
	now := platformruntime.GetTimestamp()
	r.CreatedAt = now
	r.UpdatedAt = now
	return nil
}

func (r *DailyMissionReward) BeforeUpdate(tx *gorm.DB) error {
	r.UpdatedAt = platformruntime.GetTimestamp()
	return nil
}
