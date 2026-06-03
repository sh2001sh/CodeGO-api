package controller

import (
	"errors"
	"net/http"
	"strconv"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

func GetAllRedemptions(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	redemptions, total, err := model.GetAllRedemptions(pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(redemptions)
	common.ApiSuccess(c, pageInfo)
}

func SearchRedemptions(c *gin.Context) {
	keyword := c.Query("keyword")
	pageInfo := common.GetPageQuery(c)
	redemptions, total, err := model.SearchRedemptions(keyword, pageInfo.GetStartIdx(), pageInfo.GetPageSize())
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(redemptions)
	common.ApiSuccess(c, pageInfo)
}

func GetRedemption(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	redemption, err := model.GetRedemptionById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    redemption,
	})
}

func AddRedemption(c *gin.Context) {
	if !operation_setting.IsPaymentComplianceConfirmed() {
		common.ApiErrorI18n(c, i18n.MsgPaymentComplianceRequired)
		return
	}

	redemption := model.Redemption{}
	err := c.ShouldBindJSON(&redemption)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if utf8.RuneCountInString(redemption.Name) == 0 || utf8.RuneCountInString(redemption.Name) > 20 {
		common.ApiErrorI18n(c, i18n.MsgRedemptionNameLength)
		return
	}
	if redemption.Count <= 0 {
		common.ApiErrorI18n(c, i18n.MsgRedemptionCountPositive)
		return
	}
	if redemption.Count > 100 {
		common.ApiErrorI18n(c, i18n.MsgRedemptionCountMax)
		return
	}
	if valid, msg := validateExpiredTime(c, redemption.ExpiredTime); !valid {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": msg})
		return
	}
	if err := prepareRedemptionForWrite(&redemption); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	var keys []string
	for i := 0; i < redemption.Count; i++ {
		cleanRedemption := model.Redemption{
			UserId:           c.GetInt("id"),
			Name:             redemption.Name,
			Key:              common.GetUUID(),
			CreatedTime:      common.GetTimestamp(),
			RedeemType:       redemption.RedeemType,
			Quota:            redemption.Quota,
			PlanId:           redemption.PlanId,
			PlanTitle:        redemption.PlanTitle,
			BlindBoxQuantity: redemption.BlindBoxQuantity,
			ExpiredTime:      redemption.ExpiredTime,
		}
		err = cleanRedemption.Insert()
		if err != nil {
			common.SysError("failed to insert redemption: " + err.Error())
			c.JSON(http.StatusOK, gin.H{
				"success": false,
				"message": i18n.T(c, i18n.MsgRedemptionCreateFailed),
				"data":    keys,
			})
			return
		}
		keys = append(keys, cleanRedemption.Key)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    keys,
	})
}

func DeleteRedemption(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	err := model.DeleteRedemptionById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func UpdateRedemption(c *gin.Context) {
	statusOnly := c.Query("status_only")
	redemption := model.Redemption{}
	err := c.ShouldBindJSON(&redemption)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	cleanRedemption, err := model.GetRedemptionById(redemption.Id)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	if statusOnly == "" {
		if utf8.RuneCountInString(redemption.Name) == 0 || utf8.RuneCountInString(redemption.Name) > 20 {
			common.ApiErrorI18n(c, i18n.MsgRedemptionNameLength)
			return
		}
		if valid, msg := validateExpiredTime(c, redemption.ExpiredTime); !valid {
			c.JSON(http.StatusOK, gin.H{"success": false, "message": msg})
			return
		}
		cleanRedemption.Name = redemption.Name
		cleanRedemption.RedeemType = redemption.RedeemType
		cleanRedemption.Quota = redemption.Quota
		cleanRedemption.PlanId = redemption.PlanId
		cleanRedemption.BlindBoxQuantity = redemption.BlindBoxQuantity
		cleanRedemption.ExpiredTime = redemption.ExpiredTime
		if err := prepareRedemptionForWrite(cleanRedemption); err != nil {
			common.ApiErrorMsg(c, err.Error())
			return
		}
	}
	if statusOnly != "" {
		cleanRedemption.Status = redemption.Status
	}
	err = cleanRedemption.Update()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    cleanRedemption,
	})
}

func DeleteInvalidRedemption(c *gin.Context) {
	rows, err := model.DeleteInvalidRedemptions()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    rows,
	})
}

func validateExpiredTime(c *gin.Context, expired int64) (bool, string) {
	if expired != 0 && expired < common.GetTimestamp() {
		return false, i18n.T(c, i18n.MsgRedemptionExpireTimeInvalid)
	}
	return true, ""
}

func prepareRedemptionForWrite(redemption *model.Redemption) error {
	if redemption == nil {
		return errors.New("redemption payload is empty")
	}

	redemption.RedeemType = model.NormalizeRedemptionType(redemption.RedeemType)
	switch redemption.RedeemType {
	case model.RedemptionTypeSubscription:
		if redemption.PlanId <= 0 {
			return errors.New("subscription redemption requires a valid plan")
		}
		plan, err := model.GetSubscriptionPlanById(redemption.PlanId)
		if err != nil {
			return errors.New("subscription plan not found")
		}
		redemption.PlanTitle = plan.Title
		redemption.Quota = 0
		redemption.BlindBoxQuantity = 0
	case model.RedemptionTypeBlindBox:
		if redemption.BlindBoxQuantity <= 0 {
			return errors.New("blind box redemption requires quantity greater than 0")
		}
		redemption.Quota = 0
		redemption.PlanId = 0
		redemption.PlanTitle = ""
	default:
		if redemption.Quota <= 0 {
			return errors.New("quota redemption requires quota greater than 0")
		}
		redemption.PlanId = 0
		redemption.PlanTitle = ""
		redemption.BlindBoxQuantity = 0
	}

	return nil
}
