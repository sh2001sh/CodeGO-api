package service

import (
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

type PointMallProductView struct {
	model.PointMallProduct
	StockRemaining int64 `json:"stock_remaining"`
	RedeemedToday  int64 `json:"redeemed_today"`
	RedeemedMonth  int64 `json:"redeemed_month"`
}

type PointMallOverview struct {
	Account               model.PointAccount     `json:"account"`
	AvailableBonusQuota   int64                  `json:"available_bonus_quota"`
	ConvertibleBonusQuota int64                  `json:"convertible_bonus_quota"`
	ConvertiblePoints     int64                  `json:"convertible_points"`
	Products              []PointMallProductView `json:"products"`
	RecentOrders          []model.PointMallOrder `json:"recent_orders"`
	RecentLedgers         []model.PointLedger    `json:"recent_ledgers"`
}

type BonusQuotaConversionResult struct {
	PointsAdded      int64              `json:"points_added"`
	BonusQuotaSpent  int64              `json:"bonus_quota_spent"`
	Account          model.PointAccount `json:"account"`
	AvailableBonus   int64              `json:"available_bonus_quota"`
	MonthlyConverted int64              `json:"monthly_converted_quota"`
}

type PointMallAdminRules struct {
	BonusQuotaPerPointUSD       int64            `json:"bonus_quota_per_point_usd"`
	MonthlyBonusConvertLimitUSD int64            `json:"monthly_bonus_convert_limit_usd"`
	PackagePurchasePoints       map[string]int64 `json:"package_purchase_points"`
	JDCardDailyLimit            int              `json:"jd_card_daily_limit"`
	JDCardMonthlyFaceLimit      int64            `json:"jd_card_monthly_face_limit"`
}

type PointMallAdminAccountView struct {
	UserId        int    `json:"user_id"`
	Username      string `json:"username"`
	DisplayName   string `json:"display_name"`
	Balance       int64  `json:"balance"`
	FrozenBalance int64  `json:"frozen_balance"`
	TotalEarned   int64  `json:"total_earned"`
	TotalSpent    int64  `json:"total_spent"`
	UpdatedAt     int64  `json:"updated_at"`
}

type PointMallAdminLedgerView struct {
	Id           int    `json:"id"`
	UserId       int    `json:"user_id"`
	Username     string `json:"username"`
	DisplayName  string `json:"display_name"`
	Type         string `json:"type"`
	Delta        int64  `json:"delta"`
	BalanceAfter int64  `json:"balance_after"`
	FrozenAfter  int64  `json:"frozen_after"`
	SourceType   string `json:"source_type"`
	Note         string `json:"note"`
	CreatedAt    int64  `json:"created_at"`
}

type PointMallAdminPointsOverview struct {
	Accounts      []PointMallAdminAccountView `json:"accounts"`
	RecentLedgers []PointMallAdminLedgerView  `json:"recent_ledgers"`
}

func pointMallDayRange(now int64) (int64, int64) {
	base := time.Unix(now, 0).In(time.Local)
	start := time.Date(base.Year(), base.Month(), base.Day(), 0, 0, 0, 0, base.Location()).Unix()
	return start, start + 24*3600
}

func pointMallMonthRange(now int64) (int64, int64) {
	base := time.Unix(now, 0).In(time.Local)
	start := time.Date(base.Year(), base.Month(), 1, 0, 0, 0, 0, base.Location()).Unix()
	return start, time.Date(base.Year(), base.Month()+1, 1, 0, 0, 0, 0, base.Location()).Unix()
}

func GetPointMallOverview(userId int) (*PointMallOverview, error) {
	if userId <= 0 {
		return nil, errors.New("invalid user id")
	}
	var account model.PointAccount
	err := model.DB.Transaction(func(tx *gorm.DB) error {
		acc, err := model.GetOrCreatePointAccountTx(tx, userId)
		if err != nil {
			return err
		}
		account = *acc
		return nil
	})
	if err != nil {
		return nil, err
	}
	availableBonus, err := model.SumAvailableBonusQuota(userId)
	if err != nil {
		return nil, err
	}
	monthlyConverted, _ := getMonthlyConvertedBonusQuota(userId)
	rules := model.GetPointMallRulesConfig()
	remainingMonthly := rules.MonthlyBonusConvertLimitUSD*int64(common.QuotaPerUnit) - monthlyConverted
	if remainingMonthly < 0 {
		remainingMonthly = 0
	}
	convertibleBonus := pointMallMinInt64(availableBonus, remainingMonthly)
	products, err := listPointMallProductsForUser(userId, false)
	if err != nil {
		return nil, err
	}
	var orders []model.PointMallOrder
	_ = model.DB.Where("user_id = ?", userId).Order("created_at desc, id desc").Limit(8).Find(&orders).Error
	var ledgers []model.PointLedger
	_ = model.DB.Where("user_id = ?", userId).Order("created_at desc, id desc").Limit(8).Find(&ledgers).Error
	return &PointMallOverview{
		Account:               account,
		AvailableBonusQuota:   availableBonus,
		ConvertibleBonusQuota: convertibleBonus,
		ConvertiblePoints:     int64(math.Floor(float64(convertibleBonus) / common.QuotaPerUnit / float64(rules.BonusQuotaPerPointUSD))),
		Products:              products,
		RecentOrders:          orders,
		RecentLedgers:         ledgers,
	}, nil
}

func ConvertBonusQuotaToPoints(userId int, requestedPoints int64) (*BonusQuotaConversionResult, error) {
	if userId <= 0 || requestedPoints <= 0 {
		return nil, errors.New("invalid conversion request")
	}
	rules := model.GetPointMallRulesConfig()
	quotaToSpend := requestedPoints * rules.BonusQuotaPerPointUSD * int64(common.QuotaPerUnit)
	var result BonusQuotaConversionResult
	err := model.DB.Transaction(func(tx *gorm.DB) error {
		monthlyConverted, err := getMonthlyConvertedBonusQuotaTx(tx, userId)
		if err != nil {
			return err
		}
		monthlyLimit := rules.MonthlyBonusConvertLimitUSD * int64(common.QuotaPerUnit)
		if monthlyConverted+quotaToSpend > monthlyLimit {
			return errors.New("monthly bonus quota conversion limit reached")
		}
		spent, err := consumeBonusQuotaCreditsTx(tx, userId, quotaToSpend)
		if err != nil {
			return err
		}
		if spent != quotaToSpend {
			return errors.New("available bonus quota is insufficient")
		}
		res := tx.Model(&model.User{}).
			Where("id = ? AND quota >= ?", userId, quotaToSpend).
			Update("quota", gorm.Expr("quota - ?", quotaToSpend))
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errors.New("user quota is insufficient")
		}
		key := fmt.Sprintf("bonus-conversion:%d:%d:%d", userId, time.Now().UnixNano(), quotaToSpend)
		ledger, _, err := model.AddPointLedgerTx(tx, userId, model.PointLedgerTypeEarn, requestedPoints, model.PointSourceBonusConversion, "", key, "赠送额度兑换积分")
		if err != nil {
			return err
		}
		result.PointsAdded = requestedPoints
		result.BonusQuotaSpent = quotaToSpend
		result.Account = model.PointAccount{UserId: userId, Balance: ledger.BalanceAfter, FrozenBalance: ledger.FrozenAfter}
		result.MonthlyConverted = monthlyConverted + quotaToSpend
		return nil
	})
	if err != nil {
		return nil, err
	}
	_, _ = model.GetUserQuota(userId, true)
	result.AvailableBonus, _ = model.SumAvailableBonusQuota(userId)
	return &result, nil
}

