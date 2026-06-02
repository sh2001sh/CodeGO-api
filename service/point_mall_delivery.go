package service

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

func pointMallMinInt64(left int64, right int64) int64 {
	if left < right {
		return left
	}
	return right
}

func getMonthlyConvertedBonusQuota(userId int) (int64, error) {
	return getMonthlyConvertedBonusQuotaTx(model.DB, userId)
}

func getMonthlyConvertedBonusQuotaTx(tx *gorm.DB, userId int) (int64, error) {
	now := model.GetDBTimestamp()
	start, end := pointMallMonthRange(now)
	var points int64
	err := tx.Model(&model.PointLedger{}).
		Where("user_id = ? AND source_type = ? AND created_at >= ? AND created_at < ?", userId, model.PointSourceBonusConversion, start, end).
		Select("COALESCE(SUM(delta), 0)").Scan(&points).Error
	if err != nil {
		return 0, err
	}
	return points * model.PointMallBonusQuotaPerPointUSD * int64(common.QuotaPerUnit), nil
}

func consumeBonusQuotaCreditsTx(tx *gorm.DB, userId int, amount int64) (int64, error) {
	if amount <= 0 {
		return 0, nil
	}
	var credits []model.BonusQuotaCredit
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("user_id = ? AND remaining_amount > 0", userId).
		Order("id asc").Find(&credits).Error; err != nil {
		return 0, err
	}
	remaining := amount
	spent := int64(0)
	for _, credit := range credits {
		if remaining <= 0 {
			break
		}
		use := credit.RemainingAmount
		if use > remaining {
			use = remaining
		}
		credit.RemainingAmount -= use
		if credit.RemainingAmount <= 0 {
			credit.RemainingAmount = 0
			credit.Status = model.BonusQuotaStatusExhausted
		}
		if err := tx.Save(&credit).Error; err != nil {
			return spent, err
		}
		spent += use
		remaining -= use
	}
	return spent, nil
}

func getProductStockRemaining(product model.PointMallProduct) int64 {
	switch product.Type {
	case model.PointProductTypeJDCard:
		var count int64
		_ = model.DB.Model(&model.PointMallCardSecret{}).
			Where("product_id = ? AND status = ?", product.Id, model.PointCardStatusUnused).
			Count(&count).Error
		required := jdCardSecretCount(product)
		if required <= 0 {
			return 0
		}
		return count / int64(required)
	default:
		return int64(product.VirtualStock)
	}
}

func countUserProductRedeems(userId int, productId int) (int64, int64) {
	return countUserProductRedeemsTx(model.DB, userId, productId)
}

