package model

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	GroupBuyStatusPending   = "pending"
	GroupBuyStatusCompleted = "completed"
	GroupBuyStatusExpired   = "expired"
)

var (
	ErrGroupBuyNotFound       = errors.New("group buy order not found")
	ErrGroupBuyNotJoinable    = errors.New("group buy order is not joinable")
	ErrGroupBuyAlreadyJoined  = errors.New("user already joined this group buy")
	ErrGroupBuyPlanNotEnabled = errors.New("plan does not support group buy")
)

type GroupBuyOrder struct {
	Id           int64  `json:"id"`
	InitiatorId  int    `json:"initiator_id" gorm:"type:int;not null;index"`
	PlanId       int    `json:"plan_id" gorm:"type:int;not null;index"`
	Status       string `json:"status" gorm:"type:varchar(20);not null;default:'pending';index"`
	TargetCount  int    `json:"target_count" gorm:"type:int;not null;default:5"`
	CurrentCount int    `json:"current_count" gorm:"type:int;not null;default:1"`
	ExpiresAt    int64  `json:"expires_at" gorm:"type:bigint;not null;index"`
	SettledAt    int64  `json:"settled_at" gorm:"type:bigint;default:0"`
	CreatedAt    int64  `json:"created_at" gorm:"type:bigint;not null"`
	UpdatedAt    int64  `json:"updated_at" gorm:"type:bigint;not null"`
}

func (g *GroupBuyOrder) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	if g.Status == "" {
		g.Status = GroupBuyStatusPending
	}
	if g.TargetCount <= 0 {
		g.TargetCount = 5
	}
	if g.CurrentCount <= 0 {
		g.CurrentCount = 1
	}
	if g.ExpiresAt <= 0 {
		g.ExpiresAt = time.Now().Add(48 * time.Hour).Unix()
	}
	g.CreatedAt = now
	g.UpdatedAt = now
	return nil
}

func (g *GroupBuyOrder) BeforeUpdate(tx *gorm.DB) error {
	g.UpdatedAt = common.GetTimestamp()
	return nil
}

type GroupBuyMember struct {
	Id                 int64   `json:"id"`
	GroupBuyId         int64   `json:"group_buy_id" gorm:"type:bigint;not null;uniqueIndex:idx_group_buy_user"`
	UserId             int     `json:"user_id" gorm:"type:int;not null;uniqueIndex:idx_group_buy_user;index"`
	OrderId            int     `json:"order_id" gorm:"type:int;not null;default:0;index"`
	UserSubscriptionId int     `json:"user_subscription_id" gorm:"type:int;not null;default:0;index"`
	BonusGranted       bool    `json:"bonus_granted" gorm:"default:false"`
	BonusAmountUSD     float64 `json:"bonus_amount_usd" gorm:"type:decimal(10,2);default:0"`
	CreatedAt          int64   `json:"created_at" gorm:"type:bigint;not null"`
}

func (m *GroupBuyMember) BeforeCreate(tx *gorm.DB) error {
	m.CreatedAt = common.GetTimestamp()
	return nil
}

type GroupBuyListItem struct {
	Id              int64   `json:"id"`
	PlanId          int     `json:"plan_id"`
	PlanName        string  `json:"plan_name"`
	PlanPrice       float64 `json:"plan_price"`
	Currency        string  `json:"currency"`
	BaseQuotaUSD    float64 `json:"base_quota_usd"`
	CurrentCount    int     `json:"current_count"`
	TargetCount     int     `json:"target_count"`
	BonusAt2        float64 `json:"bonus_at_2"`
	BonusAt3        float64 `json:"bonus_at_3"`
	BonusAt5        float64 `json:"bonus_at_5"`
	ExpiresAt       int64   `json:"expires_at"`
	InitiatorId     int     `json:"initiator_id"`
	InitiatorAvatar string  `json:"initiator_avatar"`
	Status          string  `json:"status"`
	Joined          bool    `json:"joined,omitempty"`
}

func quotaUnitsToUSD(amount int64) float64 {
	if amount <= 0 || common.QuotaPerUnit <= 0 {
		return 0
	}
	return float64(amount) / common.QuotaPerUnit
}