func RedeemPointMallProduct(userId int, productId int) (*model.PointMallOrder, error) {
	if userId <= 0 || productId <= 0 {
		return nil, errors.New("invalid redeem request")
	}
	var order model.PointMallOrder
	err := model.DB.Transaction(func(tx *gorm.DB) error {
		var product model.PointMallProduct
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", productId).First(&product).Error; err != nil {
			return err
		}
		if err := validateProductRedeemTx(tx, userId, &product); err != nil {
			return err
		}
		order = model.PointMallOrder{
			UserId:      userId,
			ProductId:   product.Id,
			ProductName: product.Name,
			ProductType: product.Type,
			PointsCost:  product.PointsPrice,
			Status:      model.PointOrderStatusPending,
		}
		if err := tx.Create(&order).Error; err != nil {
			return err
		}
		key := fmt.Sprintf("mall-redeem:%d", order.Id)
		if _, _, err := model.AddPointLedgerTx(tx, userId, model.PointLedgerTypeSpend, -product.PointsPrice, model.PointSourceMallRedeem, fmt.Sprintf("%d", order.Id), key, "积分商城兑换"); err != nil {
			return err
		}
		return deliverPointMallOrderTx(tx, &order, &product)
	})
	if err != nil {
		return nil, err
	}
	if err := model.DB.Where("id = ?", order.Id).First(&order).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func GetPointMallOrders(userId int, includeSecret bool) ([]model.PointMallOrder, error) {
	var orders []model.PointMallOrder
	query := model.DB.Order("created_at desc, id desc")
	if userId > 0 {
		query = query.Where("user_id = ?", userId)
	}
	if err := query.Limit(200).Find(&orders).Error; err != nil {
		return nil, err
	}
	if includeSecret {
		for index := range orders {
			attachOrderCardSecret(&orders[index])
		}
	}
	return orders, nil
}

func GetPointMallAdminRules() PointMallAdminRules {
	rules := model.GetPointMallRulesConfig()
	return PointMallAdminRules{
		BonusQuotaPerPointUSD:       rules.BonusQuotaPerPointUSD,
		MonthlyBonusConvertLimitUSD: rules.MonthlyBonusConvertLimitUSD,
		PackagePurchasePoints: map[string]int64{
			"Lite":     model.PackagePurchasePointReward("Lite"),
			"Standard": model.PackagePurchasePointReward("Standard"),
			"Pro":      model.PackagePurchasePointReward("Pro"),
			"Ultra":    model.PackagePurchasePointReward("Ultra"),
		},
		JDCardDailyLimit:       rules.JDCardDailyLimit,
		JDCardMonthlyFaceLimit: rules.JDCardMonthlyFaceLimit,
	}
}

