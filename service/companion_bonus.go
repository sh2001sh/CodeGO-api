package service

import (
	"errors"
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

type companionQuotaSpend struct {
	Source         string
	UserId         int
	SubscriptionId int
	Quota          int64
}

func getEffectiveConsumptionDiscountRate(userId int) float64 {
	companionRate := getCompanionConsumptionDiscountRate(userId)
	blindBoxRate := model.GetUserBlindBoxConsumptionDiscountRate(userId)
	if blindBoxRate > companionRate {
		return blindBoxRate
	}
	return companionRate
}

func rewardQuotaWithRate(baseQuota int64, bonusRate float64) int64 {
	if baseQuota <= 0 {
		return 0
	}
	return int64(math.Round(float64(baseQuota) * (1 + bonusRate)))
}

func missionRewardQuotaWithBonus(ctx *gamificationContext, rewardUSD float64) int64 {
	baseQuota := quotaUnitsFromUSD(rewardUSD)
	if baseQuota <= 0 || ctx == nil || ctx.activeBonus == nil {
		return baseQuota
	}
	return rewardQuotaWithRate(baseQuota, ctx.activeBonus.Buff.DailyMissionBonusRate)
}

func missionPetExperienceWithBonus(ctx *gamificationContext, baseExp int64) int64 {
	if baseExp <= 0 || ctx == nil || ctx.activeBonus == nil {
		return baseExp
	}
	return int64(math.Round(float64(baseExp) * (1 + ctx.activeBonus.Buff.DailyMissionExpBonusRate)))
}

func achievementRewardQuotaWithBonus(ctx *gamificationContext, rewardUSD float64) int64 {
	baseQuota := quotaUnitsFromUSD(rewardUSD)
	if baseQuota <= 0 || ctx == nil || ctx.activeBonus == nil {
		return baseQuota
	}
	return rewardQuotaWithRate(baseQuota, ctx.activeBonus.Buff.AchievementRewardBonusRate)
}

func companionFeedExperienceWithBonus(activeBonus *model.CompanionAppliedBonus, consumedQuota int64) int64 {
	if activeBonus == nil {
		return model.CompanionPetFeedExperience(consumedQuota, 0)
	}
	return model.CompanionPetFeedExperience(
		consumedQuota,
		model.CompanionPetEffectiveFeedExpBonusRate(activeBonus.Buff),
	)
}

func isSubscriptionQuotaError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "no active subscription") ||
		strings.Contains(msg, "subscription quota insufficient") ||
		strings.Contains(msg, "subscription used exceeds total") ||
		strings.Contains(msg, "subscription period quota exceeded") ||
		strings.Contains(msg, "subscription model quota exceeded")
}

func isWalletQuotaError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "insufficient quota")
}

func spendCompanionQuota(userId int, quota int64) (*companionQuotaSpend, error) {
	if userId <= 0 || quota <= 0 {
		return nil, errors.New("invalid companion quota spend")
	}

	settingMap, err := model.GetUserSetting(userId, false)
	if err != nil {
		return nil, err
	}
	preference := common.NormalizeBillingPreference(settingMap.BillingPreference)

	tryWallet := func() (*companionQuotaSpend, error) {
		if err := model.DecreaseUserQuota(userId, int(quota), false); err != nil {
			return nil, err
		}
		return &companionQuotaSpend{
			Source: BillingSourceWallet,
			UserId: userId,
			Quota:  quota,
		}, nil
	}

	trySubscription := func() (*companionQuotaSpend, error) {
		result, err := model.PreConsumeUserSubscription(
			"companion_"+common.GetUUID(),
			userId,
			"",
			0,
			quota,
		)
		if err != nil {
			return nil, err
		}
		return &companionQuotaSpend{
			Source:         BillingSourceSubscription,
			UserId:         userId,
			SubscriptionId: result.UserSubscriptionId,
			Quota:          quota,
		}, nil
	}

	switch preference {
	case "wallet_only":
		return tryWallet()
	case "subscription_only":
		return trySubscription()
	case "wallet_first":
		spend, err := tryWallet()
		if err == nil {
			return spend, nil
		}
		if !isWalletQuotaError(err) {
			return nil, err
		}
		return trySubscription()
	case "subscription_first":
		fallthrough
	default:
		hasSub, err := model.HasActiveUserSubscription(userId)
		if err != nil {
			return nil, err
		}
		if hasSub {
			spend, subErr := trySubscription()
			if subErr == nil {
				return spend, nil
			}
			if !isSubscriptionQuotaError(subErr) {
				return nil, subErr
			}
		}
		return tryWallet()
	}
}

func refundCompanionQuotaSpend(spend *companionQuotaSpend) error {
	if spend == nil || spend.Quota <= 0 || spend.UserId <= 0 {
		return nil
	}
	switch spend.Source {
	case BillingSourceSubscription:
		if spend.SubscriptionId <= 0 {
			return errors.New("missing subscription id for companion refund")
		}
		return model.PostConsumeUserSubscriptionUsageDelta(spend.SubscriptionId, "", -spend.Quota)
	case BillingSourceWallet:
		return model.IncreaseUserQuota(spend.UserId, int(spend.Quota), false)
	default:
		return errors.New("unsupported companion quota source")
	}
}

func getCompanionConsumptionDiscountRate(userId int) float64 {
	if userId <= 0 {
		return 0
	}
	appliedBonus, err := model.GetUserCompanionAppliedBonus(userId)
	if err != nil || appliedBonus == nil {
		return 0
	}
	return appliedBonus.Buff.ConsumptionDiscountRate
}

func applyCompanionConsumptionDiscount(userId int, quota int) int {
	if quota <= 0 {
		return quota
	}
	return model.CompanionDiscountedQuota(quota, getEffectiveConsumptionDiscountRate(userId))
}
