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
	if err := tx.Where("title = ?", title).First(&plan).Error; err != nil {
		return nil, err
	}
	return &plan, nil
}

func formatFirstPurchaseBlindBoxRewardTitle(amount float64) string {
	return fmt.Sprintf("首购专属奖励：%.2f 美元", amount)
}

func buildFirstPurchaseBlindBoxTiers(
	tiers []operation_setting.BlindBoxTierSetting,
	startUSD float64,
) []operation_setting.BlindBoxTierSetting {
	if len(tiers) == 0 || startUSD <= 0 {
		return tiers
	}

	remapped := make([]operation_setting.BlindBoxTierSetting, 0, len(tiers))
	currentMin := math.Round(startUSD*100) / 100
	for index, tier := range tiers {
		width := math.Round((tier.MaxUSD-tier.MinUSD)*100) / 100
		if width < 0 {
			width = 0
		}
		currentMax := math.Round((currentMin+width)*100) / 100
		remapped = append(remapped, operation_setting.BlindBoxTierSetting{
			Name:        tier.Name,
			MinUSD:      currentMin,
			MaxUSD:      currentMax,
			Probability: tier.Probability,
			WalletType:  tier.WalletType,
		})
		if index < len(tiers)-1 {
			currentMin = math.Round((currentMax+0.1)*100) / 100
		}
	}

	applyFirstPurchaseTierProbabilityBoost(remapped)
	return remapped
}

