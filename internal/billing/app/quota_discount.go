package app

import (
	commercedomain "github.com/sh2001sh/new-api/internal/commerce/domain"
	commercestore "github.com/sh2001sh/new-api/internal/commerce/store"
)

func getCompanionConsumptionDiscountRate(userID int) float64 {
	if userID <= 0 {
		return 0
	}
	appliedBonus, err := commercestore.LoadUserCompanionAppliedBonus(userID)
	if err != nil || appliedBonus == nil {
		return 0
	}
	return appliedBonus.Buff.ConsumptionDiscountRate
}

func getEffectiveConsumptionDiscountRate(userID int) float64 {
	companionRate := getCompanionConsumptionDiscountRate(userID)
	blindBoxRate := getBlindBoxConsumptionDiscountRate(userID)
	if blindBoxRate > companionRate {
		return blindBoxRate
	}
	return companionRate
}

func applyCompanionConsumptionDiscount(userID int, quota int) int {
	if quota <= 0 {
		return quota
	}
	return commercedomain.CompanionDiscountedQuota(quota, getEffectiveConsumptionDiscountRate(userID))
}
