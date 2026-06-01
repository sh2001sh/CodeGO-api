package model

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

func SeedDefaultPointMallProducts() error {
	plans := map[string]int{}
	var subscriptionPlans []SubscriptionPlan
	if err := DB.Find(&subscriptionPlans).Error; err == nil {
		for _, plan := range subscriptionPlans {
			plans[strings.TrimSpace(plan.Title)] = plan.Id
		}
	}
	defaults := []PointMallProduct{
		{Name: "京东 E 卡 10 元", Type: PointProductTypeJDCard, PointsPrice: 20, FaceValue: 10, DailyLimitPerUser: 1, MonthlyLimitPerUser: 10, SortOrder: 80, Status: PointProductStatusOn, ImageUrl: "/assets/point-mall/jd-card-10.svg", Description: "兑换后可在兑换记录中查看卡号和卡密。"},
		{Name: "京东 E 卡 20 元", Type: PointProductTypeJDCard, PointsPrice: 40, FaceValue: 20, DailyLimitPerUser: 1, MonthlyLimitPerUser: 5, SortOrder: 70, Status: PointProductStatusOn, ImageUrl: "/assets/point-mall/jd-card-20.svg", Description: "兑换后可在兑换记录中查看卡号和卡密。"},
		{Name: "盲盒券×1", Type: PointProductTypeBlindBox, PointsPrice: 3, BlindBoxQuantity: 1, VirtualStock: 999999, MonthlyLimitPerUser: 20, SortOrder: 60, Status: PointProductStatusOn, ImageUrl: "/assets/point-mall/blind-box-1.svg", Description: "兑换后增加 1 次盲盒开启机会。"},
		{Name: "盲盒券×5", Type: PointProductTypeBlindBox, PointsPrice: 12, BlindBoxQuantity: 5, VirtualStock: 999999, MonthlyLimitPerUser: 10, SortOrder: 50, Status: PointProductStatusOn, ImageUrl: "/assets/point-mall/blind-box-5.svg", Description: "兑换后增加 5 次盲盒开启机会。"},
		{Name: "Lite 月卡", Type: PointProductTypeSubscription, PointsPrice: 70, SubscriptionPlanId: pointMallPlanId(plans, "Lite"), VirtualStock: 999999, MonthlyLimitPerUser: 1, SortOrder: 40, Status: PointProductStatusOn, ImageUrl: "/assets/point-mall/month-card-lite.svg", Description: "积分兑换月卡不再赠送购买积分。"},
		{Name: "Standard 月卡", Type: PointProductTypeSubscription, PointsPrice: 140, SubscriptionPlanId: pointMallPlanId(plans, "Standard"), VirtualStock: 999999, MonthlyLimitPerUser: 1, SortOrder: 30, Status: PointProductStatusOn, ImageUrl: "/assets/point-mall/month-card-standard.svg", Description: "积分兑换月卡不再赠送购买积分。"},
		{Name: "Pro 月卡", Type: PointProductTypeSubscription, PointsPrice: 320, SubscriptionPlanId: pointMallPlanId(plans, "Pro"), VirtualStock: 999999, MonthlyLimitPerUser: 1, SortOrder: 20, Status: PointProductStatusOn, ImageUrl: "/assets/point-mall/month-card-pro.svg", Description: "积分兑换月卡不再赠送购买积分。"},
		{Name: "Ultra 月卡", Type: PointProductTypeSubscription, PointsPrice: 850, SubscriptionPlanId: pointMallPlanId(plans, "Ultra"), VirtualStock: 999999, MonthlyLimitPerUser: 1, SortOrder: 10, Status: PointProductStatusOn, ImageUrl: "/assets/point-mall/month-card-ultra.svg", Description: "积分兑换月卡不再赠送购买积分。"},
	}
	for _, item := range defaults {
		var existing PointMallProduct
		err := findDefaultPointMallProduct(item, &existing)
		if err == nil {
			if err := updateDefaultPointMallProduct(&existing, item); err != nil {
				return err
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if err := DB.Create(&item).Error; err != nil {
			return fmt.Errorf("seed point mall product %s: %w", item.Name, err)
		}
	}
	return nil
}

func findDefaultPointMallProduct(item PointMallProduct, existing *PointMallProduct) error {
	query := DB.Where("type = ?", item.Type)
	switch item.Type {
	case PointProductTypeJDCard:
		query = query.Where("face_value = ?", item.FaceValue)
	case PointProductTypeBlindBox:
		query = query.Where("blind_box_quantity = ?", item.BlindBoxQuantity)
	case PointProductTypeSubscription:
		query = query.Where("points_price = ?", item.PointsPrice)
	default:
		query = query.Where("name = ?", item.Name)
	}
	return query.First(existing).Error
}

func pointMallPlanId(plans map[string]int, prefix string) int {
	for title, id := range plans {
		if strings.HasPrefix(strings.TrimSpace(title), prefix) {
			return id
		}
	}
	return 0
}

func updateDefaultPointMallProduct(existing *PointMallProduct, item PointMallProduct) error {
	updates := map[string]interface{}{
		"points_price":           item.PointsPrice,
		"face_value":             item.FaceValue,
		"blind_box_quantity":     item.BlindBoxQuantity,
		"subscription_plan_id":   item.SubscriptionPlanId,
		"virtual_stock":          item.VirtualStock,
		"daily_limit_per_user":   item.DailyLimitPerUser,
		"monthly_limit_per_user": item.MonthlyLimitPerUser,
		"sort_order":             item.SortOrder,
		"image_url":              item.ImageUrl,
		"description":            item.Description,
		"name":                   item.Name,
		"status":                 item.Status,
	}
	return DB.Model(existing).Updates(updates).Error
}