func buildGroupBuyItem(order GroupBuyOrder, plan SubscriptionPlan, joined bool) GroupBuyListItem {
	return GroupBuyListItem{
		Id:           order.Id,
		PlanId:       plan.Id,
		PlanName:     plan.Title,
		PlanPrice:    plan.PriceAmount,
		Currency:     plan.Currency,
		BaseQuotaUSD: quotaUnitsToUSD(plan.TotalAmount),
		CurrentCount: order.CurrentCount,
		TargetCount:  order.TargetCount,
		BonusAt2:     plan.GroupBuyBonus2,
		BonusAt3:     plan.GroupBuyBonus3,
		BonusAt5:     plan.GroupBuyBonus5,
		ExpiresAt:    order.ExpiresAt,
		InitiatorId:  order.InitiatorId,
		Status:       order.Status,
		Joined:       joined,
	}
}

func buildEmptyGroupBuyRoom(plan SubscriptionPlan) GroupBuyListItem {
	return GroupBuyListItem{
		Id:           0,
		PlanId:       plan.Id,
		PlanName:     plan.Title,
		PlanPrice:    plan.PriceAmount,
		Currency:     plan.Currency,
		BaseQuotaUSD: quotaUnitsToUSD(plan.TotalAmount),
		CurrentCount: 0,
		TargetCount:  5,
		BonusAt2:     plan.GroupBuyBonus2,
		BonusAt3:     plan.GroupBuyBonus3,
		BonusAt5:     plan.GroupBuyBonus5,
		ExpiresAt:    time.Now().Add(48 * time.Hour).Unix(),
		Status:       GroupBuyStatusPending,
	}
}

func ListActiveGroupBuys(userId int) ([]GroupBuyListItem, error) {
	now := common.GetTimestamp()
	var orders []GroupBuyOrder
	if err := DB.Where("status = ? AND expires_at > ? AND current_count < target_count", GroupBuyStatusPending, now).
		Order("created_at asc, id asc").
		Find(&orders).Error; err != nil {
		return nil, err
	}
	orders = oneGroupBuyOrderPerPlan(orders)
	items, err := hydrateGroupBuyItems(orders, userId)
	if err != nil {
		return nil, err
	}
	activePlanSet := make(map[int]struct{}, len(items))
	for _, item := range items {
		activePlanSet[item.PlanId] = struct{}{}
	}
	var plans []SubscriptionPlan
	if err := DB.Where("enabled = ? AND internal_only = ? AND group_buy_enabled = ?", true, false, true).
		Order("sort_order desc, id desc").
		Find(&plans).Error; err != nil {
		return nil, err
	}
	for _, plan := range plans {
		if _, ok := activePlanSet[plan.Id]; ok {
			continue
		}
		items = append(items, buildEmptyGroupBuyRoom(plan))
	}
	items = injectGhostParticipants(items)
	return items, nil
}

// injectGhostParticipants adds 1-2 fake current_count to 2 randomly chosen empty
// monthly-plan rooms when there are 2+ such empty rooms, to improve social proof.
// This is display-only: id remains 0, no DB writes, real join logic is unaffected.
func injectGhostParticipants(items []GroupBuyListItem) []GroupBuyListItem {
	emptyIdx := make([]int, 0, len(items))
	for i, item := range items {
		if item.Id == 0 && strings.Contains(item.PlanName, "月卡") {
			emptyIdx = append(emptyIdx, i)
		}
	}
	if len(emptyIdx) < 2 {
		return items
	}
	rand.Shuffle(len(emptyIdx), func(i, j int) {
		emptyIdx[i], emptyIdx[j] = emptyIdx[j], emptyIdx[i]
	})
	for _, idx := range emptyIdx[:2] {
		items[idx].CurrentCount = 1 + rand.Intn(2)
	}
	return items
}

func oneGroupBuyOrderPerPlan(orders []GroupBuyOrder) []GroupBuyOrder {
	if len(orders) <= 1 {
		return orders
	}
	filtered := make([]GroupBuyOrder, 0, len(orders))
	seen := make(map[int]struct{}, len(orders))
	for _, order := range orders {
		if _, ok := seen[order.PlanId]; ok {
			continue
		}
		seen[order.PlanId] = struct{}{}
		filtered = append(filtered, order)
	}
	return filtered
}

