package controller

import (
	"errors"
	"net"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/cachex"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/samber/hot"
	"gorm.io/gorm"
)

const (
	desktopDefaultTokenPrefix = "Code Go Desktop - "
	desktopToolCodex          = "codex"
	desktopToolClaude         = "claude"
	desktopToolGemini         = "gemini"
	desktopToolOpenCode       = "opencode"
	desktopToolOpenClaw       = "openclaw"
	desktopToolHermes         = "hermes"
	desktopImportCodeTTL      = 10 * time.Minute
	desktopImportCacheNS      = "new-api:desktop_import:v1"
)

var (
	desktopImportCacheOnce sync.Once
	desktopImportCache     *cachex.HybridCache[desktopImportConfigPayload]
)

type desktopAccountSnapshot struct {
	ID                 int      `json:"id"`
	Username           string   `json:"username"`
	DisplayName        string   `json:"display_name"`
	Group              string   `json:"group"`
	Quota              int      `json:"quota"`
	ClaudeQuota        int      `json:"claude_quota"`
	UsedQuota          int      `json:"used_quota"`
	RequestCount       int      `json:"request_count"`
	QuotaUSD           float64  `json:"quota_usd"`
	ClaudeQuotaUSD     float64  `json:"claude_quota_usd"`
	UsedQuotaUSD       float64  `json:"used_quota_usd"`
	BillingPreference  string   `json:"billing_preference"`
	FundingSourceOrder []string `json:"funding_source_order"`
}

type desktopTokenSummary struct {
	Total        int          `json:"total"`
	DesktopToken *model.Token `json:"desktop_token,omitempty"`
}

type desktopUsageSummary struct {
	AvailableModels []string `json:"available_models"`
	TodayUSD        float64  `json:"today_usd"`
	Last7DaysUSD    float64  `json:"last_7_days_usd"`
	LastRequestAt   int64    `json:"last_request_at"`
}

type desktopServiceSummary struct {
	Status            string   `json:"status"`
	Notice            string   `json:"notice"`
	Maintenance       bool     `json:"maintenance"`
	RecommendedAction string   `json:"recommended_action"`
	AffectedScopes    []string `json:"affected_scopes"`
}

type desktopQuickActions struct {
	ServerAddress string `json:"server_address"`
	TopUpLink     string `json:"topup_link"`
	TokensPath    string `json:"tokens_path"`
	LogsPath      string `json:"logs_path"`
}

type desktopAccountSummaryResponse struct {
	Account    desktopAccountSnapshot `json:"account"`
	Tokens     desktopTokenSummary    `json:"tokens"`
	Usage      desktopUsageSummary    `json:"usage"`
	Service    desktopServiceSummary  `json:"service"`
	RecentLogs []*model.Log           `json:"recent_logs"`
	Actions    desktopQuickActions    `json:"actions"`
}

type desktopEnsureTokenRequest struct {
	DeviceName string `json:"device_name"`
}

type desktopEnsureTokenResponse struct {
	Token     *model.Token `json:"token"`
	Created   bool         `json:"created"`
	FullKey   string       `json:"full_key"`
	TokenName string       `json:"token_name"`
}

type desktopConfigTemplate struct {
	Tool            string            `json:"tool"`
	Label           string            `json:"label"`
	ServerAddress   string            `json:"server_address"`
	Endpoint        string            `json:"endpoint"`
	AuthScheme      string            `json:"auth_scheme"`
	ModelFormat     string            `json:"model_format"`
	Env             map[string]string `json:"env"`
	DefaultProvider string            `json:"default_provider"`
}

type desktopConfigTemplatesResponse struct {
	BaseURL string                           `json:"base_url"`
	Tools   map[string]desktopConfigTemplate `json:"tools"`
}

type desktopTokenConfigResponse struct {
	Token         *model.Token                          `json:"token"`
	ServerAddress string                                `json:"server_address"`
	Tools         map[string]desktopImportConfigPayload `json:"tools"`
}

