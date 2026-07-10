package domain

import commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"

const CompanionPetMaxLevel = 5

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
	Pet            *commerceschema.UserCompanionPet
	Buff           CompanionPetBuff
	EffectiveLevel int
}

var companionPetLevelThresholds = map[int]int64{1: 0, 2: 60, 3: 180, 4: 420, 5: 820}

func companionPetLevelForExperience(experience int64) int {
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
