package model

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
)

const (
	BlindBoxRewardTypeQuota        = "quota"
	BlindBoxRewardTypeClaudeQuota  = "claude_quota"
	BlindBoxRewardTypeProp         = "prop"
	BlindBoxRewardTypeSubscription = "subscription"

	BlindBoxCreditStatusActive    = "active"
	BlindBoxCreditStatusExhausted = "exhausted"

	BlindBoxPreConsumeStatusConsumed = "consumed"
	BlindBoxPreConsumeStatusRefunded = "refunded"
)

var (
	ErrBlindBoxDisabled             = errors.New("blind box is disabled")
	ErrBlindBoxOrderNotFound        = errors.New("blind box order not found")
	ErrBlindBoxOrderStatusInvalid   = errors.New("blind box order status invalid")
	ErrBlindBoxInsufficientStock    = errors.New("blind box stock is insufficient")
	ErrBlindBoxInsufficientQuota    = errors.New("blind box quota insufficient")
	ErrBlindBoxSiteOpenLimitReached = errors.New("blind box daily open limit reached")
)

type BlindBoxOrder struct {
	Id int `json:"id"`

	UserId      int     `json:"user_id" gorm:"index"`
	Quantity    int     `json:"quantity"`
	OpenedCount int     `json:"opened_count"`
	Money       float64 `json:"money"`

	TradeNo         string `json:"trade_no" gorm:"unique;type:varchar(255);index"`
	PaymentMethod   string `json:"payment_method" gorm:"type:varchar(50)"`
	PaymentProvider string `json:"payment_provider" gorm:"type:varchar(50);default:''"`
	Status          string `json:"status" gorm:"type:varchar(32);index"`
	CreateTime      int64  `json:"create_time" gorm:"index"`
	CompleteTime    int64  `json:"complete_time"`

	ProviderPayload string `json:"provider_payload" gorm:"type:text"`
}

type BlindBoxCredit struct {
	Id int `json:"id"`

	UserId             int     `json:"user_id" gorm:"index"`
	OpenRecordId       int     `json:"open_record_id" gorm:"index"`
	OriginalAmount     int64   `json:"original_amount" gorm:"type:bigint;not null;default:0"`
	RemainingAmount    int64   `json:"remaining_amount" gorm:"type:bigint;not null;default:0;index"`
	RewardUSD          float64 `json:"reward_usd"`
	ExpiresAt          int64   `json:"expires_at" gorm:"bigint;index"`
	Status             string  `json:"status" gorm:"type:varchar(32);index"`
	MigratedAt         int64   `json:"migrated_at" gorm:"bigint;index;default:0"`
	MigratedWalletType string  `json:"migrated_wallet_type" gorm:"type:varchar(32);default:''"`
	CreatedAt          int64   `json:"created_at" gorm:"bigint"`
	UpdatedAt          int64   `json:"updated_at" gorm:"bigint"`
}

type BlindBoxRewardWalletType string

const (
	BlindBoxRewardWalletTypeDefault BlindBoxRewardWalletType = "default"
	BlindBoxRewardWalletTypeClaude  BlindBoxRewardWalletType = "claude"
)

type BlindBoxOpenRecord struct {
	Id int `json:"id"`

	UserId             int     `json:"user_id" gorm:"index"`
	OrderId            int     `json:"order_id" gorm:"index"`
	RewardType         string  `json:"reward_type" gorm:"type:varchar(32);index"`
	RewardWalletType   string  `json:"reward_wallet_type" gorm:"type:varchar(32);default:'default';index"`
	RewardUSD          float64 `json:"reward_usd"`
	CreditAmount       int64   `json:"credit_amount" gorm:"type:bigint;not null;default:0"`
	RewardTitle        string  `json:"reward_title" gorm:"type:varchar(255)"`
	RewardTier         string  `json:"reward_tier" gorm:"type:varchar(64)"`
	UserSubscriptionId int     `json:"user_subscription_id" gorm:"index"`
	IsPity             bool    `json:"is_pity"`
	CreateTime         int64   `json:"create_time" gorm:"bigint;index"`

	PropId        int    `json:"prop_id,omitempty" gorm:"-"`
	PropType      string `json:"prop_type,omitempty" gorm:"-"`
	PropStatus    string `json:"prop_status,omitempty" gorm:"-"`
	PropExpiresAt int64  `json:"prop_expires_at,omitempty" gorm:"-"`
}

