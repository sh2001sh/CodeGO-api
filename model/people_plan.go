package model

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

const (
	PeoplePlanTeamStatusCollecting = "collecting"
	PeoplePlanTeamStatusFormed     = "formed"
	PeoplePlanTeamStatusLocked     = "locked"

	PeoplePlanMemberRoleCaptain = "captain"
	PeoplePlanMemberRoleMember  = "member"

	PeoplePlanMemberStatusActive = "active"
	PeoplePlanMemberStatusLeft   = "left"

	PeoplePlanRewardStatusPending   = "pending"
	PeoplePlanRewardStatusClaimable = "claimable"
	PeoplePlanRewardStatusClaimed   = "claimed"
	PeoplePlanRewardStatusRejected  = "rejected"
	PeoplePlanRewardStatusExpired   = "expired"
	PeoplePlanRewardStatusFrozen    = "frozen"

	PeoplePlanSubmissionStatusPending  = "pending"
	PeoplePlanSubmissionStatusApproved = "approved"
	PeoplePlanSubmissionStatusRejected = "rejected"

	PeoplePlanRiskStatusOpen     = "open"
	PeoplePlanRiskStatusResolved = "resolved"
)

type PeoplePlanTeam struct {
	Id            int    `json:"id"`
	Name          string `json:"name" gorm:"type:varchar(128);not null"`
	InviteCode    string `json:"invite_code" gorm:"type:varchar(32);not null;uniqueIndex"`
	Status        string `json:"status" gorm:"type:varchar(32);not null;default:'collecting';index"`
	CaptainUserId int    `json:"captain_user_id" gorm:"not null;index"`
	MinMembers    int    `json:"min_members" gorm:"not null;default:3"`
	MaxMembers    int    `json:"max_members" gorm:"not null;default:8"`
	FormedAt      int64  `json:"formed_at" gorm:"default:0"`
	LockedAt      int64  `json:"locked_at" gorm:"default:0"`
	LastSyncedAt  int64  `json:"last_synced_at" gorm:"default:0"`
	Snapshot      string `json:"snapshot" gorm:"type:text"`
	CreatedAt     int64  `json:"created_at" gorm:"autoCreateTime:milli"`
	UpdatedAt     int64  `json:"updated_at" gorm:"autoUpdateTime:milli"`
}

type PeoplePlanMember struct {
	Id                int    `json:"id"`
	TeamId            int    `json:"team_id" gorm:"not null;index;uniqueIndex:idx_people_plan_member_active"`
	UserId            int    `json:"user_id" gorm:"not null;index;uniqueIndex:idx_people_plan_member_active"`
	Role              string `json:"role" gorm:"type:varchar(32);not null;default:'member'"`
	Status            string `json:"status" gorm:"type:varchar(32);not null;default:'active';index;uniqueIndex:idx_people_plan_member_active"`
	JoinSource        string `json:"join_source" gorm:"type:varchar(32);default:'direct'"`
	InvitedByUserId   int    `json:"invited_by_user_id" gorm:"default:0;index"`
	VerifiedAt        int64  `json:"verified_at" gorm:"default:0"`
	FirstApiKeyAt     int64  `json:"first_api_key_at" gorm:"default:0"`
	FirstCallAt       int64  `json:"first_call_at" gorm:"default:0"`
	FirstTopupAt      int64  `json:"first_topup_at" gorm:"default:0"`
	EffectiveAt       int64  `json:"effective_at" gorm:"default:0"`
	LastActiveAt      int64  `json:"last_active_at" gorm:"default:0"`
	CurrentMonthSpend int64  `json:"current_month_spend" gorm:"default:0"`
	CurrentMonthCalls int64  `json:"current_month_calls" gorm:"default:0"`
	LifetimeSpend     int64  `json:"lifetime_spend" gorm:"default:0"`
	LifetimeCalls     int64  `json:"lifetime_calls" gorm:"default:0"`
	Snapshot          string `json:"snapshot" gorm:"type:text"`
	CreatedAt         int64  `json:"created_at" gorm:"autoCreateTime:milli"`
	UpdatedAt         int64  `json:"updated_at" gorm:"autoUpdateTime:milli"`
}

