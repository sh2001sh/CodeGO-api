package service

import (
	"fmt"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

const (
	referralRegisterFrozenPoints = 2
	referralFirstCallPoints      = 5
	referralFirstTopupPoints     = 12
)

type AffiliateRewardRule struct {
	PurchaseType     string  `json:"purchase_type"`
	PurchaseLabel    string  `json:"purchase_label"`
	BonusQuotaAmount int64   `json:"bonus_quota_amount"`
	BonusQuotaUSD    float64 `json:"bonus_quota_usd"`
}

type AffiliateInviteeRewardStatus struct {
	InviteeId                 int    `json:"invitee_id"`
	InviteeUsername           string `json:"invitee_username"`
	InviteeDisplayName        string `json:"invitee_display_name"`
	CreatedAt                 int64  `json:"created_at"`
	FirstCallCompleted        bool   `json:"first_call_completed"`
	FirstCallRewardedPoints   int64  `json:"first_call_rewarded_points"`
	FirstTopupCompleted       bool   `json:"first_topup_completed"`
	FirstTopupRewardedPoints  int64  `json:"first_topup_rewarded_points"`
	FirstPurchaseCompleted    bool   `json:"first_purchase_completed"`
	FirstPurchaseType         string `json:"first_purchase_type"`
	FirstPurchaseLabel        string `json:"first_purchase_label"`
	FirstPurchaseRewardQuota  int64  `json:"first_purchase_reward_quota"`
	FirstPurchaseRewardedAt   int64  `json:"first_purchase_rewarded_at"`
}

type AffiliateRewardsOverview struct {
	AffiliateCode              string                         `json:"affiliate_code"`
	InvitedCount               int                            `json:"invited_count"`
	ReferralPointsEarned       int64                          `json:"referral_points_earned"`
	ReferralPointsPending      int64                          `json:"referral_points_pending"`
	ReferralBonusQuotaEarned   int64                          `json:"referral_bonus_quota_earned"`
	LegacyAffiliateQuota       int64                          `json:"legacy_affiliate_quota"`
	LegacyAffiliateQuotaEarned int64                          `json:"legacy_affiliate_quota_earned"`
	SuccessfulPurchaseInvites  int                            `json:"successful_purchase_invites"`
	Rules                      []AffiliateRewardRule          `json:"rules"`
	Invitees                   []AffiliateInviteeRewardStatus `json:"invitees"`
}

type affiliatePointTotals struct {
	ReferralPointsEarned  int64 `gorm:"column:referral_points_earned"`
	ReferralPointsPending int64 `gorm:"column:referral_points_pending"`
}

func GetAffiliateRewardsOverview(userId int) (*AffiliateRewardsOverview, error) {
	if userId <= 0 {
		return nil, fmt.Errorf("invalid user id")
	}

	var inviter model.User
	if err := model.DB.Select("id, aff_code, aff_quota, aff_history").
		Where("id = ?", userId).
		First(&inviter).Error; err != nil {
		return nil, err
	}

	var invitees []model.User
	if err := model.DB.Select("id, username, display_name, created_at").
		Where("inviter_id = ?", userId).
		Order("created_at desc, id desc").
		Find(&invitees).Error; err != nil {
		return nil, err
	}

	overview := &AffiliateRewardsOverview{
		AffiliateCode:              inviter.AffCode,
		InvitedCount:               len(invitees),
		LegacyAffiliateQuota:       int64(inviter.AffQuota),
		LegacyAffiliateQuotaEarned: int64(inviter.AffHistoryQuota),
		Rules: []AffiliateRewardRule{
			newAffiliateRewardRule(model.ReferralPurchaseTypeBlindBox),
			newAffiliateRewardRule(model.ReferralPurchaseTypeDayPass),
			newAffiliateRewardRule(model.ReferralPurchaseTypeMonthCard),
		},
		Invitees: make([]AffiliateInviteeRewardStatus, 0, len(invitees)),
	}

	var pointTotals affiliatePointTotals
	if err := model.DB.Table("point_ledgers").
		Select(`
			COALESCE(SUM(
				CASE
					WHEN source_type = ? AND type = ? THEN -delta
					WHEN source_type = ? AND type = ? THEN delta
					WHEN source_type = ? AND type = ? THEN delta
					ELSE 0
				END
			), 0) AS referral_points_earned,
			COALESCE(SUM(
				CASE
					WHEN source_type = ? AND type = ? THEN delta
					WHEN source_type = ? AND type = ? THEN delta
					ELSE 0
				END
			), 0) AS referral_points_pending
		`,
			model.PointSourceReferralRegister, model.PointLedgerTypeRelease,
			model.PointSourceReferralCall, model.PointLedgerTypeEarn,
			model.PointSourceReferralTopup, model.PointLedgerTypeEarn,
			model.PointSourceReferralRegister, model.PointLedgerTypeFreeze,
			model.PointSourceReferralRegister, model.PointLedgerTypeRelease).
		Where("user_id = ?", userId).
		Scan(&pointTotals).Error; err != nil {
		return nil, err
	}
	overview.ReferralPointsEarned = pointTotals.ReferralPointsEarned
	overview.ReferralPointsPending = pointTotals.ReferralPointsPending

	var purchaseRewards []model.ReferralPurchaseReward
	if err := model.DB.Where("inviter_id = ?", userId).
		Order("rewarded_at desc, id desc").
		Find(&purchaseRewards).Error; err != nil {
		return nil, err
	}
	purchaseRewardsByInvitee := make(map[int]model.ReferralPurchaseReward, len(purchaseRewards))
	for _, reward := range purchaseRewards {
		overview.ReferralBonusQuotaEarned += reward.BonusQuotaAmount
		purchaseRewardsByInvitee[reward.InviteeId] = reward
	}
	overview.SuccessfulPurchaseInvites = len(purchaseRewards)

	firstCallInvitees, err := loadInviteeIdsByPointSource(userId, model.PointSourceReferralCall)
	if err != nil {
		return nil, err
	}
	firstTopupInvitees, err := loadInviteeIdsByPointSource(userId, model.PointSourceReferralTopup)
	if err != nil {
		return nil, err
	}

	for _, invitee := range invitees {
		status := AffiliateInviteeRewardStatus{
			InviteeId:          invitee.Id,
			InviteeUsername:    invitee.Username,
			InviteeDisplayName: invitee.DisplayName,
			CreatedAt:          invitee.CreatedAt,
		}

		if _, ok := firstCallInvitees[invitee.Id]; ok {
			status.FirstCallCompleted = true
			status.FirstCallRewardedPoints = referralRegisterFrozenPoints + referralFirstCallPoints
		}
		if _, ok := firstTopupInvitees[invitee.Id]; ok {
			status.FirstTopupCompleted = true
			status.FirstTopupRewardedPoints = referralFirstTopupPoints
		}
		if reward, ok := purchaseRewardsByInvitee[invitee.Id]; ok {
			status.FirstPurchaseCompleted = true
			status.FirstPurchaseType = reward.PurchaseType
			status.FirstPurchaseLabel = reward.PurchaseLabel
			status.FirstPurchaseRewardQuota = reward.BonusQuotaAmount
			status.FirstPurchaseRewardedAt = reward.RewardedAt
		}

		overview.Invitees = append(overview.Invitees, status)
	}

	return overview, nil
}

func loadInviteeIdsByPointSource(userId int, sourceType string) (map[int]struct{}, error) {
	var rows []struct {
		SourceId string `gorm:"column:source_id"`
	}
	if err := model.DB.Table("point_ledgers").
		Select("DISTINCT source_id").
		Where("user_id = ? AND source_type = ? AND type = ?", userId, sourceType, model.PointLedgerTypeEarn).
		Find(&rows).Error; err != nil {
		return nil, err
	}

	result := make(map[int]struct{}, len(rows))
	for _, row := range rows {
		inviteeId, err := strconv.Atoi(row.SourceId)
		if err != nil || inviteeId <= 0 {
			continue
		}
		result[inviteeId] = struct{}{}
	}
	return result, nil
}

func newAffiliateRewardRule(purchaseType string) AffiliateRewardRule {
	return AffiliateRewardRule{
		PurchaseType:     purchaseType,
		PurchaseLabel:    model.ReferralPurchaseRewardLabel(purchaseType),
		BonusQuotaAmount: int64(model.ReferralPurchaseRewardUSD(purchaseType) * common.QuotaPerUnit),
		BonusQuotaUSD:    model.ReferralPurchaseRewardUSD(purchaseType),
	}
}
