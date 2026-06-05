package model

import (
	"errors"
	"os"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	ImageWorkspaceStatusReady   = "ready"
	ImageWorkspaceStatusExpired = "expired"
	ImageWorkspaceStatusFailed  = "failed"
)

type ImageWorkspaceItem struct {
	Id            int            `json:"id" gorm:"primaryKey"`
	UserId        int            `json:"user_id" gorm:"index;not null"`
	SessionId     string         `json:"session_id" gorm:"type:varchar(64);index;not null"`
	BatchId       string         `json:"batch_id" gorm:"type:varchar(64);index;not null"`
	SourceItemId  int            `json:"source_item_id" gorm:"index;default:0"`
	Model         string         `json:"model" gorm:"type:varchar(128);not null"`
	Prompt        string         `json:"prompt" gorm:"type:text"`
	RevisedPrompt string         `json:"revised_prompt" gorm:"type:text"`
	RequestParams string         `json:"request_params" gorm:"type:text"`
	ImageIndex    int            `json:"image_index" gorm:"default:0"`
	Status        string         `json:"status" gorm:"type:varchar(32);index;not null"`
	MimeType      string         `json:"mime_type" gorm:"type:varchar(128);default:''"`
	FilePath      string         `json:"file_path" gorm:"type:text"`
	OriginalURL   string         `json:"original_url" gorm:"type:text"`
	ErrorMessage  string         `json:"error_message" gorm:"type:text"`
	ExpiresAt     int64          `json:"expires_at" gorm:"bigint;index"`
	CreatedAt     int64          `json:"created_at" gorm:"bigint;index"`
	UpdatedAt     int64          `json:"updated_at" gorm:"bigint"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

func (item *ImageWorkspaceItem) BeforeCreate(_ *gorm.DB) error {
	now := common.GetTimestamp()
	if item.CreatedAt == 0 {
		item.CreatedAt = now
	}
	if item.UpdatedAt == 0 {
		item.UpdatedAt = now
	}
	return nil
}

func (item *ImageWorkspaceItem) BeforeUpdate(_ *gorm.DB) error {
	item.UpdatedAt = common.GetTimestamp()
	return nil
}

func CreateImageWorkspaceItems(items []*ImageWorkspaceItem) error {
	if len(items) == 0 {
		return nil
	}
	return DB.Create(&items).Error
}

func GetImageWorkspaceItemsByUser(userId int, sessionId string, offset int, limit int) ([]*ImageWorkspaceItem, int64, error) {
	var (
		items []*ImageWorkspaceItem
		total int64
	)
	tx := DB.Model(&ImageWorkspaceItem{}).Where("user_id = ?", userId)
	if sessionId != "" {
		tx = tx.Where("session_id = ?", sessionId)
	}
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := tx.Order("created_at desc, id desc").Offset(offset).Limit(limit).Find(&items).Error
	return items, total, err
}

func GetImageWorkspaceItemByUser(userId int, itemId int) (*ImageWorkspaceItem, error) {
	var item ImageWorkspaceItem
	err := DB.Where("id = ? AND user_id = ?", itemId, userId).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func CleanupExpiredImageWorkspaceItems(limit int, now int64) (int, error) {
	if limit <= 0 {
		limit = 100
	}
	var items []*ImageWorkspaceItem
	err := DB.Where("status = ? AND expires_at > 0 AND expires_at <= ?", ImageWorkspaceStatusReady, now).
		Order("expires_at asc, id asc").
		Limit(limit).
		Find(&items).Error
	if err != nil {
		return 0, err
	}
	if len(items) == 0 {
		return 0, nil
	}

	for _, item := range items {
		if item.FilePath != "" {
			_ = os.Remove(item.FilePath)
		}
	}

	ids := make([]int, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.Id)
	}

	return len(ids), DB.Model(&ImageWorkspaceItem{}).
		Where("id IN ?", ids).
		Updates(map[string]any{
			"status":        ImageWorkspaceStatusExpired,
			"file_path":     "",
			"error_message": "expired",
			"updated_at":    common.GetTimestamp(),
		}).Error
}

func GetImageWorkspaceSourceItem(userId int, sourceItemId int) (*ImageWorkspaceItem, error) {
	if sourceItemId <= 0 {
		return nil, errors.New("source item id is required")
	}
	return GetImageWorkspaceItemByUser(userId, sourceItemId)
}