type desktopImportConfigPayload struct {
	Tool         string `json:"tool"`
	Name         string `json:"name"`
	Homepage     string `json:"homepage"`
	Endpoint     string `json:"endpoint"`
	APIKey       string `json:"apiKey"`
	Model        string `json:"model,omitempty"`
	HaikuModel   string `json:"haikuModel,omitempty"`
	SonnetModel  string `json:"sonnetModel,omitempty"`
	OpusModel    string `json:"opusModel,omitempty"`
	Enabled      bool   `json:"enabled"`
	Config       string `json:"config"`
	ConfigFormat string `json:"configFormat"`
	Icon         string `json:"icon,omitempty"`
	Notes        string `json:"notes,omitempty"`
}

type desktopImportCreateRequest struct {
	Tool        string `json:"tool"`
	TokenID     int    `json:"token_id"`
	Name        string `json:"name"`
	Model       string `json:"model"`
	HaikuModel  string `json:"haiku_model"`
	SonnetModel string `json:"sonnet_model"`
	OpusModel   string `json:"opus_model"`
	Enabled     *bool  `json:"enabled"`
}

type desktopImportCreateResponse struct {
	Code      string `json:"code"`
	DeepLink  string `json:"deep_link"`
	ConfigURL string `json:"config_url"`
	ExpiresIn int64  `json:"expires_in_seconds"`
	Tool      string `json:"tool"`
	TokenName string `json:"token_name"`
	Provider  string `json:"provider_name"`
}

func normalizeDesktopTool(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case desktopToolCodex:
		return desktopToolCodex
	case desktopToolClaude, "claude-code":
		return desktopToolClaude
	case desktopToolGemini, "gemini-cli":
		return desktopToolGemini
	case desktopToolOpenCode, "open-code":
		return desktopToolOpenCode
	case desktopToolOpenClaw, "open-claw":
		return desktopToolOpenClaw
	case desktopToolHermes, "hermes-agent":
		return desktopToolHermes
	default:
		return ""
	}
}

func buildDesktopTokenName(deviceName string) string {
	name := strings.TrimSpace(deviceName)
	if name == "" {
		return desktopDefaultTokenPrefix + "Default"
	}
	return desktopDefaultTokenPrefix + name
}

func desktopProviderDisplayName(tool string) string {
	switch tool {
	case desktopToolCodex:
		return "Code Go Codex"
	case desktopToolClaude:
		return "Code Go Claude"
	case desktopToolGemini:
		return "Code Go Gemini"
	case desktopToolOpenCode:
		return "Code Go OpenCode"
	case desktopToolOpenClaw:
		return "Code Go OpenClaw"
	case desktopToolHermes:
		return "Code Go Hermes"
	default:
		return "Code Go"
	}
}

func normalizeDesktopServerAddress(raw string) string {
	base := strings.TrimSpace(raw)
	if base == "" {
		base = strings.TrimSpace(system_setting.ServerAddress)
	}
	if base == "" {
		base = "http://localhost:3000"
	}
	base = strings.TrimRight(base, "/")
	base = strings.TrimSuffix(base, "/v1")
	if !strings.Contains(base, "://") {
		base = "https://" + base
	}

	parsed, err := url.Parse(base)
	if err != nil {
		return strings.TrimRight(base, "/")
	}

	if parsed.Scheme == "http" {
		host := parsed.Hostname()
		ip := net.ParseIP(host)
		if host != "localhost" && host != "127.0.0.1" && host != "0.0.0.0" && ip == nil {
			parsed.Scheme = "https"
		}
	}
	return strings.TrimRight(parsed.String(), "/")
}

func desktopToolIcon(tool string) string {
	switch tool {
	case desktopToolCodex, desktopToolClaude, desktopToolGemini, desktopToolOpenCode:
		return "newapi"
	case desktopToolOpenClaw:
		return "newapi"
	case desktopToolHermes:
		return "newapi"
	default:
		return ""
	}
}

