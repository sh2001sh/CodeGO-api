package app

import (
	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/constant"
	"github.com/sh2001sh/new-api/dto"
	billingschema "github.com/sh2001sh/new-api/internal/billing/schema"
	relaycommon "github.com/sh2001sh/new-api/internal/gateway/runtime"
	identityschema "github.com/sh2001sh/new-api/internal/identity/schema"
	identitystore "github.com/sh2001sh/new-api/internal/identity/store"
	platformdb "github.com/sh2001sh/new-api/internal/platform/db"
	"github.com/sh2001sh/new-api/internal/platform/logger"
	"github.com/sh2001sh/new-api/types"
	"github.com/stretchr/testify/require"
	"net/http/httptest"
	"testing"
)

func TestIsClaudeBillingRequestUsesChannelSettingOnly(t *testing.T) {
	info := &relaycommon.RelayInfo{
		OriginModelName: "claude-3-7-sonnet",
		RelayFormat:     types.RelayFormatClaude,
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelSetting: dto.ChannelSettings{},
		},
	}

	require.False(t, isClaudeBillingRequest(info))

	info.ChannelSetting.ClaudeWalletEnabled = true
	require.True(t, isClaudeBillingRequest(info))
}

func TestBillingSessionRefundSyncRestoresWalletAndTokenPreConsume(t *testing.T) {
	truncate(t)
	seedUser(t, 1001, 10000)
	seedToken(t, 2001, 1001, "sk-refund", 10000)

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	info := &relaycommon.RelayInfo{
		UserId:          1001,
		UserQuota:       10000,
		TokenId:         2001,
		TokenKey:        "sk-refund",
		OriginModelName: "gpt-5",
		RequestId:       "req-refund",
		IsPlayground:    true,
		ForcePreConsume: true,
		UserSetting: dto.UserSetting{
			BillingPreference: "wallet_only",
		},
	}

	session, apiErr := NewBillingSession(ctx, info, 3000)
	require.Nil(t, apiErr)
	require.Equal(t, 3000, session.GetPreConsumedQuota())

	userQuota, err := identitystore.LoadUserQuota(1001, false)
	require.NoError(t, err)
	require.Equal(t, 7000, userQuota)
	require.Equal(t, int64(7000), loadBillingSnapshot(t, 1001, "wallet").AvailableBalance)

	require.NoError(t, session.RefundSync(ctx))

	userQuota, err = identitystore.LoadUserQuota(1001, false)
	require.NoError(t, err)
	require.Equal(t, 10000, userQuota)
	require.Equal(t, int64(10000), loadBillingSnapshot(t, 1001, "wallet").AvailableBalance)
}

func TestBillingSessionSettleAdjustsWalletAndTokenToActualUsage(t *testing.T) {
	truncate(t)
	seedUser(t, 1002, 10000)
	seedToken(t, 2002, 1002, "sk-settle", 10000)

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	info := &relaycommon.RelayInfo{
		UserId:          1002,
		UserQuota:       10000,
		TokenId:         2002,
		TokenKey:        "sk-settle",
		OriginModelName: "gpt-5",
		RequestId:       "req-settle",
		IsPlayground:    true,
		ForcePreConsume: true,
		UserSetting: dto.UserSetting{
			BillingPreference: "wallet_only",
		},
	}

	session, apiErr := NewBillingSession(ctx, info, 3000)
	require.Nil(t, apiErr)

	require.NoError(t, session.Settle(4500))

	userQuota, err := identitystore.LoadUserQuota(1002, false)
	require.NoError(t, err)
	require.Equal(t, 5500, userQuota)
	snapshot := loadBillingSnapshot(t, 1002, "wallet")
	require.Equal(t, int64(5500), snapshot.AvailableBalance)
	require.Equal(t, int64(4500), snapshot.ConsumedTotal)
	require.NoError(t, session.RefundSync(ctx))
	userQuota, err = identitystore.LoadUserQuota(1002, false)
	require.NoError(t, err)
	require.Equal(t, 5500, userQuota)
}

func TestBridgeSeparatesWalletAndClaudeLedgerAccounts(t *testing.T) {
	truncate(t)
	require.NoError(t, platformdb.DB.Create(&identityschema.User{
		Id:          1005,
		Username:    "dual_wallet_user",
		Quota:       5000,
		ClaudeQuota: 2000,
		Status:      constant.UserStatusEnabled,
	}).Error)

	require.NoError(t, AdjustWalletQuota(1005, 1000))
	require.NoError(t, AdjustClaudeWalletQuota(1005, 500))

	walletSnapshot := loadBillingSnapshot(t, 1005, "wallet")
	require.Equal(t, int64(4000), walletSnapshot.AvailableBalance)

	claudeSnapshot := loadBillingSnapshot(t, 1005, "claude_wallet")
	require.Equal(t, int64(1500), claudeSnapshot.AvailableBalance)

	var accounts []billingschema.BillingAccount
	require.NoError(t, platformdb.DB.Where("owner_type = ? AND owner_id = ?", "user", 1005).Order("account_type asc").Find(&accounts).Error)
	require.Len(t, accounts, 2)
	require.Equal(t, "claude_wallet", accounts[0].AccountType)
	require.Equal(t, "wallet", accounts[1].AccountType)
}

