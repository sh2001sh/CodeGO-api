package model

import (
	"fmt"
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	CompanionPetMaxLevel              = 5
	CompanionFeedBaseExperiencePerUSD = 5.0
	companionBasePityThreshold        = 5
	companionMaxDiscountRate          = 0.8
)

type CompanionPetBuff struct {
	Type                       string  `json:"type"`
	Name                       string  `json:"name"`
	Description                string  `json:"description"`
	ValueText                  string  `json:"value_text"`
	DailyMissionBonusRate      float64 `json:"daily_mission_bonus_rate"`
	DailyMissionExpBonusRate   float64 `json:"daily_mission_exp_bonus_rate"`
	AchievementRewardBonusRate float64 `json:"achievement_reward_bonus_rate"`
	FeedExpBonusRate           float64 `json:"feed_exp_bonus_rate"`
	CheckinBonusQuota          int64   `json:"checkin_bonus_quota"`
	BlindBoxBonusQuota         int64   `json:"blind_box_bonus_quota"`
	BlindBoxRewardRate         float64 `json:"blind_box_reward_rate"`
	BlindBoxPityReduction      int     `json:"blind_box_pity_reduction"`
	BlindBoxPityGuaranteeUSD   float64 `json:"blind_box_pity_guarantee_usd"`
	UpgradeDiscountRate        float64 `json:"upgrade_discount_rate"`
	ConsumptionDiscountRate    float64 `json:"consumption_discount_rate"`
}

type CompanionAppliedBonus struct {
	Pet            *UserCompanionPet
	Buff           CompanionPetBuff
	EffectiveLevel int
}

type companionBuffBlueprint struct {
	BuffType                    string
	BuffName                    string
	DailyMissionBonusRates      []float64
	DailyMissionExpBonusRates   []float64
	AchievementRewardBonusRates []float64
	FeedExpBonusRates           []float64
	CheckinBonusUSD             []float64
	BlindBoxBonusUSD            []float64
	BlindBoxRewardRates         []float64
	BlindBoxPityReductions      []int
	BlindBoxPityGuaranteeUSD    []float64
	UpgradeDiscountRates        []float64
	ConsumptionDiscountRates    []float64
}

var companionBuffBlueprints = map[string]companionBuffBlueprint{
	"first-call": {
		BuffType:               "daily_bonus_rate",
		BuffName:               "每日任务额度加成",
		DailyMissionBonusRates: []float64{0, 0.03, 0.05, 0.07, 0.09, 0.12},
	},
	"ten-calls": {
		BuffType:          "feed_exp_bonus_rate",
		BuffName:          "投喂经验加成",
		FeedExpBonusRates: []float64{0, 0.08, 0.12, 0.18, 0.24, 0.30},
	},
	"hundred-calls": {
		BuffType:                  "daily_mission_exp_bonus_rate",
		BuffName:                  "每日任务经验加成",
		DailyMissionExpBonusRates: []float64{0, 0.06, 0.09, 0.12, 0.15, 0.18},
	},
	"thousand-calls": {
		BuffType:             "upgrade_discount_rate",
		BuffName:             "成长加速",
		UpgradeDiscountRates: []float64{0, 0.05, 0.08, 0.11, 0.14, 0.18},
	},
	"quota-scout": {
		BuffType:                    "achievement_reward_bonus_rate",
		BuffName:                    "成就奖励加成",
		AchievementRewardBonusRates: []float64{0, 0.08, 0.11, 0.14, 0.18, 0.22},
	},
	"quota-smith": {
		BuffType:         "blind_box_bonus_quota",
		BuffName:         "盲盒返还额度",
		BlindBoxBonusUSD: []float64{0, 0.04, 0.06, 0.08, 0.10, 0.12},
	},
	"thousand-forge": {
		BuffType:                 "consumption_discount_rate",
		BuffName:                 "永久扣费折扣",
		ConsumptionDiscountRates: []float64{0, 0.01, 0.015, 0.02, 0.03, 0.04},
	},
	"contract-power": {
		BuffType:                  "daily_bonus_rate",
		BuffName:                  "任务双成长",
		DailyMissionBonusRates:    []float64{0, 0.05, 0.07, 0.09, 0.12, 0.15},
		DailyMissionExpBonusRates: []float64{0, 0.06, 0.08, 0.10, 0.12, 0.15},
	},
	"plan-collector": {
		BuffType:                    "achievement_reward_bonus_rate",
		BuffName:                    "成就成长礼包",
		AchievementRewardBonusRates: []float64{0, 0.08, 0.11, 0.14, 0.18, 0.22},
		UpgradeDiscountRates:        []float64{0, 0.04, 0.06, 0.08, 0.10, 0.12},
	},
	"blind-box-rookie": {
		BuffType:               "blind_box_pity_reduction",
		BuffName:               "盲盒保底推进",
		BlindBoxPityReductions: []int{0, 0, 1, 1, 1, 1},
	},
	"blind-box-regular": {
		BuffType:            "blind_box_reward_rate",
		BuffName:            "盲盒奖励增幅",
		BlindBoxRewardRates: []float64{0, 0.03, 0.05, 0.07, 0.10, 0.12},
	},
	"lucky-star": {
		BuffType:                 "blind_box_pity_guarantee_usd",
		BuffName:                 "保底额度抬升",
		BlindBoxPityGuaranteeUSD: []float64{0, 0.5, 0.8, 1.0, 1.5, 2.0},
	},
	"social-crafter": {
		BuffType:               "blind_box_bonus_quota",
		BuffName:               "邀请活跃返礼",
		BlindBoxBonusUSD:       []float64{0, 0.05, 0.08, 0.10, 0.12, 0.15},
		BlindBoxPityReductions: []int{0, 0, 0, 1, 1, 1},
	},
	"community-core": {
		BuffType:                    "feed_exp_bonus_rate",
		BuffName:                    "社群培育加速",
		FeedExpBonusRates:           []float64{0, 0.10, 0.15, 0.20, 0.25, 0.30},
		AchievementRewardBonusRates: []float64{0, 0.08, 0.12, 0.16, 0.20, 0.25},
	},
	"seven-day-streak": {
		BuffType:                 "consumption_discount_rate",
		BuffName:                 "高频调用回馈",
		DailyMissionBonusRates:   []float64{0, 0.06, 0.08, 0.10, 0.12, 0.15},
		ConsumptionDiscountRates: []float64{0, 0.015, 0.025, 0.035, 0.045, 0.05},
	},
	"month-streak": {
		BuffType:                 "consumption_discount_rate",
		BuffName:                 "终阶主宠光环",
		ConsumptionDiscountRates: []float64{0, 0.03, 0.05, 0.06, 0.08, 0.10},
		BlindBoxRewardRates:      []float64{0, 0.05, 0.07, 0.09, 0.12, 0.15},
		UpgradeDiscountRates:     []float64{0, 0.05, 0.08, 0.10, 0.12, 0.15},
	},
}

