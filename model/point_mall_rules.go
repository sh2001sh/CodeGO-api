package model

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
)

const PointMallRulesOptionKey = "PointMallRules"

type PointMallRulesConfig struct {
	BonusQuotaPerPointUSD       int64            `json:"bonus_quota_per_point_usd"`
	MonthlyBonusConvertLimitUSD int64            `json:"monthly_bonus_convert_limit_usd"`
	PackagePurchasePoints       map[string]int64 `json:"package_purchase_points"`
	JDCardDailyLimit            int              `json:"jd_card_daily_limit"`
	JDCardMonthlyFaceLimit      int64            `json:"jd_card_monthly_face_limit"`
	NewUserJDCardLockDays       int              `json:"new_user_jd_card_lock_days"`
}

func DefaultPointMallRulesConfig() PointMallRulesConfig {
	return PointMallRulesConfig{
		BonusQuotaPerPointUSD:       PointMallBonusQuotaPerPointUSD,
		MonthlyBonusConvertLimitUSD: PointMallMonthlyBonusConvertLimitUSD,
		PackagePurchasePoints: map[string]int64{
			"Lite":     10,
			"Standard": 18,
			"Pro":      30,
			"Ultra":    60,
		},
		JDCardDailyLimit:       1,
		JDCardMonthlyFaceLimit: 100,
		NewUserJDCardLockDays:  0,
	}
}

func GetPointMallRulesConfig() PointMallRulesConfig {
	cfg := DefaultPointMallRulesConfig()
	common.OptionMapRWMutex.RLock()
	raw := common.OptionMap[PointMallRulesOptionKey]
	common.OptionMapRWMutex.RUnlock()
	if strings.TrimSpace(raw) == "" {
		return cfg
	}
	var stored PointMallRulesConfig
	if err := common.UnmarshalJsonStr(raw, &stored); err != nil {
		return cfg
	}
	return normalizePointMallRulesConfig(stored)
}

func UpdatePointMallRulesConfig(input PointMallRulesConfig) (PointMallRulesConfig, error) {
	cfg := normalizePointMallRulesConfig(input)
	raw, err := common.Marshal(cfg)
	if err != nil {
		return cfg, err
	}
	return cfg, UpdateOption(PointMallRulesOptionKey, string(raw))
}

func normalizePointMallRulesConfig(input PointMallRulesConfig) PointMallRulesConfig {
	defaults := DefaultPointMallRulesConfig()
	if input.BonusQuotaPerPointUSD <= 0 {
		input.BonusQuotaPerPointUSD = defaults.BonusQuotaPerPointUSD
	}
	if input.MonthlyBonusConvertLimitUSD <= 0 {
		input.MonthlyBonusConvertLimitUSD = defaults.MonthlyBonusConvertLimitUSD
	}
	if input.PackagePurchasePoints == nil {
		input.PackagePurchasePoints = defaults.PackagePurchasePoints
	}
	delete(input.PackagePurchasePoints, "DayPass50")
	delete(input.PackagePurchasePoints, "DayPass100")
	for key, value := range defaults.PackagePurchasePoints {
		if input.PackagePurchasePoints[key] <= 0 {
			input.PackagePurchasePoints[key] = value
		}
	}
	if input.JDCardDailyLimit <= 0 {
		input.JDCardDailyLimit = defaults.JDCardDailyLimit
	}
	if input.JDCardMonthlyFaceLimit <= 0 {
		input.JDCardMonthlyFaceLimit = defaults.JDCardMonthlyFaceLimit
	}
	if input.NewUserJDCardLockDays <= 0 {
		input.NewUserJDCardLockDays = defaults.NewUserJDCardLockDays
	}
	return input
}
