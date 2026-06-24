package model

import (
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"gorm.io/gorm"
)

const (
	SubscriptionClaudeConversionStatusCompleted = "completed"

	SubscriptionClaudeConversionEnabledOptionKey         = "SubscriptionClaudeConversionEnabled"
	SubscriptionClaudeConversionRatioNumeratorOptionKey  = "SubscriptionClaudeConversionRatioNumerator"
	SubscriptionClaudeConversionRatioDenominatorOptionKey = "SubscriptionClaudeConversionRatioDenominator"
	SubscriptionClaudeConversionExcludeDayPassOptionKey  = "SubscriptionClaudeConversionExcludeDayPass"
)

var (
	SubscriptionClaudeConversionEnabled        = true
	SubscriptionClaudeConversionRatioNumerator = 1
	SubscriptionClaudeConversionRatioDenominator = 10
	SubscriptionClaudeConversionExcludeDayPass = true

	ErrSubscriptionClaudeConversionDisabled      = errors.New("套餐转 Claude 额度未开启")
	ErrSubscriptionClaudeConversionInvalidAmount = errors.New("转换额度无效")
	ErrSubscriptionClaudeConversionNoTarget      = errors.New("当前订阅不可转换")
	ErrSubscriptionClaudeConversionInsufficient  = errors.New("套餐可转换额度不足")
	ErrSubscriptionClaudeConversionZeroResult    = errors.New("当前转换额度过小，无法得到 Claude 额度")
)

type SubscriptionClaudeConversion struct {
	Id                 int    `json:"id"`
	UserId             int    `json:"user_id" gorm:"index"`
	UserSubscriptionId int    `json:"user_subscription_id" gorm:"index"`
	RequestId          string `json:"request_id" gorm:"type:varchar(128);not null;uniqueIndex"`
	Status             string `json:"status" gorm:"type:varchar(32);not null;default:'completed'"`

	SourceQuota       int64 `json:"source_quota" gorm:"type:bigint;not null;default:0"`
	TargetClaudeQuota int   `json:"target_claude_quota" gorm:"type:int;not null;default:0"`

	RatioNumerator   int `json:"ratio_numerator" gorm:"type:int;not null;default:1"`
	RatioDenominator int `json:"ratio_denominator" gorm:"type:int;not null;default:10"`

	CreatedAt int64 `json:"created_at" gorm:"bigint"`
	UpdatedAt int64 `json:"updated_at" gorm:"bigint"`
}

func (c *SubscriptionClaudeConversion) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	c.CreatedAt = now
	c.UpdatedAt = now
	return nil
}

func (c *SubscriptionClaudeConversion) BeforeUpdate(tx *gorm.DB) error {
	c.UpdatedAt = common.GetTimestamp()
	return nil
}

type SubscriptionClaudeConversionConfig struct {
	Enabled         bool `json:"enabled"`
	RatioNumerator  int  `json:"ratio_numerator"`
	RatioDenominator int `json:"ratio_denominator"`
	ExcludeDayPass  bool `json:"exclude_day_pass"`
}

type SubscriptionClaudeConversionPreview struct {
	Eligible           bool  `json:"eligible"`
	MaxSourceQuota      int64 `json:"max_source_quota"`
	PreviewClaudeQuota  int   `json:"preview_claude_quota"`
}

type SubscriptionClaudeConversionResult struct {
	Conversion              *SubscriptionClaudeConversion       `json:"conversion"`
	SubscriptionId          int                                 `json:"subscription_id"`
	SourceQuota             int64                               `json:"source_quota"`
	TargetClaudeQuota       int                                 `json:"target_claude_quota"`
	ClaudeQuotaAfter        int                                 `json:"claude_quota_after"`
	AmountUsedAfter         int64                               `json:"amount_used_after"`
	PeriodUsedAfter         int64                               `json:"period_used_after"`
	Config                  SubscriptionClaudeConversionConfig  `json:"config"`
}