func getDesktopImportCache() *cachex.HybridCache[desktopImportConfigPayload] {
	desktopImportCacheOnce.Do(func() {
		desktopImportCache = cachex.NewHybridCache[desktopImportConfigPayload](cachex.HybridCacheConfig[desktopImportConfigPayload]{
			Namespace: cachex.Namespace(desktopImportCacheNS),
			Redis:     common.RDB,
			RedisEnabled: func() bool {
				return common.RedisEnabled && common.RDB != nil
			},
			RedisCodec: cachex.JSONCodec[desktopImportConfigPayload]{},
			Memory: func() *hot.HotCache[string, desktopImportConfigPayload] {
				return hot.NewHotCache[string, desktopImportConfigPayload](hot.LRU, 512).
					WithTTL(desktopImportCodeTTL).
					WithJanitor().
					Build()
			},
		})
	})
	return desktopImportCache
}

func listDesktopAvailableModels(group string) []string {
	groups := service.GetUserUsableGroups(group)
	modelSet := make(map[string]struct{})
	models := make([]string, 0)
	for usableGroup := range groups {
		var groupModels []string
		_ = model.DB.Table("abilities").
			Where(map[string]any{
				"group":   usableGroup,
				"enabled": true,
			}).
			Distinct("model").
			Pluck("model", &groupModels).Error
		for _, modelName := range groupModels {
			if _, ok := modelSet[modelName]; ok {
				continue
			}
			modelSet[modelName] = struct{}{}
			models = append(models, modelName)
		}
	}
	sort.Strings(models)
	return models
}

func desktopServiceStatusSummary() desktopServiceSummary {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()

	notice := strings.TrimSpace(common.OptionMap["Notice"])
	maintenance := desktopServiceMaintenanceEnabled(common.OptionMap)
	status := "ok"
	recommendedAction := ""
	affectedScopes := []string{}

	if notice != "" {
		status = "notice"
		recommendedAction = "Review the latest service notice before retrying large or long-running coding sessions."
		affectedScopes = []string{"account", "logs", "tool-config"}
	}

	if maintenance {
		status = "maintenance"
		recommendedAction = "Wait for maintenance to finish or switch to another provider before continuing."
	}

	return desktopServiceSummary{
		Status:            status,
		Notice:            notice,
		Maintenance:       maintenance,
		RecommendedAction: recommendedAction,
		AffectedScopes:    affectedScopes,
	}
}

func desktopServiceMaintenanceEnabled(options map[string]string) bool {
	if options == nil {
		return false
	}

	raw := strings.TrimSpace(options["Maintenance"])
	if raw == "" {
		raw = strings.TrimSpace(options["DesktopMaintenance"])
	}

	switch strings.ToLower(raw) {
	case "1", "true", "yes", "on", "enabled":
		return true
	default:
		return false
	}
}

func summarizeDesktopUsage(logs []*model.Log) desktopUsageSummary {
	summary := desktopUsageSummary{
		AvailableModels: []string{},
	}
	if len(logs) == 0 {
		return summary
	}

	now := time.Now()
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).Unix()
	startOfLast7Days := startOfToday - 6*24*60*60
	var todayQuota, last7Quota int64
	var lastRequestAt int64

	for _, item := range logs {
		if item == nil {
			continue
		}
		if item.CreatedAt > lastRequestAt {
			lastRequestAt = item.CreatedAt
		}
		if item.CreatedAt >= startOfToday {
			todayQuota += int64(item.Quota)
		}
		if item.CreatedAt >= startOfLast7Days {
			last7Quota += int64(item.Quota)
		}
	}

	summary.TodayUSD = quotaToOpenAIUSD(int(todayQuota))
	summary.Last7DaysUSD = quotaToOpenAIUSD(int(last7Quota))
	summary.LastRequestAt = lastRequestAt
	return summary
}

