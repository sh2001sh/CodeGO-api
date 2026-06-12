package model

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"gorm.io/gorm"
)

const (
	SubscriptionResetOpportunityChangeEarn = "earn"
	SubscriptionResetOpportunityChangeUse  = "use"
)

var (
	ErrSubscriptionResetOpportunityUnavailable = errors.New("当前没有可用的额度重置机会")
	ErrSubscriptionResetOpportunityMonthlyUsed = errors.New("本月已经使用过一次额度重置机会")
	ErrSubscriptionResetOpportunityNoActiveSub = errors.New("当前没有可重置的生效订阅")
)

type SubscriptionResetOpportunityAccount struct {
	Id             int    `json:"id"`
	UserId         int    `json:"user_id" gorm:"uniqueIndex;not null"`
	EarnedTotal    int    `json:"earned_total" gorm:"not null;default:0"`
	UsedTotal      int    `json:"used_total" gorm:"not null;default:0"`
	AvailableTotal int    `json:"available_total" gorm:"not null;default:0"`
	LastUsedMonth  string `json:"last_used_month" gorm:"type:varchar(7);default:''"`
	CreatedAt      int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt      int64  `json:"updated_at" gorm:"bigint"`
}

func (a *SubscriptionResetOpportunityAccount) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	a.CreatedAt = now
	a.UpdatedAt = now
	return nil
}

func (a *SubscriptionResetOpportunityAccount) BeforeUpdate(tx *gorm.DB) error {
	a.UpdatedAt = common.GetTimestamp()
	return nil
}

type SubscriptionResetOpportunityLedger struct {
	Id            int    `json:"id"`
	UserId        int    `json:"user_id" gorm:"index;not null"`
	RelatedUserId int    `json:"related_user_id" gorm:"index;not null;default:0"`
	ChangeType    string `json:"change_type" gorm:"type:varchar(16);index;not null"`
	Delta         int    `json:"delta" gorm:"not null"`
	BalanceAfter  int    `json:"balance_after" gorm:"not null;default:0"`
	UsedMonth     string `json:"used_month" gorm:"type:varchar(7);index;default:''"`
	SourceType    string `json:"source_type" gorm:"type:varchar(32);index;not null;default:''"`
	SourceRef     string `json:"source_ref" gorm:"type:varchar(128);index;not null;default:''"`
	EventKey      string `json:"event_key" gorm:"type:varchar(128);uniqueIndex;not null"`
	Note          string `json:"note" gorm:"type:varchar(255);default:''"`
	CreatedAt     int64  `json:"created_at" gorm:"bigint"`
	UpdatedAt     int64  `json:"updated_at" gorm:"bigint"`
}

func (l *SubscriptionResetOpportunityLedger) BeforeCreate(tx *gorm.DB) error {
	now := common.GetTimestamp()
	l.CreatedAt = now
	l.UpdatedAt = now
	return nil
}

func (l *SubscriptionResetOpportunityLedger) BeforeUpdate(tx *gorm.DB) error {
	l.UpdatedAt = common.GetTimestamp()
	return nil
}

type SubscriptionResetOpportunitySummary struct {
	AvailableCount int    `json:"available_count"`
	EarnedTotal    int    `json:"earned_total"`
	UsedTotal      int    `json:"used_total"`
	UsedThisMonth  bool   `json:"used_this_month"`
	CurrentMonth   string `json:"current_month"`
	LastUsedMonth  string `json:"last_used_month"`
}

type SubscriptionResetOpportunityUseResult struct {
	ResetOpportunity   SubscriptionResetOpportunitySummary `json:"reset_opportunity"`
	UserSubscriptionId int                                 `json:"subscription_id"`
	AmountUsedBefore   int64                               `json:"amount_used_before"`
	AmountUsedAfter    int64                               `json:"amount_used_after"`
	PeriodUsedBefore   int64                               `json:"period_used_before"`
	PeriodUsedAfter    int64                               `json:"period_used_after"`
	ClearedUsedAmount  int64                               `json:"cleared_used_amount"`
}

func currentResetOpportunityMonth() string {
	return time.Now().In(time.Local).Format("2006-01")
}

func buildSubscriptionResetOpportunitySummary(account *SubscriptionResetOpportunityAccount) SubscriptionResetOpportunitySummary {
	summary := SubscriptionResetOpportunitySummary{
		CurrentMonth: currentResetOpportunityMonth(),
	}
	if account == nil {
		return summary
	}
	summary.AvailableCount = account.AvailableTotal
	summary.EarnedTotal = account.EarnedTotal
	summary.UsedTotal = account.UsedTotal
	summary.LastUsedMonth = strings.TrimSpace(account.LastUsedMonth)
	summary.UsedThisMonth = summary.LastUsedMonth != "" && summary.LastUsedMonth == summary.CurrentMonth
	return summary
}

