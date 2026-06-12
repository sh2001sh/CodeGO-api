package controller

import (
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

const miniProgramBindCodeTTL = 10 * time.Minute

type miniProgramSessionRequest struct {
	Code string `json:"code"`
}

type miniProgramBindRequest struct {
	BindCode string `json:"bind_code"`
}

type miniProgramShareCheckRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

type miniProgramDailyUsageItem struct {
	Date      string `json:"date"`
	Timestamp int64  `json:"timestamp"`
	Requests  int64  `json:"requests"`
	Quota     int64  `json:"quota"`
	TokenUsed int64  `json:"token_used"`
}

func maskMiniProgramIdentifier(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	runes := []rune(value)
	if len(runes) <= 4 {
		return strings.Repeat("*", len(runes))
	}
	return string(runes[:2]) + strings.Repeat("*", len(runes)-4) + string(runes[len(runes)-2:])
}

func maskMiniProgramAccountLabel(user *model.User) string {
	if user == nil {
		return ""
	}
	if strings.TrimSpace(user.Email) != "" {
		return common.MaskEmail(user.Email)
	}
	if strings.TrimSpace(user.DisplayName) != "" {
		return maskMiniProgramIdentifier(user.DisplayName)
	}
	return maskMiniProgramIdentifier(user.Username)
}

func buildMiniProgramWebsiteLinks() gin.H {
	baseURL := strings.TrimRight(strings.TrimSpace(service.GetCallbackAddress()), "/")
	if baseURL == "" {
		baseURL = strings.TrimRight(strings.TrimSpace(common.TopUpLink), "/")
	}

	link := func(path string) string {
		if baseURL == "" {
			return path
		}
		return baseURL + path
	}

	return gin.H{
		"home_url":     link("/"),
		"landing_url":  link("/miniapp/landing"),
		"guide_url":    link("/guide"),
		"pricing_url":  link("/pricing"),
		"profile_url":  link("/profile"),
		"packages_url": link("/packages"),
		"support_hint": "Use the website for account actions, purchases, and support requests.",
	}
}

func buildMiniProgramBindingPayload(binding *model.UserWeChatBinding, user *model.User) gin.H {
	if binding == nil {
		return gin.H{
			"bound": false,
		}
	}

	payload := gin.H{
		"bound":         true,
		"status":        binding.Status,
		"openid_masked": maskMiniProgramIdentifier(binding.OpenID),
		"bound_at":      binding.BoundAt,
		"last_seen_at":  binding.LastSeenAt,
	}
	if user != nil {
		payload["user_id"] = user.Id
		payload["account_masked"] = maskMiniProgramAccountLabel(user)
		payload["username_masked"] = maskMiniProgramIdentifier(user.Username)
	}
	return payload
}

func getMiniProgramWindowDays(c *gin.Context, fallback int) int {
	days, _ := strconv.Atoi(strings.TrimSpace(c.Query("days")))
	if days <= 0 {
		days = fallback
	}
	if days <= 0 {
		days = 7
	}
	if days > 30 {
		days = 30
	}
	return days
}

func getMiniProgramTrend(userId int, days int) ([]miniProgramDailyUsageItem, error) {
	now := time.Now().In(time.Local)
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	start := dayStart.AddDate(0, 0, -(days - 1))

	rows, err := model.GetQuotaDataByUserId(userId, start.Unix(), now.Unix())
	if err != nil {
		return nil, err
	}

	result := make([]miniProgramDailyUsageItem, 0, days)
	indexByDate := make(map[string]int, days)
	for i := 0; i < days; i++ {
		current := start.AddDate(0, 0, i)
		key := current.Format("2006-01-02")
		indexByDate[key] = len(result)
		result = append(result, miniProgramDailyUsageItem{
			Date:      key,
			Timestamp: current.Unix(),
		})
	}

	for _, row := range rows {
		if row == nil {
			continue
		}
		key := time.Unix(row.CreatedAt, 0).In(time.Local).Format("2006-01-02")
		index, ok := indexByDate[key]
		if !ok {
			continue
		}
		result[index].Requests += int64(row.Count)
		result[index].Quota += int64(row.Quota)
		result[index].TokenUsed += int64(row.TokenUsed)
	}

	return result, nil
}

func getMiniProgramSessionState(openID string) (gin.H, error) {
	binding, err := model.GetActiveUserWeChatBindingByOpenID(openID)
	if err != nil {
		return nil, err
	}
	if binding == nil {
		return gin.H{
			"bound":         false,
			"openid_masked": maskMiniProgramIdentifier(openID),
			"binding": gin.H{
				"bound": false,
			},
			"website": buildMiniProgramWebsiteLinks(),
		}, nil
	}

	user, err := model.GetUserById(binding.UserId, false)
	if err != nil || user == nil || user.Status != common.UserStatusEnabled {
		return gin.H{
			"bound":         false,
			"openid_masked": maskMiniProgramIdentifier(openID),
			"binding": gin.H{
				"bound": false,
			},
			"website": buildMiniProgramWebsiteLinks(),
		}, nil
	}

	return gin.H{
		"bound":         true,
		"openid_masked": maskMiniProgramIdentifier(openID),
		"binding":       buildMiniProgramBindingPayload(binding, user),
		"website":       buildMiniProgramWebsiteLinks(),
	}, nil
}

func getMiniProgramCurrentUser(c *gin.Context) (*model.User, error) {
	userId := c.GetInt("id")
	if userId <= 0 {
		return nil, nil
	}
	return model.GetUserById(userId, false)
}

// CreateMiniProgramBindCode creates a new one-time bind code from the website.
func CreateMiniProgramBindCode(c *gin.Context) {
	userId := c.GetInt("id")
	code, record, err := model.CreateMiniProgramBindCode(userId, c.ClientIP(), miniProgramBindCodeTTL)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	model.RecordLog(userId, model.LogTypeManage, "generated a mini program bind code")
	common.ApiSuccess(c, gin.H{
		"code":        code,
		"expires_at":  record.ExpiresAt,
		"ttl_seconds": model.GetMiniProgramBindCodeTTLSeconds(record),
	})
}

// GetMiniProgramBinding returns the current website user's active mini program binding.
func GetMiniProgramBinding(c *gin.Context) {
	userId := c.GetInt("id")
	binding, err := model.GetActiveUserWeChatBindingByUserID(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	user, err := getMiniProgramCurrentUser(c)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, buildMiniProgramBindingPayload(binding, user))
}

// DeleteMiniProgramBinding revokes the current website user's active mini program binding.
func DeleteMiniProgramBinding(c *gin.Context) {
	userId := c.GetInt("id")
	if err := model.RevokeMiniProgramBindingByUserID(userId); err != nil {
		common.ApiError(c, err)
		return
	}
	model.RecordLog(userId, model.LogTypeManage, "revoked the mini program binding")
	common.ApiSuccess(c, gin.H{
		"bound": false,
	})
}

// MiniProgramSession exchanges a wx.login code and creates a signed session token.
func MiniProgramSession(c *gin.Context) {
	var req miniProgramSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	openID, unionID, err := service.ExchangeMiniProgramCode(req.Code)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	binding, err := model.GetActiveUserWeChatBindingByOpenID(openID)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	boundUserID := 0
	if binding != nil {
		boundUserID = binding.UserId
	}
	token, expiresAt, err := service.BuildMiniProgramSessionToken(openID, unionID, boundUserID)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	state, err := getMiniProgramSessionState(openID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	state["token"] = token
	state["expires_at"] = expiresAt
	common.ApiSuccess(c, state)
}

// GetMiniProgramMe returns binding and website guidance for the current mini program session.
func GetMiniProgramMe(c *gin.Context) {
	openID := c.GetString("mini_openid")
	state, err := getMiniProgramSessionState(openID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	state["expires_at"] = c.GetInt64("mini_token_expires_at")
	common.ApiSuccess(c, state)
}

// BindMiniProgram binds the current mini program session to a website account using a one-time code.
func BindMiniProgram(c *gin.Context) {
	var req miniProgramBindRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	openID := c.GetString("mini_openid")
	unionID := c.GetString("mini_unionid")
	_, binding, err := model.ConsumeMiniProgramBindCodeAndBind(req.BindCode, openID, unionID)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	user, err := model.GetUserById(binding.UserId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	model.RecordLog(binding.UserId, model.LogTypeManage, "bound a mini program account")
	common.ApiSuccess(c, buildMiniProgramBindingPayload(binding, user))
}

// UnbindMiniProgram revokes the current mini program binding from the mini program side.
func UnbindMiniProgram(c *gin.Context) {
	userId := c.GetInt("id")
	openID := c.GetString("mini_openid")
	if err := model.RevokeMiniProgramBindingByOpenID(openID); err != nil {
		common.ApiError(c, err)
		return
	}
	if userId > 0 {
		model.RecordLog(userId, model.LogTypeManage, "unbound the mini program account")
	}
	common.ApiSuccess(c, gin.H{
		"bound": false,
	})
}

// GetMiniProgramDashboard returns the mini program dashboard aggregate.
func GetMiniProgramDashboard(c *gin.Context) {
	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	days := getMiniProgramWindowDays(c, 7)
	trend, err := getMiniProgramTrend(userId, days)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	startTimestamp := time.Now().AddDate(0, 0, -days).Unix()
	usageStat, err := model.SumUsedQuota(model.LogTypeConsume, startTimestamp, time.Now().Unix(), "", user.Username, "", 0, "")
	if err != nil {
		common.ApiError(c, err)
		return
	}

	subscriptions, err := model.GetAllActiveUserSubscriptions(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	blindBoxOverview, err := model.GetUserBlindBoxOverview(userId, 5)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	resetOpportunity, err := model.GetUserSubscriptionResetOpportunity(userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	website := buildMiniProgramWebsiteLinks()
	campaigns := []gin.H{
		{
			"id":              "invite-month-card-reset",
			"title":           "邀请新用户购买月卡，送 1 次额度重置机会",
			"subtitle":        "机会可长期保存，每个自然月最多使用 1 次，去官网订阅页执行。",
			"badge":           "拉新活动",
			"page_path":       "/pages/campaign-reset/index",
			"website_url":     website["packages_url"],
			"available_count": resetOpportunity.AvailableCount,
			"used_this_month": resetOpportunity.UsedThisMonth,
		},
	}

	common.ApiSuccess(c, gin.H{
		"user": gin.H{
			"id":             user.Id,
			"display_name":   user.DisplayName,
			"account_masked": maskMiniProgramAccountLabel(user),
			"quota":          user.Quota,
			"used_quota":     user.UsedQuota,
			"request_count":  user.RequestCount,
			"group":          user.Group,
		},
		"usage": gin.H{
			"days":  days,
			"quota": usageStat.Quota,
			"rpm":   usageStat.Rpm,
			"tpm":   usageStat.Tpm,
			"trend": trend,
		},
		"subscriptions": subscriptions,
		"blind_box":     blindBoxOverview,
		"reset_opportunity": gin.H{
			"available_count": resetOpportunity.AvailableCount,
			"earned_total":    resetOpportunity.EarnedTotal,
			"used_total":      resetOpportunity.UsedTotal,
			"used_this_month": resetOpportunity.UsedThisMonth,
			"current_month":   resetOpportunity.CurrentMonth,
			"last_used_month": resetOpportunity.LastUsedMonth,
		},
		"campaigns": campaigns,
	})
}

// GetMiniProgramLogs returns recent usage logs for the bound website account.
func GetMiniProgramLogs(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	userId := c.GetInt("id")
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	modelName := c.Query("model_name")
	tokenName := c.Query("token_name")
	group := c.Query("group")
	requestID := c.Query("request_id")
	upstreamRequestID := c.Query("upstream_request_id")

	logs, total, err := model.GetUserLogs(
		userId,
		logType,
		startTimestamp,
		endTimestamp,
		modelName,
		tokenName,
		pageInfo.GetStartIdx(),
		pageInfo.GetPageSize(),
		group,
		requestID,
		upstreamRequestID,
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(logs)
	common.ApiSuccess(c, pageInfo)
}

// GetMiniProgramStat returns aggregated recent usage stats and trend data.
func GetMiniProgramStat(c *gin.Context) {
	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	days := getMiniProgramWindowDays(c, 7)
	endTimestamp := time.Now().Unix()
	startTimestamp := time.Now().AddDate(0, 0, -days).Unix()

	trend, err := getMiniProgramTrend(userId, days)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	stat, err := model.SumUsedQuota(model.LogTypeConsume, startTimestamp, endTimestamp, "", user.Username, "", 0, "")
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"days":  days,
		"quota": stat.Quota,
		"rpm":   stat.Rpm,
		"tpm":   stat.Tpm,
		"trend": trend,
	})
}

// GetMiniProgramGeneMap returns the existing gene-map snapshot for the bound account.
func GetMiniProgramGeneMap(c *gin.Context) {
	userId := c.GetInt("id")
	days := getMiniProgramWindowDays(c, 30)
	snapshot, err := service.GenerateGeneMapSnapshot(userId, days)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, snapshot)
}

// CheckMiniProgramShareContent runs text content through the existing sensitive-word checker.
func CheckMiniProgramShareContent(c *gin.Context) {
	var req miniProgramShareCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	text := strings.TrimSpace(strings.Join([]string{req.Title, req.Content}, "\n"))
	if text == "" {
		common.ApiErrorMsg(c, "content is required")
		return
	}

	containsSensitive, words := service.CheckSensitiveText(text)
	common.ApiSuccess(c, gin.H{
		"safe":      !containsSensitive,
		"keywords":  words,
		"can_share": !containsSensitive,
	})
}