type PeoplePlanRewardLedger struct {
	Id            int    `json:"id"`
	UserId        int    `json:"user_id" gorm:"not null;index"`
	TeamId        int    `json:"team_id" gorm:"default:0;index"`
	SourceType    string `json:"source_type" gorm:"type:varchar(32);not null;index"`
	SourceKey     string `json:"source_key" gorm:"type:varchar(128);not null;index;uniqueIndex:idx_people_plan_reward_source_user"`
	Title         string `json:"title" gorm:"type:varchar(255);not null"`
	Description   string `json:"description" gorm:"type:text"`
	RewardType    string `json:"reward_type" gorm:"type:varchar(32);not null"`
	QuotaDelta    int64  `json:"quota_delta" gorm:"default:0"`
	RewardPayload string `json:"reward_payload" gorm:"type:text"`
	Status        string `json:"status" gorm:"type:varchar(32);not null;default:'claimable';index"`
	ReviewStatus  string `json:"review_status" gorm:"type:varchar(32);not null;default:'auto';index"`
	RiskStatus    string `json:"risk_status" gorm:"type:varchar(32);not null;default:'clear';index"`
	ClaimableAt   int64  `json:"claimable_at" gorm:"default:0"`
	ExpiresAt     int64  `json:"expires_at" gorm:"default:0"`
	ClaimedAt     int64  `json:"claimed_at" gorm:"default:0"`
	ReviewedBy    int    `json:"reviewed_by" gorm:"default:0"`
	ReviewedAt    int64  `json:"reviewed_at" gorm:"default:0"`
	ReviewNotes   string `json:"review_notes" gorm:"type:text"`
	CreatedAt     int64  `json:"created_at" gorm:"autoCreateTime:milli"`
	UpdatedAt     int64  `json:"updated_at" gorm:"autoUpdateTime:milli"`
}

type PeoplePlanAchievementProgress struct {
	Id              int    `json:"id"`
	TeamId          int    `json:"team_id" gorm:"not null;index;uniqueIndex:idx_people_plan_achievement_period"`
	AchievementKey  string `json:"achievement_key" gorm:"type:varchar(64);not null;uniqueIndex:idx_people_plan_achievement_period"`
	Category        string `json:"category" gorm:"type:varchar(32);not null;index"`
	PeriodKey       string `json:"period_key" gorm:"type:varchar(32);not null;uniqueIndex:idx_people_plan_achievement_period"`
	CurrentValue    int64  `json:"current_value" gorm:"default:0"`
	TargetValue     int64  `json:"target_value" gorm:"default:0"`
	Status          string `json:"status" gorm:"type:varchar(32);not null;default:'tracking';index"`
	LastReachedAt   int64  `json:"last_reached_at" gorm:"default:0"`
	CompletionCount int    `json:"completion_count" gorm:"default:0"`
	RewardLedgerId  int    `json:"reward_ledger_id" gorm:"default:0"`
	Snapshot        string `json:"snapshot" gorm:"type:text"`
	CreatedAt       int64  `json:"created_at" gorm:"autoCreateTime:milli"`
	UpdatedAt       int64  `json:"updated_at" gorm:"autoUpdateTime:milli"`
}

type PeoplePlanSubmission struct {
	Id            int    `json:"id"`
	UserId        int    `json:"user_id" gorm:"not null;index"`
	TeamId        int    `json:"team_id" gorm:"default:0;index"`
	Type          string `json:"type" gorm:"type:varchar(32);not null;index"`
	Title         string `json:"title" gorm:"type:varchar(255);not null"`
	Summary       string `json:"summary" gorm:"type:text"`
	Content       string `json:"content" gorm:"type:text"`
	Attachments   string `json:"attachments" gorm:"type:text"`
	Contact       string `json:"contact" gorm:"type:varchar(255)"`
	PublicDisplay bool   `json:"public_display" gorm:"default:false"`
	Status        string `json:"status" gorm:"type:varchar(32);not null;default:'pending';index"`
	ReviewNotes   string `json:"review_notes" gorm:"type:text"`
	ReviewedBy    int    `json:"reviewed_by" gorm:"default:0"`
	ReviewedAt    int64  `json:"reviewed_at" gorm:"default:0"`
	CreatedAt     int64  `json:"created_at" gorm:"autoCreateTime:milli"`
	UpdatedAt     int64  `json:"updated_at" gorm:"autoUpdateTime:milli"`
}

type PeoplePlanRiskReview struct {
	Id             int    `json:"id"`
	UserId         int    `json:"user_id" gorm:"not null;index"`
	TeamId         int    `json:"team_id" gorm:"default:0;index"`
	RewardLedgerId int    `json:"reward_ledger_id" gorm:"default:0;index"`
	RuleKey        string `json:"rule_key" gorm:"type:varchar(64);not null;index"`
	RiskLevel      string `json:"risk_level" gorm:"type:varchar(32);not null;default:'medium'"`
	HitReason      string `json:"hit_reason" gorm:"type:text"`
	Status         string `json:"status" gorm:"type:varchar(32);not null;default:'open';index"`
	Notes          string `json:"notes" gorm:"type:text"`
	ReviewedBy     int    `json:"reviewed_by" gorm:"default:0"`
	ReviewedAt     int64  `json:"reviewed_at" gorm:"default:0"`
	CreatedAt      int64  `json:"created_at" gorm:"autoCreateTime:milli"`
	UpdatedAt      int64  `json:"updated_at" gorm:"autoUpdateTime:milli"`
}

func (PeoplePlanTeam) TableName() string                { return "people_plan_teams" }
func (PeoplePlanMember) TableName() string              { return "people_plan_members" }
func (PeoplePlanRewardLedger) TableName() string        { return "people_plan_reward_ledgers" }
func (PeoplePlanAchievementProgress) TableName() string { return "people_plan_achievement_progress" }
func (PeoplePlanSubmission) TableName() string          { return "people_plan_submissions" }
func (PeoplePlanRiskReview) TableName() string          { return "people_plan_risk_reviews" }