func GetSubscriptionClaudeConversionConfig() SubscriptionClaudeConversionConfig {
	numerator := SubscriptionClaudeConversionRatioNumerator
	denominator := SubscriptionClaudeConversionRatioDenominator
	if numerator <= 0 {
		numerator = 1
	}
	if denominator <= 0 {
		denominator = 10
	}
	return SubscriptionClaudeConversionConfig{
		Enabled:          SubscriptionClaudeConversionEnabled,
		RatioNumerator:   numerator,
		RatioDenominator: denominator,
		ExcludeDayPass:   SubscriptionClaudeConversionExcludeDayPass,
	}
}

func CalculateSubscriptionClaudeTargetQuota(sourceQuota int64) int {
	config := GetSubscriptionClaudeConversionConfig()
	if sourceQuota <= 0 || config.RatioNumerator <= 0 || config.RatioDenominator <= 0 {
		return 0
	}
	value := float64(sourceQuota) * float64(config.RatioNumerator) / float64(config.RatioDenominator)
	return int(math.Floor(value))
}

func subscriptionClaudeMaxConvertibleQuota(plan *SubscriptionPlan, sub *UserSubscription, now int64) int64 {
	if plan == nil || sub == nil {
		return 0
	}
	if now <= 0 {
		now = common.GetTimestamp()
	}
	if sub.Status != "active" || sub.EndTime <= now {
		return 0
	}
	if GetSubscriptionClaudeConversionConfig().ExcludeDayPass && IsSubscriptionDayPassPlan(plan) {
		return 0
	}
	totalRemain := int64(0)
	if sub.AmountTotal > 0 {
		totalRemain = sub.AmountTotal - sub.AmountUsed
		if totalRemain < 0 {
			totalRemain = 0
		}
	}
	if sub.AmountTotal == 0 {
		return 0
	}
	maxConvertible := totalRemain
	periodAmount := getSubscriptionPeriodAmount(plan, sub)
	if !usesLegacyPeriodicQuota(plan, sub) && periodAmount > 0 {
		periodRemain := periodAmount - sub.PeriodUsed
		if periodRemain < 0 {
			periodRemain = 0
		}
		if maxConvertible == 0 || periodRemain < maxConvertible {
			maxConvertible = periodRemain
		}
	}
	if maxConvertible < 0 {
		return 0
	}
	return maxConvertible
}

func BuildSubscriptionClaudeConversionPreview(plan *SubscriptionPlan, sub *UserSubscription) SubscriptionClaudeConversionPreview {
	maxSourceQuota := subscriptionClaudeMaxConvertibleQuota(plan, sub, common.GetTimestamp())
	return SubscriptionClaudeConversionPreview{
		Eligible:          maxSourceQuota > 0,
		MaxSourceQuota:    maxSourceQuota,
		PreviewClaudeQuota: CalculateSubscriptionClaudeTargetQuota(maxSourceQuota),
	}
}

