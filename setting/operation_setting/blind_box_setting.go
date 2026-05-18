package operation_setting

import (
	"sort"

	"github.com/QuantumNous/new-api/setting/config"
)

type BlindBoxTierSetting struct {
	Name        string  `json:"name"`
	MinUSD      float64 `json:"min_usd"`
	MaxUSD      float64 `json:"max_usd"`
	Probability float64 `json:"probability"`
}

type BlindBoxSetting struct {
	Enabled                      bool                  `json:"enabled"`
	UnitPrice                    float64               `json:"unit_price"`
	ExpireDays                   int                   `json:"expire_days"`
	DailyLimit                   int                   `json:"daily_limit"`
	MonthlyLimit                 int                   `json:"monthly_limit"`
	DailyOpenLimit               int                   `json:"daily_open_limit"`
	PityThreshold                int                   `json:"pity_threshold"`
	PityGuaranteeUSD             float64               `json:"pity_guarantee_usd"`
	LowRewardThresholdUSD        float64               `json:"low_reward_threshold_usd"`
	SubscriptionPrizeProbability float64               `json:"subscription_prize_probability"`
	SubscriptionPlanTitle        string                `json:"subscription_plan_title"`
	CountOptions                 []int                 `json:"count_options"`
	Tiers                        []BlindBoxTierSetting `json:"tiers"`
}

var blindBoxSetting = BlindBoxSetting{
	Enabled:                      false,
	UnitPrice:                    2.5,
	ExpireDays:                   7,
	DailyLimit:                   50,
	MonthlyLimit:                 500,
	DailyOpenLimit:               5000,
	PityThreshold:                5,
	PityGuaranteeUSD:             10,
	LowRewardThresholdUSD:        5,
	SubscriptionPrizeProbability: 0.003,
	SubscriptionPlanTitle:        "Standard月卡",
	CountOptions:                 []int{1, 5, 10, 20, 50},
	Tiers: []BlindBoxTierSetting{
		{Name: "starter", MinUSD: 1, MaxUSD: 3, Probability: 0.18},
		{Name: "steady", MinUSD: 4, MaxUSD: 7, Probability: 0.30},
		{Name: "core", MinUSD: 8, MaxUSD: 12, Probability: 0.31},
		{Name: "boost", MinUSD: 13, MaxUSD: 20, Probability: 0.15},
		{Name: "lucky", MinUSD: 21, MaxUSD: 50, Probability: 0.057},
	},
}

func init() {
	config.GlobalConfig.Register("blind_box_setting", &blindBoxSetting)
}

func normalizeBlindBoxCountOptions(options []int) []int {
	if len(options) == 0 {
		return []int{1, 5, 10, 20, 50}
	}
	seen := make(map[int]struct{}, len(options))
	result := make([]int, 0, len(options))
	for _, option := range options {
		if option <= 0 {
			continue
		}
		if _, ok := seen[option]; ok {
			continue
		}
		seen[option] = struct{}{}
		result = append(result, option)
	}
	if len(result) == 0 {
		return []int{1, 5, 10, 20, 50}
	}
	sort.Ints(result)
	return result
}

func defaultBlindBoxTiers() []BlindBoxTierSetting {
	copied := make([]BlindBoxTierSetting, len(blindBoxSetting.Tiers))
	copy(copied, blindBoxSetting.Tiers)
	return copied
}

func GetBlindBoxSetting() BlindBoxSetting {
	settingCopy := blindBoxSetting
	if settingCopy.UnitPrice <= 0 {
		settingCopy.UnitPrice = 2.5
	}
	if settingCopy.ExpireDays <= 0 {
		settingCopy.ExpireDays = 7
	}
	if settingCopy.DailyLimit <= 0 {
		settingCopy.DailyLimit = 50
	}
	if settingCopy.MonthlyLimit <= 0 {
		settingCopy.MonthlyLimit = 500
	}
	if settingCopy.DailyOpenLimit <= 0 {
		settingCopy.DailyOpenLimit = 5000
	}
	if settingCopy.PityThreshold <= 0 {
		settingCopy.PityThreshold = 5
	}
	if settingCopy.PityGuaranteeUSD <= 0 {
		settingCopy.PityGuaranteeUSD = 10
	}
	if settingCopy.LowRewardThresholdUSD <= 0 {
		settingCopy.LowRewardThresholdUSD = 5
	}
	if settingCopy.SubscriptionPrizeProbability < 0 {
		settingCopy.SubscriptionPrizeProbability = 0
	}
	if settingCopy.SubscriptionPrizeProbability > 1 {
		settingCopy.SubscriptionPrizeProbability = 1
	}
	if settingCopy.SubscriptionPlanTitle == "" {
		settingCopy.SubscriptionPlanTitle = "Standard月卡"
	}
	settingCopy.CountOptions = normalizeBlindBoxCountOptions(settingCopy.CountOptions)
	if len(settingCopy.Tiers) == 0 {
		settingCopy.Tiers = defaultBlindBoxTiers()
	}
	return settingCopy
}
