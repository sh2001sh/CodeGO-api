package controller

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type subscriptionAPIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func setupSubscriptionControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	gin.SetMode(gin.TestMode)
	common.UsingSQLite = true
	common.UsingMySQL = false
	common.UsingPostgreSQL = false
	common.RedisEnabled = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)

	model.DB = db
	model.LOG_DB = db
	require.NoError(t, db.AutoMigrate(&model.SubscriptionPlan{}))

	t.Cleanup(func() {
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return db
}

func withPaymentComplianceConfirmed(t *testing.T) {
	t.Helper()

	paymentSetting := operation_setting.GetPaymentSetting()
	originalConfirmed := paymentSetting.ComplianceConfirmed
	originalTermsVersion := paymentSetting.ComplianceTermsVersion

	paymentSetting.ComplianceConfirmed = true
	paymentSetting.ComplianceTermsVersion = operation_setting.CurrentComplianceTermsVersion

	t.Cleanup(func() {
		paymentSetting.ComplianceConfirmed = originalConfirmed
		paymentSetting.ComplianceTermsVersion = originalTermsVersion
	})
}

func TestAdminUpdateSubscriptionPlanUsesLegacyBonusColumns(t *testing.T) {
	db := setupSubscriptionControllerTestDB(t)
	withPaymentComplianceConfirmed(t)

	plan := model.SubscriptionPlan{
		Title:                   "Starter",
		Subtitle:                "starter",
		PriceAmount:             9.9,
		Currency:                "USD",
		DurationUnit:            model.SubscriptionDurationMonth,
		DurationValue:           1,
		Enabled:                 true,
		PlanType:                model.SubscriptionPlanTypeMonthly,
		MaxPurchasePerUser:      1,
		GroupBuyEnabled:         true,
		GroupBuyBonus2:          0,
		GroupBuyBonus3:          0,
		GroupBuyBonus5:          0,
		RenewalBonus2:           0,
		RenewalBonus3:           0,
		RenewalBonus4:           0,
		TotalAmount:             100,
		PeriodAmount:            100,
		QuotaResetPeriod:        model.SubscriptionResetMonthly,
		QuotaResetCustomSeconds: 0,
	}
	require.NoError(t, db.Create(&plan).Error)

	body, err := json.Marshal(AdminUpsertSubscriptionPlanRequest{
		Plan: model.SubscriptionPlan{
			Title:                   "Starter Updated",
			Subtitle:                "starter updated",
			PriceAmount:             19.9,
			Currency:                "USD",
			DurationUnit:            model.SubscriptionDurationMonth,
			DurationValue:           1,
			Enabled:                 true,
			PlanType:                model.SubscriptionPlanTypeMonthly,
			MaxPurchasePerUser:      2,
			GroupBuyEnabled:         true,
			GroupBuyBonus2:          20,
			GroupBuyBonus3:          30,
			GroupBuyBonus5:          50,
			RenewalBonus2:           0.2,
			RenewalBonus3:           0.3,
			RenewalBonus4:           0.4,
			TotalAmount:             200,
			PeriodAmount:            200,
			QuotaResetPeriod:        model.SubscriptionResetMonthly,
			QuotaResetCustomSeconds: 0,
		},
	})
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = gin.Params{{Key: "id", Value: fmt.Sprintf("%d", plan.Id)}}
	ctx.Request = httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/subscription/%d", plan.Id), bytes.NewReader(body))
	ctx.Request.Header.Set("Content-Type", "application/json")

	AdminUpdateSubscriptionPlan(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)

	var response subscriptionAPIResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.True(t, response.Success, response.Message)

	var reloaded model.SubscriptionPlan
	require.NoError(t, db.First(&reloaded, plan.Id).Error)
	assert.Equal(t, 20.0, reloaded.GroupBuyBonus2)
	assert.Equal(t, 30.0, reloaded.GroupBuyBonus3)
	assert.Equal(t, 50.0, reloaded.GroupBuyBonus5)
	assert.Equal(t, 0.2, reloaded.RenewalBonus2)
	assert.Equal(t, 0.3, reloaded.RenewalBonus3)
	assert.Equal(t, 0.4, reloaded.RenewalBonus4)
}