func getOrCreateSubscriptionResetOpportunityAccountTx(tx *gorm.DB, userId int) (*SubscriptionResetOpportunityAccount, error) {
	if tx == nil {
		tx = DB
	}
	if userId <= 0 {
		return nil, errors.New("invalid userId")
	}
	var account SubscriptionResetOpportunityAccount
	err := tx.Set("gorm:query_option", "FOR UPDATE").
		Where("user_id = ?", userId).
		First(&account).Error
	if err == nil {
		return &account, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	account = SubscriptionResetOpportunityAccount{
		UserId: userId,
	}
	if err := tx.Create(&account).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

func GetUserSubscriptionResetOpportunity(userId int) (*SubscriptionResetOpportunitySummary, error) {
	if userId <= 0 {
		return nil, errors.New("invalid userId")
	}
	var account SubscriptionResetOpportunityAccount
	err := DB.Where("user_id = ?", userId).First(&account).Error
	if err == nil {
		summary := buildSubscriptionResetOpportunitySummary(&account)
		return &summary, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		summary := buildSubscriptionResetOpportunitySummary(nil)
		return &summary, nil
	}
	return nil, err
}

func AwardReferralSubscriptionResetOpportunityTx(tx *gorm.DB, inviteeId int, purchaseType string, orderSourceType string, orderSourceId string) error {
	if tx == nil {
		tx = DB
	}
	if inviteeId <= 0 || strings.TrimSpace(purchaseType) != ReferralPurchaseTypeMonthCard {
		return nil
	}
	inviterId, err := referralInviterIdTx(tx, inviteeId)
	if err != nil || inviterId <= 0 {
		return err
	}
	previousPaidCount, err := countSuccessfulPaidPurchasesTx(tx, inviteeId)
	if err != nil {
		return err
	}
	if previousPaidCount > 0 {
		return nil
	}

	eventKey := fmt.Sprintf("referral-reset-opportunity:%d", inviteeId)
	var existing SubscriptionResetOpportunityLedger
	if err := tx.Where("event_key = ?", eventKey).First(&existing).Error; err == nil {
		return nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	account, err := getOrCreateSubscriptionResetOpportunityAccountTx(tx, inviterId)
	if err != nil {
		return err
	}
	account.EarnedTotal++
	account.AvailableTotal++
	if err := tx.Save(account).Error; err != nil {
		return err
	}

	ledger := SubscriptionResetOpportunityLedger{
		UserId:        inviterId,
		RelatedUserId: inviteeId,
		ChangeType:    SubscriptionResetOpportunityChangeEarn,
		Delta:         1,
		BalanceAfter:  account.AvailableTotal,
		SourceType:    strings.TrimSpace(orderSourceType),
		SourceRef:     strings.TrimSpace(orderSourceId),
		EventKey:      eventKey,
		Note:          "邀请新用户首购月卡赠送额度重置机会",
	}
	return tx.Create(&ledger).Error
}

func UseUserSubscriptionResetOpportunity(userId int) (*SubscriptionResetOpportunityUseResult, error) {
	if userId <= 0 {
		return nil, errors.New("invalid userId")
	}
	now := GetDBTimestamp()
	currentMonth := currentResetOpportunityMonth()
	setting, err := GetUserSetting(userId, false)
	if err != nil {
		setting = dto.UserSetting{}
	}
	explicitOrder := common.NormalizePositiveIntSlice(setting.SubscriptionOrderIds)
	result := &SubscriptionResetOpportunityUseResult{}

	err = DB.Transaction(func(tx *gorm.DB) error {
		account, err := getOrCreateSubscriptionResetOpportunityAccountTx(tx, userId)
		if err != nil {
			return err
		}
		if account.AvailableTotal <= 0 {
			return ErrSubscriptionResetOpportunityUnavailable
		}
		if strings.TrimSpace(account.LastUsedMonth) == currentMonth {
			return ErrSubscriptionResetOpportunityMonthlyUsed
		}

		var subs []UserSubscription
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("user_id = ? AND status = ? AND end_time > ?", userId, "active", now).
			Order("end_time asc, id asc").
			Find(&subs).Error; err != nil {
			return err
		}
		if len(subs) == 0 {
			return ErrSubscriptionResetOpportunityNoActiveSub
		}
		subs, _, err = orderActiveUserSubscriptionsWithExplicitOrderTx(tx, subs, explicitOrder)
		if err != nil {
			return err
		}
		if len(subs) == 0 {
			return ErrSubscriptionResetOpportunityNoActiveSub
		}

		sub := subs[0]
		result.UserSubscriptionId = sub.Id
		result.AmountUsedBefore = sub.AmountUsed
		result.PeriodUsedBefore = sub.PeriodUsed

		sub.AmountUsed = 0
		sub.PeriodUsed = 0
		sub.ModelUsage = ""
		if err := tx.Save(&sub).Error; err != nil {
			return err
		}

		account.UsedTotal++
		account.AvailableTotal--
		account.LastUsedMonth = currentMonth
		if err := tx.Save(account).Error; err != nil {
			return err
		}

		ledger := SubscriptionResetOpportunityLedger{
			UserId:        userId,
			RelatedUserId: sub.Id,
			ChangeType:    SubscriptionResetOpportunityChangeUse,
			Delta:         -1,
			BalanceAfter:  account.AvailableTotal,
			UsedMonth:     currentMonth,
			SourceType:    "user_subscription",
			SourceRef:     strconv.Itoa(sub.Id),
			EventKey:      fmt.Sprintf("use-reset-opportunity:%d:%s", userId, currentMonth),
			Note:          "使用额度重置机会清空当前订阅已用额度",
		}
		if err := tx.Create(&ledger).Error; err != nil {
			return err
		}

		result.AmountUsedAfter = sub.AmountUsed
		result.PeriodUsedAfter = sub.PeriodUsed
		result.ClearedUsedAmount = result.AmountUsedBefore
		result.ResetOpportunity = buildSubscriptionResetOpportunitySummary(account)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}