func ListUserGroupBuys(userId int) ([]GroupBuyListItem, error) {
	if userId <= 0 {
		return []GroupBuyListItem{}, nil
	}
	var memberRows []GroupBuyMember
	if err := DB.Where("user_id = ?", userId).Find(&memberRows).Error; err != nil {
		return nil, err
	}
	orderIdSet := make(map[int64]struct{}, len(memberRows))
	for _, row := range memberRows {
		orderIdSet[row.GroupBuyId] = struct{}{}
	}
	var initiated []GroupBuyOrder
	if err := DB.Where("initiator_id = ?", userId).Find(&initiated).Error; err != nil {
		return nil, err
	}
	for _, row := range initiated {
		orderIdSet[row.Id] = struct{}{}
	}
	if len(orderIdSet) == 0 {
		return []GroupBuyListItem{}, nil
	}
	ids := make([]int64, 0, len(orderIdSet))
	for id := range orderIdSet {
		ids = append(ids, id)
	}
	var orders []GroupBuyOrder
	if err := DB.Where("id IN ?", ids).Order("updated_at desc, id desc").Find(&orders).Error; err != nil {
		return nil, err
	}
	return hydrateGroupBuyItems(orders, userId)
}

func GetGroupBuyDetail(id int64, userId int) (*GroupBuyListItem, error) {
	var order GroupBuyOrder
	if err := DB.Where("id = ?", id).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrGroupBuyNotFound
		}
		return nil, err
	}
	items, err := hydrateGroupBuyItems([]GroupBuyOrder{order}, userId)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, ErrGroupBuyNotFound
	}
	return &items[0], nil
}

func hydrateGroupBuyItems(orders []GroupBuyOrder, userId int) ([]GroupBuyListItem, error) {
	if len(orders) == 0 {
		return []GroupBuyListItem{}, nil
	}
	planIds := make([]int, 0, len(orders))
	planIdSet := make(map[int]struct{}, len(orders))
	orderIds := make([]int64, 0, len(orders))
	for _, order := range orders {
		orderIds = append(orderIds, order.Id)
		if _, ok := planIdSet[order.PlanId]; ok {
			continue
		}
		planIdSet[order.PlanId] = struct{}{}
		planIds = append(planIds, order.PlanId)
	}
	var plans []SubscriptionPlan
	if err := DB.Where("id IN ?", planIds).Find(&plans).Error; err != nil {
		return nil, err
	}
	planMap := make(map[int]SubscriptionPlan, len(plans))
	for _, plan := range plans {
		planMap[plan.Id] = plan
	}
	joinedSet := map[int64]struct{}{}
	if userId > 0 {
		var members []GroupBuyMember
		if err := DB.Where("group_buy_id IN ? AND user_id = ?", orderIds, userId).Find(&members).Error; err != nil {
			return nil, err
		}
		for _, member := range members {
			joinedSet[member.GroupBuyId] = struct{}{}
		}
	}
	items := make([]GroupBuyListItem, 0, len(orders))
	for _, order := range orders {
		plan, ok := planMap[order.PlanId]
		if !ok {
			continue
		}
		_, joined := joinedSet[order.Id]
		items = append(items, buildGroupBuyItem(order, plan, joined))
	}
	return items, nil
}

func JoinGroupBuy(userId int, groupBuyId int64, orderId int) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		return joinGroupBuyTx(tx, userId, groupBuyId, orderId, 0, 0)
	})
}

func ValidateGroupBuyPurchase(userId int, planId int, purchaseType string, groupBuyId int64) error {
	purchaseType = NormalizeSubscriptionPurchaseType(purchaseType)
	if purchaseType == SubscriptionPurchaseTypeNormal {
		return nil
	}
	plan, err := GetSubscriptionPlanById(planId)
	if err != nil {
		return err
	}
	if !plan.GroupBuyEnabled {
		return ErrGroupBuyPlanNotEnabled
	}
	if purchaseType == SubscriptionPurchaseTypeGroupBuy {
		order, err := findJoinableGroupBuyByPlanTx(nil, planId)
		if err != nil || order == nil {
			return err
		}
		return ensureUserCanJoinGroupBuyTx(nil, order.Id, userId)
	}
	if groupBuyId <= 0 {
		return ErrGroupBuyNotFound
	}
	order, err := getJoinableGroupBuyTx(nil, groupBuyId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGroupBuyNotFound
		}
		return err
	}
	if order.PlanId != planId {
		return ErrGroupBuyNotJoinable
	}
	return ensureUserCanJoinGroupBuyTx(nil, groupBuyId, userId)
}

func groupBuyDB(tx *gorm.DB) *gorm.DB {
	if tx != nil {
		return tx
	}
	return DB
}

func lockGroupBuyPlanTx(tx *gorm.DB, planId int) error {
	if tx == nil || planId <= 0 {
		return nil
	}
	var plan SubscriptionPlan
	return tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Select("id").
		Where("id = ?", planId).
		First(&plan).Error
}

