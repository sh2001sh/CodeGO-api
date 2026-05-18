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

	UserId          int     `json:"user_id" gorm:"index"`
	OpenRecordId    int     `json:"open_record_id" gorm:"index"`
	OriginalAmount  int64   `json:"original_amount" gorm:"type:bigint;not null;default:0"`
	RemainingAmount int64   `json:"remaining_amount" gorm:"type:bigint;not null;default:0;index"`
	RewardUSD       float64 `json:"reward_usd"`
	ExpiresAt       int64   `json:"expires_at" gorm:"bigint;index"`
	Status          string  `json:"status" gorm:"type:varchar(32);index"`
	CreatedAt       int64   `json:"created_at" gorm:"bigint"`
	UpdatedAt       int64   `json:"updated_at" gorm:"bigint"`
}

type BlindBoxOpenRecord struct {
	Id int `json:"id"`

	UserId             int     `json:"user_id" gorm:"index"`
	OrderId            int     `json:"order_id" gorm:"index"`
	RewardType         string  `json:"reward_type" gorm:"type:varchar(32);index"`
	RewardUSD          float64 `json:"reward_usd"`
	CreditAmount       int64   `json:"credit_amount" gorm:"type:bigint;not null;default:0"`
	RewardTitle        string  `json:"reward_title" gorm:"type:varchar(255)"`
	RewardTier         string  `json:"reward_tier" gorm:"type:varchar(64)"`
	UserSubscriptionId int     `json:"user_subscription_id" gorm:"index"`
	IsPity             bool    `json:"is_pity"`
	CreateTime         int64   `json:"create_time" gorm:"bigint;index"`
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
	AvailableBoxes     int                  `json:"available_boxes"`
	PendingBoxes       int                  `json:"pending_boxes"`
	ActiveCreditCount  int                  `json:"active_credit_count"`
	RemainingQuota     int64                `json:"remaining_quota"`
	NextExpireAt       int64                `json:"next_expire_at"`
	PityProgress       int                  `json:"pity_progress"`
	PityThreshold      int                  `json:"pity_threshold"`
	PurchasedToday     int                  `json:"purchased_today"`
	PurchasedThisMonth int                  `json:"purchased_this_month"`
	RecentRecords      []BlindBoxOpenRecord `json:"recent_records"`
	ActiveCredits      []BlindBoxCredit     `json:"active_credits"`
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
		Where("user_id = ? AND create_time >= ? AND create_time < ? AND status <> ?", userId, start, end, common.TopUpStatusExpired).
		Scan(&row).Error
	return int(row.Total), err
}

func GetUserBlindBoxOverview(userId int, recentLimit int) (*BlindBoxOverview, error) {
	if userId <= 0 {
		return nil, errors.New("invalid userId")
	}
	now := common.GetTimestamp()
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
	credits, err := GetActiveBlindBoxCredits(userId)
	if err != nil {
		return nil, err
	}
	overview.ActiveCredits = credits
	overview.ActiveCreditCount = len(credits)
	for _, credit := range credits {
		overview.RemainingQuota += credit.RemainingAmount
		if overview.NextExpireAt == 0 || credit.ExpiresAt < overview.NextExpireAt {
			overview.NextExpireAt = credit.ExpiresAt
		}
	}
	var pity BlindBoxPityState
	if err := DB.Where("user_id = ?", userId).First(&pity).Error; err == nil {
		overview.PityProgress = pity.ConsecutiveLowRewards
	}
	setting := operation_setting.GetBlindBoxSetting()
	overview.PityThreshold = setting.PityThreshold
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

func GetActiveBlindBoxCredits(userId int) ([]BlindBoxCredit, error) {
	now := common.GetTimestamp()
	var credits []BlindBoxCredit
	err := DB.Where("user_id = ? AND remaining_amount > 0 AND expires_at > ?", userId, now).
		Order("expires_at asc, id asc").
		Find(&credits).Error
	return credits, err
}

func CompleteBlindBoxOrder(tradeNo string, providerPayload string, expectedPaymentProvider string, actualPaymentMethod string) error {
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
		if order.Status == common.TopUpStatusSuccess {
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
		return tx.Save(&order).Error
	})
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
