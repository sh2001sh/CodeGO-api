package service

import (
	"testing"

	"github.com/QuantumNous/new-api/model"
)

func TestPeoplePlanTeamRuleRequiresMinimumMembers(t *testing.T) {
	rule := PeoplePlanAchievementRule{
		Key:      "monthly-spend-150",
		Audience: "team",
		Metric:   "monthly_team_spend_usd",
		Target:   60,
		RewardTiers: []PeoplePlanRewardTier{
			{RequiredMembers: 3, Target: 60, RewardPoolUSD: 24},
			{RequiredMembers: 5, Target: 180, RewardPoolUSD: 68},
		},
		Repeatable:     true,
		MaxCompletions: 1,
	}

	if isPeoplePlanRuleEligible(rule, 1) {
		t.Fatalf("expected team rule to be ineligible before minimum members")
	}
	if got := computePeoplePlanCompletionCount(rule, 60, 1); got != 0 {
		t.Fatalf("expected no completion before minimum members, got %d", got)
	}
	if !isPeoplePlanRuleEligible(rule, 3) {
		t.Fatalf("expected team rule to be eligible at the first tier")
	}
	if got := computePeoplePlanCompletionCount(rule, 60, 3); got != 1 {
		t.Fatalf("expected one completion at the first tier, got %d", got)
	}
}

func TestPeoplePlanFormationRuleRemainsEligible(t *testing.T) {
	rule := PeoplePlanAchievementRule{
		Key:      "team-formed-3",
		Audience: "team",
		Metric:   "effective_members",
		Target:   3,
	}

	if !isPeoplePlanRuleEligible(rule, 1) {
		t.Fatalf("expected formation rule to stay eligible for tracking")
	}
	if got := computePeoplePlanCompletionCount(rule, 3, 3); got != 1 {
		t.Fatalf("expected formation rule to complete at target, got %d", got)
	}
}

func TestParsePeoplePlanRewardCompletionIndex(t *testing.T) {
	if got := parsePeoplePlanRewardCompletionIndex("achievement:12:monthly-spend-150:2026-05:2:81"); got != 2 {
		t.Fatalf("expected completion index 2, got %d", got)
	}
	if got := parsePeoplePlanRewardCompletionIndex("achievement:bad"); got != 0 {
		t.Fatalf("expected invalid source key to return 0, got %d", got)
	}
}

func TestBuildPeoplePlanRewardSummarySeparatesIssuedQuota(t *testing.T) {
	summary := buildPeoplePlanRewardSummary([]model.PeoplePlanRewardLedger{
		{Status: model.PeoplePlanRewardStatusClaimable, QuotaDelta: QuotaFromUSDInt(18)},
		{Status: model.PeoplePlanRewardStatusClaimed, QuotaDelta: QuotaFromUSDInt(24)},
		{Status: model.PeoplePlanRewardStatusPending, QuotaDelta: QuotaFromUSDInt(88)},
	})

	if summary.Claimable != 1 || summary.Claimed != 1 || summary.Pending != 1 {
		t.Fatalf("unexpected status counts: %+v", summary)
	}
	if summary.ClaimableQuotaUSD != 18 {
		t.Fatalf("expected claimable quota 18, got %d", summary.ClaimableQuotaUSD)
	}
	if summary.IssuedQuotaUSD != 24 {
		t.Fatalf("expected issued quota 24, got %d", summary.IssuedQuotaUSD)
	}
}
