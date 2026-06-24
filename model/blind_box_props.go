package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	BlindBoxPropTypeTopupDiscount90       = "topup_discount_90"
	BlindBoxPropTypeSubscriptionDiscount90 = "subscription_discount_90"
	BlindBoxPropTypeConsumeDiscount95     = "consume_discount_95"
	BlindBoxPropTypeConsumeDiscount90     = "consume_discount_90"
)

const (
	BlindBoxPropStatusAvailable = "available"
	BlindBoxPropStatusActive    = "active"
	BlindBoxPropStatusReserved  = "reserved"
	BlindBoxPropStatusUsed      = "used"
	BlindBoxPropStatusExpired   = "expired"
)

const (
	BlindBoxPropOrderTypeTopup        = "topup"
	BlindBoxPropOrderTypeSubscription = "subscription"
)

const blindBoxPropActiveDurationSeconds int64 = 24 * 60 * 60

type BlindBoxProp struct {
	Id int `json:"id"`

	UserId       int     `json:"user_id" gorm:"index"`
	OpenRecordId int     `json:"open_record_id" gorm:"index"`
	PropType     string  `json:"prop_type" gorm:"type:varchar(64);index"`
	Title        string  `json:"title" gorm:"type:varchar(255)"`
	Status       string  `json:"status" gorm:"type:varchar(32);index"`

	DiscountRate float64 `json:"discount_rate" gorm:"type:decimal(8,4);not null;default:0"`
	Multiplier   float64 `json:"multiplier" gorm:"type:decimal(8,4);not null;default:1"`

	DurationSeconds int64 `json:"duration_seconds" gorm:"bigint;not null;default:0"`
	ActivatedAt     int64 `json:"activated_at" gorm:"bigint;index;default:0"`
	ExpiresAt       int64 `json:"expires_at" gorm:"bigint;index;default:0"`
	ReservedAt      int64 `json:"reserved_at" gorm:"bigint;default:0"`
	UsedAt          int64 `json:"used_at" gorm:"bigint;default:0"`

	ReservedOrderType    string `json:"reserved_order_type" gorm:"type:varchar(32);index;default:''"`
	ReservedOrderTradeNo string `json:"reserved_order_trade_no" gorm:"type:varchar(255);index;default:''"`

	CreatedAt int64 `json:"created_at" gorm:"bigint"`
	UpdatedAt int64 `json:"updated_at" gorm:"bigint"`
}

type BlindBoxPropSpec struct {
	PropType        string
	Title           string
	DiscountRate    float64
	Multiplier      float64
	DurationSeconds int64
	Activatable     bool
}

func (p *BlindBoxProp) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	p.CreatedAt = now
	p.UpdatedAt = now
	if strings.TrimSpace(p.Status) == "" {
		p.Status = BlindBoxPropStatusAvailable
	}
	return nil
}

func (p *BlindBoxProp) BeforeUpdate(tx *gorm.DB) error {
	p.UpdatedAt = common.GetTimestamp()
	return nil
}

func blindBoxPropSpecs() []BlindBoxPropSpec {
	return []BlindBoxPropSpec{
		{
			PropType:     BlindBoxPropTypeTopupDiscount90,
			Title:        "充值九折卡",
			DiscountRate: 0.10,
			Multiplier:   1,
		},
		{
			PropType:     BlindBoxPropTypeSubscriptionDiscount90,
			Title:        "套餐九折卡",
			DiscountRate: 0.10,
			Multiplier:   1,
		},
		{
			PropType:        BlindBoxPropTypeConsumeDiscount95,
			Title:           "0.95 倍率卡",
			DiscountRate:    0.05,
			Multiplier:      0.95,
			DurationSeconds: blindBoxPropActiveDurationSeconds,
			Activatable:     true,
		},
		{
			PropType:        BlindBoxPropTypeConsumeDiscount90,
			Title:           "0.9 倍率卡",
			DiscountRate:    0.10,
			Multiplier:      0.90,
			DurationSeconds: blindBoxPropActiveDurationSeconds,
			Activatable:     true,
		},
	}
}

func GetBlindBoxPropSpecByTitle(title string) (BlindBoxPropSpec, bool) {
	trimmedTitle := strings.TrimSpace(title)
	for _, spec := range blindBoxPropSpecs() {
		if spec.Title == trimmedTitle {
			return spec, true
		}
	}
	return BlindBoxPropSpec{}, false
}

func GetBlindBoxPropSpecByType(propType string) (BlindBoxPropSpec, bool) {
	trimmedType := strings.TrimSpace(propType)
	for _, spec := range blindBoxPropSpecs() {
		if spec.PropType == trimmedType {
			return spec, true
		}
	}
	return BlindBoxPropSpec{}, false
}