type BlindBoxPityState struct {
	Id                    int   `json:"id"`
	UserId                int   `json:"user_id" gorm:"uniqueIndex"`
	ConsecutiveLowRewards int   `json:"consecutive_low_rewards"`
	UpdatedAt             int64 `json:"updated_at" gorm:"bigint"`
}

type BlindBoxCreditAllocation struct {
	CreditId int   `json:"credit_id"`
	Amount   int64 `json:"amount"`
}

type BlindBoxPreConsumeRecord struct {
	Id          int    `json:"id"`
	RequestId   string `json:"request_id" gorm:"type:varchar(64);uniqueIndex"`
	UserId      int    `json:"user_id" gorm:"index"`
	Allocations string `json:"allocations" gorm:"type:text"`
	PreConsumed int64  `json:"pre_consumed" gorm:"type:bigint;not null;default:0"`
	Status      string `json:"status" gorm:"type:varchar(32);index"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt   int64  `json:"updated_at" gorm:"bigint;index"`
}

type BlindBoxOverview struct {
	AvailableBoxes         int                  `json:"available_boxes"`
	PendingBoxes           int                  `json:"pending_boxes"`
	// RemainingQuota mirrors the user's main wallet quota after blind-box rewards
	// are credited directly into users.quota. It is not a standalone blind-box pool.
	RemainingQuota         int64                `json:"remaining_quota"`
	ClaudeQuota            int64                `json:"claude_quota"`
	PityProgress           int                  `json:"pity_progress"`
	PityThreshold          int                  `json:"pity_threshold"`
	EffectivePityThreshold int                  `json:"effective_pity_threshold"`
	PurchasedToday         int                  `json:"purchased_today"`
	PurchasedThisMonth     int                  `json:"purchased_this_month"`
	RecentRecords          []BlindBoxOpenRecord `json:"recent_records"`
}

func (c *BlindBoxCredit) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	c.CreatedAt = now
	c.UpdatedAt = now
	return nil
}

func (c *BlindBoxCredit) BeforeUpdate(tx *gorm.DB) error {
	c.UpdatedAt = common.GetTimestamp()
	return nil
}

func (p *BlindBoxPityState) BeforeCreate(tx *gorm.DB) error {
	p.UpdatedAt = common.GetTimestamp()
	return nil
}

func (p *BlindBoxPityState) BeforeUpdate(tx *gorm.DB) error {
	p.UpdatedAt = common.GetTimestamp()
	return nil
}

func (r *BlindBoxPreConsumeRecord) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	r.CreatedAt = now
	r.UpdatedAt = now
	return nil
}

func (r *BlindBoxPreConsumeRecord) BeforeUpdate(tx *gorm.DB) error {
	r.UpdatedAt = common.GetTimestamp()
	return nil
}

func (o *BlindBoxOrder) Insert() error {
	if o.CreateTime == 0 {
		o.CreateTime = common.GetTimestamp()
	}
	return DB.Create(o).Error
}

func (o *BlindBoxOrder) Update() error {
	return DB.Save(o).Error
}

func quotaUnitsFromBlindBoxUSD(amount float64) int64 {
	if amount <= 0 {
		return 0
	}
	return quotaUnitsFromUSD(amount)
}

func increaseUserQuotaTx(tx *gorm.DB, userId int, quota int64) error {
	if tx == nil {
		return errors.New("transaction is required")
	}
	if userId <= 0 || quota <= 0 {
		return errors.New("invalid quota increase")
	}
	return tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", quota)).Error
}

func increaseUserClaudeQuotaTx(tx *gorm.DB, userId int, quota int64) error {
	if tx == nil {
		return errors.New("transaction is required")
	}
	if userId <= 0 || quota <= 0 {
		return errors.New("invalid claude quota increase")
	}
	return tx.Model(&User{}).Where("id = ?", userId).Update("claude_quota", gorm.Expr("claude_quota + ?", quota)).Error
}

func normalizeBlindBoxRewardWalletType(value string) BlindBoxRewardWalletType {
	switch strings.TrimSpace(value) {
	case string(BlindBoxRewardWalletTypeClaude):
		return BlindBoxRewardWalletTypeClaude
	default:
		return BlindBoxRewardWalletTypeDefault
	}
}

func applyBlindBoxWalletRewardTx(tx *gorm.DB, userId int, amount int64, walletType BlindBoxRewardWalletType) error {
	if amount <= 0 {
		return errors.New("invalid blind box reward amount")
	}
	switch walletType {
	case BlindBoxRewardWalletTypeClaude:
		return increaseUserClaudeQuotaTx(tx, userId, amount)
	default:
		return increaseUserQuotaTx(tx, userId, amount)
	}
}

func normalizeBlindBoxOpenRecordDisplay(record *BlindBoxOpenRecord) {
	if record == nil {
		return
	}
	if record.RewardTier == "first_purchase" {
		record.RewardTitle = formatFirstPurchaseBlindBoxRewardTitle(record.RewardUSD)
	}
	if record.RewardType == BlindBoxRewardTypeQuota && record.RewardTitle == "" {
		record.RewardTitle = fmt.Sprintf("%.2f 美元奖励", record.RewardUSD)
	}
	if record.RewardType == BlindBoxRewardTypeClaudeQuota && record.RewardTitle == "" {
		record.RewardTitle = fmt.Sprintf("%.2f Claude 额度奖励", record.RewardUSD)
	}
	if record.RewardType == BlindBoxRewardTypeProp && record.RewardTitle == "" {
		record.RewardTitle = "实用道具奖励"
	}
}

func attachBlindBoxPropStateTx(tx *gorm.DB, records []BlindBoxOpenRecord) error {
	if tx == nil || len(records) == 0 {
		return nil
	}
	openRecordIds := make([]int, 0, len(records))
	indexByOpenRecordId := make(map[int]int, len(records))
	for index := range records {
		if records[index].RewardType != BlindBoxRewardTypeProp || records[index].Id <= 0 {
			continue
		}
		openRecordIds = append(openRecordIds, records[index].Id)
		indexByOpenRecordId[records[index].Id] = index
	}
	if len(openRecordIds) == 0 {
		return nil
	}
	var props []BlindBoxProp
	if err := tx.Where("open_record_id IN ?", openRecordIds).Find(&props).Error; err != nil {
		return err
	}
	for _, prop := range props {
		index, ok := indexByOpenRecordId[prop.OpenRecordId]
		if !ok {
			continue
		}
		records[index].PropId = prop.Id
		records[index].PropType = prop.PropType
		records[index].PropStatus = prop.Status
		records[index].PropExpiresAt = prop.ExpiresAt
	}
	return nil
}

func GetBlindBoxOrderByTradeNo(tradeNo string) *BlindBoxOrder {
	if strings.TrimSpace(tradeNo) == "" {
		return nil
	}
	var order BlindBoxOrder
	if err := DB.Where("trade_no = ?", tradeNo).First(&order).Error; err != nil {
		return nil
	}
	return &order
}

func GetBlindBoxOrderByTradeNoForUser(tradeNo string, userId int) (*BlindBoxOrder, error) {
	if strings.TrimSpace(tradeNo) == "" || userId <= 0 {
		return nil, errors.New("invalid tradeNo or userId")
	}
	var order BlindBoxOrder
	if err := DB.Where("trade_no = ? AND user_id = ?", tradeNo, userId).First(&order).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func getBlindBoxDayRange(now int64) (int64, int64) {
	base := time.Unix(now, 0).In(time.Local)
	start := time.Date(base.Year(), base.Month(), base.Day(), 0, 0, 0, 0, base.Location()).Unix()
	return start, start + 24*3600
}

func getBlindBoxMonthRange(now int64) (int64, int64) {
	base := time.Unix(now, 0).In(time.Local)
	start := time.Date(base.Year(), base.Month(), 1, 0, 0, 0, 0, base.Location()).Unix()
	return start, time.Date(base.Year(), base.Month()+1, 1, 0, 0, 0, 0, base.Location()).Unix()
}

func sumBlindBoxOrderQuantity(userId int, start, end int64) (int, error) {
	type result struct {
		Total int64 `gorm:"column:total"`
	}
	var row result
	err := DB.Model(&BlindBoxOrder{}).
		Select("COALESCE(SUM(quantity), 0) AS total").
		Where("user_id = ? AND create_time >= ? AND create_time < ? AND status <> ? AND money > 0", userId, start, end, common.TopUpStatusExpired).
		Scan(&row).Error
	return int(row.Total), err
}

func GetUserBlindBoxOverview(userId int, recentLimit int) (*BlindBoxOverview, error) {
	if userId <= 0 {
		return nil, errors.New("invalid userId")
	}
	now := common.GetTimestamp()
	userQuota, err := GetUserQuota(userId, false)
	if err != nil {
		return nil, err
	}
	claudeQuota, err := GetUserClaudeQuota(userId, false)
	if err != nil {
		return nil, err
	}
	var orders []BlindBoxOrder
	if err := DB.Where("user_id = ? AND status = ?", userId, common.TopUpStatusSuccess).
		Order("id desc").
		Find(&orders).Error; err != nil {
		return nil, err
	}
	overview := &BlindBoxOverview{}
	for _, order := range orders {
		remaining := order.Quantity - order.OpenedCount
		if remaining > 0 {
			overview.AvailableBoxes += remaining
		}
	}
	if err := DB.Model(&BlindBoxOrder{}).
		Where("user_id = ? AND status = ?", userId, common.TopUpStatusPending).
		Select("COALESCE(SUM(quantity - opened_count), 0)").
		Scan(&overview.PendingBoxes).Error; err != nil {
		return nil, err
	}
	if recentLimit <= 0 {
		recentLimit = 20
	}
	if err := DB.Where("user_id = ?", userId).
		Order("create_time desc, id desc").
		Limit(recentLimit).
		Find(&overview.RecentRecords).Error; err != nil {
		return nil, err
	}
	if err := attachBlindBoxPropStateTx(DB, overview.RecentRecords); err != nil {
		return nil, err
	}
	for index := range overview.RecentRecords {
		normalizeBlindBoxOpenRecordDisplay(&overview.RecentRecords[index])
	}
	overview.RemainingQuota = int64(userQuota)
	overview.ClaudeQuota = int64(claudeQuota)
	var pity BlindBoxPityState
	if err := DB.Where("user_id = ?", userId).First(&pity).Error; err == nil {
		overview.PityProgress = pity.ConsecutiveLowRewards
	}
	setting := operation_setting.GetBlindBoxSetting()
	overview.PityThreshold = setting.PityThreshold
	overview.EffectivePityThreshold = setting.PityThreshold
	if appliedBonus, err := GetUserCompanionAppliedBonus(userId); err == nil &&
		appliedBonus != nil &&
		appliedBonus.Buff.BlindBoxPityReduction > 0 {
		overview.EffectivePityThreshold -= appliedBonus.Buff.BlindBoxPityReduction
		if overview.EffectivePityThreshold < 1 {
			overview.EffectivePityThreshold = 1
		}
	}
	dayStart, dayEnd := getBlindBoxDayRange(now)
	monthStart, monthEnd := getBlindBoxMonthRange(now)
	if overview.PurchasedToday, err = sumBlindBoxOrderQuantity(userId, dayStart, dayEnd); err != nil {
		return nil, err
	}
	if overview.PurchasedThisMonth, err = sumBlindBoxOrderQuantity(userId, monthStart, monthEnd); err != nil {
		return nil, err
	}
	return overview, nil
}

func getBlindBoxUserQuotaTx(tx *gorm.DB, userId int) (int, error) {
	var quota int
	if err := tx.Model(&User{}).Where("id = ?", userId).Select("quota").Find(&quota).Error; err != nil {
		return 0, err
	}
	return quota, nil
}

func getBlindBoxUserClaudeQuotaTx(tx *gorm.DB, userId int) (int, error) {
	var quota int
	if err := tx.Model(&User{}).Where("id = ?", userId).Select("claude_quota").Find(&quota).Error; err != nil {
		return 0, err
	}
	return quota, nil
}

func CompleteBlindBoxOrder(tradeNo string, providerPayload string, expectedPaymentProvider string, actualPaymentMethod string) error {
	if strings.TrimSpace(tradeNo) == "" {
		return errors.New("tradeNo is empty")
	}
	refCol := "`trade_no`"
	if common.UsingPostgreSQL {
		refCol = `"trade_no"`
	}
	shouldAutoOpen := false
	err := DB.Transaction(func(tx *gorm.DB) error {
		var order BlindBoxOrder
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where(refCol+" = ?", tradeNo).First(&order).Error; err != nil {
			return ErrBlindBoxOrderNotFound
		}
		if expectedPaymentProvider != "" && order.PaymentProvider != expectedPaymentProvider {
			return ErrPaymentMethodMismatch
		}
		if order.Status == common.TopUpStatusSuccess {
			shouldAutoOpen = true
			return nil
		}
		if order.Status != common.TopUpStatusPending {
			return ErrBlindBoxOrderStatusInvalid
		}
		order.Status = common.TopUpStatusSuccess
		order.CompleteTime = common.GetTimestamp()
		if providerPayload != "" {
			order.ProviderPayload = providerPayload
		}
		if actualPaymentMethod != "" && order.PaymentMethod != actualPaymentMethod {
			order.PaymentMethod = actualPaymentMethod
		}
		if err := AwardReferralFirstPurchaseBonusTx(tx, order.UserId, ReferralPurchaseTypeBlindBox, "blind_box_order", order.TradeNo); err != nil {
			return err
		}
		shouldAutoOpen = true
		return tx.Save(&order).Error
	})
	if err != nil {
		return err
	}
	if shouldAutoOpen {
		if _, autoOpenErr := OpenBlindBoxOrderByTradeNo(tradeNo); autoOpenErr != nil {
			common.SysError(fmt.Sprintf("failed to auto open blind box order %s: %s", tradeNo, autoOpenErr.Error()))
		}
	}
	return nil
}

func ExpireBlindBoxOrder(tradeNo string, expectedPaymentProvider string) error {
	if strings.TrimSpace(tradeNo) == "" {
		return errors.New("tradeNo is empty")
	}
	refCol := "`trade_no`"
	if common.UsingPostgreSQL {
		refCol = `"trade_no"`
	}
	return DB.Transaction(func(tx *gorm.DB) error {
		var order BlindBoxOrder
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where(refCol+" = ?", tradeNo).First(&order).Error; err != nil {
			return ErrBlindBoxOrderNotFound
		}
		if expectedPaymentProvider != "" && order.PaymentProvider != expectedPaymentProvider {
			return ErrPaymentMethodMismatch
		}
		if order.Status != common.TopUpStatusPending {
			return nil
		}
		order.Status = common.TopUpStatusExpired
		order.CompleteTime = common.GetTimestamp()
		return tx.Save(&order).Error
	})
}

func ValidateBlindBoxPurchase(userId int, quantity int) (float64, error) {
	setting := operation_setting.GetBlindBoxSetting()
	if !setting.Enabled {
		return 0, ErrBlindBoxDisabled
	}
	if userId <= 0 || quantity <= 0 {
		return 0, errors.New("invalid blind box request")
	}
	now := common.GetTimestamp()
	dayStart, dayEnd := getBlindBoxDayRange(now)
	monthStart, monthEnd := getBlindBoxMonthRange(now)
	todayCount, err := sumBlindBoxOrderQuantity(userId, dayStart, dayEnd)
	if err != nil {
		return 0, err
	}
	if todayCount+quantity > setting.DailyLimit {
		return 0, fmt.Errorf("daily blind box limit reached: %d", setting.DailyLimit)
	}
	monthCount, err := sumBlindBoxOrderQuantity(userId, monthStart, monthEnd)
	if err != nil {
		return 0, err
	}
	if monthCount+quantity > setting.MonthlyLimit {
		return 0, fmt.Errorf("monthly blind box limit reached: %d", setting.MonthlyLimit)
	}
	return setting.UnitPrice * float64(quantity), nil
}