var companionPetLevelThresholds = map[int]int64{
	1: 0,
	2: 60,
	3: 180,
	4: 420,
	5: 820,
}

var companionPetUpgradeCostUSD = map[int]float64{
	1: 0.5,
	2: 1.2,
	3: 3.0,
	4: 6.5,
}

func clampCompanionPetLevel(level int) int {
	if level < 1 {
		return 1
	}
	if level > CompanionPetMaxLevel {
		return CompanionPetMaxLevel
	}
	return level
}

func clampCompanionRate(rate float64, max float64) float64 {
	if rate < 0 {
		return 0
	}
	if rate > max {
		return max
	}
	return rate
}

func CompanionPetCurrentLevelThreshold(level int) int64 {
	return companionPetLevelThresholds[clampCompanionPetLevel(level)]
}

func CompanionPetNextLevelThreshold(level int) int64 {
	if level >= CompanionPetMaxLevel {
		return companionPetLevelThresholds[CompanionPetMaxLevel]
	}
	return companionPetLevelThresholds[level+1]
}

func CompanionPetLevelForExperience(experience int64) int {
	if experience <= 0 {
		return 1
	}
	level := 1
	for nextLevel := 2; nextLevel <= CompanionPetMaxLevel; nextLevel++ {
		threshold, ok := companionPetLevelThresholds[nextLevel]
		if !ok || experience < threshold {
			break
		}
		level = nextLevel
	}
	return level
}

func CompanionPetCanLevelUp(level int, experience int64) bool {
	if level >= CompanionPetMaxLevel {
		return false
	}
	return experience >= CompanionPetNextLevelThreshold(level)
}

func CompanionPetUpgradeCostQuota(level int, discountRate float64) int64 {
	if level >= CompanionPetMaxLevel {
		return 0
	}
	baseUSD, ok := companionPetUpgradeCostUSD[clampCompanionPetLevel(level)]
	if !ok || baseUSD <= 0 {
		return 0
	}
	finalUSD := baseUSD * (1 - clampCompanionRate(discountRate, companionMaxDiscountRate))
	return int64(math.Round(finalUSD * common.QuotaPerUnit))
}

func CompanionPetUpgradeCostUSDValue(level int, discountRate float64) float64 {
	return float64(CompanionPetUpgradeCostQuota(level, discountRate)) / common.QuotaPerUnit
}