func pickDesktopRecommendedModel(models []string, prefixes ...string) string {
	for _, prefix := range prefixes {
		for _, modelName := range models {
			if strings.HasPrefix(modelName, prefix) {
				return modelName
			}
		}
	}
	return ""
}

func buildDesktopTokenConfigResponse(token *model.Token, availableModels []string) (*desktopTokenConfigResponse, error) {
	toolRequests := map[string]desktopImportCreateRequest{
		desktopToolCodex: {
			Tool:  desktopToolCodex,
			Name:  desktopProviderDisplayName(desktopToolCodex),
			Model: pickDesktopRecommendedModel(availableModels, "gpt-5.5", "gpt-5", "o3", "o4"),
		},
		desktopToolClaude: {
			Tool:        desktopToolClaude,
			Name:        desktopProviderDisplayName(desktopToolClaude),
			Model:       pickDesktopRecommendedModel(availableModels, "claude-sonnet-4-5", "claude-sonnet", "claude-3-7-sonnet"),
			HaikuModel:  pickDesktopRecommendedModel(availableModels, "claude-3-5-haiku", "claude-haiku"),
			SonnetModel: pickDesktopRecommendedModel(availableModels, "claude-sonnet-4-5", "claude-sonnet"),
			OpusModel:   pickDesktopRecommendedModel(availableModels, "claude-opus-4", "claude-opus"),
		},
		desktopToolGemini: {
			Tool:  desktopToolGemini,
			Name:  desktopProviderDisplayName(desktopToolGemini),
			Model: pickDesktopRecommendedModel(availableModels, "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0"),
		},
		desktopToolOpenCode: {
			Tool:  desktopToolOpenCode,
			Name:  desktopProviderDisplayName(desktopToolOpenCode),
			Model: pickDesktopRecommendedModel(availableModels, "gpt-5.5", "gpt-5", "o3", "o4"),
		},
		desktopToolOpenClaw: {
			Tool:  desktopToolOpenClaw,
			Name:  desktopProviderDisplayName(desktopToolOpenClaw),
			Model: pickDesktopRecommendedModel(availableModels, "gpt-5.5", "gpt-5", "o3", "o4"),
		},
		desktopToolHermes: {
			Tool:  desktopToolHermes,
			Name:  desktopProviderDisplayName(desktopToolHermes),
			Model: pickDesktopRecommendedModel(availableModels, "gpt-5.5", "gpt-5", "o3", "o4"),
		},
	}

	tools := make(map[string]desktopImportConfigPayload, len(toolRequests))
	for tool, req := range toolRequests {
		payload, err := buildDesktopImportConfig(tool, token, req)
		if err != nil {
			return nil, err
		}
		tools[tool] = *payload
	}

	return &desktopTokenConfigResponse{
		Token:         buildMaskedTokenResponse(token),
		ServerAddress: normalizeDesktopServerAddress(""),
		Tools:         tools,
	}, nil
}