func GetPeoplePlanTeamByUser(userId int) (*PeoplePlanTeam, *PeoplePlanMember, error) {
	if userId <= 0 {
		return nil, nil, errors.New("invalid user id")
	}
	var member PeoplePlanMember
	if err := DB.Where("user_id = ? AND status = ?", userId, PeoplePlanMemberStatusActive).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, nil
		}
		return nil, nil, err
	}
	var team PeoplePlanTeam
	if err := DB.Where("id = ?", member.TeamId).First(&team).Error; err != nil {
		return nil, nil, err
	}
	return &team, &member, nil
}

func CountActivePeoplePlanMembers(teamId int) (int64, error) {
	var count int64
	err := DB.Model(&PeoplePlanMember{}).
		Where("team_id = ? AND status = ?", teamId, PeoplePlanMemberStatusActive).
		Count(&count).Error
	return count, err
}

func CountEffectivePeoplePlanMembers(teamId int) (int64, error) {
	var count int64
	err := DB.Model(&PeoplePlanMember{}).
		Where("team_id = ? AND status = ? AND effective_at > 0", teamId, PeoplePlanMemberStatusActive).
		Count(&count).Error
	return count, err
}

func GetPeoplePlanTeamMembers(teamId int) ([]PeoplePlanMember, error) {
	var members []PeoplePlanMember
	err := DB.Where("team_id = ?", teamId).Order("id asc").Find(&members).Error
	return members, err
}

func GetPeoplePlanRewardsByUser(userId int, includeReviewed bool) ([]PeoplePlanRewardLedger, error) {
	var rewards []PeoplePlanRewardLedger
	query := DB.Where("user_id = ?", userId)
	if !includeReviewed {
		query = query.Where("status <> ?", PeoplePlanRewardStatusRejected)
	}
	err := query.Order("created_at desc, id desc").Find(&rewards).Error
	return rewards, err
}

func GetPeoplePlanSubmissionsByUser(userId int) ([]PeoplePlanSubmission, error) {
	var submissions []PeoplePlanSubmission
	err := DB.Where("user_id = ?", userId).Order("created_at desc").Find(&submissions).Error
	return submissions, err
}

func GetPendingPeoplePlanRewards() ([]PeoplePlanRewardLedger, error) {
	var rewards []PeoplePlanRewardLedger
	err := DB.Where("status = ? OR status = ?", PeoplePlanRewardStatusPending, PeoplePlanRewardStatusFrozen).
		Order("created_at asc").Find(&rewards).Error
	return rewards, err
}

func GetPendingPeoplePlanSubmissions() ([]PeoplePlanSubmission, error) {
	var submissions []PeoplePlanSubmission
	err := DB.Where("status = ?", PeoplePlanSubmissionStatusPending).
		Order("created_at asc").Find(&submissions).Error
	return submissions, err
}

func CreatePeoplePlanRewardTx(tx *gorm.DB, reward *PeoplePlanRewardLedger) error {
	if reward == nil {
		return errors.New("reward is nil")
	}
	if strings.TrimSpace(reward.SourceKey) == "" {
		return errors.New("reward source key is required")
	}
	var existing PeoplePlanRewardLedger
	err := tx.Where("user_id = ? AND source_key = ?", reward.UserId, reward.SourceKey).First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return tx.Create(reward).Error
}

func UpdatePeoplePlanRewardReviewTx(tx *gorm.DB, rewardId int, status string, reviewedBy int, notes string, reviewedAt int64) error {
	return tx.Model(&PeoplePlanRewardLedger{}).
		Where("id = ?", rewardId).
		Updates(map[string]interface{}{
			"status":       status,
			"review_notes": notes,
			"reviewed_by":  reviewedBy,
			"reviewed_at":  reviewedAt,
		}).Error
}

func ClaimPeoplePlanQuotaRewardTx(tx *gorm.DB, reward *PeoplePlanRewardLedger, claimedAt int64) error {
	if reward == nil {
		return errors.New("reward is nil")
	}
	if reward.Status != PeoplePlanRewardStatusClaimable {
		return fmt.Errorf("reward status %s is not claimable", reward.Status)
	}
	if reward.QuotaDelta > 0 {
		key := fmt.Sprintf("people-plan-reward:%d", reward.Id)
		if _, err := GrantBonusQuotaTx(tx, reward.UserId, reward.QuotaDelta, "people_plan_reward", fmt.Sprintf("%d", reward.Id), key); err != nil {
			return err
		}
	}
	return tx.Model(&PeoplePlanRewardLedger{}).Where("id = ?", reward.Id).
		Updates(map[string]interface{}{
			"status":     PeoplePlanRewardStatusClaimed,
			"claimed_at": claimedAt,
		}).Error
}