func CompanionDiscountedQuota(quota int, discountRate float64) int {
	if quota <= 0 {
		return quota
	}
	finalQuota := int(math.Round(float64(quota) * (1 - clampCompanionRate(discountRate, 0.5))))
	if finalQuota <= 0 {
		return 1
	}
	return finalQuota
}

func CompanionPetFeedExperience(quota int64, bonusRate float64) int64 {
	if quota <= 0 {
		return 0
	}
	baseExp := (float64(quota) / common.QuotaPerUnit) * CompanionFeedBaseExperiencePerUSD
	exp := baseExp * (1 + clampCompanionRate(bonusRate, 3))
	return int64(math.Round(exp))
}

func CompanionPetEffectiveFeedExpBonusRate(buff CompanionPetBuff) float64 {
	return clampCompanionRate(buff.FeedExpBonusRate+buff.UpgradeDiscountRate, 3)
}

func buildDefaultCompanionBlueprint() companionBuffBlueprint {
	return companionBuffBlueprint{
		BuffType:               "daily_bonus_rate",
		BuffName:               "每日任务额度加成",
		DailyMissionBonusRates: []float64{0, 0.05, 0.07, 0.09, 0.12, 0.15},
	}
}

func companionFloatAt(values []float64, level int) float64 {
	if len(values) == 0 {
		return 0
	}
	if level < 0 {
		level = 0
	}
	if level >= len(values) {
		return values[len(values)-1]
	}
	return values[level]
}

func companionIntAt(values []int, level int) int {
	if len(values) == 0 {
		return 0
	}
	if level < 0 {
		level = 0
	}
	if level >= len(values) {
		return values[len(values)-1]
	}
	return values[level]
}

func percentText(rate float64) string {
	return fmt.Sprintf("%d%%", int(math.Round(rate*100)))
}

func usdTextFromQuota(quota int64) string {
	return fmt.Sprintf("%.2f 美元", float64(quota)/common.QuotaPerUnit)
}

func buildCompanionBuffTexts(buff CompanionPetBuff) (string, string) {
	shortParts := make([]string, 0, 3)
	descParts := make([]string, 0, 6)

	if buff.DailyMissionBonusRate > 0 {
		shortParts = append(shortParts, "任务奖励 +"+percentText(buff.DailyMissionBonusRate))
		descParts = append(descParts, "完成每日任务时，奖励额度增加 "+percentText(buff.DailyMissionBonusRate))
	}
	if buff.DailyMissionExpBonusRate > 0 {
		shortParts = append(shortParts, "任务经验 +"+percentText(buff.DailyMissionExpBonusRate))
		descParts = append(descParts, "完成每日任务时，当前出战宠物获得的经验增加 "+percentText(buff.DailyMissionExpBonusRate))
	}
	if buff.AchievementRewardBonusRate > 0 {
		shortParts = append(shortParts, "成就奖励 +"+percentText(buff.AchievementRewardBonusRate))
		descParts = append(descParts, "点亮新成就时，发放的额度奖励增加 "+percentText(buff.AchievementRewardBonusRate))
	}
	if buff.FeedExpBonusRate > 0 {
		shortParts = append(shortParts, "投喂经验 +"+percentText(buff.FeedExpBonusRate))
		descParts = append(descParts, "投喂同样额度时，这只宠物获得的经验增加 "+percentText(buff.FeedExpBonusRate))
	}
	if buff.BlindBoxBonusQuota > 0 {
		shortParts = append(shortParts, "每盒返 "+usdTextFromQuota(buff.BlindBoxBonusQuota))
		descParts = append(descParts, "每开 1 个盲盒，额外返还 "+usdTextFromQuota(buff.BlindBoxBonusQuota)+" 额度")
	}
	if buff.BlindBoxRewardRate > 0 {
		shortParts = append(shortParts, "盲盒奖励 +"+percentText(buff.BlindBoxRewardRate))
		descParts = append(descParts, "每次开盲盒得到的额度奖励再增加 "+percentText(buff.BlindBoxRewardRate))
	}
	if buff.BlindBoxPityReduction > 0 {
		effectiveThreshold := companionBasePityThreshold - buff.BlindBoxPityReduction
		if effectiveThreshold < 1 {
			effectiveThreshold = 1
		}
		shortParts = append(shortParts, fmt.Sprintf("低奖 %d 次保底", effectiveThreshold))
		descParts = append(descParts, fmt.Sprintf("若连续 %d 次都开到低于 5 美元的小奖，则下一次直接触发 10 美元保底", effectiveThreshold))
	}
	if buff.BlindBoxPityGuaranteeUSD > 0 {
		shortParts = append(shortParts, "保底 +"+fmt.Sprintf("%.2f 美元", buff.BlindBoxPityGuaranteeUSD))
		descParts = append(descParts, "触发盲盒保底时，保底额度再增加 "+fmt.Sprintf("%.2f 美元", buff.BlindBoxPityGuaranteeUSD))
	}
	if buff.UpgradeDiscountRate > 0 {
		shortParts = append(shortParts, "成长加速 +"+percentText(buff.UpgradeDiscountRate))
		descParts = append(descParts, "投喂这只宠物时，获得的经验再增加 "+percentText(buff.UpgradeDiscountRate))
	}
	if buff.ConsumptionDiscountRate > 0 {
		shortParts = append(shortParts, fmt.Sprintf("扣费 %.2f 倍", 1-buff.ConsumptionDiscountRate))
		descParts = append(descParts, fmt.Sprintf("按量调用时，实际扣费按 %.2f 倍计算", 1-buff.ConsumptionDiscountRate))
	}
	if buff.CheckinBonusQuota > 0 {
		shortParts = append(shortParts, "签到多领 "+usdTextFromQuota(buff.CheckinBonusQuota))
		descParts = append(descParts, "签到时额外获得 "+usdTextFromQuota(buff.CheckinBonusQuota)+" 额度")
	}

	valueText := strings.Join(shortParts, " + ")
	description := strings.Join(descParts, "；")
	if valueText == "" {
		valueText = "暂无额外增益"
	}
	if description == "" {
		description = "装备这只宠物后，会按照当前等级生效对应增益。"
	}
	return valueText, description
}

