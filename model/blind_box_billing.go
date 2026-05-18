package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

type BlindBoxPreConsumeResult struct {
	PreConsumed int64
	Allocations []BlindBoxCreditAllocation
}

func decodeBlindBoxAllocations(raw string) ([]BlindBoxCreditAllocation, error) {
	if strings.TrimSpace(raw) == "" {
		return []BlindBoxCreditAllocation{}, nil
	}
	var allocations []BlindBoxCreditAllocation
	if err := common.UnmarshalJsonStr(raw, &allocations); err != nil {
		return nil, err
	}
	return allocations, nil
}

func encodeBlindBoxAllocations(allocations []BlindBoxCreditAllocation) (string, error) {
	if len(allocations) == 0 {
		return "", nil
	}
	raw, err := common.Marshal(allocations)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func preConsumeBlindBoxCreditsTx(tx *gorm.DB, userId int, amount int64) ([]BlindBoxCreditAllocation, error) {
	if amount <= 0 {
		return []BlindBoxCreditAllocation{}, nil
	}
	now := common.GetTimestamp()
	var credits []BlindBoxCredit
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("user_id = ? AND remaining_amount > 0 AND expires_at > ?", userId, now).
		Order("expires_at asc, id asc").
		Find(&credits).Error; err != nil {
		return nil, err
	}
	remaining := amount
	allocations := make([]BlindBoxCreditAllocation, 0, len(credits))
	for _, credit := range credits {
		if remaining <= 0 {
			break
		}
		consume := credit.RemainingAmount
		if consume > remaining {
			consume = remaining
		}
		credit.RemainingAmount -= consume
		if credit.RemainingAmount <= 0 {
			credit.RemainingAmount = 0
			credit.Status = BlindBoxCreditStatusExhausted
		}
		if err := tx.Save(&credit).Error; err != nil {
			return nil, err
		}
		allocations = append(allocations, BlindBoxCreditAllocation{
			CreditId: credit.Id,
			Amount:   consume,
		})
		remaining -= consume
	}
	if remaining > 0 {
		return nil, fmt.Errorf("%w, need=%d", ErrBlindBoxInsufficientQuota, amount)
	}
	return allocations, nil
}

func refundBlindBoxAllocationsTx(tx *gorm.DB, allocations []BlindBoxCreditAllocation) error {
	for i := len(allocations) - 1; i >= 0; i-- {
		allocation := allocations[i]
		if allocation.Amount <= 0 || allocation.CreditId <= 0 {
			continue
		}
		var credit BlindBoxCredit
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("id = ?", allocation.CreditId).
			First(&credit).Error; err != nil {
			return err
		}
		credit.RemainingAmount += allocation.Amount
		if credit.RemainingAmount > 0 {
			credit.Status = BlindBoxCreditStatusActive
		}
		if credit.RemainingAmount > credit.OriginalAmount {
			credit.RemainingAmount = credit.OriginalAmount
		}
		if err := tx.Save(&credit).Error; err != nil {
			return err
		}
	}
	return nil
}

func PreConsumeBlindBoxCredits(requestId string, userId int, amount int64) (*BlindBoxPreConsumeResult, error) {
	if userId <= 0 {
		return nil, errors.New("invalid userId")
	}
	if strings.TrimSpace(requestId) == "" {
		return nil, errors.New("requestId is empty")
	}
	if amount <= 0 {
		return nil, errors.New("amount must be > 0")
	}
	result := &BlindBoxPreConsumeResult{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		var existing BlindBoxPreConsumeRecord
		query := tx.Where("request_id = ?", requestId).Limit(1).Find(&existing)
		if query.Error != nil {
			return query.Error
		}
		if query.RowsAffected > 0 {
			if existing.Status == BlindBoxPreConsumeStatusRefunded {
				return errors.New("blind box pre-consume already refunded")
			}
			allocations, err := decodeBlindBoxAllocations(existing.Allocations)
			if err != nil {
				return err
			}
			result.PreConsumed = existing.PreConsumed
			result.Allocations = allocations
			return nil
		}
		allocations, err := preConsumeBlindBoxCreditsTx(tx, userId, amount)
		if err != nil {
			return err
		}
		raw, err := encodeBlindBoxAllocations(allocations)
		if err != nil {
			return err
		}
		record := BlindBoxPreConsumeRecord{
			RequestId:   requestId,
			UserId:      userId,
			Allocations: raw,
			PreConsumed: amount,
			Status:      BlindBoxPreConsumeStatusConsumed,
		}
		if err := tx.Create(&record).Error; err != nil {
			return err
		}
		result.PreConsumed = amount
		result.Allocations = allocations
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func PostConsumeBlindBoxPreConsumeDelta(requestId string, delta int64) error {
	if strings.TrimSpace(requestId) == "" {
		return errors.New("requestId is empty")
	}
	if delta == 0 {
		return nil
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var record BlindBoxPreConsumeRecord
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("request_id = ?", requestId).
			First(&record).Error; err != nil {
			return err
		}
		if record.Status == BlindBoxPreConsumeStatusRefunded {
			return errors.New("blind box pre-consume already refunded")
		}
		allocations, err := decodeBlindBoxAllocations(record.Allocations)
		if err != nil {
			return err
		}
		if delta > 0 {
			extra, err := preConsumeBlindBoxCreditsTx(tx, record.UserId, delta)
			if err != nil {
				return err
			}
			allocations = append(allocations, extra...)
			record.PreConsumed += delta
		} else {
			refundAmount := -delta
			if refundAmount > record.PreConsumed {
				refundAmount = record.PreConsumed
			}
			refunded := int64(0)
			for i := len(allocations) - 1; i >= 0 && refunded < refundAmount; i-- {
				available := allocations[i].Amount
				need := refundAmount - refunded
				if available > need {
					available = need
				}
				if err := refundBlindBoxAllocationsTx(tx, []BlindBoxCreditAllocation{{
					CreditId: allocations[i].CreditId,
					Amount:   available,
				}}); err != nil {
					return err
				}
				allocations[i].Amount -= available
				refunded += available
			}
			next := make([]BlindBoxCreditAllocation, 0, len(allocations))
			for _, allocation := range allocations {
				if allocation.Amount > 0 {
					next = append(next, allocation)
				}
			}
			allocations = next
			record.PreConsumed -= refunded
		}
		raw, err := encodeBlindBoxAllocations(allocations)
		if err != nil {
			return err
		}
		record.Allocations = raw
		if record.PreConsumed <= 0 {
			record.PreConsumed = 0
		}
		return tx.Save(&record).Error
	})
}

func RefundBlindBoxPreConsume(requestId string) error {
	if strings.TrimSpace(requestId) == "" {
		return errors.New("requestId is empty")
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var record BlindBoxPreConsumeRecord
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("request_id = ?", requestId).
			First(&record).Error; err != nil {
			return err
		}
		if record.Status == BlindBoxPreConsumeStatusRefunded {
			return nil
		}
		allocations, err := decodeBlindBoxAllocations(record.Allocations)
		if err != nil {
			return err
		}
		if err := refundBlindBoxAllocationsTx(tx, allocations); err != nil {
			return err
		}
		record.Status = BlindBoxPreConsumeStatusRefunded
		record.PreConsumed = 0
		record.Allocations = ""
		return tx.Save(&record).Error
	})
}
