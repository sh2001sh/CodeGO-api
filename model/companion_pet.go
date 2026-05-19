package model

import (
	"errors"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

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

func (p *UserCompanionPet) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if p.Level <= 0 {
		p.Level = 1
	}
	p.CreatedAt = now
	p.UpdatedAt = now
	return nil
}

func (p *UserCompanionPet) BeforeUpdate(tx *gorm.DB) error {
	p.UpdatedAt = common.GetTimestamp()
	return nil
}

func GetUserCompanionPetsByUser(userId int) ([]UserCompanionPet, error) {
	var pets []UserCompanionPet
	err := DB.Where("user_id = ?", userId).
		Order("equipped desc, updated_at desc, id asc").
		Find(&pets).Error
	return pets, err
}

func GetUserCompanionPetByUserAndKey(userId int, achievementKey string) (*UserCompanionPet, error) {
	var pet UserCompanionPet
	err := DB.Where("user_id = ? AND achievement_key = ?", userId, achievementKey).
		First(&pet).Error
	if err != nil {
		return nil, err
	}
	return &pet, nil
}

func EnsureUserCompanionPetTx(tx *gorm.DB, userId int, achievementKey string) (*UserCompanionPet, error) {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 || achievementKey == "" {
		return nil, errors.New("invalid companion pet")
	}

	var pet UserCompanionPet
	err := tx.Where("user_id = ? AND achievement_key = ?", userId, achievementKey).
		Attrs(UserCompanionPet{
			UserId:         userId,
			AchievementKey: achievementKey,
			Level:          1,
			Experience:     0,
			Equipped:       false,
		}).
		FirstOrCreate(&pet).Error
	if err != nil {
		return nil, err
	}
	return &pet, nil
}

func SetEquippedCompanionPetTx(tx *gorm.DB, userId int, achievementKey string) error {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 || achievementKey == "" {
		return errors.New("invalid companion pet equip")
	}

	if err := tx.Model(&UserCompanionPet{}).
		Where("user_id = ?", userId).
		Update("equipped", false).Error; err != nil {
		return err
	}

	result := tx.Model(&UserCompanionPet{}).
		Where("user_id = ? AND achievement_key = ?", userId, achievementKey).
		Update("equipped", true)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func AddCompanionPetExperienceTx(tx *gorm.DB, userId int, achievementKey string, exp int64) error {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 || achievementKey == "" || exp <= 0 {
		return nil
	}
	return tx.Model(&UserCompanionPet{}).
		Where("user_id = ? AND achievement_key = ?", userId, achievementKey).
		Update("experience", gorm.Expr("experience + ?", exp)).Error
}

func DecreaseUserQuotaTx(tx *gorm.DB, userId int, quota int64) error {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 || quota <= 0 {
		return errors.New("invalid quota deduction")
	}

	result := tx.Model(&User{}).
		Where("id = ? AND quota >= ?", userId, quota).
		Update("quota", gorm.Expr("quota - ?", quota))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("insufficient quota")
	}

	go func() {
		_ = cacheDecrUserQuota(userId, quota)
	}()
	return nil
}
