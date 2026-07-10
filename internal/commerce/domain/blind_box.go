package domain

import commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"

type BlindBoxOverview struct {
	AvailableBoxes         int                                 `json:"available_boxes"`
	PendingBoxes           int                                 `json:"pending_boxes"`
	RemainingQuota         int64                               `json:"remaining_quota"`
	ClaudeQuota            int64                               `json:"claude_quota"`
	PityProgress           int                                 `json:"pity_progress"`
	PityThreshold          int                                 `json:"pity_threshold"`
	EffectivePityThreshold int                                 `json:"effective_pity_threshold"`
	PurchasedToday         int                                 `json:"purchased_today"`
	PurchasedThisMonth     int                                 `json:"purchased_this_month"`
	RecentRecords          []commerceschema.BlindBoxOpenRecord `json:"recent_records"`
}
