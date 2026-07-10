package store

import (
	"errors"

	commercedomain "github.com/sh2001sh/new-api/internal/commerce/domain"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"gorm.io/gorm"
)

func LoadUserCompanionAppliedBonus(userID int) (*commercedomain.CompanionAppliedBonus, error) {
	if userID <= 0 {
		return nil, nil
	}

	var pet commerceschema.UserCompanionPet
	err := platformdb.DB.Where("user_id = ? AND equipped = ?", userID, true).
		Order("updated_at desc, id asc").
		First(&pet).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	level := pet.Level
	if level < 1 {
		level = 1
	}
	if level > commercedomain.CompanionPetMaxLevel {
		level = commercedomain.CompanionPetMaxLevel
	}

	return &commercedomain.CompanionAppliedBonus{
		Pet:            &pet,
		Buff:           commercedomain.BuildCompanionPetBuff(pet.AchievementKey, level),
		EffectiveLevel: level,
	}, nil
}