func findJoinableGroupBuyByPlanTx(tx *gorm.DB, planId int) (*GroupBuyOrder, error) {
	db := groupBuyDB(tx)
	var order GroupBuyOrder
	query := db.Where("plan_id = ? AND status = ? AND expires_at > ? AND current_count < target_count", planId, GroupBuyStatusPending, common.GetTimestamp()).
		Order("created_at asc, id asc")
	if tx != nil {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	if err := query.First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &order, nil
}

func getJoinableGroupBuyTx(tx *gorm.DB, groupBuyId int64) (*GroupBuyOrder, error) {
	db := groupBuyDB(tx)
	var order GroupBuyOrder
	query := db.Where("id = ?", groupBuyId)
	if tx != nil {
		query = query.Clauses(clause.Locking{Strength: "UPDATE"})
	}
	if err := query.First(&order).Error; err != nil {
		return nil, err
	}
	if order.Status != GroupBuyStatusPending || order.ExpiresAt <= common.GetTimestamp() || order.CurrentCount >= order.TargetCount {
		return nil, ErrGroupBuyNotJoinable
	}
	return &order, nil
}

func ensureUserCanJoinGroupBuyTx(tx *gorm.DB, groupBuyId int64, userId int) error {
	var count int64
	if err := groupBuyDB(tx).Model(&GroupBuyMember{}).Where("group_buy_id = ? AND user_id = ?", groupBuyId, userId).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrGroupBuyAlreadyJoined
	}
	return nil
}

func ApplyGroupBuyPurchaseAfterPaymentTx(tx *gorm.DB, order *SubscriptionOrder, plan *SubscriptionPlan, sub *UserSubscription) error {
	if tx == nil || order == nil || plan == nil {
		return errors.New("invalid group buy purchase args")
	}
	purchaseType := NormalizeSubscriptionPurchaseType(order.PurchaseType)
	if purchaseType == SubscriptionPurchaseTypeNormal {
		return nil
	}
	if !plan.GroupBuyEnabled {
		return ErrGroupBuyPlanNotEnabled
	}
	if purchaseType == SubscriptionPurchaseTypeGroupBuy {
		if err := lockGroupBuyPlanTx(tx, plan.Id); err != nil {
			return err
		}
		existingOrder, err := findJoinableGroupBuyByPlanTx(tx, plan.Id)
		if err != nil {
			return err
		}
		if existingOrder != nil {
			order.GroupBuyId = existingOrder.Id
			return joinGroupBuyTx(tx, order.UserId, existingOrder.Id, order.Id, plan.Id, groupBuySubscriptionId(sub))
		}
		groupOrder := &GroupBuyOrder{
			InitiatorId:  order.UserId,
			PlanId:       plan.Id,
			Status:       GroupBuyStatusPending,
			TargetCount:  5,
			CurrentCount: 1,
			ExpiresAt:    time.Now().Add(48 * time.Hour).Unix(),
		}
		if err := tx.Create(groupOrder).Error; err != nil {
			return err
		}
		member := GroupBuyMember{
			GroupBuyId:         groupOrder.Id,
			UserId:             order.UserId,
			OrderId:            order.Id,
			UserSubscriptionId: groupBuySubscriptionId(sub),
		}
		if err := tx.Create(&member).Error; err != nil {
			return err
		}
		order.GroupBuyId = groupOrder.Id
		return nil
	}
	if purchaseType == SubscriptionPurchaseTypeJoinGroup {
		return joinGroupBuyTx(tx, order.UserId, order.GroupBuyId, order.Id, plan.Id, groupBuySubscriptionId(sub))
	}
	return nil
}

func groupBuySubscriptionId(sub *UserSubscription) int {
	if sub == nil {
		return 0
	}
	return sub.Id
}

