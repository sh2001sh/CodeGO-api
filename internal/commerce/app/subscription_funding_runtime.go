package app

import (
	"errors"
	"fmt"
	commercedomain "github.com/sh2001sh/new-api/internal/commerce/domain"
	commerceschema "github.com/sh2001sh/new-api/internal/commerce/schema"
	"strings"

	commercestore "github.com/sh2001sh/new-api/internal/commerce/store"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"gorm.io/gorm"
)

// PreConsumeUserSubscription pre-consumes quota from an active subscription.
func PreConsumeUserSubscription(requestID string, userID int, modelName string, amount int64) (*commercedomain.SubscriptionPreConsumeResult, error) {
	if userID <= 0 {
		return nil, errors.New("invalid userId")
	}
	if strings.TrimSpace(requestID) == "" {
		return nil, errors.New("requestId is empty")
	}
	if amount <= 0 {
		return nil, errors.New("amount must be > 0")
	}

	now := commercestore.GetDBTimestamp()
	result := &commercedomain.SubscriptionPreConsumeResult{}
	err := platformdb.DB.Transaction(func(tx *gorm.DB) error {
		record := &commerceschema.SubscriptionPreConsumeRecord{}
		query := tx.Where("request_id = ?", requestID).Limit(1).Find(record)
		if query.Error != nil {
			return query.Error
		}
		if query.RowsAffected > 0 {
			if record.Status == "refunded" {
				return errors.New("subscription pre-consume already refunded")
			}
			sub := &commerceschema.UserSubscription{}
			if err := tx.Where("id = ?", record.UserSubscriptionId).First(sub).Error; err != nil {
				return err
			}
			result.UserSubscriptionId = sub.Id
			result.PreConsumed = record.PreConsumed
			result.AmountTotal = sub.AmountTotal
			result.AmountUsedBefore = sub.AmountUsed
			result.AmountUsedAfter = sub.AmountUsed
			return nil
		}

		var subs []commerceschema.UserSubscription
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("user_id = ? AND status = ? AND end_time > ?", userID, "active", now).
			Order("end_time asc, id asc").
			Find(&subs).Error; err != nil {
			return errors.New("no active subscription")
		}
		if len(subs) == 0 {
			return errors.New("no active subscription")
		}

		ordered, err := orderActiveUserSubscriptionsTx(tx, userID, subs)
		if err != nil {
			return err
		}
		for _, candidate := range ordered {
			sub := candidate
			plan, err := getSubscriptionPlanRecordTx(tx, sub.PlanId)
			if err != nil {
				return err
			}
			if err := maybeResetUserSubscriptionWithPlanTx(tx, &sub, plan, now); err != nil {
				return err
			}

			usedBefore := sub.AmountUsed
			if sub.AmountTotal > 0 {
				remain := sub.AmountTotal - usedBefore
				if remain < amount {
					continue
				}
			}

			periodAmount := getSubscriptionPeriodAmount(plan, &sub)
			if !usesLegacySubscriptionPeriodicQuota(plan, &sub) && periodAmount > 0 {
				periodRemain := periodAmount - sub.PeriodUsed
				if periodRemain < amount {
					continue
				}
			}

			trimmedModelName := strings.TrimSpace(modelName)
			if trimmedModelName != "" {
				modelLimits := sub.GetModelLimitsMap()
				if modelLimit, ok := modelLimits[trimmedModelName]; ok && modelLimit > 0 {
					modelUsage := sub.GetModelUsageMap()
					if modelUsage[trimmedModelName]+amount > modelLimit {
						continue
					}
				}
			}

			record = &commerceschema.SubscriptionPreConsumeRecord{
				RequestId:          requestID,
				UserId:             userID,
				UserSubscriptionId: sub.Id,
				ModelName:          trimmedModelName,
				PreConsumed:        amount,
				Status:             "consumed",
			}
			if err := tx.Create(record).Error; err != nil {
				dup := &commerceschema.SubscriptionPreConsumeRecord{}
				if err2 := tx.Where("request_id = ?", requestID).First(dup).Error; err2 == nil {
					if dup.Status == "refunded" {
						return errors.New("subscription pre-consume already refunded")
					}
					result.UserSubscriptionId = sub.Id
					result.PreConsumed = dup.PreConsumed
					result.AmountTotal = sub.AmountTotal
					result.AmountUsedBefore = sub.AmountUsed
					result.AmountUsedAfter = sub.AmountUsed
					return nil
				}
				return err
			}

			if err := applySubscriptionUsageDelta(plan, &sub, record.ModelName, amount); err != nil {
				return err
			}
			if err := tx.Save(&sub).Error; err != nil {
				return err
			}

			result.UserSubscriptionId = sub.Id
			result.PreConsumed = amount
			result.AmountTotal = sub.AmountTotal
			result.AmountUsedBefore = usedBefore
			result.AmountUsedAfter = sub.AmountUsed
			return nil
		}
		return fmt.Errorf("subscription quota insufficient, need=%d", amount)
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// RefundSubscriptionPreConsume refunds a previous subscription pre-consume idempotently.
func RefundSubscriptionPreConsume(requestID string) error {
	if strings.TrimSpace(requestID) == "" {
		return errors.New("requestId is empty")
	}

	return platformdb.DB.Transaction(func(tx *gorm.DB) error {
		record := &commerceschema.SubscriptionPreConsumeRecord{}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("request_id = ?", requestID).
			First(record).Error; err != nil {
			return err
		}
		if record.Status == "refunded" {
			return nil
		}
		if record.PreConsumed <= 0 {
			record.Status = "refunded"
			return tx.Save(record).Error
		}
		if err := postConsumeUserSubscriptionUsageDeltaTx(tx, record.UserSubscriptionId, record.ModelName, -record.PreConsumed); err != nil {
			return err
		}
		record.Status = "refunded"
		return tx.Save(record).Error
	})
}

// PostConsumeUserSubscriptionDelta updates total subscription usage without model-specific usage.
func PostConsumeUserSubscriptionDelta(userSubscriptionID int, delta int64) error {
	return PostConsumeUserSubscriptionUsageDelta(userSubscriptionID, "", delta)
}

// PostConsumeUserSubscriptionUsageDelta applies a usage delta to a subscription.
func PostConsumeUserSubscriptionUsageDelta(userSubscriptionID int, modelName string, delta int64) error {
	if userSubscriptionID <= 0 {
		return errors.New("invalid userSubscriptionId")
	}
	if delta == 0 {
		return nil
	}
	return platformdb.DB.Transaction(func(tx *gorm.DB) error {
		return postConsumeUserSubscriptionUsageDeltaTx(tx, userSubscriptionID, modelName, delta)
	})
}

func postConsumeUserSubscriptionUsageDeltaTx(tx *gorm.DB, userSubscriptionID int, modelName string, delta int64) error {
	if tx == nil {
		return errors.New("tx is nil")
	}
	sub := &commerceschema.UserSubscription{}
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("id = ?", userSubscriptionID).
		First(sub).Error; err != nil {
		return err
	}
	plan, err := getSubscriptionPlanRecordTx(tx, sub.PlanId)
	if err != nil {
		return err
	}
	if err := applySubscriptionUsageDelta(plan, sub, modelName, delta); err != nil {
		return err
	}
	return tx.Save(sub).Error
}
