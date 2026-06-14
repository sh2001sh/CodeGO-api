package service

import (
	"fmt"

	"github.com/QuantumNous/new-api/model"
)

type AffiliateInviteeRewardStatus struct {
	InviteeId               int    `json:"invitee_id"`
	InviteeUsername         string `json:"invitee_username"`
	InviteeDisplayName      string `json:"invitee_display_name"`
	CreatedAt               int64  `json:"created_at"`
	MonthCardPurchased      bool   `json:"month_card_purchased"`
	ResetOpportunityEarned  bool   `json:"reset_opportunity_earned"`
	ResetOpportunityEarnedAt int64 `json:"reset_opportunity_earned_at"`
}

type AffiliateRewardsOverview struct {
	AffiliateCode             string                                   `json:"affiliate_code"`
	InvitedCount              int                                      `json:"invited_count"`
	SuccessfulPurchaseInvites int                                      `json:"successful_purchase_invites"`
	ResetOpportunity          model.SubscriptionResetOpportunitySummary `json:"reset_opportunity"`
	Invitees                  []AffiliateInviteeRewardStatus           `json:"invitees"`
}

func GetAffiliateRewardsOverview(userId int) (*AffiliateRewardsOverview, error) {
	if userId <= 0 {
		return nil, fmt.Errorf("invalid user id")
	}

	var inviter model.User
	if err := model.DB.Select("id, aff_code").
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

	resetOpportunity, err := model.GetUserSubscriptionResetOpportunity(userId)
	if err != nil {
		return nil, err
	}

	var ledgers []model.SubscriptionResetOpportunityLedger
	if err := model.DB.
		Where("user_id = ? AND change_type = ?", userId, model.SubscriptionResetOpportunityChangeEarn).
		Order("created_at desc, id desc").
		Find(&ledgers).Error; err != nil {
		return nil, err
	}

	earnedByInvitee := make(map[int]model.SubscriptionResetOpportunityLedger, len(ledgers))
	for _, ledger := range ledgers {
		if ledger.RelatedUserId <= 0 {
			continue
		}
		earnedByInvitee[ledger.RelatedUserId] = ledger
	}

	overview := &AffiliateRewardsOverview{
		AffiliateCode:             inviter.AffCode,
		InvitedCount:              len(invitees),
		ResetOpportunity:          *resetOpportunity,
		SuccessfulPurchaseInvites: len(earnedByInvitee),
		Invitees:                  make([]AffiliateInviteeRewardStatus, 0, len(invitees)),
	}

	for _, invitee := range invitees {
		status := AffiliateInviteeRewardStatus{
			InviteeId:          invitee.Id,
			InviteeUsername:    invitee.Username,
			InviteeDisplayName: invitee.DisplayName,
			CreatedAt:          invitee.CreatedAt,
		}
		if ledger, ok := earnedByInvitee[invitee.Id]; ok {
			status.MonthCardPurchased = true
			status.ResetOpportunityEarned = true
			status.ResetOpportunityEarnedAt = ledger.CreatedAt
		}
		overview.Invitees = append(overview.Invitees, status)
	}

	return overview, nil
}
