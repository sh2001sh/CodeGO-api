package model

import (
	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

func countSuccessfulBlindBoxOrdersTx(tx *gorm.DB, userId int, beforeOrderId *int) (int64, error) {
	var count int64
	query := tx.Model(&BlindBoxOrder{}).
		Where("user_id = ? AND status = ? AND money > 0", userId, common.TopUpStatusSuccess)
	if beforeOrderId != nil && *beforeOrderId > 0 {
		query = query.Where("id < ?", *beforeOrderId)
	}
	err := query.Count(&count).Error
	return count, err
}

func isFirstSuccessfulBlindBoxOrderTx(tx *gorm.DB, userId int, orderId int) (bool, error) {
	if userId <= 0 || orderId <= 0 {
		return false, nil
	}
	count, err := countSuccessfulBlindBoxOrdersTx(tx, userId, &orderId)
	if err != nil {
		return false, err
	}
	return count == 0, nil
}

func IsBlindBoxFirstPurchaseEligible(userId int) (bool, error) {
	if userId <= 0 {
		return false, nil
	}
	count, err := countSuccessfulBlindBoxOrdersTx(DB, userId, nil)
	if err != nil {
		return false, err
	}
	return count == 0, nil
}