func IsBlindBoxPropActivatable(propType string) bool {
	spec, ok := GetBlindBoxPropSpecByType(propType)
	return ok && spec.Activatable
}

func expireBlindBoxPropIfNeededTx(tx *gorm.DB, prop *BlindBoxProp, now int64) error {
	if tx == nil || prop == nil {
		return nil
	}
	if prop.Status != BlindBoxPropStatusActive {
		return nil
	}
	if prop.ExpiresAt <= 0 || prop.ExpiresAt > now {
		return nil
	}
	prop.Status = BlindBoxPropStatusExpired
	return tx.Save(prop).Error
}

func expireUserBlindBoxPropsTx(tx *gorm.DB, userId int, now int64) error {
	if tx == nil || userId <= 0 {
		return nil
	}
	return tx.Model(&BlindBoxProp{}).
		Where("user_id = ? AND status = ? AND expires_at > 0 AND expires_at <= ?", userId, BlindBoxPropStatusActive, now).
		Updates(map[string]any{
			"status":     BlindBoxPropStatusExpired,
			"updated_at": now,
		}).Error
}

func createBlindBoxPropTx(tx *gorm.DB, userId int, openRecordId int, rewardTitle string) (*BlindBoxProp, error) {
	spec, ok := GetBlindBoxPropSpecByTitle(rewardTitle)
	if !ok {
		return nil, errors.New("unsupported blind box prop reward")
	}
	prop := &BlindBoxProp{
		UserId:          userId,
		OpenRecordId:    openRecordId,
		PropType:        spec.PropType,
		Title:           spec.Title,
		Status:          BlindBoxPropStatusAvailable,
		DiscountRate:    spec.DiscountRate,
		Multiplier:      spec.Multiplier,
		DurationSeconds: spec.DurationSeconds,
	}
	if err := tx.Create(prop).Error; err != nil {
		return nil, err
	}
	return prop, nil
}

func listUserBlindBoxPropsTx(tx *gorm.DB, userId int) ([]BlindBoxProp, error) {
	now := common.GetTimestamp()
	if err := expireUserBlindBoxPropsTx(tx, userId, now); err != nil {
		return nil, err
	}
	var props []BlindBoxProp
	err := tx.Where("user_id = ?", userId).
		Order("created_at desc, id desc").
		Find(&props).Error
	return props, err
}

func ListUserBlindBoxProps(userId int) ([]BlindBoxProp, error) {
	if userId <= 0 {
		return []BlindBoxProp{}, nil
	}
	var props []BlindBoxProp
	err := DB.Transaction(func(tx *gorm.DB) error {
		var err error
		props, err = listUserBlindBoxPropsTx(tx, userId)
		return err
	})
	return props, err
}

func ActivateBlindBoxProp(userId int, propId int) (*BlindBoxProp, error) {
	if userId <= 0 || propId <= 0 {
		return nil, errors.New("invalid blind box prop request")
	}
	var prop BlindBoxProp
	err := DB.Transaction(func(tx *gorm.DB) error {
		now := common.GetTimestamp()
		if err := expireUserBlindBoxPropsTx(tx, userId, now); err != nil {
			return err
		}
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("id = ? AND user_id = ?", propId, userId).
			First(&prop).Error; err != nil {
			return err
		}
		if err := expireBlindBoxPropIfNeededTx(tx, &prop, now); err != nil {
			return err
		}
		if !IsBlindBoxPropActivatable(prop.PropType) {
			return errors.New("this prop is applied automatically")
		}
		if prop.Status != BlindBoxPropStatusAvailable {
			return errors.New("this prop cannot be activated")
		}
		prop.Status = BlindBoxPropStatusActive
		prop.ActivatedAt = now
		prop.ExpiresAt = now + prop.DurationSeconds
		return tx.Save(&prop).Error
	})
	if err != nil {
		return nil, err
	}
	return &prop, nil
}

func GetUserBlindBoxConsumptionDiscountRate(userId int) float64 {
	if userId <= 0 {
		return 0
	}
	now := common.GetTimestamp()
	props := []BlindBoxProp{}
	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := expireUserBlindBoxPropsTx(tx, userId, now); err != nil {
			return err
		}
		return tx.Where("user_id = ? AND status = ? AND prop_type IN ?", userId, BlindBoxPropStatusActive, []string{
			BlindBoxPropTypeConsumeDiscount95,
			BlindBoxPropTypeConsumeDiscount90,
		}).Find(&props).Error
	})
	if err != nil {
		return 0
	}
	bestRate := 0.0
	for _, prop := range props {
		if prop.DiscountRate > bestRate {
			bestRate = prop.DiscountRate
		}
	}
	return bestRate
}