func findDesktopToken(userID int, tokenName string) (*model.Token, error) {
	var token model.Token
	err := model.DB.Where("user_id = ? AND name = ?", userID, tokenName).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func findDesktopTokenByID(userID int, tokenID int) (*model.Token, error) {
	return model.GetTokenByIds(tokenID, userID)
}

func buildDesktopConfigTemplate(tool string) (*desktopConfigTemplate, error) {
	tool = normalizeDesktopTool(tool)
	if tool == "" {
		return nil, errors.New("unsupported tool")
	}

	serverAddress := normalizeDesktopServerAddress("")
	template := &desktopConfigTemplate{
		Tool:            tool,
		ServerAddress:   serverAddress,
		DefaultProvider: "codego",
	}

	switch tool {
	case desktopToolCodex:
		template.Label = "Codex"
		template.Endpoint = serverAddress + "/v1"
		template.AuthScheme = "openai-api-key"
		template.ModelFormat = "responses"
		template.Env = map[string]string{
			"OPENAI_BASE_URL": serverAddress + "/v1",
			"OPENAI_API_BASE": serverAddress + "/v1",
		}
	case desktopToolClaude:
		template.Label = "Claude Code"
		template.Endpoint = serverAddress
		template.AuthScheme = "anthropic-auth-token"
		template.ModelFormat = "anthropic"
		template.Env = map[string]string{
			"ANTHROPIC_BASE_URL": serverAddress,
		}
	case desktopToolGemini:
		template.Label = "Gemini CLI"
		template.Endpoint = serverAddress
		template.AuthScheme = "google-api-key-compatible"
		template.ModelFormat = "gemini"
		template.Env = map[string]string{
			"GOOGLE_API_BASE": serverAddress,
		}
	case desktopToolOpenCode:
		template.Label = "OpenCode"
		template.Endpoint = serverAddress + "/v1"
		template.AuthScheme = "openai-compatible-api-key"
		template.ModelFormat = "openai-compatible"
		template.Env = map[string]string{
			"OPENAI_BASE_URL": serverAddress + "/v1",
		}
	case desktopToolOpenClaw:
		template.Label = "OpenClaw"
		template.Endpoint = serverAddress + "/v1"
		template.AuthScheme = "openai-compatible-api-key"
		template.ModelFormat = "openai-compatible"
		template.Env = map[string]string{
			"OPENAI_BASE_URL": serverAddress + "/v1",
		}
	case desktopToolHermes:
		template.Label = "Hermes"
		template.Endpoint = serverAddress + "/v1"
		template.AuthScheme = "openai-compatible-api-key"
		template.ModelFormat = "chat-completions"
		template.Env = map[string]string{
			"OPENAI_BASE_URL": serverAddress + "/v1",
		}
	}

	return template, nil
}

func buildDesktopImportConfig(tool string, token *model.Token, req desktopImportCreateRequest) (*desktopImportConfigPayload, error) {
	template, err := buildDesktopConfigTemplate(tool)
	if err != nil {
		return nil, err
	}

	payload := &desktopImportConfigPayload{
		Tool:         tool,
		Name:         strings.TrimSpace(req.Name),
		Homepage:     template.ServerAddress,
		Endpoint:     template.Endpoint,
		APIKey:       token.GetFullKey(),
		Model:        strings.TrimSpace(req.Model),
		HaikuModel:   strings.TrimSpace(req.HaikuModel),
		SonnetModel:  strings.TrimSpace(req.SonnetModel),
		OpusModel:    strings.TrimSpace(req.OpusModel),
		Enabled:      req.Enabled == nil || *req.Enabled,
		ConfigFormat: "json",
		Icon:         desktopToolIcon(tool),
		Notes:        "Generated by Code Go Desktop import",
	}
	if payload.Name == "" {
		payload.Name = desktopProviderDisplayName(tool)
	}

	switch tool {
	case desktopToolClaude:
		env := map[string]string{
			"ANTHROPIC_BASE_URL":   template.Endpoint,
			"ANTHROPIC_AUTH_TOKEN": payload.APIKey,
		}
		if payload.Model != "" {
			env["ANTHROPIC_MODEL"] = payload.Model
		}
		if payload.HaikuModel != "" {
			env["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = payload.HaikuModel
		}
		if payload.SonnetModel != "" {
			env["ANTHROPIC_DEFAULT_SONNET_MODEL"] = payload.SonnetModel
		}
		if payload.OpusModel != "" {
			env["ANTHROPIC_DEFAULT_OPUS_MODEL"] = payload.OpusModel
		}
		configBody, err := common.Marshal(map[string]any{"env": env})
		if err != nil {
			return nil, err
		}
		payload.Config = common.EncodeBase64(string(configBody))
	case desktopToolGemini:
		env := map[string]string{
			"GEMINI_API_KEY":         payload.APIKey,
			"GOOGLE_GEMINI_BASE_URL": template.Endpoint,
		}
		if payload.Model != "" {
			env["GEMINI_MODEL"] = payload.Model
		}
		configBody, err := common.Marshal(env)
		if err != nil {
			return nil, err
		}
		payload.Config = common.EncodeBase64(string(configBody))
	case desktopToolCodex:
		modelName := payload.Model
		if modelName == "" {
			modelName = "gpt-5.5"
		}
		configText := "model_provider = \"custom\"\n" +
			"model = " + strconv.Quote(modelName) + "\n" +
			"model_reasoning_effort = \"high\"\n" +
			"disable_response_storage = true\n\n" +
			"[model_providers.custom]\n" +
			"name = \"Code Go\"\n" +
			"base_url = " + strconv.Quote(template.Endpoint) + "\n" +
			"wire_api = \"responses\"\n" +
			"requires_openai_auth = true\n"
		configBody, err := common.Marshal(map[string]any{
			"auth": map[string]string{
				"OPENAI_API_KEY": payload.APIKey,
			},
			"config": configText,
		})
		if err != nil {
			return nil, err
		}
		payload.Config = common.EncodeBase64(string(configBody))
	case desktopToolOpenCode:
		modelName := payload.Model
		if modelName == "" {
			modelName = "gpt-5.5"
		}
		configBody, err := common.Marshal(map[string]any{
			"npm":  "@ai-sdk/openai-compatible",
			"name": payload.Name,
			"options": map[string]any{
				"baseURL":     template.Endpoint,
				"apiKey":      payload.APIKey,
				"setCacheKey": true,
			},
			"models": map[string]any{
				modelName: map[string]any{
					"name": modelName,
				},
			},
		})
		if err != nil {
			return nil, err
		}
		payload.Config = common.EncodeBase64(string(configBody))
	case desktopToolOpenClaw:
		modelName := payload.Model
		if modelName == "" {
			modelName = "gpt-5.5"
		}
		configBody, err := common.Marshal(map[string]any{
			"baseUrl": template.Endpoint,
			"apiKey":  payload.APIKey,
			"api":     "openai-completions",
			"models": []map[string]any{
				{
					"id":   modelName,
					"name": modelName,
				},
			},
		})
		if err != nil {
			return nil, err
		}
		payload.Config = common.EncodeBase64(string(configBody))
	case desktopToolHermes:
		modelName := payload.Model
		if modelName == "" {
			modelName = "gpt-5.5"
		}
		configBody, err := common.Marshal(map[string]any{
			"name":     payload.Name,
			"base_url": template.Endpoint,
			"api_key":  payload.APIKey,
			"api_mode": "chat_completions",
			"models": []map[string]any{
				{
					"id":   modelName,
					"name": modelName,
				},
			},
		})
		if err != nil {
			return nil, err
		}
		payload.Config = common.EncodeBase64(string(configBody))
	default:
		return nil, errors.New("unsupported tool")
	}

	return payload, nil
}

func GetDesktopAccountSummary(c *gin.Context) {
	userID := c.GetInt("id")
	user, err := model.GetUserById(userID, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	recentLogs, _, err := model.GetUserLogs(userID, model.LogTypeUnknown, 0, 0, "", "", 0, 10, "", "", "")
	if err != nil {
		common.ApiError(c, err)
		return
	}

	tokenCount, err := model.CountUserTokens(userID)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	defaultDesktopToken, err := findDesktopToken(userID, buildDesktopTokenName("Default"))
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		common.ApiError(c, err)
		return
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		defaultDesktopToken = nil
	}

	setting := user.GetSetting()
	serverAddress := normalizeDesktopServerAddress("")
	usageSummary := summarizeDesktopUsage(recentLogs)
	usageSummary.AvailableModels = listDesktopAvailableModels(user.Group)

	common.ApiSuccess(c, desktopAccountSummaryResponse{
		Account: desktopAccountSnapshot{
			ID:                 user.Id,
			Username:           user.Username,
			DisplayName:        user.DisplayName,
			Group:              user.Group,
			Quota:              user.Quota,
			ClaudeQuota:        user.ClaudeQuota,
			UsedQuota:          user.UsedQuota,
			RequestCount:       user.RequestCount,
			QuotaUSD:           quotaToOpenAIUSD(user.Quota),
			ClaudeQuotaUSD:     quotaToOpenAIUSD(user.ClaudeQuota),
			UsedQuotaUSD:       quotaToOpenAIUSD(user.UsedQuota),
			BillingPreference:  setting.BillingPreference,
			FundingSourceOrder: setting.FundingSourceOrder,
		},
		Tokens: desktopTokenSummary{
			Total:        int(tokenCount),
			DesktopToken: buildMaskedTokenResponse(defaultDesktopToken),
		},
		Usage:      usageSummary,
		Service:    desktopServiceStatusSummary(),
		RecentLogs: recentLogs,
		Actions: desktopQuickActions{
			ServerAddress: serverAddress,
			TopUpLink:     common.TopUpLink,
			TokensPath:    "/tokens",
			LogsPath:      "/usage-logs",
		},
	})
}

func GetDesktopUsageLogs(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	userID := c.GetInt("id")
	logType, _ := strconv.Atoi(c.Query("type"))
	startTimestamp, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	endTimestamp, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	tokenName := c.Query("token_name")
	modelName := c.Query("model_name")
	group := c.Query("group")
	requestID := c.Query("request_id")
	upstreamRequestID := c.Query("upstream_request_id")

	logs, total, err := model.GetUserLogs(
		userID,
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

func EnsureDesktopToken(c *gin.Context) {
	userID := c.GetInt("id")
	var req desktopEnsureTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	tokenName := buildDesktopTokenName(req.DeviceName)
	if len(tokenName) > 50 {
		common.ApiErrorMsg(c, "desktop token name is too long")
		return
	}

	existing, err := findDesktopToken(userID, tokenName)
	if err == nil && existing != nil {
		common.ApiSuccess(c, desktopEnsureTokenResponse{
			Token:     buildMaskedTokenResponse(existing),
			Created:   false,
			FullKey:   existing.GetFullKey(),
			TokenName: existing.Name,
		})
		return
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		common.ApiError(c, err)
		return
	}

	key, err := common.GenerateKey()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	token := &model.Token{
		UserId:             userID,
		Name:               tokenName,
		Key:                key,
		Status:             common.TokenStatusEnabled,
		CreatedTime:        common.GetTimestamp(),
		AccessedTime:       common.GetTimestamp(),
		ExpiredTime:        -1,
		RemainQuota:        0,
		UnlimitedQuota:     true,
		ModelLimitsEnabled: false,
		Group:              "default",
	}
	if err := token.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, desktopEnsureTokenResponse{
		Token:     buildMaskedTokenResponse(token),
		Created:   true,
		FullKey:   token.GetFullKey(),
		TokenName: token.Name,
	})
}

func GetDesktopConfigTemplate(c *gin.Context) {
	template, err := buildDesktopConfigTemplate(c.Query("tool"))
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}
	common.ApiSuccess(c, template)
}

func GetDesktopConfigTemplates(c *gin.Context) {
	baseURL := normalizeDesktopServerAddress("") + "/v1"
	tools := make(map[string]desktopConfigTemplate)
	for _, tool := range []string{
		desktopToolCodex,
		desktopToolClaude,
		desktopToolGemini,
		desktopToolOpenCode,
		desktopToolOpenClaw,
		desktopToolHermes,
	} {
		template, err := buildDesktopConfigTemplate(tool)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		tools[tool] = *template
	}

	common.ApiSuccess(c, desktopConfigTemplatesResponse{
		BaseURL: baseURL,
		Tools:   tools,
	})
}

func GetDesktopTokenConfig(c *gin.Context) {
	userID := c.GetInt("id")
	tokenID, err := strconv.Atoi(strings.TrimSpace(c.Param("id")))
	if err != nil {
		common.ApiErrorMsg(c, "invalid token id")
		return
	}

	token, err := findDesktopTokenByID(userID, tokenID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "token not found")
			return
		}
		common.ApiError(c, err)
		return
	}

	user, err := model.GetUserById(userID, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	response, err := buildDesktopTokenConfigResponse(token, listDesktopAvailableModels(user.Group))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, response)
}