func BuildCompanionPetBuff(achievementKey string, level int) CompanionPetBuff {
	level = clampCompanionPetLevel(level)
	blueprint, ok := companionBuffBlueprints[achievementKey]
	if !ok {
		blueprint = buildDefaultCompanionBlueprint()
	}

	buff := CompanionPetBuff{
		Type:                       blueprint.BuffType,
		Name:                       blueprint.BuffName,
		DailyMissionBonusRate:      companionFloatAt(blueprint.DailyMissionBonusRates, level),
		DailyMissionExpBonusRate:   companionFloatAt(blueprint.DailyMissionExpBonusRates, level),
		AchievementRewardBonusRate: companionFloatAt(blueprint.AchievementRewardBonusRates, level),
		FeedExpBonusRate:           companionFloatAt(blueprint.FeedExpBonusRates, level),
		CheckinBonusQuota:          int64(math.Round(companionFloatAt(blueprint.CheckinBonusUSD, level) * common.QuotaPerUnit)),
		BlindBoxBonusQuota:         int64(math.Round(companionFloatAt(blueprint.BlindBoxBonusUSD, level) * common.QuotaPerUnit)),
		BlindBoxRewardRate:         companionFloatAt(blueprint.BlindBoxRewardRates, level),
		BlindBoxPityReduction:      companionIntAt(blueprint.BlindBoxPityReductions, level),
		BlindBoxPityGuaranteeUSD:   companionFloatAt(blueprint.BlindBoxPityGuaranteeUSD, level),
		UpgradeDiscountRate:        companionFloatAt(blueprint.UpgradeDiscountRates, level),
		ConsumptionDiscountRate:    companionFloatAt(blueprint.ConsumptionDiscountRates, level),
	}
	buff.ValueText, buff.Description = buildCompanionBuffTexts(buff)
	return buff
}

func getUserEquippedCompanionPetTx(tx *gorm.DB, userId int) (*UserCompanionPet, error) {
	if userId <= 0 {
		return nil, nil
	}
	if tx == nil {
		tx = DB
	}
	var pet UserCompanionPet
	err := tx.Where("user_id = ? AND equipped = ?", userId, true).
		Order("updated_at desc, id asc").
		First(&pet).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &pet, nil
}

func GetUserEquippedCompanionPet(userId int) (*UserCompanionPet, error) {
	return getUserEquippedCompanionPetTx(nil, userId)
}

func getUserCompanionAppliedBonusTx(tx *gorm.DB, userId int) (*CompanionAppliedBonus, error) {
	pet, err := getUserEquippedCompanionPetTx(tx, userId)
	if err != nil {
		return nil, err
	}
	if pet == nil {
		return nil, nil
	}
	level := clampCompanionPetLevel(pet.Level)
	return &CompanionAppliedBonus{
		Pet:            pet,
		Buff:           BuildCompanionPetBuff(pet.AchievementKey, level),
		EffectiveLevel: level,
	}, nil
}

func GetUserCompanionAppliedBonus(userId int) (*CompanionAppliedBonus, error) {
	return getUserCompanionAppliedBonusTx(nil, userId)
}
