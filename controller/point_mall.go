package controller

import (
	"errors"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type pointConversionRequest struct {
	Points int64 `json:"points"`
}

type pointMallProductRequest struct {
	Product model.PointMallProduct `json:"product"`
}

type pointMallCardSecretRequest struct {
	ProductId  int    `json:"product_id"`
	CardNo     string `json:"card_no"`
	CardSecret string `json:"card_secret"`
}

type pointMallOrderPatchRequest struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

type pointMallRulesRequest struct {
	Rules model.PointMallRulesConfig `json:"rules"`
}

func GetPointMallOverview(c *gin.Context) {
	overview, err := service.GetPointMallOverview(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, overview)
}

func ConvertPointMallBonusQuota(c *gin.Context) {
	var req pointConversionRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Points <= 0 {
		common.ApiErrorMsg(c, "invalid conversion request")
		return
	}
	result, err := service.ConvertBonusQuotaToPoints(c.GetInt("id"), req.Points)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, result)
}

func RedeemPointMallProduct(c *gin.Context) {
	productId, _ := strconv.Atoi(c.Param("id"))
	order, err := service.RedeemPointMallProduct(c.GetInt("id"), productId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, order)
}

func GetPointMallOrders(c *gin.Context) {
	orders, err := service.GetPointMallOrders(c.GetInt("id"), true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, orders)
}

func AdminListPointMallProducts(c *gin.Context) {
	products, err := service.ListPointMallProducts(true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, products)
}

func AdminCreatePointMallProduct(c *gin.Context) {
	var req pointMallProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	req.Product.Id = 0
	normalizePointMallProduct(&req.Product)
	if err := validatePointMallProduct(req.Product); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DB.Create(&req.Product).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, req.Product)
}

func AdminUpdatePointMallProduct(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid product id")
		return
	}
	var req pointMallProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	req.Product.Id = id
	normalizePointMallProduct(&req.Product)
	if err := validatePointMallProduct(req.Product); err != nil {
		common.ApiError(c, err)
		return
	}
	updates := map[string]interface{}{
		"name": req.Product.Name, "type": req.Product.Type, "image_url": req.Product.ImageUrl,
		"description": req.Product.Description, "points_price": req.Product.PointsPrice,
		"face_value": req.Product.FaceValue, "blind_box_quantity": req.Product.BlindBoxQuantity,
		"subscription_plan_id": req.Product.SubscriptionPlanId, "virtual_stock": req.Product.VirtualStock,
		"daily_limit_per_user": req.Product.DailyLimitPerUser, "monthly_limit_per_user": req.Product.MonthlyLimitPerUser,
		"total_limit": req.Product.TotalLimit, "status": req.Product.Status, "sort_order": req.Product.SortOrder,
	}
	if err := model.DB.Model(&model.PointMallProduct{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminListPointMallCardSecrets(c *gin.Context) {
	var cards []model.PointMallCardSecret
	if err := model.DB.Order("id desc").Limit(500).Find(&cards).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	for index := range cards {
		if c.Query("reveal") == "true" {
			if secret, err := model.DecryptPointMallSecret(cards[index].CardSecret); err == nil {
				cards[index].CardSecretView = secret
			}
		}
	}
	common.ApiSuccess(c, cards)
}

func AdminCreatePointMallCardSecret(c *gin.Context) {
	var req pointMallCardSecretRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.ProductId <= 0 || strings.TrimSpace(req.CardSecret) == "" {
		common.ApiErrorMsg(c, "invalid card secret request")
		return
	}
	encrypted, err := model.EncryptPointMallSecret(strings.TrimSpace(req.CardSecret))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	card := model.PointMallCardSecret{
		ProductId: req.ProductId, CardNo: strings.TrimSpace(req.CardNo),
		CardSecret: encrypted, Status: model.PointCardStatusUnused,
	}
	if err := model.DB.Create(&card).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, card)
}

func AdminVoidPointMallCardSecret(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid card id")
		return
	}
	if err := model.DB.Model(&model.PointMallCardSecret{}).
		Where("id = ? AND status = ?", id, model.PointCardStatusUnused).
		Update("status", model.PointCardStatusVoid).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminListPointMallOrders(c *gin.Context) {
	orders, err := service.GetPointMallOrders(0, c.Query("reveal") == "true")
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, orders)
}

func AdminPatchPointMallOrder(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	if id <= 0 {
		common.ApiErrorMsg(c, "invalid order id")
		return
	}
	var req pointMallOrderPatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	if err := patchPointMallOrder(id, req); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func AdminGetPointMallRules(c *gin.Context) {
	common.ApiSuccess(c, service.GetPointMallAdminRules())
}

func AdminUpdatePointMallRules(c *gin.Context) {
	var req pointMallRulesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}
	rules, err := service.UpdatePointMallAdminRules(req.Rules)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, rules)
}

func normalizePointMallProduct(product *model.PointMallProduct) {
	product.Name = strings.TrimSpace(product.Name)
	product.Type = strings.TrimSpace(product.Type)
	product.ImageUrl = strings.TrimSpace(product.ImageUrl)
	product.Description = strings.TrimSpace(product.Description)
	if product.Status != model.PointProductStatusOff {
		product.Status = model.PointProductStatusOn
	}
}

func validatePointMallProduct(product model.PointMallProduct) error {
	if product.Name == "" || product.PointsPrice <= 0 {
		return errors.New("product name and points price are required")
	}
	switch product.Type {
	case model.PointProductTypeJDCard, model.PointProductTypeBlindBox, model.PointProductTypeSubscription:
		return nil
	default:
		return errors.New("invalid product type")
	}
}

func patchPointMallOrder(id int, req pointMallOrderPatchRequest) error {
	status := strings.TrimSpace(req.Status)
	if status != model.PointOrderStatusFailed && status != model.PointOrderStatusRefunded {
		return errors.New("unsupported order status")
	}
	return model.DB.Transaction(func(tx *gorm.DB) error {
		var order model.PointMallOrder
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", id).First(&order).Error; err != nil {
			return err
		}
		if order.Status == model.PointOrderStatusRefunded {
			return nil
		}
		updates := map[string]interface{}{"status": status, "failure_reason": strings.TrimSpace(req.Reason)}
		if status == model.PointOrderStatusRefunded && order.PointsCost > 0 {
			key := "mall-order-refund:" + strconv.Itoa(order.Id)
			if _, _, err := model.AddPointLedgerTx(tx, order.UserId, model.PointLedgerTypeRefund, order.PointsCost, model.PointSourceMallRedeem, strconv.Itoa(order.Id), key, "积分商城订单退款"); err != nil {
				return err
			}
		}
		if order.CardSecretId > 0 && status == model.PointOrderStatusRefunded {
			if err := tx.Model(&model.PointMallCardSecret{}).Where("id = ?", order.CardSecretId).
				Updates(map[string]interface{}{"status": model.PointCardStatusUnused, "order_id": 0, "user_id": 0, "issued_at": 0}).Error; err != nil {
				return err
			}
		}
		return tx.Model(&order).Updates(updates).Error
	})
}