func GetDesktopServiceStatus(c *gin.Context) {
	common.ApiSuccess(c, desktopServiceStatusSummary())
}

// CreateDesktopImportConfig creates a short-lived deeplink that references a one-time import config.
func CreateDesktopImportConfig(c *gin.Context) {
	userID := c.GetInt("id")
	var req desktopImportCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	tool := normalizeDesktopTool(req.Tool)
	if tool == "" {
		common.ApiErrorMsg(c, "unsupported tool")
		return
	}
	if req.TokenID <= 0 {
		common.ApiErrorMsg(c, "invalid token_id")
		return
	}

	token, err := findDesktopTokenByID(userID, req.TokenID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "token not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	if token.Status != common.TokenStatusEnabled {
		common.ApiErrorMsg(c, "token is not enabled")
		return
	}

	payload, err := buildDesktopImportConfig(tool, token, req)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	code := common.GetRandomString(32)
	if code == "" {
		common.ApiErrorMsg(c, "failed to generate import code")
		return
	}
	if err = getDesktopImportCache().SetWithTTL(code, *payload, desktopImportCodeTTL); err != nil {
		common.ApiError(c, err)
		return
	}

	serverAddress := normalizeDesktopServerAddress("")
	configURL := serverAddress + "/api/desktop/import/config?code=" + url.QueryEscape(code)
	params := url.Values{}
	params.Set("resource", "provider")
	params.Set("app", tool)
	params.Set("name", payload.Name)
	params.Set("endpoint", payload.Endpoint)
	params.Set("homepage", payload.Homepage)
	params.Set("enabled", strconv.FormatBool(payload.Enabled))
	params.Set("icon", payload.Icon)
	params.Set("tokenId", strconv.Itoa(req.TokenID))
	params.Set("codegoAction", "applyToolConfig")
	params.Set("configUrl", configURL)
	params.Set("configFormat", payload.ConfigFormat)
	if payload.Model != "" {
		params.Set("model", payload.Model)
	}
	if payload.HaikuModel != "" {
		params.Set("haikuModel", payload.HaikuModel)
	}
	if payload.SonnetModel != "" {
		params.Set("sonnetModel", payload.SonnetModel)
	}
	if payload.OpusModel != "" {
		params.Set("opusModel", payload.OpusModel)
	}
	if payload.Notes != "" {
		params.Set("notes", payload.Notes)
	}

	common.ApiSuccess(c, desktopImportCreateResponse{
		Code:      code,
		DeepLink:  "codego://v1/import?" + params.Encode(),
		ConfigURL: configURL,
		ExpiresIn: int64(desktopImportCodeTTL / time.Second),
		Tool:      tool,
		TokenName: token.Name,
		Provider:  payload.Name,
	})
}

// GetDesktopImportConfig resolves a one-time import code into the provider configuration payload.
func GetDesktopImportConfig(c *gin.Context) {
	code := strings.TrimSpace(c.Query("code"))
	if code == "" {
		common.ApiErrorMsg(c, "missing code")
		return
	}

	cache := getDesktopImportCache()
	payload, found, err := cache.Get(code)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !found {
		common.ApiErrorMsg(c, "import code is invalid or expired")
		return
	}
	if _, err = cache.DeleteMany([]string{code}); err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, payload)
}
