package schema

import (
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"gorm.io/gorm"
)

// UserCompanionPet is an achievement-linked companion equipped by a user.
type UserCompanionPet struct {
	Id             int    `json:"id"`
	UserId         int    `json:"user_id" gorm:"index;uniqueIndex:idx_user_companion_pet"`
	AchievementKey string `json:"achievement_key" gorm:"type:varchar(64);not null;uniqueIndex:idx_user_companion_pet"`
	Level          int    `json:"level" gorm:"not null;default:1"`
	Experience     int64  `json:"experience" gorm:"bigint;not null;default:0"`
	Equipped       bool   `json:"equipped" gorm:"not null;default:false;index"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt      int64  `json:"updated_at" gorm:"bigint"`
}

func (UserCompanionPet) TableName() string {
	return "user_companion_pets"
}

func (pet *UserCompanionPet) BeforeCreate(_ *gorm.DB) error {
	now := platformruntime.GetTimestamp()
	if pet.Level <= 0 {
		pet.Level = 1
	}
	pet.CreatedAt = now
	pet.UpdatedAt = now
	return nil
}

func (pet *UserCompanionPet) BeforeUpdate(_ *gorm.DB) error {
	pet.UpdatedAt = platformruntime.GetTimestamp()
	return nil
}