func getAvailableBlindBoxPropDiscountRateTx(tx *gorm.DB, userId int, propType string) float64 {
	if tx == nil || userId <= 0 || strings.TrimSpace(propType) == "" {
		return 0
	}
	var prop BlindBoxProp
	err := tx.Where("user_id = ? AND prop_type = ? AND status = ?", userId, propType, BlindBoxPropStatusAvailable).
		Order("created_at asc, id asc").
		First(&prop).Error
	if err != nil {
		return 0
	}
	return prop.DiscountRate
}

func getAvailableBlindBoxPropByTypeTx(tx *gorm.DB, userId int, propType string) (*BlindBoxProp, error) {
	var prop BlindBoxProp
	if err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("user_id = ? AND prop_type = ? AND status = ?", userId, propType, BlindBoxPropStatusAvailable).
		Order("created_at asc, id asc").
		First(&prop).Error; err != nil {
		return nil, err
	}
	return &prop, nil
}

func GetUserBlindBoxTopupDiscountRate(userId int) float64 {
	if userId <= 0 {
		return 0
	}
	return getAvailableBlindBoxPropDiscountRateTx(DB, userId, BlindBoxPropTypeTopupDiscount90)
}

func GetUserBlindBoxSubscriptionDiscountRate(userId int) float64 {
	if userId <= 0 {
		return 0
	}
	return getAvailableBlindBoxPropDiscountRateTx(DB, userId, BlindBoxPropTypeSubscriptionDiscount90)
}

func ReserveBlindBoxTopupDiscountPropTx(tx *gorm.DB, userId int, tradeNo string) (*BlindBoxProp, error) {
	if tx == nil || userId <= 0 || strings.TrimSpace(tradeNo) == "" {
		return nil, nil
	}
	prop, err := getAvailableBlindBoxPropByTypeTx(tx, userId, BlindBoxPropTypeTopupDiscount90)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	now := common.GetTimestamp()
	prop.Status = BlindBoxPropStatusReserved
	prop.ReservedAt = now
	prop.ReservedOrderType = BlindBoxPropOrderTypeTopup
	prop.ReservedOrderTradeNo = tradeNo
	if err := tx.Save(prop).Error; err != nil {
		return nil, err
	}
	return prop, nil
}

func ReserveBlindBoxSubscriptionDiscountPropTx(tx *gorm.DB, userId int, tradeNo string) (*BlindBoxProp, error) {
	if tx == nil || userId <= 0 || strings.TrimSpace(tradeNo) == "" {
		return nil, nil
	}
	prop, err := getAvailableBlindBoxPropByTypeTx(tx, userId, BlindBoxPropTypeSubscriptionDiscount90)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	now := common.GetTimestamp()
	prop.Status = BlindBoxPropStatusReserved
	prop.ReservedAt = now
	prop.ReservedOrderType = BlindBoxPropOrderTypeSubscription
	prop.ReservedOrderTradeNo = tradeNo
	if err := tx.Save(prop).Error; err != nil {
		return nil, err
	}
	return prop, nil
}

func ReleaseReservedBlindBoxPropByTradeNoTx(tx *gorm.DB, tradeNo string, orderType string) error {
	if tx == nil || strings.TrimSpace(tradeNo) == "" || strings.TrimSpace(orderType) == "" {
		return nil
	}
	return tx.Model(&BlindBoxProp{}).
		Where("reserved_order_trade_no = ? AND reserved_order_type = ? AND status = ?", tradeNo, orderType, BlindBoxPropStatusReserved).
		Updates(map[string]any{
			"status":                  BlindBoxPropStatusAvailable,
			"reserved_at":             int64(0),
			"reserved_order_type":     "",
			"reserved_order_trade_no": "",
			"updated_at":              common.GetTimestamp(),
		}).Error
}

func ConsumeReservedBlindBoxPropByTradeNoTx(tx *gorm.DB, tradeNo string, orderType string) error {
	if tx == nil || strings.TrimSpace(tradeNo) == "" || strings.TrimSpace(orderType) == "" {
		return nil
	}
	return tx.Model(&BlindBoxProp{}).
		Where("reserved_order_trade_no = ? AND reserved_order_type = ? AND status = ?", tradeNo, orderType, BlindBoxPropStatusReserved).
		Updates(map[string]any{
			"status":                  BlindBoxPropStatusUsed,
			"used_at":                 common.GetTimestamp(),
			"reserved_order_type":     "",
			"reserved_order_trade_no": "",
			"updated_at":              common.GetTimestamp(),
		}).Error
}
