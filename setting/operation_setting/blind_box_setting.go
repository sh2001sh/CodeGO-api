package operation_setting

import (
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/setting/config"
)

type BlindBoxTierSetting struct {
	Name        string  `json:"name"`
	MinUSD      float64 `json:"min_usd"`
	MaxUSD      float64 `json:"max_usd"`
	Probability float64 `json:"probability"`
	RewardType  string  `json:"reward_type,omitempty"`
	WalletType  string  `json:"wallet_type,omitempty"`
}

type BlindBoxSetting struct {
	Enabled                      bool                  `json:"enabled"`
	UnitPrice                    float64               `json:"unit_price"`
	ExpireDays                   int                   `json:"expire_days"`
	DailyLimit                   int                   `json:"daily_limit"`
	MonthlyLimit                 int                   `json:"monthly_limit"`
	DailyOpenLimit               int                   `json:"daily_open_limit"`
	FirstPurchaseGuaranteeUSD    float64               `json:"first_purchase_guarantee_usd"`
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
	FirstPurchaseGuaranteeUSD:    10,
	PityThreshold:                5,
	PityGuaranteeUSD:             10,
	LowRewardThresholdUSD:        5,
	SubscriptionPrizeProbability: 0.001,
	SubscriptionPlanTitle:        "Standard月卡",
	CountOptions:                 []int{1, 5, 10, 20, 50},
	Tiers: []BlindBoxTierSetting{
		{Name: "5 美元普通额度", MinUSD: 5.0, MaxUSD: 5.0, Probability: 0.10, RewardType: "quota", WalletType: "default"},
		{Name: "8 美元普通额度", MinUSD: 8.0, MaxUSD: 8.0, Probability: 0.16, RewardType: "quota", WalletType: "default"},
		{Name: "12 美元普通额度", MinUSD: 12.0, MaxUSD: 12.0, Probability: 0.18, RewardType: "quota", WalletType: "default"},
		{Name: "20 美元 Claude 额度", MinUSD: 20.0, MaxUSD: 20.0, Probability: 0.20, RewardType: "claude_quota", WalletType: "claude"},
		{Name: "30 美元 Claude 额度", MinUSD: 30.0, MaxUSD: 30.0, Probability: 0.14, RewardType: "claude_quota", WalletType: "claude"},
		{Name: "充值九折卡", MinUSD: 0, MaxUSD: 0, Probability: 0.08, RewardType: "prop"},
		{Name: "套餐九折卡", MinUSD: 0, MaxUSD: 0, Probability: 0.07, RewardType: "prop"},
		{Name: "0.95 倍率卡", MinUSD: 0, MaxUSD: 0, Probability: 0.04, RewardType: "prop"},
		{Name: "0.9 倍率卡", MinUSD: 0, MaxUSD: 0, Probability: 0.03, RewardType: "prop"},
		{Name: "免费调用次数卡（10 次）", MinUSD: 0, MaxUSD: 0, Probability: 0.02, RewardType: "prop"},
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

func normalizeBlindBoxWalletType(walletType string) string {
	switch strings.TrimSpace(walletType) {
	case "claude":
		return "claude"
	default:
		return "default"
	}
}

func normalizeBlindBoxTierSettings(tiers []BlindBoxTierSetting) []BlindBoxTierSetting {
	if len(tiers) == 0 {
		return defaultBlindBoxTiers()
	}
	result := make([]BlindBoxTierSetting, len(tiers))
	for i, tier := range tiers {
		result[i] = tier
		result[i].RewardType = NormalizeBlindBoxRewardType(tier.RewardType)
		result[i].WalletType = normalizeBlindBoxWalletType(tier.WalletType)
	}
	return result
}

func NormalizeBlindBoxRewardType(rewardType string) string {
	switch strings.TrimSpace(rewardType) {
	case "claude_quota":
		return "claude_quota"
	case "prop":
		return "prop"
	case "subscription":
		return "subscription"
	default:
		return "quota"
	}
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
	if settingCopy.FirstPurchaseGuaranteeUSD <= 0 {
		settingCopy.FirstPurchaseGuaranteeUSD = 10
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
	settingCopy.Tiers = normalizeBlindBoxTierSettings(settingCopy.Tiers)
	return settingCopy
}

func SetBlindBoxSetting(setting BlindBoxSetting) {
	blindBoxSetting = setting
}
