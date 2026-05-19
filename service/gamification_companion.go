package service

import (
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
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
	feedExpPerUSD := model.CompanionPetFeedExperience(int64(common.QuotaPerUnit), 0)
	if ctx.activeBonus != nil {
		discountRate = ctx.activeBonus.Buff.UpgradeDiscountRate
		feedExpPerUSD = model.CompanionPetFeedExperience(int64(common.QuotaPerUnit), ctx.activeBonus.Buff.FeedExpBonusRate)
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
		FeedExpPerUSD:    feedExpPerUSD,
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
		OnlyOneEquipRule: "同一时间只能装备一只宠物，切换出战后，新宠物的增益会立刻接管全站玩法。",
		FeedingRule:      "输入要投喂给宠物的额度后，系统会按你的扣费顺序优先消耗套餐或余额；额度不够就会直接失败，不允许欠款。投喂后，这部分额度会转成宠物经验；如果当前出战宠物带有投喂加成，拿到的经验会更多。",
		UpgradeRule:      "宠物满级为 5 级。先靠任务和投喂攒经验，经验到线后再点击升级；升级消耗也会按你的套餐/余额顺序扣除。",
		DailyMissionRule: "完成每日任务会同时给当前出战宠物发放经验；如果当前出战宠物带有任务奖励或任务经验加成，这两部分会一起变多。",
		BuffRule:         "所有宠物都会提前展示解锁方式、Lv.1 效果和 Lv.5 效果。越难解锁的宠物，效果越直接，像永久 0.95 倍或 0.90 倍扣费这类强增益只会出现在后期主宠上。",
	}
	if ctx.equippedPet != nil {
		if achievement, ok := findAchievementDefinition(ctx.equippedPet.AchievementKey); ok {
			summary.Name = achievement.Name
			summary.Title = "当前出战宠物"
			summary.Flavor = "当前宠物的增益已经接入任务、成就、盲盒、升级和真实扣费链路。投喂和做任务都会把它养得更强。"
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
			PreviewBuff:       buildCompanionBuffView(model.BuildCompanionPetBuff(achievement.Key, 1)),
			MaxBuff:           buildCompanionBuffView(model.BuildCompanionPetBuff(achievement.Key, model.CompanionPetMaxLevel)),
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
			PetExpReward: missionPetExperienceWithBonus(ctx, mission.PetExpReward),
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

	var spend *companionQuotaSpend

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		var pet model.UserCompanionPet
		if txErr := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("user_id = ? AND achievement_key = ?", userId, achievementKey).
			First(&pet).Error; txErr != nil {
			return txErr
		}
		if pet.Level >= model.CompanionPetMaxLevel {
			return errors.New("companion pet already max level")
		}
		if !model.CompanionPetCanLevelUp(pet.Level, pet.Experience) {
			return fmt.Errorf("not enough pet experience: need %d", model.CompanionPetNextLevelThreshold(pet.Level))
		}

		costQuota := model.CompanionPetUpgradeCostQuota(pet.Level, discountRate)
		if costQuota > 0 {
			var spendErr error
			spend, spendErr = spendCompanionQuota(userId, costQuota)
			if spendErr != nil {
				return spendErr
			}
		}

		return tx.Model(&model.UserCompanionPet{}).
			Where("id = ?", pet.Id).
			Update("level", pet.Level+1).Error
	})
	if err != nil {
		if spend != nil {
			_ = refundCompanionQuotaSpend(spend)
		}
		return nil, err
	}
	if spend != nil {
		model.RecordLog(userId, model.LogTypeSystem, fmt.Sprintf("companion pet upgraded: %s, cost %.2f USD via %s", achievementKey, float64(spend.Quota)/common.QuotaPerUnit, spend.Source))
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

func FeedCompanionPet(userId int, achievementKey string, feedQuota int64) (*CompanionFeedResult, error) {
	if userId <= 0 || achievementKey == "" || feedQuota <= 0 {
		return nil, errors.New("invalid companion feed request")
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

	gainedExp := companionFeedExperienceWithBonus(ctx.activeBonus, feedQuota)
	if gainedExp <= 0 {
		return nil, errors.New("feed quota is too low")
	}

	spend, err := spendCompanionQuota(userId, feedQuota)
	if err != nil {
		return nil, err
	}
	success := false
	defer func() {
		if !success {
			_ = refundCompanionQuotaSpend(spend)
		}
	}()

	err = model.DB.Transaction(func(tx *gorm.DB) error {
		var pet model.UserCompanionPet
		if txErr := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("user_id = ? AND achievement_key = ?", userId, achievementKey).
			First(&pet).Error; txErr != nil {
			return txErr
		}
		return model.AddCompanionPetExperienceTx(tx, userId, achievementKey, gainedExp)
	})
	if err != nil {
		return nil, err
	}
	success = true

	model.RecordLog(
		userId,
		model.LogTypeSystem,
		fmt.Sprintf("companion pet fed: %s, spent %.2f USD via %s, gained %d exp", achievementKey, float64(feedQuota)/common.QuotaPerUnit, spend.Source, gainedExp),
	)

	if err := refreshCompanionState(ctx); err != nil {
		return nil, err
	}
	updatedPet, ok := ctx.companionPetMap[achievementKey]
	if !ok {
		return nil, errors.New("companion pet not found after feed")
	}
	return &CompanionFeedResult{
		Pet:           buildCompanionPetView(ctx, updatedPet),
		ConsumedQuota: feedQuota,
		ConsumedUSD:   float64(feedQuota) / common.QuotaPerUnit,
		GainedExp:     gainedExp,
		FundingSource: spend.Source,
	}, nil
}