func countUserProductRedeemsTx(tx *gorm.DB, userId int, productId int) (int64, int64) {
	now := model.GetDBTimestamp()
	dayStart, dayEnd := pointMallDayRange(now)
	monthStart, monthEnd := pointMallMonthRange(now)
	var today int64
	var month int64
	base := tx.Model(&model.PointMallOrder{}).
		Where("user_id = ? AND product_id = ? AND status <> ?", userId, productId, model.PointOrderStatusRefunded)
	base.Session(&gorm.Session{}).Where("created_at >= ? AND created_at < ?", dayStart, dayEnd).Count(&today)
	base.Session(&gorm.Session{}).Where("created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&month)
	return today, month
}

func validateJDCardRedeemTx(tx *gorm.DB, userId int, product *model.PointMallProduct) error {
	rules := model.GetPointMallRulesConfig()
	var stock int64
	if err := tx.Model(&model.PointMallCardSecret{}).
		Where("product_id = ? AND status = ?", product.Id, model.PointCardStatusUnused).
		Count(&stock).Error; err != nil {
		return err
	}
	if stock < int64(jdCardSecretCount(*product)) {
		return errors.New("JD E-Card stock is insufficient")
	}
	now := model.GetDBTimestamp()
	monthStart, monthEnd := pointMallMonthRange(now)
	var orders []model.PointMallOrder
	err := tx.Model(&model.PointMallOrder{}).
		Where("user_id = ? AND product_type = ? AND status = ? AND created_at >= ? AND created_at < ?", userId, model.PointProductTypeJDCard, model.PointOrderStatusSuccess, monthStart, monthEnd).
		Find(&orders).Error
	if err != nil {
		return err
	}
	faceTotal := int64(0)
	for _, order := range orders {
		var redeemedProduct model.PointMallProduct
		if err := tx.Select("face_value").Where("id = ?", order.ProductId).First(&redeemedProduct).Error; err != nil {
			return err
		}
		faceTotal += redeemedProduct.FaceValue
	}
	if faceTotal+product.FaceValue > rules.JDCardMonthlyFaceLimit {
		return errors.New("monthly JD E-Card face-value limit reached")
	}
	return nil
}

func deliverPointMallOrderTx(tx *gorm.DB, order *model.PointMallOrder, product *model.PointMallProduct) error {
	switch product.Type {
	case model.PointProductTypeJDCard:
		return deliverJDCardTx(tx, order, product)
	case model.PointProductTypeBlindBox:
		return deliverBlindBoxTicketTx(tx, order, product)
	case model.PointProductTypeSubscription:
		return deliverSubscriptionPlanTx(tx, order, product)
	default:
		return errors.New("unsupported product type")
	}
}

func deliverJDCardTx(tx *gorm.DB, order *model.PointMallOrder, product *model.PointMallProduct) error {
	required := jdCardSecretCount(*product)
	var cards []model.PointMallCardSecret
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("product_id = ? AND status = ?", order.ProductId, model.PointCardStatusUnused).
		Order("id asc").Limit(required).Find(&cards).Error; err != nil {
		return err
	}
	if len(cards) < required {
		return errors.New("JD E-Card stock is insufficient")
	}
	issuedAt := model.GetDBTimestamp()
	cardIds := make([]int, 0, len(cards))
	maskedSecrets := make([]string, 0, len(cards))
	for _, card := range cards {
		card.Status = model.PointCardStatusIssued
		card.OrderId = order.Id
		card.UserId = order.UserId
		card.IssuedAt = issuedAt
		if err := tx.Save(&card).Error; err != nil {
			return err
		}
		cardIds = append(cardIds, card.Id)
		maskedSecrets = append(maskedSecrets, maskCardSecret(card.CardSecret))
	}
	content := map[string]interface{}{
		"card_count":          len(cards),
		"card_secrets_masked": maskedSecrets,
	}
	raw, err := common.Marshal(content)
	if err != nil {
		return err
	}
	return markOrderDeliveredTx(tx, order, string(raw), map[string]interface{}{"card_secret_id": cardIds[0]})
}

func deliverBlindBoxTicketTx(tx *gorm.DB, order *model.PointMallOrder, product *model.PointMallProduct) error {
	quantity := product.BlindBoxQuantity
	if quantity <= 0 {
		quantity = 1
	}
	tradeNo := fmt.Sprintf("POINT-MALL-%d", order.Id)
	blindOrder := model.BlindBoxOrder{
		UserId:          order.UserId,
		Quantity:        quantity,
		OpenedCount:     0,
		Money:           0,
		TradeNo:         tradeNo,
		PaymentMethod:   "point_mall",
		PaymentProvider: "point_mall",
		Status:          common.TopUpStatusSuccess,
		CreateTime:      model.GetDBTimestamp(),
		CompleteTime:    model.GetDBTimestamp(),
	}
	if err := tx.Create(&blindOrder).Error; err != nil {
		return err
	}
	records, err := model.OpenBlindBoxOrderByTradeNoTx(tx, tradeNo)
	if err != nil {
		return err
	}
	raw, err := common.Marshal(map[string]interface{}{
		"blind_box_quantity": quantity,
		"blind_box_order_id": blindOrder.Id,
		"blind_box_records":  records,
		"reward_summary":     blindBoxRewardSummary(records),
	})
	if err != nil {
		return err
	}
	return markOrderDeliveredTx(tx, order, string(raw), nil)
}

func blindBoxRewardSummary(records []model.BlindBoxOpenRecord) string {
	if len(records) == 0 {
		return "未开出奖励"
	}
	parts := make([]string, 0, len(records))
	for _, record := range records {
		if strings.TrimSpace(record.RewardTitle) != "" {
			parts = append(parts, record.RewardTitle)
			continue
		}
		if record.RewardUSD > 0 {
			parts = append(parts, fmt.Sprintf("%.2f 美元临时额度", record.RewardUSD))
			continue
		}
		parts = append(parts, "已获得奖励")
	}
	return strings.Join(parts, "，")
}

func deliverSubscriptionPlanTx(tx *gorm.DB, order *model.PointMallOrder, product *model.PointMallProduct) error {
	if product.SubscriptionPlanId <= 0 {
		return errors.New("subscription plan is not configured")
	}
	plan, err := model.GetSubscriptionPlanById(product.SubscriptionPlanId)
	if err != nil {
		return err
	}
	sub, _, err := model.ApplySubscriptionPurchaseTx(tx, order.UserId, plan, "point_mall")
	if err != nil {
		return err
	}
	content := map[string]interface{}{
		"subscription_plan_id":    plan.Id,
		"subscription_plan_title": plan.Title,
		"user_subscription_id":    sub.Id,
		"start_time":              sub.StartTime,
		"end_time":                sub.EndTime,
	}
	raw, err := common.Marshal(content)
	if err != nil {
		return err
	}
	return markOrderDeliveredTx(tx, order, string(raw), map[string]interface{}{"user_subscription_id": sub.Id})
}

func markOrderDeliveredTx(tx *gorm.DB, order *model.PointMallOrder, content string, extra map[string]interface{}) error {
	updates := map[string]interface{}{
		"status":           model.PointOrderStatusSuccess,
		"delivery_content": content,
		"completed_at":     model.GetDBTimestamp(),
	}
	for key, value := range extra {
		updates[key] = value
	}
	return tx.Model(order).Updates(updates).Error
}

func attachOrderCardSecret(order *model.PointMallOrder) {
	var cards []model.PointMallCardSecret
	if err := model.DB.Where("order_id = ?", order.Id).Order("id asc").Find(&cards).Error; err != nil {
		return
	}
	if len(cards) == 0 && order.CardSecretId > 0 {
		var card model.PointMallCardSecret
		if err := model.DB.Where("id = ?", order.CardSecretId).First(&card).Error; err == nil {
			cards = append(cards, card)
		}
	}
	if len(cards) == 0 {
		return
	}
	secrets := make([]string, 0, len(cards))
	for _, card := range cards {
		secret, err := model.DecryptPointMallSecret(card.CardSecret)
		if err != nil {
			return
		}
		secrets = append(secrets, secret)
	}
	content := map[string]interface{}{"card_secrets": secrets, "card_count": len(secrets)}
	if len(secrets) > 0 {
		content["card_secret"] = strings.Join(secrets, " / ")
	}
	raw, err := common.Marshal(content)
	if err == nil {
		order.DeliveryContent = string(raw)
	}
}

func jdCardSecretCount(product model.PointMallProduct) int {
	if product.FaceValue == 10 {
		return 2
	}
	return 1
}

func maskCardSecret(encrypted string) string {
	secret, err := model.DecryptPointMallSecret(encrypted)
	if err != nil {
		return "****"
	}
	trimmed := strings.TrimSpace(secret)
	if len(trimmed) <= 4 {
		return "****"
	}
	return strings.Repeat("*", len(trimmed)-4) + trimmed[len(trimmed)-4:]
}