func TestAdjustWalletQuotaConsumesBonusQuotaCredits(t *testing.T) {
	truncate(t)
	require.NoError(t, platformdb.DB.Create(&identityschema.User{
		Id:       1006,
		Username: "bonus_wallet_user",
		Quota:    1000,
		Status:   constant.UserStatusEnabled,
	}).Error)
	require.NoError(t, platformdb.DB.Create(&billingschema.BonusQuotaCredit{
		UserId:          1006,
		OriginalAmount:  1000,
		RemainingAmount: 1000,
		SourceType:      billingschema.PointSourceBonusConversion,
		SourceId:        "seed-bonus-credit",
		IdempotencyKey:  "seed-bonus-credit",
		Status:          billingschema.BonusQuotaStatusActive,
	}).Error)

	require.NoError(t, AdjustWalletQuota(1006, 400))

	userQuota, err := identitystore.LoadUserQuota(1006, false)
	require.NoError(t, err)
	require.Equal(t, 600, userQuota)

	var credit billingschema.BonusQuotaCredit
	require.NoError(t, platformdb.DB.Where("user_id = ?", 1006).First(&credit).Error)
	require.EqualValues(t, 600, credit.RemainingAmount)
	require.Equal(t, billingschema.BonusQuotaStatusActive, credit.Status)

	require.NoError(t, AdjustWalletQuota(1006, 600))

	require.NoError(t, platformdb.DB.Where("user_id = ?", 1006).First(&credit).Error)
	require.Zero(t, credit.RemainingAmount)
	require.Equal(t, billingschema.BonusQuotaStatusExhausted, credit.Status)
}

func TestNewBillingSessionReturnsLocalWalletQuotaMessage(t *testing.T) {
	truncate(t)
	seedUser(t, 1003, 750)
	seedToken(t, 2003, 1003, "sk-wallet-insufficient", 10000)

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	info := &relaycommon.RelayInfo{
		UserId:          1003,
		TokenId:         2003,
		TokenKey:        "sk-wallet-insufficient",
		OriginModelName: "gpt-5",
		RequestId:       "req-wallet-insufficient",
		IsPlayground:    true,
		ForcePreConsume: true,
		UserSetting: dto.UserSetting{
			BillingPreference: "wallet_only",
		},
	}

	session, apiErr := NewBillingSession(ctx, info, 2364)
	require.Nil(t, session)
	require.NotNil(t, apiErr)
	require.Equal(t, types.ErrorCodeInsufficientUserQuota, apiErr.GetErrorCode())
	require.Equal(t,
		"站内余额不足, 当前余额: "+logger.FormatQuota(750)+", 本次所需: "+logger.FormatQuota(2364),
		apiErr.Error(),
	)
}

func TestNewBillingSessionReturnsLocalClaudeQuotaMessage(t *testing.T) {
	truncate(t)
	require.NoError(t, platformdb.DB.Model(&identityschema.User{}).Create(&identityschema.User{
		Id:          1004,
		Username:    "claude_user",
		ClaudeQuota: 750,
		Status:      constant.UserStatusEnabled,
	}).Error)
	seedToken(t, 2004, 1004, "sk-claude-insufficient", 10000)

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	info := &relaycommon.RelayInfo{
		UserId:          1004,
		TokenId:         2004,
		TokenKey:        "sk-claude-insufficient",
		OriginModelName: "claude-3-7-sonnet",
		RequestId:       "req-claude-insufficient",
		IsPlayground:    true,
		ForcePreConsume: true,
		ChannelMeta: &relaycommon.ChannelMeta{
			ChannelSetting: dto.ChannelSettings{
				ClaudeWalletEnabled: true,
			},
		},
	}

	session, apiErr := NewBillingSession(ctx, info, 2364)
	require.Nil(t, session)
	require.NotNil(t, apiErr)
	require.Equal(t, types.ErrorCodeInsufficientUserQuota, apiErr.GetErrorCode())
	require.Equal(t,
		"Claude额度不足, 当前余额: "+logger.FormatQuota(750)+", 本次所需: "+logger.FormatQuota(2364),
		apiErr.Error(),
	)
}

func loadBillingSnapshot(t *testing.T, userID int, accountType string) *billingschema.BillingBalanceSnapshot {
	t.Helper()
	var account billingschema.BillingAccount
	require.NoError(t, platformdb.DB.Where("owner_type = ? AND owner_id = ? AND account_type = ?", "user", userID, accountType).First(&account).Error)

	var snapshot billingschema.BillingBalanceSnapshot
	require.NoError(t, platformdb.DB.Where("account_id = ?", account.AccountID).First(&snapshot).Error)
	return &snapshot
}
