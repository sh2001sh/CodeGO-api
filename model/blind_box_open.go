package model

import (
	"errors"
	"fmt"
	"math"
	"math/rand"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

func getBlindBoxSubscriptionPlanTx(tx *gorm.DB) (*SubscriptionPlan, error) {
	setting := operation_setting.GetBlindBoxSetting()
	title := strings.TrimSpace(setting.SubscriptionPlanTitle)
	if title == "" {
		return nil, errors.New("blind box subscription plan title is empty")
	}
	var plan SubscriptionPlan
	query := tx.Where("title = ?", title).First(&plan)
	if query.Error != nil {
		return nil, query.Error
	}
	return &plan, nil
}

func countBlindBoxOpensInRange(tx *gorm.DB, start, end int64) (int64, error) {
	var count int64
	err := tx.Model(&BlindBoxOpenRecord{}).
		Where("create_time >= ? AND create_time < ?", start, end).
		Count(&count).Error
	return count, err
}

func getOrCreateBlindBoxPityStateTx(tx *gorm.DB, userId int) (*BlindBoxPityState, error) {
	var state BlindBoxPityState
	err := tx.Set("gorm:query_option", "FOR UPDATE").Where("user_id = ?", userId).First(&state).Error
	if err == nil {
		return &state, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	state = BlindBoxPityState{
		UserId:                userId,
		ConsecutiveLowRewards: 0,
	}
	if err := tx.Create(&state).Error; err != nil {
		return nil, err
	}
	return &state, nil
}

func getOpenableBlindBoxOrdersTx(tx *gorm.DB, userId int) ([]BlindBoxOrder, int, error) {
	var orders []BlindBoxOrder
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("user_id = ? AND status = ? AND opened_count < quantity", userId, common.TopUpStatusSuccess).
		Order("id asc").
		Find(&orders).Error; err != nil {
		return nil, 0, err
	}
	total := 0
	for _, order := range orders {
		remaining := order.Quantity - order.OpenedCount
		if remaining > 0 {
			total += remaining
		}
	}
	return orders, total, nil
}

func pickBlindBoxTier(tiers []operation_setting.BlindBoxTierSetting) operation_setting.BlindBoxTierSetting {
	if len(tiers) == 0 {
		return operation_setting.BlindBoxTierSetting{Name: "fallback", MinUSD: 1, MaxUSD: 1, Probability: 1}
	}
	roll := rand.Float64()
	cumulative := 0.0
	for _, tier := range tiers {
		probability := tier.Probability
		if probability <= 0 {
			continue
		}
		cumulative += probability
		if roll <= cumulative {
			return tier
		}
	}
	return tiers[len(tiers)-1]
}

func randomTierRewardUSD(tier operation_setting.BlindBoxTierSetting) float64 {
	minValue := tier.MinUSD
	maxValue := tier.MaxUSD
	if maxValue <= minValue {
		return math.Round(minValue*100) / 100
	}
	value := minValue + rand.Float64()*(maxValue-minValue)
	return math.Round(value*100) / 100
}

func OpenBlindBoxes(userId int, count int) ([]BlindBoxOpenRecord, error) {
	if userId <= 0 || count <= 0 {
		return nil, errors.New("invalid blind box open request")
	}
	setting := operation_setting.GetBlindBoxSetting()
	if !setting.Enabled {
		return nil, ErrBlindBoxDisabled
	}
	now := common.GetTimestamp()
	dayStart, dayEnd := getBlindBoxDayRange(now)
	records := make([]BlindBoxOpenRecord, 0, count)
	err := DB.Transaction(func(tx *gorm.DB) error {
		openCountToday, err := countBlindBoxOpensInRange(tx, dayStart, dayEnd)
		if err != nil {
			return err
		}
		if int(openCountToday)+count > setting.DailyOpenLimit {
			return ErrBlindBoxSiteOpenLimitReached
		}
		orders, available, err := getOpenableBlindBoxOrdersTx(tx, userId)
		if err != nil {
			return err
		}
		if available < count {
			return ErrBlindBoxInsufficientStock
		}
		pityState, err := getOrCreateBlindBoxPityStateTx(tx, userId)
		if err != nil {
			return err
		}
		effectivePityThreshold := setting.PityThreshold
		blindBoxBonusQuota := int64(0)
		blindBoxRewardRate := 0.0
		blindBoxPityGuaranteeUSD := 0.0
		if appliedBonus, bonusErr := GetUserCompanionAppliedBonus(userId); bonusErr == nil &&
			appliedBonus != nil {
			if appliedBonus.Buff.BlindBoxPityReduction > 0 {
				effectivePityThreshold -= appliedBonus.Buff.BlindBoxPityReduction
				if effectivePityThreshold < 1 {
					effectivePityThreshold = 1
				}
			}
			if appliedBonus.Buff.BlindBoxBonusQuota > 0 {
				blindBoxBonusQuota = appliedBonus.Buff.BlindBoxBonusQuota
			}
			if appliedBonus.Buff.BlindBoxRewardRate > 0 {
				blindBoxRewardRate = appliedBonus.Buff.BlindBoxRewardRate
			}
			if appliedBonus.Buff.BlindBoxPityGuaranteeUSD > 0 {
				blindBoxPityGuaranteeUSD = appliedBonus.Buff.BlindBoxPityGuaranteeUSD
			}
		}
		subscriptionPlan, err := getBlindBoxSubscriptionPlanTx(tx)
		if err != nil {
			return err
		}
		orderIndex := 0
		currentOrderRemaining := orders[0].Quantity - orders[0].OpenedCount
		for i := 0; i < count; i++ {
			for currentOrderRemaining <= 0 && orderIndex < len(orders)-1 {
				orderIndex++
				currentOrderRemaining = orders[orderIndex].Quantity - orders[orderIndex].OpenedCount
			}
			if orderIndex >= len(orders) || currentOrderRemaining <= 0 {
				return ErrBlindBoxInsufficientStock
			}
			currentOrder := &orders[orderIndex]
			currentOrder.OpenedCount++
			currentOrderRemaining--

			record := BlindBoxOpenRecord{
				UserId:     userId,
				OrderId:    currentOrder.Id,
				CreateTime: common.GetTimestamp(),
			}

			subscriptionHit := rand.Float64() < setting.SubscriptionPrizeProbability
			if subscriptionHit {
				sub, _, err := ApplySubscriptionPurchaseTx(tx, userId, subscriptionPlan, "blind_box")
				if err != nil {
					return err
				}
				record.RewardType = BlindBoxRewardTypeSubscription
				record.RewardTitle = subscriptionPlan.Title
				record.RewardTier = "subscription"
				record.UserSubscriptionId = sub.Id
				record.RewardUSD = 0
				pityState.ConsecutiveLowRewards = 0
			} else {
				pityTriggered := pityState.ConsecutiveLowRewards >= effectivePityThreshold
				rewardUSD := 0.0
				tierName := "pity"
				if pityTriggered {
					rewardUSD = setting.PityGuaranteeUSD + blindBoxPityGuaranteeUSD
				} else {
					tier := pickBlindBoxTier(setting.Tiers)
					tierName = tier.Name
					rewardUSD = randomTierRewardUSD(tier)
				}
				if blindBoxRewardRate > 0 {
					rewardUSD = math.Round(rewardUSD*(1+blindBoxRewardRate)*100) / 100
				}
				baseCreditAmount := quotaUnitsFromBlindBoxUSD(rewardUSD)
				creditAmount := baseCreditAmount + blindBoxBonusQuota
				if creditAmount <= 0 {
					return fmt.Errorf("invalid blind box reward amount: %.2f", rewardUSD)
				}
				totalRewardUSD := rewardUSD + float64(blindBoxBonusQuota)/common.QuotaPerUnit
				record.RewardType = BlindBoxRewardTypeQuota
				record.RewardUSD = totalRewardUSD
				record.CreditAmount = creditAmount
				record.RewardTier = tierName
				record.IsPity = pityTriggered
				record.RewardTitle = fmt.Sprintf("%.2f USD short-term quota", totalRewardUSD)
				if err := tx.Create(&record).Error; err != nil {
					return err
				}
				credit := BlindBoxCredit{
					UserId:          userId,
					OpenRecordId:    record.Id,
					OriginalAmount:  creditAmount,
					RemainingAmount: creditAmount,
					RewardUSD:       totalRewardUSD,
					ExpiresAt:       now + int64(setting.ExpireDays)*24*3600,
					Status:          BlindBoxCreditStatusActive,
				}
				if err := tx.Create(&credit).Error; err != nil {
					return err
				}
				if rewardUSD >= setting.LowRewardThresholdUSD {
					pityState.ConsecutiveLowRewards = 0
				} else {
					pityState.ConsecutiveLowRewards++
				}
				records = append(records, record)
				continue
			}

			if err := tx.Create(&record).Error; err != nil {
				return err
			}
			records = append(records, record)
		}
		for i := range orders {
			if err := tx.Save(&orders[i]).Error; err != nil {
				return err
			}
		}
		return tx.Save(pityState).Error
	})
	if err != nil {
		return nil, err
	}
	return records, nil
}
