package model

import (
	"errors"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// GeneMapShare stores a public share snapshot for the API gene-map feature.
type GeneMapShare struct {
	Id           int    `json:"id"`
	UserId       int    `json:"user_id" gorm:"index"`
	ShareToken   string `json:"share_token" gorm:"size:48;uniqueIndex"`
	OwnerLabel   string `json:"owner_label" gorm:"size:96;default:''"`
	Headline     string `json:"headline" gorm:"size:255;default:''"`
	SnapshotJSON string `json:"snapshot_json" gorm:"type:text;not null"`
	CreateTime   int64  `json:"create_time" gorm:"bigint;index"`
	UpdateTime   int64  `json:"update_time" gorm:"bigint"`
}

func (GeneMapShare) TableName() string {
	return "gene_map_shares"
}

func (share *GeneMapShare) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if share.CreateTime <= 0 {
		share.CreateTime = now
	}
	share.UpdateTime = now
	if share.ShareToken == "" {
		share.ShareToken = common.GetRandomString(24)
	}
	return nil
}

func (share *GeneMapShare) BeforeUpdate(tx *gorm.DB) error {
	share.UpdateTime = common.GetTimestamp()
	return nil
}

func GetGeneMapShareByToken(token string) (*GeneMapShare, error) {
	if token == "" {
		return nil, errors.New("invalid share token")
	}
	var share GeneMapShare
	if err := DB.Where("share_token = ?", token).First(&share).Error; err != nil {
		return nil, err
	}
	return &share, nil
}