func applyFirstPurchaseTierProbabilityBoost(tiers []operation_setting.BlindBoxTierSetting) {
	if len(tiers) == 0 {
		return
	}

	weighted := make([]float64, len(tiers))
	totalWeight := 0.0
	lastIndex := len(tiers) - 1
	for index, tier := range tiers {
		if tier.Probability <= 0 {
			continue
		}
		boost := 1.0
		if lastIndex > 0 {
			progress := float64(index) / float64(lastIndex)
			boost = 0.45 + math.Pow(progress, 1.35)*2.55
		}
		weighted[index] = tier.Probability * boost
		totalWeight += weighted[index]
	}
	if totalWeight <= 0 {
		return
	}

	for index := range tiers {
		tiers[index].Probability = weighted[index] / totalWeight
	}
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

func getOpenableBlindBoxOrdersTx(tx *gorm.DB, userId int, orderId *int) ([]BlindBoxOrder, int, error) {
	query := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("user_id = ? AND status = ? AND opened_count < quantity", userId, common.TopUpStatusSuccess)
	if orderId != nil {
		query = query.Where("id = ?", *orderId)
	}
	var orders []BlindBoxOrder
	if err := query.Order("id asc").Find(&orders).Error; err != nil {
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

func openBlindBoxesTx(tx *gorm.DB, userId int, count int, orderId *int) ([]BlindBoxOpenRecord, error) {
	now := common.GetTimestamp()
	dayStart, dayEnd := getBlindBoxDayRange(now)
	setting := operation_setting.GetBlindBoxSetting()
	records := make([]BlindBoxOpenRecord, 0, count)

	openCountToday, err := countBlindBoxOpensInRange(tx, dayStart, dayEnd)
	if err != nil {
		return nil, err
	}
	if int(openCountToday)+count > setting.DailyOpenLimit {
		return nil, ErrBlindBoxSiteOpenLimitReached
	}

	orders, available, err := getOpenableBlindBoxOrdersTx(tx, userId, orderId)
	if err != nil {
		return nil, err
	}
	if available < count {
		return nil, ErrBlindBoxInsufficientStock
	}

	pityState, err := getOrCreateBlindBoxPityStateTx(tx, userId)
	if err != nil {
		return nil, err
	}
	effectivePityThreshold := setting.PityThreshold
	blindBoxBonusQuota := int64(0)
	blindBoxRewardRate := 0.0
	blindBoxPityGuaranteeUSD := 0.0
	firstPurchaseStartUSD := setting.FirstPurchaseGuaranteeUSD
	firstPurchaseTiers := buildFirstPurchaseBlindBoxTiers(
		setting.Tiers,
		firstPurchaseStartUSD,
	)
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
		return nil, err
	}

	firstPurchaseOrderID := 0
	if firstPurchaseStartUSD > 0 && len(orders) > 0 {
		isFirstOrder, err := isFirstSuccessfulBlindBoxOrderTx(tx, userId, orders[0].Id)
		if err != nil {
			return nil, err
		}
		if isFirstOrder && orders[0].OpenedCount == 0 {
			firstPurchaseOrderID = orders[0].Id
		}
	}

	orderIndex := 0
	currentOrderRemaining := orders[0].Quantity - orders[0].OpenedCount
	for i := 0; i < count; i++ {
		for currentOrderRemaining <= 0 && orderIndex < len(orders)-1 {
			orderIndex++
			currentOrderRemaining = orders[orderIndex].Quantity - orders[orderIndex].OpenedCount
		}
		if orderIndex >= len(orders) || currentOrderRemaining <= 0 {
			return nil, ErrBlindBoxInsufficientStock
		}

		currentOrder := &orders[orderIndex]
		currentOrder.OpenedCount++
		currentOrderRemaining--
		isFirstPurchaseOpen := currentOrder.Id == firstPurchaseOrderID && currentOrder.OpenedCount == 1

		record := BlindBoxOpenRecord{
			UserId:     userId,
			OrderId:    currentOrder.Id,
			CreateTime: common.GetTimestamp(),
		}

		subscriptionHit := rand.Float64() < setting.SubscriptionPrizeProbability
		if subscriptionHit {
			sub, _, err := ApplySubscriptionPurchaseTx(tx, userId, subscriptionPlan, "blind_box")
			if err != nil {
				return nil, err
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
			var tier operation_setting.BlindBoxTierSetting
			rewardType := BlindBoxRewardTypeQuota
			tierWalletType := BlindBoxRewardWalletTypeDefault
			if pityTriggered {
				rewardUSD = setting.PityGuaranteeUSD + blindBoxPityGuaranteeUSD
			} else {
				rewardTiers := setting.Tiers
				if isFirstPurchaseOpen && len(firstPurchaseTiers) > 0 {
					rewardTiers = firstPurchaseTiers
					tierName = "first_purchase"
				}
				tier = pickBlindBoxTier(rewardTiers)
				if tierName != "first_purchase" {
					tierName = tier.Name
				}
				rewardUSD = randomTierRewardUSD(tier)
				rewardType = operation_setting.NormalizeBlindBoxRewardType(tier.RewardType)
				tierWalletType = normalizeBlindBoxRewardWalletType(tier.WalletType)
			}
			if blindBoxRewardRate > 0 && rewardType != BlindBoxRewardTypeProp {
				rewardUSD = math.Round(rewardUSD*(1+blindBoxRewardRate)*100) / 100
			}
			totalRewardUSD := rewardUSD + float64(blindBoxBonusQuota)/common.QuotaPerUnit
			switch rewardType {
			case BlindBoxRewardTypeProp:
				record.RewardType = BlindBoxRewardTypeProp
				record.RewardTitle = tier.Name
				if record.RewardTitle == "" {
					record.RewardTitle = "实用道具奖励"
				}
				record.RewardTier = tierName
				record.RewardUSD = 0
				record.CreditAmount = 0
				record.RewardWalletType = ""
				record.IsPity = false
			case BlindBoxRewardTypeClaudeQuota:
				creditAmount := quotaUnitsFromBlindBoxUSD(totalRewardUSD)
				if creditAmount <= 0 {
					return nil, fmt.Errorf("invalid blind box reward amount: %.2f", totalRewardUSD)
				}
				record.RewardType = BlindBoxRewardTypeClaudeQuota
				record.RewardWalletType = string(BlindBoxRewardWalletTypeClaude)
				record.RewardUSD = totalRewardUSD
				record.CreditAmount = creditAmount
				record.RewardTier = tierName
				record.IsPity = pityTriggered
				if tierName == "first_purchase" {
					record.RewardTitle = formatFirstPurchaseBlindBoxRewardTitle(totalRewardUSD)
				} else {
					record.RewardTitle = fmt.Sprintf("%.2f Claude 额度奖励", totalRewardUSD)
				}
				if err := tx.Create(&record).Error; err != nil {
					return nil, err
				}
				if err := applyBlindBoxWalletRewardTx(tx, userId, creditAmount, BlindBoxRewardWalletTypeClaude); err != nil {
					return nil, err
				}
				if isBlindBoxHighValueReward(record.RewardType, rewardUSD, setting.LowRewardThresholdUSD) {
					pityState.ConsecutiveLowRewards = 0
				} else {
					pityState.ConsecutiveLowRewards++
				}
				records = append(records, record)
				continue
			default:
				baseCreditAmount := quotaUnitsFromBlindBoxUSD(totalRewardUSD)
				creditAmount := baseCreditAmount + blindBoxBonusQuota
				if creditAmount <= 0 {
					return nil, fmt.Errorf("invalid blind box reward amount: %.2f", totalRewardUSD)
				}
				record.RewardType = BlindBoxRewardTypeQuota
				record.RewardWalletType = string(tierWalletType)
				record.RewardUSD = totalRewardUSD
				record.CreditAmount = creditAmount
				record.RewardTier = tierName
				record.IsPity = pityTriggered
				if tierName == "first_purchase" {
					record.RewardTitle = formatFirstPurchaseBlindBoxRewardTitle(totalRewardUSD)
				} else if tierWalletType == BlindBoxRewardWalletTypeClaude {
					record.RewardTitle = fmt.Sprintf("%.2f Claude 额度奖励", totalRewardUSD)
				} else {
					record.RewardTitle = fmt.Sprintf("%.2f 美元奖励", totalRewardUSD)
				}
				if err := tx.Create(&record).Error; err != nil {
					return nil, err
				}
				if err := applyBlindBoxWalletRewardTx(tx, userId, creditAmount, tierWalletType); err != nil {
					return nil, err
				}
				if isBlindBoxHighValueReward(record.RewardType, rewardUSD, setting.LowRewardThresholdUSD) {
					pityState.ConsecutiveLowRewards = 0
				} else {
					pityState.ConsecutiveLowRewards++
				}
				records = append(records, record)
				continue
			}
			if err := tx.Create(&record).Error; err != nil {
				return nil, err
			}
			if record.RewardType == BlindBoxRewardTypeProp {
				prop, err := createBlindBoxPropTx(tx, userId, record.Id, record.RewardTitle)
				if err != nil {
					return nil, err
				}
				record.PropId = prop.Id
				record.PropType = prop.PropType
				record.PropStatus = prop.Status
				record.PropExpiresAt = prop.ExpiresAt
			}
			records = append(records, record)
			continue
		}

		if err := tx.Create(&record).Error; err != nil {
			return nil, err
		}
		if record.RewardType == BlindBoxRewardTypeProp {
			prop, err := createBlindBoxPropTx(tx, userId, record.Id, record.RewardTitle)
			if err != nil {
				return nil, err
			}
			record.PropId = prop.Id
			record.PropType = prop.PropType
			record.PropStatus = prop.Status
			record.PropExpiresAt = prop.ExpiresAt
		}
		records = append(records, record)
	}

	for i := range orders {
		if err := tx.Save(&orders[i]).Error; err != nil {
			return nil, err
		}
	}
	if err := tx.Save(pityState).Error; err != nil {
		return nil, err
	}

	return records, nil
}

func pickBlindBoxTier(tiers []operation_setting.BlindBoxTierSetting) operation_setting.BlindBoxTierSetting {
	if len(tiers) == 0 {
		return operation_setting.BlindBoxTierSetting{
			Name:        "fallback",
			MinUSD:      1,
			MaxUSD:      1,
			Probability: 1,
		}
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

func isBlindBoxHighValueReward(
	rewardType string,
	rewardUSD float64,
	thresholdUSD float64,
) bool {
	if rewardUSD <= 0 || thresholdUSD <= 0 {
		return false
	}
	valueEquivalent := rewardUSD
	if rewardType == BlindBoxRewardTypeClaudeQuota {
		// Claude quota cost is roughly 10x normal quota cost in the current pool,
		// so the pity threshold uses an ordinary-quota equivalent value.
		valueEquivalent = rewardUSD * 10
	}
	return valueEquivalent >= thresholdUSD
}

func OpenBlindBoxes(userId int, count int) ([]BlindBoxOpenRecord, error) {
	if userId <= 0 || count <= 0 {
		return nil, errors.New("invalid blind box open request")
	}
	setting := operation_setting.GetBlindBoxSetting()
	if !setting.Enabled {
		return nil, ErrBlindBoxDisabled
	}
	var records []BlindBoxOpenRecord
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		records, err = openBlindBoxesTx(tx, userId, count, nil)
		return err
	})
	if err != nil {
		return nil, err
	}
	return records, nil
}

func OpenBlindBoxOrderByTradeNo(tradeNo string) ([]BlindBoxOpenRecord, error) {
	if strings.TrimSpace(tradeNo) == "" {
		return nil, errors.New("tradeNo is empty")
	}
	var records []BlindBoxOpenRecord
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		records, err = OpenBlindBoxOrderByTradeNoTx(tx, tradeNo)
		return err
	})
	if err != nil {
		return nil, err
	}
	return records, nil
}

func OpenBlindBoxOrderByTradeNoTx(tx *gorm.DB, tradeNo string) ([]BlindBoxOpenRecord, error) {
	if strings.TrimSpace(tradeNo) == "" {
		return nil, errors.New("tradeNo is empty")
	}
	var order BlindBoxOrder
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("trade_no = ?", tradeNo).
		First(&order).Error; err != nil {
		return nil, ErrBlindBoxOrderNotFound
	}
	if order.Status != common.TopUpStatusSuccess {
		return nil, ErrBlindBoxOrderStatusInvalid
	}
	remaining := order.Quantity - order.OpenedCount
	if remaining <= 0 {
		return []BlindBoxOpenRecord{}, nil
	}
	return openBlindBoxesTx(tx, order.UserId, remaining, &order.Id)
}