func UpdatePointMallAdminRules(input model.PointMallRulesConfig) (PointMallAdminRules, error) {
	if _, err := model.UpdatePointMallRulesConfig(input); err != nil {
		return PointMallAdminRules{}, err
	}
	return GetPointMallAdminRules(), nil
}

func GetPointMallAdminPointsOverview() (*PointMallAdminPointsOverview, error) {
	var accounts []PointMallAdminAccountView
	if err := model.DB.Table("point_accounts").
		Select("point_accounts.user_id, users.username, users.display_name, point_accounts.balance, point_accounts.frozen_balance, point_accounts.updated_at").
		Joins("LEFT JOIN users ON users.id = point_accounts.user_id").
		Order("point_accounts.updated_at desc, point_accounts.user_id desc").
		Limit(300).Scan(&accounts).Error; err != nil {
		return nil, err
	}

	type totalsRow struct {
		UserId      int
		TotalEarned int64
		TotalSpent  int64
	}
	var totals []totalsRow
	if err := model.DB.Table("point_ledgers").
		Select("user_id, SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END) AS total_earned, SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END) AS total_spent").
		Group("user_id").Scan(&totals).Error; err != nil {
		return nil, err
	}
	totalsByUser := make(map[int]totalsRow, len(totals))
	for _, row := range totals {
		totalsByUser[row.UserId] = row
	}
	for index := range accounts {
		if row, ok := totalsByUser[accounts[index].UserId]; ok {
			accounts[index].TotalEarned = row.TotalEarned
			accounts[index].TotalSpent = row.TotalSpent
		}
	}

	var ledgers []PointMallAdminLedgerView
	if err := model.DB.Table("point_ledgers").
		Select("point_ledgers.id, point_ledgers.user_id, users.username, users.display_name, point_ledgers.type, point_ledgers.delta, point_ledgers.balance_after, point_ledgers.frozen_after, point_ledgers.source_type, point_ledgers.note, point_ledgers.created_at").
		Joins("LEFT JOIN users ON users.id = point_ledgers.user_id").
		Order("point_ledgers.created_at desc, point_ledgers.id desc").
		Limit(300).Scan(&ledgers).Error; err != nil {
		return nil, err
	}

	return &PointMallAdminPointsOverview{Accounts: accounts, RecentLedgers: ledgers}, nil
}

func ListPointMallProducts(admin bool) ([]PointMallProductView, error) {
	return listPointMallProductsForUser(0, admin)
}

func listPointMallProductsForUser(userId int, admin bool) ([]PointMallProductView, error) {
	var products []model.PointMallProduct
	query := model.DB.Order("sort_order desc, id desc")
	if !admin {
		query = query.Where("status = ?", model.PointProductStatusOn)
	}
	if err := query.Find(&products).Error; err != nil {
		return nil, err
	}
	if len(products) == 0 {
		if err := model.SeedDefaultPointMallProducts(); err != nil {
			return nil, err
		}
		query = model.DB.Order("sort_order desc, id desc")
		if !admin {
			query = query.Where("status = ?", model.PointProductStatusOn)
		}
		if err := query.Find(&products).Error; err != nil {
			return nil, err
		}
	}
	views := make([]PointMallProductView, 0, len(products))
	for _, product := range products {
		view := PointMallProductView{PointMallProduct: product}
		view.StockRemaining = getProductStockRemaining(product)
		if userId > 0 {
			view.RedeemedToday, view.RedeemedMonth = countUserProductRedeems(userId, product.Id)
		}
		views = append(views, view)
	}
	return views, nil
}

func validateProductRedeemTx(tx *gorm.DB, userId int, product *model.PointMallProduct) error {
	if product.Status != model.PointProductStatusOn {
		return errors.New("product is not available")
	}
	if product.PointsPrice <= 0 {
		return errors.New("product points price is invalid")
	}
	if product.Type == model.PointProductTypeJDCard {
		if err := validateJDCardRedeemTx(tx, userId, product); err != nil {
			return err
		}
	}
	today, month := countUserProductRedeemsTx(tx, userId, product.Id)
	if product.DailyLimitPerUser > 0 && today >= int64(product.DailyLimitPerUser) {
		return errors.New("daily redeem limit reached")
	}
	if product.MonthlyLimitPerUser > 0 && month >= int64(product.MonthlyLimitPerUser) {
		return errors.New("monthly redeem limit reached")
	}
	if product.TotalLimit > 0 {
		var total int64
		tx.Model(&model.PointMallOrder{}).Where("product_id = ? AND status = ?", product.Id, model.PointOrderStatusSuccess).Count(&total)
		if total >= int64(product.TotalLimit) {
			return errors.New("product total redeem limit reached")
		}
	}
	return nil
}