func ListRecentSubscriptionClaudeConversions(userId int, limit int) ([]SubscriptionClaudeConversion, error) {
	if userId <= 0 {
		return []SubscriptionClaudeConversion{}, nil
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	var items []SubscriptionClaudeConversion
	err := DB.Where("user_id = ?", userId).Order("id desc").Limit(limit).Find(&items).Error
	return items, err
}

func ConvertSubscriptionQuotaToClaudeQuota(requestId string, userId int, subscriptionId int, sourceQuota int64) (*SubscriptionClaudeConversionResult, error) {
	if !GetSubscriptionClaudeConversionConfig().Enabled {
		return nil, ErrSubscriptionClaudeConversionDisabled
	}
	if userId <= 0 || subscriptionId <= 0 {
		return nil, ErrSubscriptionClaudeConversionNoTarget
	}
	if strings.TrimSpace(requestId) == "" || sourceQuota <= 0 {
		return nil, ErrSubscriptionClaudeConversionInvalidAmount
	}

	result := &SubscriptionClaudeConversionResult{
		SubscriptionId: subscriptionId,
		SourceQuota:    sourceQuota,
		Config:         GetSubscriptionClaudeConversionConfig(),
	}

	err := DB.Transaction(func(tx *gorm.DB) error {
		now := common.GetTimestamp()
		var existing SubscriptionClaudeConversion
		if err := tx.Where("request_id = ?", requestId).First(&existing).Error; err == nil {
			if existing.UserId != userId || existing.UserSubscriptionId != subscriptionId {
				return ErrSubscriptionClaudeConversionInvalidAmount
			}
			var sub UserSubscription
			if err := tx.Where("id = ?", existing.UserSubscriptionId).First(&sub).Error; err != nil {
				return err
			}
			claudeQuotaAfter, err := getSubscriptionClaudeQuotaTx(tx, userId)
			if err != nil {
				return err
			}
			result.Conversion = &existing
			result.TargetClaudeQuota = existing.TargetClaudeQuota
			result.ClaudeQuotaAfter = claudeQuotaAfter
			result.AmountUsedAfter = sub.AmountUsed
			result.PeriodUsedAfter = sub.PeriodUsed
			return nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		var sub UserSubscription
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("id = ? AND user_id = ?", subscriptionId, userId).
			First(&sub).Error; err != nil {
			return ErrSubscriptionClaudeConversionNoTarget
		}

		plan, err := getSubscriptionPlanByIdTx(tx, sub.PlanId)
		if err != nil || plan == nil {
			return ErrSubscriptionClaudeConversionNoTarget
		}
		if sub.Status != "active" || sub.EndTime <= now {
			return ErrSubscriptionClaudeConversionNoTarget
		}
		if GetSubscriptionClaudeConversionConfig().ExcludeDayPass && IsSubscriptionDayPassPlan(plan) {
			return ErrSubscriptionClaudeConversionNoTarget
		}
		if err := maybeResetUserSubscriptionWithPlanTx(tx, &sub, plan, now); err != nil {
			return err
		}

		maxConvertible := subscriptionClaudeMaxConvertibleQuota(plan, &sub, now)
		if maxConvertible <= 0 {
			return ErrSubscriptionClaudeConversionInsufficient
		}
		if sourceQuota > maxConvertible {
			return ErrSubscriptionClaudeConversionInsufficient
		}

		targetClaudeQuota := CalculateSubscriptionClaudeTargetQuota(sourceQuota)
		if targetClaudeQuota <= 0 {
			return ErrSubscriptionClaudeConversionZeroResult
		}
		if err := applySubscriptionUsageDelta(plan, &sub, "", sourceQuota); err != nil {
			return ErrSubscriptionClaudeConversionInsufficient
		}
		if err := tx.Save(&sub).Error; err != nil {
			return err
		}
		if err := tx.Model(&User{}).
			Where("id = ?", userId).
			Update("claude_quota", gorm.Expr("claude_quota + ?", targetClaudeQuota)).Error; err != nil {
			return err
		}
		_ = cacheIncrUserClaudeQuota(userId, int64(targetClaudeQuota))

		record := &SubscriptionClaudeConversion{
			UserId:              userId,
			UserSubscriptionId:  sub.Id,
			RequestId:           strings.TrimSpace(requestId),
			Status:              SubscriptionClaudeConversionStatusCompleted,
			SourceQuota:         sourceQuota,
			TargetClaudeQuota:   targetClaudeQuota,
			RatioNumerator:      result.Config.RatioNumerator,
			RatioDenominator:    result.Config.RatioDenominator,
		}
		if err := tx.Create(record).Error; err != nil {
			return err
		}

		claudeQuotaAfter, err := getSubscriptionClaudeQuotaTx(tx, userId)
		if err != nil {
			return err
		}

		result.Conversion = record
		result.TargetClaudeQuota = targetClaudeQuota
		result.ClaudeQuotaAfter = claudeQuotaAfter
		result.AmountUsedAfter = sub.AmountUsed
		result.PeriodUsedAfter = sub.PeriodUsed
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func getSubscriptionClaudeQuotaTx(tx *gorm.DB, userId int) (int, error) {
	var quota int
	err := tx.Model(&User{}).Where("id = ?", userId).Select("claude_quota").Find(&quota).Error
	if err != nil {
		return 0, err
	}
	return quota, nil
}

func BuildSubscriptionClaudeConversionLog(planTitle string, sourceQuota int64, targetQuota int) string {
	return fmt.Sprintf("套餐额度转 Claude 成功，套餐：%s，扣减套餐额度：%s，到账 Claude 额度：%s", planTitle, logger.LogQuota(int(sourceQuota)), logger.LogQuota(targetQuota))
}
