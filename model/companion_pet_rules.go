package model

import (
	"fmt"
	"math"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const CompanionPetMaxLevel = 5

type CompanionPetBuff struct {
	Type                 string  `json:"type"`
	Name                 string  `json:"name"`
	Description          string  `json:"description"`
	ValueText            string  `json:"value_text"`
	DailyMissionBonusRate float64 `json:"daily_mission_bonus_rate"`
	CheckinBonusQuota    int64   `json:"checkin_bonus_quota"`
	BlindBoxPityReduction int    `json:"blind_box_pity_reduction"`
	UpgradeDiscountRate  float64 `json:"upgrade_discount_rate"`
}

type CompanionAppliedBonus struct {
	Pet            *UserCompanionPet
	Buff           CompanionPetBuff
	EffectiveLevel int
}

type companionPetArchetype struct {
	BuffType string
	BuffName string
}

var companionPetArchetypes = map[string]companionPetArchetype{
	"first-call":        {BuffType: "daily_bonus_rate", BuffName: "日常补给加成"},
	"ten-calls":         {BuffType: "daily_bonus_rate", BuffName: "任务推进加成"},
	"hundred-calls":     {BuffType: "daily_bonus_rate", BuffName: "调用回响加成"},
	"thousand-calls":    {BuffType: "upgrade_discount_rate", BuffName: "进化折扣"},
	"quota-scout":       {BuffType: "upgrade_discount_rate", BuffName: "轻量进化折扣"},
	"quota-smith":       {BuffType: "upgrade_discount_rate", BuffName: "锻造折扣"},
	"thousand-forge":    {BuffType: "upgrade_discount_rate", BuffName: "重铸折扣"},
	"contract-power":    {BuffType: "daily_bonus_rate", BuffName: "契约补给加成"},
	"plan-collector":    {BuffType: "daily_bonus_rate", BuffName: "套餐任务加成"},
	"blind-box-rookie":  {BuffType: "blind_box_pity_reduction", BuffName: "盲盒保底推进"},
	"blind-box-regular": {BuffType: "blind_box_pity_reduction", BuffName: "盲盒保底推进"},
	"lucky-star":        {BuffType: "blind_box_pity_reduction", BuffName: "幸运保底推进"},
	"social-crafter":    {BuffType: "checkin_bonus_quota", BuffName: "签到补给"},
	"community-core":    {BuffType: "checkin_bonus_quota", BuffName: "社群签到补给"},
	"seven-day-streak":  {BuffType: "checkin_bonus_quota", BuffName: "连续签到补给"},
	"month-streak":      {BuffType: "checkin_bonus_quota", BuffName: "满月签到补给"},
}

var companionPetLevelThresholds = map[int]int64{
	1: 0,
	2: 40,
	3: 130,
	4: 310,
	5: 630,
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

func CompanionPetCurrentLevelThreshold(level int) int64 {
	return companionPetLevelThresholds[clampCompanionPetLevel(level)]
}

func CompanionPetNextLevelThreshold(level int) int64 {
	if level >= CompanionPetMaxLevel {
		return companionPetLevelThresholds[CompanionPetMaxLevel]
	}
	return companionPetLevelThresholds[level+1]
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
	if discountRate < 0 {
		discountRate = 0
	}
	if discountRate > 0.8 {
		discountRate = 0.8
	}
	finalUSD := baseUSD * (1 - discountRate)
	return int64(math.Round(finalUSD * common.QuotaPerUnit))
}

func CompanionPetUpgradeCostUSDValue(level int, discountRate float64) float64 {
	return float64(CompanionPetUpgradeCostQuota(level, discountRate)) / common.QuotaPerUnit
}

func BuildCompanionPetBuff(achievementKey string, level int) CompanionPetBuff {
	level = clampCompanionPetLevel(level)
	archetype, ok := companionPetArchetypes[achievementKey]
	if !ok {
		archetype = companionPetArchetype{
			BuffType: "daily_bonus_rate",
			BuffName: "日常补给加成",
		}
	}

	buff := CompanionPetBuff{
		Type: archetype.BuffType,
		Name: archetype.BuffName,
	}

	switch archetype.BuffType {
	case "daily_bonus_rate":
		rates := []float64{0, 0.03, 0.05, 0.08, 0.12, 0.18}
		buff.DailyMissionBonusRate = rates[level]
		buff.ValueText = fmt.Sprintf("+%d%%", int(math.Round(buff.DailyMissionBonusRate*100)))
		buff.Description = "完成每日任务时，额外获得同倍率的额度奖励。"
	case "checkin_bonus_quota":
		bonusUSD := []float64{0, 0.05, 0.10, 0.15, 0.22, 0.30}
		quota := int64(math.Round(bonusUSD[level] * common.QuotaPerUnit))
		buff.CheckinBonusQuota = quota
		buff.ValueText = fmt.Sprintf("+%.2f 美元", bonusUSD[level])
		buff.Description = "每日签到时，额外获得一份固定补给额度。"
	case "blind_box_pity_reduction":
		reductions := []int{0, 0, 1, 1, 2, 2}
		buff.BlindBoxPityReduction = reductions[level]
		if buff.BlindBoxPityReduction <= 0 {
			buff.ValueText = "已准备"
		} else {
			buff.ValueText = fmt.Sprintf("保底-%d 次", buff.BlindBoxPityReduction)
		}
		buff.Description = "降低盲盒保底所需的连续低奖励次数。"
	case "upgrade_discount_rate":
		rates := []float64{0, 0.02, 0.04, 0.07, 0.10, 0.15}
		buff.UpgradeDiscountRate = rates[level]
		buff.ValueText = fmt.Sprintf("-%d%%", int(math.Round(buff.UpgradeDiscountRate*100)))
		buff.Description = "手动升级宠物时，减少本次进化消耗的额度。"
	default:
		buff.Type = "daily_bonus_rate"
		buff.Name = "日常补给加成"
		buff.DailyMissionBonusRate = 0.03
		buff.ValueText = "+3%"
		buff.Description = "完成每日任务时，额外获得少量额度奖励。"
	}

	return buff
}

func GetUserEquippedCompanionPet(userId int) (*UserCompanionPet, error) {
	if userId <= 0 {
		return nil, nil
	}
	var pet UserCompanionPet
	err := DB.Where("user_id = ? AND equipped = ?", userId, true).
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

func GetUserCompanionAppliedBonus(userId int) (*CompanionAppliedBonus, error) {
	pet, err := GetUserEquippedCompanionPet(userId)
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
