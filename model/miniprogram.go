package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	// MiniProgramBindingStatusActive marks an active mini program binding.
	MiniProgramBindingStatusActive = "active"
	// MiniProgramBindingStatusRevoked marks a revoked mini program binding.
	MiniProgramBindingStatusRevoked = "revoked"
)

// UserWeChatBinding stores the binding between a website user and a mini program openid.
type UserWeChatBinding struct {
	Id         int    `json:"id"`
	UserId     int    `json:"user_id" gorm:"uniqueIndex"`
	OpenID     string `json:"openid" gorm:"column:openid;size:128;uniqueIndex"`
	UnionID    string `json:"unionid" gorm:"column:unionid;size:128;default:''"`
	Status     string `json:"status" gorm:"size:16;index;default:'active'"`
	BoundAt    int64  `json:"bound_at" gorm:"bigint;index"`
	RevokedAt  int64  `json:"revoked_at" gorm:"bigint;default:0"`
	LastSeenAt int64  `json:"last_seen_at" gorm:"bigint;default:0"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt  int64  `json:"updated_at" gorm:"bigint"`
}

func (UserWeChatBinding) TableName() string {
	return "user_wechat_bindings"
}

func (binding *UserWeChatBinding) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if binding.BoundAt <= 0 && binding.Status == MiniProgramBindingStatusActive {
		binding.BoundAt = now
	}
	if binding.LastSeenAt <= 0 && binding.Status == MiniProgramBindingStatusActive {
		binding.LastSeenAt = now
	}
	if binding.CreatedAt <= 0 {
		binding.CreatedAt = now
	}
	binding.UpdatedAt = now
	return nil
}

func (binding *UserWeChatBinding) BeforeUpdate(tx *gorm.DB) error {
	binding.UpdatedAt = common.GetTimestamp()
	return nil
}

// MiniProgramBindCode stores a short-lived bind code generated on the website.
type MiniProgramBindCode struct {
	Id           int    `json:"id"`
	UserId       int    `json:"user_id" gorm:"index"`
	CodeHash     string `json:"code_hash" gorm:"size:64;index"`
	ExpiresAt    int64  `json:"expires_at" gorm:"bigint;index"`
	UsedAt       int64  `json:"used_at" gorm:"bigint;default:0"`
	CreatedIP    string `json:"created_ip" gorm:"size:64;default:''"`
	AttemptCount int    `json:"attempt_count" gorm:"default:0"`
	CreatedAt    int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt    int64  `json:"updated_at" gorm:"bigint"`
}

func (MiniProgramBindCode) TableName() string {
	return "miniprogram_bind_codes"
}

func (code *MiniProgramBindCode) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if code.CreatedAt <= 0 {
		code.CreatedAt = now
	}
	code.UpdatedAt = now
	return nil
}

func (code *MiniProgramBindCode) BeforeUpdate(tx *gorm.DB) error {
	code.UpdatedAt = common.GetTimestamp()
	return nil
}

func normalizeMiniProgramBindCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func hashMiniProgramBindCode(code string) string {
	return common.HmacSha256(normalizeMiniProgramBindCode(code), common.SessionSecret)
}

// CreateMiniProgramBindCode creates a new one-time bind code for a website user.
func CreateMiniProgramBindCode(userId int, createdIP string, ttl time.Duration) (string, *MiniProgramBindCode, error) {
	if userId <= 0 {
		return "", nil, errors.New("invalid user id")
	}
	if ttl <= 0 {
		ttl = 10 * time.Minute
	}

	now := common.GetTimestamp()
	if err := DB.Model(&MiniProgramBindCode{}).
		Where("user_id = ? AND used_at = 0 AND expires_at > ?", userId, now).
		Update("expires_at", now-1).Error; err != nil {
		return "", nil, err
	}

	for attempt := 0; attempt < 5; attempt++ {
		code := normalizeMiniProgramBindCode(common.GetRandomString(6))
		codeHash := hashMiniProgramBindCode(code)

		var existing int64
		if err := DB.Model(&MiniProgramBindCode{}).
			Where("code_hash = ? AND used_at = 0 AND expires_at > ?", codeHash, now).
			Count(&existing).Error; err != nil {
			return "", nil, err
		}
		if existing > 0 {
			continue
		}

		record := &MiniProgramBindCode{
			UserId:    userId,
			CodeHash:  codeHash,
			ExpiresAt: now + int64(ttl.Seconds()),
			CreatedIP: strings.TrimSpace(createdIP),
		}
		if err := DB.Create(record).Error; err != nil {
			return "", nil, err
		}
		return code, record, nil
	}

	return "", nil, errors.New("failed to generate bind code")
}

// GetActiveUserWeChatBindingByOpenID returns the active binding for an openid.
func GetActiveUserWeChatBindingByOpenID(openID string) (*UserWeChatBinding, error) {
	openID = strings.TrimSpace(openID)
	if openID == "" {
		return nil, nil
	}
	var binding UserWeChatBinding
	err := DB.Where("openid = ? AND status = ?", openID, MiniProgramBindingStatusActive).First(&binding).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &binding, nil
}

// GetActiveUserWeChatBindingByUserID returns the active mini program binding for a user.
func GetActiveUserWeChatBindingByUserID(userId int) (*UserWeChatBinding, error) {
	if userId <= 0 {
		return nil, nil
	}
	var binding UserWeChatBinding
	err := DB.Where("user_id = ? AND status = ?", userId, MiniProgramBindingStatusActive).First(&binding).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &binding, nil
}

// TouchUserWeChatBindingByOpenID updates last_seen_at for the active binding.
func TouchUserWeChatBindingByOpenID(openID string) error {
	openID = strings.TrimSpace(openID)
	if openID == "" {
		return nil
	}
	return DB.Model(&UserWeChatBinding{}).
		Where("openid = ? AND status = ?", openID, MiniProgramBindingStatusActive).
		Update("last_seen_at", common.GetTimestamp()).Error
}

// RevokeMiniProgramBindingByUserID revokes the active binding for a website user.
func RevokeMiniProgramBindingByUserID(userId int) error {
	if userId <= 0 {
		return nil
	}
	now := common.GetTimestamp()
	return DB.Model(&UserWeChatBinding{}).
		Where("user_id = ? AND status = ?", userId, MiniProgramBindingStatusActive).
		Updates(map[string]interface{}{
			"status":     MiniProgramBindingStatusRevoked,
			"revoked_at": now,
		}).Error
}

// RevokeMiniProgramBindingByOpenID revokes the active binding for an openid.
func RevokeMiniProgramBindingByOpenID(openID string) error {
	openID = strings.TrimSpace(openID)
	if openID == "" {
		return nil
	}
	now := common.GetTimestamp()
	return DB.Model(&UserWeChatBinding{}).
		Where("openid = ? AND status = ?", openID, MiniProgramBindingStatusActive).
		Updates(map[string]interface{}{
			"status":     MiniProgramBindingStatusRevoked,
			"revoked_at": now,
		}).Error
}

// ConsumeMiniProgramBindCodeAndBind verifies a bind code and binds the current openid.
func ConsumeMiniProgramBindCodeAndBind(code string, openID string, unionID string) (*MiniProgramBindCode, *UserWeChatBinding, error) {
	code = normalizeMiniProgramBindCode(code)
	openID = strings.TrimSpace(openID)
	unionID = strings.TrimSpace(unionID)
	if code == "" || openID == "" {
		return nil, nil, errors.New("bind code and openid are required")
	}

	codeHash := hashMiniProgramBindCode(code)
	now := common.GetTimestamp()

	var bindCode MiniProgramBindCode
	var binding UserWeChatBinding
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("code_hash = ?", codeHash).Order("id desc").First(&bindCode).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("bind code is invalid")
			}
			return err
		}

		bindCode.AttemptCount++
		if bindCode.UsedAt > 0 {
			_ = tx.Model(&bindCode).Update("attempt_count", bindCode.AttemptCount).Error
			return errors.New("bind code has already been used")
		}
		if bindCode.ExpiresAt <= now {
			_ = tx.Model(&bindCode).Updates(map[string]interface{}{
				"attempt_count": bindCode.AttemptCount,
				"expires_at":    now - 1,
			}).Error
			return errors.New("bind code has expired")
		}

		var bindingByOpenID UserWeChatBinding
		err := tx.Where("openid = ? AND status = ?", openID, MiniProgramBindingStatusActive).First(&bindingByOpenID).Error
		if err == nil && bindingByOpenID.UserId != bindCode.UserId {
			_ = tx.Model(&bindCode).Update("attempt_count", bindCode.AttemptCount).Error
			return errors.New("this WeChat account is already bound to another website account")
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		var bindingByUser UserWeChatBinding
		err = tx.Where("user_id = ? AND status = ?", bindCode.UserId, MiniProgramBindingStatusActive).First(&bindingByUser).Error
		if err == nil && bindingByUser.OpenID != openID {
			_ = tx.Model(&bindCode).Update("attempt_count", bindCode.AttemptCount).Error
			return errors.New("this website account is already bound to another WeChat account")
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		if err := tx.Model(&bindCode).Updates(map[string]interface{}{
			"used_at":       now,
			"attempt_count": bindCode.AttemptCount,
		}).Error; err != nil {
			return err
		}

		switch {
		case bindingByOpenID.Id > 0:
			binding = bindingByOpenID
		case bindingByUser.Id > 0:
			binding = bindingByUser
		default:
			binding = UserWeChatBinding{}
		}

		binding.UserId = bindCode.UserId
		binding.OpenID = openID
		binding.UnionID = unionID
		binding.Status = MiniProgramBindingStatusActive
		binding.BoundAt = now
		binding.RevokedAt = 0
		binding.LastSeenAt = now

		if binding.Id > 0 {
			return tx.Save(&binding).Error
		}
		return tx.Create(&binding).Error
	})
	if err != nil {
		return nil, nil, err
	}

	return &bindCode, &binding, nil
}

// GetMiniProgramBindCodeTTLSeconds returns the remaining TTL for a bind code record.
func GetMiniProgramBindCodeTTLSeconds(record *MiniProgramBindCode) int64 {
	if record == nil {
		return 0
	}
	remaining := record.ExpiresAt - common.GetTimestamp()
	if remaining < 0 {
		return 0
	}
	return remaining
}

// GetMiniProgramBindingLabel returns a short debug string for logging.
func GetMiniProgramBindingLabel(binding *UserWeChatBinding) string {
	if binding == nil {
		return ""
	}
	return fmt.Sprintf("user=%d,openid=%s", binding.UserId, binding.OpenID)
}