func joinGroupBuyTx(tx *gorm.DB, userId int, groupBuyId int64, orderId int, expectedPlanId int, userSubscriptionId int) error {
	var order GroupBuyOrder
	if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", groupBuyId).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGroupBuyNotFound
		}
		return err
	}
	if expectedPlanId > 0 && order.PlanId != expectedPlanId {
		return ErrGroupBuyNotJoinable
	}
	if order.Status != GroupBuyStatusPending || order.ExpiresAt <= common.GetTimestamp() || order.CurrentCount >= order.TargetCount {
		return ErrGroupBuyNotJoinable
	}
	plan, err := getSubscriptionPlanByIdTx(tx, order.PlanId)
	if err != nil {
		return err
	}
	if !plan.GroupBuyEnabled {
		return ErrGroupBuyPlanNotEnabled
	}
	var count int64
	if err := tx.Model(&GroupBuyMember{}).Where("group_buy_id = ? AND user_id = ?", groupBuyId, userId).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrGroupBuyAlreadyJoined
	}
	member := GroupBuyMember{
		GroupBuyId:         groupBuyId,
		UserId:             userId,
		OrderId:            orderId,
		UserSubscriptionId: userSubscriptionId,
	}
	if err := tx.Create(&member).Error; err != nil {
		return err
	}
	return tx.Model(&GroupBuyOrder{}).
		Where("id = ?", groupBuyId).
		Updates(map[string]interface{}{
			"current_count": gorm.Expr("current_count + ?", 1),
			"updated_at":    common.GetTimestamp(),
		}).Error
}

func bonusForGroupBuyCount(plan SubscriptionPlan, count int) float64 {
	switch {
	case count >= 5:
		return plan.GroupBuyBonus5
	case count >= 3:
		return plan.GroupBuyBonus3
	case count >= 2:
		return plan.GroupBuyBonus2
	default:
		return 0
	}
}

func SettleDueGroupBuys(limit int) (int, error) {
	if limit <= 0 {
		limit = 100
	}
	now := common.GetTimestamp()
	var orders []GroupBuyOrder
	if err := DB.Where("status = ? AND (expires_at <= ? OR current_count >= target_count)", GroupBuyStatusPending, now).
		Order("expires_at asc, id asc").
		Limit(limit).
		Find(&orders).Error; err != nil {
		return 0, err
	}
	settled := 0
	for _, order := range orders {
		if err := settleGroupBuyOrder(order.Id); err != nil {
			return settled, err
		}
		settled++
	}
	return settled, nil
}

func settleGroupBuyOrder(groupBuyId int64) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		var order GroupBuyOrder
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", groupBuyId).First(&order).Error; err != nil {
			return err
		}
		if order.Status != GroupBuyStatusPending {
			return nil
		}
		var members []GroupBuyMember
		if err := tx.Where("group_buy_id = ?", order.Id).Find(&members).Error; err != nil {
			return err
		}
		plan, err := getSubscriptionPlanByIdTx(tx, order.PlanId)
		if err != nil {
			return err
		}
		bonusUSD := bonusForGroupBuyCount(*plan, len(members))
		status := GroupBuyStatusExpired
		if len(members) >= 2 {
			status = GroupBuyStatusCompleted
		}
		if bonusUSD > 0 {
			quota := int(quotaUnitsFromUSD(bonusUSD))
			for _, member := range members {
				if member.BonusGranted {
					continue
				}
				sub, err := getGroupBuyMemberSubscriptionTx(tx, member, order.PlanId)
				if err != nil {
					return err
				}
				if err := addSubscriptionBonusTx(tx, sub, int64(quota)); err != nil {
					return err
				}
				if err := tx.Model(&GroupBuyMember{}).Where("id = ?", member.Id).
					Updates(map[string]interface{}{
						"bonus_granted":    true,
						"bonus_amount_usd": bonusUSD,
					}).Error; err != nil {
					return err
				}
				if err := RecordLogTx(tx, member.UserId, LogTypeTopup, fmt.Sprintf("拼团奖励到账，已加入套餐额度，套餐: %s，奖励额度: $%.2f", plan.Title, bonusUSD)); err != nil {
					return err
				}
			}
		}
		return tx.Model(&GroupBuyOrder{}).Where("id = ?", order.Id).
			Updates(map[string]interface{}{
				"status":     status,
				"settled_at": common.GetTimestamp(),
				"updated_at": common.GetTimestamp(),
			}).Error
	})
}

func getGroupBuyMemberSubscriptionTx(tx *gorm.DB, member GroupBuyMember, planId int) (*UserSubscription, error) {
	if tx == nil {
		return nil, errors.New("tx is nil")
	}
	var sub UserSubscription
	query := tx.Set("gorm:query_option", "FOR UPDATE")
	if member.UserSubscriptionId > 0 {
		err := query.Where("id = ? AND user_id = ?", member.UserSubscriptionId, member.UserId).First(&sub).Error
		if err == nil {
			return &sub, nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}
	err := query.Where("user_id = ? AND plan_id = ? AND status = ?", member.UserId, planId, "active").
		Order("created_at desc, id desc").
		First(&sub).Error
	if err != nil {
		return nil, err
	}
	return &sub, nil
}
