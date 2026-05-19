package service

import (
	"errors"
	"fmt"
	"math"

	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

func findAchievementDefinition(key string) (achievementDefinition, bool) {
	for _, achievement := range achievementCatalog {
		if achievement.Key == key {
			return achievement, true
		}
	}
	return achievementDefinition{}, false
}

func missionRewardQuotaWithBonus(ctx *gamificationContext, rewardUSD float64) int64 {
	baseQuota := quotaUnitsFromUSD(rewardUSD)
	if baseQuota <= 0 || ctx == nil || ctx.activeBonus == nil {
		return baseQuota
	}
	bonusRate := ctx.activeBonus.Buff.DailyMissionBonusRate
	if bonusRate <= 0 {
		return baseQuota
	}
	return int64(math.Round(float64(baseQuota) * (1 + bonusRate)))
}

func ensureCompanionPets(ctx *gamificationContext) error {
	for _, achievement := range achievementCatalog {
		if _, unlocked := ctx.unlockMap[achievement.Key]; !unlocked {
			continue
		}
		if _, err := model.EnsureUserCompanionPetTx(nil, ctx.user.Id, achievement.Key); err != nil {
			return err
		}
	}
	if err := refreshCompanionState(ctx); err != nil {
		return err
	}
	if ctx.equippedPet == nil && len(ctx.companionPets) > 0 {
		firstPet := ctx.companionPets[0]
		if err := model.SetEquippedCompanionPetTx(nil, ctx.user.Id, firstPet.AchievementKey); err != nil {
			return err
		}
		return refreshCompanionState(ctx)
	}
	return nil
}

func refreshCompanionState(ctx *gamificationContext) error {
	pets, err := model.GetUserCompanionPetsByUser(ctx.user.Id)
	if err != nil {
		return err
	}
	ctx.companionPets = pets
	ctx.companionPetMap = make(map[string]model.UserCompanionPet, len(pets))
	ctx.equippedPet = nil
	for index := range pets {
		pet := pets[index]
		ctx.companionPetMap[pet.AchievementKey] = pet
		if pet.Equipped {
			copyPet := pet
			ctx.equippedPet = &copyPet
		}
	}
	ctx.activeBonus = nil
	if ctx.equippedPet != nil {
		ctx.activeBonus = &model.CompanionAppliedBonus{
			Pet:            ctx.equippedPet,
			Buff:           model.BuildCompanionPetBuff(ctx.equippedPet.AchievementKey, ctx.equippedPet.Level),
			EffectiveLevel: ctx.equippedPet.Level,
		}
	}
	return nil
}

func buildCompanionBuffView(buff model.CompanionPetBuff) CompanionBuffView {
	return CompanionBuffView{
		Type:        buff.Type,
		Name:        buff.Name,
		Description: buff.Description,
		ValueText:   buff.ValueText,
	}
}

func buildCompanionPetView(ctx *gamificationContext, pet model.UserCompanionPet) *CompanionPetView {
	discountRate := 0.0
	if ctx.activeBonus != nil {
		discountRate = ctx.activeBonus.Buff.UpgradeDiscountRate
	}
	return &CompanionPetView{
		AchievementKey:   pet.AchievementKey,
		Level:            pet.Level,
		MaxLevel:         model.CompanionPetMaxLevel,
		Experience:       pet.Experience,
		CurrentLevelExp:  model.CompanionPetCurrentLevelThreshold(pet.Level),
		NextLevelExp:     model.CompanionPetNextLevelThreshold(pet.Level),
		CanUpgrade:       model.CompanionPetCanLevelUp(pet.Level, pet.Experience),
		IsMaxLevel:       pet.Level >= model.CompanionPetMaxLevel,
		Equipped:         pet.Equipped,
		UpgradeCostQuota: model.CompanionPetUpgradeCostQuota(pet.Level, discountRate),
		UpgradeCostUSD:   model.CompanionPetUpgradeCostUSDValue(pet.Level, discountRate),
		Buff:             buildCompanionBuffView(model.BuildCompanionPetBuff(pet.AchievementKey, pet.Level)),
	}
}

func buildCompanionSummary(ctx *gamificationContext) CompanionSummary {
	unlockedCount := len(ctx.unlockMap)
	stageIndex := 0
	for index := range companionStages {
		if unlockedCount >= companionStages[index].MinUnlocks {
			stageIndex = index
		}
	}
	stage := companionStages[stageIndex]
	progressTarget := stage.NextUnlocksGoal
	if progressTarget < unlockedCount {
		progressTarget = unlockedCount
	}

	summary := CompanionSummary{
		Name:             stage.Name,
		Title:            stage.Title,
		Flavor:           stage.Flavor,
		Level:            stageIndex + 1,
		UnlockedCount:    unlockedCount,
		TotalCount:       len(achievementCatalog),
		ProgressCurrent:  unlockedCount,
		ProgressTarget:   progressTarget,
		MaxLevel:         model.CompanionPetMaxLevel,
		OnlyOneEquipRule: "同一时间只能装备一只宠物，当前出战宠物的增益立即生效。",
		UpgradeRule:      "升级需要消耗额度，前期便宜，后期明显提高，满级为 5 级。",
		DailyMissionRule: "完成每日任务会自动给当前出战宠物发放经验。",
		BuffRule:         "不同宠物提供不同增益，升级后增益会同步增强。",
	}
	if ctx.equippedPet != nil {
		if achievement, ok := findAchievementDefinition(ctx.equippedPet.AchievementKey); ok {
			summary.Name = achievement.Name
			summary.Title = "当前出战宠物"
			summary.Flavor = "当前宠物的增益已经接入任务、签到或盲盒链路，可以通过日常任务和额度升级继续强化。"
		}
		summary.Level = ctx.equippedPet.Level
		summary.EquippedPet = buildCompanionPetView(ctx, *ctx.equippedPet)
	}
	if ctx.activeBonus != nil {
		buff := buildCompanionBuffView(ctx.activeBonus.Buff)
		summary.ActiveBuff = &buff
	}
	return summary
}

func buildAchievementItems(ctx *gamificationContext) []AchievementItem {
	items := make([]AchievementItem, 0, len(achievementCatalog))
	for _, achievement := range achievementCatalog {
		unlock, unlocked := ctx.unlockMap[achievement.Key]
		item := AchievementItem{
			Key:               achievement.Key,
			Name:              achievement.Name,
			Description:       achievement.Description,
			Hint:              achievement.Hint,
			Icon:              achievement.Icon,
			Tier:              achievement.Tier,
			Unlocked:          unlocked,
			UnlockedAt:        unlock.UnlockedAt,
			RewardUSD:         achievement.RewardUSD,
			RewardQuota:       quotaUnitsFromUSD(achievement.RewardUSD),
			RewardTitle:       achievement.RewardTitle,
			RewardDescription: achievement.RewardDescription,
			RewardClaimed:     unlock.RewardClaimedAt > 0 || unlock.RewardQuotaAwarded > 0,
			RewardClaimedAt:   unlock.RewardClaimedAt,
		}
		if pet, ok := ctx.companionPetMap[achievement.Key]; ok {
			item.Pet = buildCompanionPetView(ctx, pet)
		}
		items = append(items, item)
	}
	return items
}

func buildMissionItems(ctx *gamificationContext) []DailyMissionItem {
	items := make([]DailyMissionItem, 0, len(missionCatalog))
	for _, mission := range missionCatalog {
		current, completedAt := missionProgress(ctx, mission)
		claimedReward, claimed := ctx.todayRewardMap[mission.Key]
		items = append(items, DailyMissionItem{
			Key:          mission.Key,
			Name:         mission.Name,
			Description:  mission.Description,
			Icon:         mission.Icon,
			RewardUSD:    mission.RewardUSD,
			RewardQuota:  missionRewardQuotaWithBonus(ctx, mission.RewardUSD),
			PetExpReward: mission.PetExpReward,
			Current:      minInt64(current, mission.Target),
			Target:       mission.Target,
			Completed:    current >= mission.Target,
			Claimed:      claimed,
			CompletedAt:  maxInt64(completedAt, claimedReward.CompletedAt),
		})
	}
	return items
}

func EquipCompanionPet(userId int, achievementKey string) (*CompanionSummary, error) {
	if userId <= 0 || achievementKey == "" {
		return nil, errors.New("invalid companion equip request")
	}
	ctx, err := buildGamificationContext(userId)
	if err != nil {
		return nil, err
	}
	if err := ensureAchievementUnlocks(ctx); err != nil {
		return nil, err
	}
	if err := ensureCompanionPets(ctx); err != nil {
		return nil, err
	}
	if _, ok := ctx.companionPetMap[achievementKey]; !ok {
		return nil, errors.New("companion pet is locked")
	}
	if err := model.SetEquippedCompanionPetTx(nil, userId, achievementKey); err != nil {
		return nil, err
	}
	if err := refreshCompanionState(ctx); err != nil {
		return nil, err
	}
	summary := buildCompanionSummary(ctx)
	return &summary, nil
}

func UpgradeCompanionPet(userId int, achievementKey string) (*CompanionPetView, error) {
	if userId <= 0 || achievementKey == "" {
		return nil, errors.New("invalid companion upgrade request")
	}
	ctx, err := buildGamificationContext(userId)
	if err != nil {
		return nil, err
	}
	if err := ensureAchievementUnlocks(ctx); err != nil {
		return nil, err
	}
	if err := ensureCompanionPets(ctx); err != nil {
		return nil, err
	}

	discountRate := 0.0
	if ctx.activeBonus != nil {
		discountRate = ctx.activeBonus.Buff.UpgradeDiscountRate
	}

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		pet, txErr := model.GetUserCompanionPetByUserAndKey(userId, achievementKey)
		if txErr != nil {
			return txErr
		}
		if pet.Level >= model.CompanionPetMaxLevel {
			return errors.New("companion pet already max level")
		}
		if !model.CompanionPetCanLevelUp(pet.Level, pet.Experience) {
			return fmt.Errorf(
				"not enough pet experience: need %d",
				model.CompanionPetNextLevelThreshold(pet.Level),
			)
		}

		costQuota := model.CompanionPetUpgradeCostQuota(pet.Level, discountRate)
		if costQuota > 0 {
			if txErr := model.DecreaseUserQuotaTx(tx, userId, costQuota); txErr != nil {
				return txErr
			}
		}

		pet.Level++
		return tx.Model(&model.UserCompanionPet{}).
			Where("id = ?", pet.Id).
			Update("level", pet.Level).Error
	})
	if err != nil {
		return nil, err
	}

	if err := refreshCompanionState(ctx); err != nil {
		return nil, err
	}
	updatedPet, ok := ctx.companionPetMap[achievementKey]
	if !ok {
		return nil, errors.New("companion pet not found after upgrade")
	}
	return buildCompanionPetView(ctx, updatedPet), nil
}
