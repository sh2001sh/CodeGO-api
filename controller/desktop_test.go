package controller

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type desktopSummaryResponse struct {
	Account struct {
		ID                 int      `json:"id"`
		Username           string   `json:"username"`
		DisplayName        string   `json:"display_name"`
		QuotaUSD           float64  `json:"quota_usd"`
		ClaudeQuotaUSD     float64  `json:"claude_quota_usd"`
		UsedQuotaUSD       float64  `json:"used_quota_usd"`
		FundingSourceOrder []string `json:"funding_source_order"`
	} `json:"account"`
	Tokens struct {
		Total        int                `json:"total"`
		DesktopToken *tokenResponseItem `json:"desktop_token"`
	} `json:"tokens"`
	Usage struct {
		AvailableModels []string `json:"available_models"`
		TodayUSD        float64  `json:"today_usd"`
		Last7DaysUSD    float64  `json:"last_7_days_usd"`
		LastRequestAt   int64    `json:"last_request_at"`
	} `json:"usage"`
	Service struct {
		Status            string   `json:"status"`
		Notice            string   `json:"notice"`
		Maintenance       bool     `json:"maintenance"`
		RecommendedAction string   `json:"recommended_action"`
		AffectedScopes    []string `json:"affected_scopes"`
	} `json:"service"`
	RecentLogs []struct {
		Content string `json:"content"`
	} `json:"recent_logs"`
	Actions struct {
		ServerAddress string `json:"server_address"`
		LogsPath      string `json:"logs_path"`
	} `json:"actions"`
}

type desktopEnsureTokenPayload struct {
	Token struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
		Key  string `json:"key"`
	} `json:"token"`
	Created   bool   `json:"created"`
	FullKey   string `json:"full_key"`
	TokenName string `json:"token_name"`
}

type desktopTemplatePayload struct {
	Tool          string            `json:"tool"`
	Label         string            `json:"label"`
	Endpoint      string            `json:"endpoint"`
	AuthScheme    string            `json:"auth_scheme"`
	ModelFormat   string            `json:"model_format"`
	Env           map[string]string `json:"env"`
	ServerAddress string            `json:"server_address"`
}

type desktopImportCreatePayload struct {
	Code      string `json:"code"`
	DeepLink  string `json:"deep_link"`
	ConfigURL string `json:"config_url"`
	ExpiresIn int64  `json:"expires_in_seconds"`
	Tool      string `json:"tool"`
	TokenName string `json:"token_name"`
	Provider  string `json:"provider_name"`
}

type desktopImportConfigResponse struct {
	Tool         string `json:"tool"`
	Name         string `json:"name"`
	Homepage     string `json:"homepage"`
	Endpoint     string `json:"endpoint"`
	APIKey       string `json:"apiKey"`
	Model        string `json:"model"`
	HaikuModel   string `json:"haikuModel"`
	SonnetModel  string `json:"sonnetModel"`
	OpusModel    string `json:"opusModel"`
	Enabled      bool   `json:"enabled"`
	Config       string `json:"config"`
	ConfigFormat string `json:"configFormat"`
	Icon         string `json:"icon"`
}

type codexImportConfigBody struct {
	Auth   map[string]string `json:"auth"`
	Config string            `json:"config"`
}

func setupDesktopControllerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db := openTokenControllerTestDB(t)
	if err := db.AutoMigrate(
		&model.User{},
		&model.Token{},
		&model.Log{},
		&model.QuotaData{},
		&model.Ability{},
		&model.DesktopAuthSession{},
		&model.DesktopAuthorizedDevice{},
		&model.DesktopDiagnosticReport{},
		&model.DesktopTelemetryEvent{},
	); err != nil {
		t.Fatalf("failed to migrate desktop controller tables: %v", err)
	}
	return db
}

func resetDesktopImportCacheForTest(t *testing.T) {
	t.Helper()
	if desktopImportCache != nil {
		if err := desktopImportCache.Purge(); err != nil {
			t.Fatalf("failed to purge desktop import cache: %v", err)
		}
	}
}

func TestGetDesktopAccountSummaryReturnsAggregatedDesktopData(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:           1,
		Username:     "desktop-user",
		Password:     "password123",
		DisplayName:  "Desktop User",
		Role:         common.RoleCommonUser,
		Status:       common.UserStatusEnabled,
		Group:        "default",
		Quota:        int(common.QuotaPerUnit * 3),
		ClaudeQuota:  int(common.QuotaPerUnit),
		UsedQuota:    int(common.QuotaPerUnit / 2),
		RequestCount: 12,
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	token := seedToken(t, db, 1, buildDesktopTokenName("Default"), "desktoptoken123456")
	if err := model.RecordLogTx(nil, user.Id, model.LogTypeConsume, "desktop log entry"); err != nil {
		t.Fatalf("failed to seed log: %v", err)
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/account/summary", nil, 1)
	GetDesktopAccountSummary(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var payload desktopSummaryResponse
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop summary: %v", err)
	}

	if payload.Account.Username != user.Username {
		t.Fatalf("expected username %q, got %q", user.Username, payload.Account.Username)
	}
	if payload.Account.QuotaUSD != 3 {
		t.Fatalf("expected quota usd 3, got %v", payload.Account.QuotaUSD)
	}
	if payload.Account.ClaudeQuotaUSD != 1 {
		t.Fatalf("expected claude quota usd 1, got %v", payload.Account.ClaudeQuotaUSD)
	}
	if payload.Account.UsedQuotaUSD != 0.5 {
		t.Fatalf("expected used quota usd 0.5, got %v", payload.Account.UsedQuotaUSD)
	}
	if payload.Tokens.Total != 1 {
		t.Fatalf("expected token total 1, got %d", payload.Tokens.Total)
	}
	if payload.Tokens.DesktopToken == nil || payload.Tokens.DesktopToken.Key != token.GetMaskedKey() {
		t.Fatalf("expected masked desktop token %q", token.GetMaskedKey())
	}
	if len(payload.RecentLogs) != 1 || payload.RecentLogs[0].Content != "desktop log entry" {
		t.Fatalf("expected seeded recent log, got %#v", payload.RecentLogs)
	}
	if payload.Usage.LastRequestAt <= 0 {
		t.Fatalf("expected last request at to be populated")
	}
	if payload.Service.Status == "" {
		t.Fatalf("expected service status in desktop summary")
	}
	if payload.Actions.LogsPath != "/usage-logs" {
		t.Fatalf("expected logs path /usage-logs, got %q", payload.Actions.LogsPath)
	}
	if !strings.Contains(payload.Actions.ServerAddress, "localhost") {
		t.Fatalf("expected localhost fallback server address, got %q", payload.Actions.ServerAddress)
	}
}

func TestEnsureDesktopTokenCreatesAndReusesNamedDesktopToken(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-owner",
		Password:    "password123",
		DisplayName: "Desktop Owner",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	body := map[string]any{"device_name": "Windows"}
	createCtx, createRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/tokens/ensure", body, 1)
	EnsureDesktopToken(createCtx)

	createResponse := decodeAPIResponse(t, createRecorder)
	if !createResponse.Success {
		t.Fatalf("expected create to succeed, got message: %s", createResponse.Message)
	}

	var created desktopEnsureTokenPayload
	if err := common.Unmarshal(createResponse.Data, &created); err != nil {
		t.Fatalf("failed to decode create response: %v", err)
	}
	if !created.Created {
		t.Fatalf("expected created=true on first ensure")
	}
	expectedName := buildDesktopTokenName("Windows")
	if created.TokenName != expectedName {
		t.Fatalf("expected token name %q, got %q", expectedName, created.TokenName)
	}
	if created.Token.Key == created.FullKey {
		t.Fatalf("expected masked key in token payload")
	}

	reuseCtx, reuseRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/tokens/ensure", body, 1)
	EnsureDesktopToken(reuseCtx)

	reuseResponse := decodeAPIResponse(t, reuseRecorder)
	if !reuseResponse.Success {
		t.Fatalf("expected reuse to succeed, got message: %s", reuseResponse.Message)
	}

	var reused desktopEnsureTokenPayload
	if err := common.Unmarshal(reuseResponse.Data, &reused); err != nil {
		t.Fatalf("failed to decode reuse response: %v", err)
	}
	if reused.Created {
		t.Fatalf("expected created=false on second ensure")
	}
	if reused.Token.ID != created.Token.ID {
		t.Fatalf("expected reused token id %d, got %d", created.Token.ID, reused.Token.ID)
	}
	if reused.FullKey != created.FullKey {
		t.Fatalf("expected same full key on reuse")
	}
}

func TestGetDesktopTokensReturnsWebsiteKeyList(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-token-list",
		Password:    "password123",
		DisplayName: "Desktop Token List",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	token := seedToken(t, db, 1, "website-key", "websitekey1234567890")
	seedToken(t, db, 2, "other-user-key", "otheruserkey123456")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/tokens?p=1&size=10", nil, 1)
	GetDesktopTokens(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var page struct {
		Total int                 `json:"total"`
		Items []tokenResponseItem `json:"items"`
	}
	if err := common.Unmarshal(response.Data, &page); err != nil {
		t.Fatalf("failed to decode desktop token page: %v", err)
	}
	if page.Total != 1 || len(page.Items) != 1 {
		t.Fatalf("expected one desktop-visible website key, got total=%d items=%d", page.Total, len(page.Items))
	}
	if page.Items[0].Name != token.Name {
		t.Fatalf("expected website token %q, got %q", token.Name, page.Items[0].Name)
	}
	if page.Items[0].Key != token.GetMaskedKey() {
		t.Fatalf("expected masked key %q, got %q", token.GetMaskedKey(), page.Items[0].Key)
	}
	if strings.Contains(recorder.Body.String(), token.GetFullKey()) {
		t.Fatalf("desktop token list leaked raw key: %s", recorder.Body.String())
	}
}

func TestGetDesktopTokenKeyReturnsWebsiteKeyFullValue(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-key-owner",
		Password:    "password123",
		DisplayName: "Desktop Key Owner",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	token := seedToken(t, db, 1, "website-full-key", "websitefullkey1234567890")

	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, fmt.Sprintf("/api/desktop/tokens/%d/key", token.Id), nil, 1)
	ctx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(token.Id)}}
	GetDesktopTokenKey(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}
	var payload tokenKeyResponse
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop token key response: %v", err)
	}
	if payload.Key != token.GetFullKey() {
		t.Fatalf("expected full website key %q, got %q", token.GetFullKey(), payload.Key)
	}
}

func TestGetDesktopGroupsReturnsUsableDropdownItems(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-groups",
		Password:    "password123",
		DisplayName: "Desktop Groups",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	if err := db.Create(&model.Ability{Group: "default", Model: "gpt-5.5", Enabled: true}).Error; err != nil {
		t.Fatalf("failed to seed ability: %v", err)
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/groups", nil, 1)
	GetDesktopGroups(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}
	var payload desktopGroupsResponse
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop groups: %v", err)
	}
	if payload.Current != "default" {
		t.Fatalf("expected current group default, got %q", payload.Current)
	}
	foundDefault := false
	for _, item := range payload.Items {
		if item.Name == "default" {
			foundDefault = true
			if !item.Current {
				t.Fatalf("expected default group to be marked current")
			}
			if item.AvailableModelsCount != 1 {
				t.Fatalf("expected default model count 1, got %d", item.AvailableModelsCount)
			}
		}
	}
	if !foundDefault {
		t.Fatalf("expected default group in desktop group list: %#v", payload.Items)
	}
}

func TestGetDesktopConfigTemplateReturnsToolSpecificEndpoints(t *testing.T) {
	common.OptionMapRWMutex.Lock()
	if common.OptionMap == nil {
		common.OptionMap = map[string]string{}
	}
	common.OptionMapRWMutex.Unlock()
	system_setting.ServerAddress = "https://shu26.cfd"
	t.Cleanup(func() {
		system_setting.ServerAddress = "http://localhost:3000"
	})

	tests := []struct {
		tool         string
		label        string
		authScheme   string
		modelFormat  string
		envKey       string
		endpointTail string
	}{
		{tool: "codex", label: "Codex", authScheme: "openai-api-key", modelFormat: "responses", envKey: "OPENAI_BASE_URL", endpointTail: "/v1"},
		{tool: "claude", label: "Claude Code", authScheme: "anthropic-auth-token", modelFormat: "anthropic", envKey: "ANTHROPIC_BASE_URL", endpointTail: ""},
		{tool: "gemini", label: "Gemini CLI", authScheme: "google-api-key-compatible", modelFormat: "gemini", envKey: "GOOGLE_API_BASE", endpointTail: ""},
		{tool: "opencode", label: "OpenCode", authScheme: "openai-compatible-api-key", modelFormat: "openai-compatible", envKey: "OPENAI_BASE_URL", endpointTail: "/v1"},
		{tool: "openclaw", label: "OpenClaw", authScheme: "openai-compatible-api-key", modelFormat: "openai-compatible", envKey: "OPENAI_BASE_URL", endpointTail: "/v1"},
		{tool: "hermes", label: "Hermes", authScheme: "openai-compatible-api-key", modelFormat: "chat-completions", envKey: "OPENAI_BASE_URL", endpointTail: "/v1"},
	}

	for _, tc := range tests {
		t.Run(tc.tool, func(t *testing.T) {
			target := "/api/desktop/config/template?tool=" + url.QueryEscape(tc.tool)
			ctx, recorder := newAuthenticatedContext(t, http.MethodGet, target, nil, 1)
			ctx.Request.URL.RawQuery = "tool=" + tc.tool
			GetDesktopConfigTemplate(ctx)

			response := decodeAPIResponse(t, recorder)
			if !response.Success {
				t.Fatalf("expected success response, got message: %s", response.Message)
			}

			var payload desktopTemplatePayload
			if err := common.Unmarshal(response.Data, &payload); err != nil {
				t.Fatalf("failed to decode template: %v", err)
			}
			if payload.Label != tc.label {
				t.Fatalf("expected label %q, got %q", tc.label, payload.Label)
			}
			if payload.AuthScheme != tc.authScheme {
				t.Fatalf("expected auth scheme %q, got %q", tc.authScheme, payload.AuthScheme)
			}
			if payload.ModelFormat != tc.modelFormat {
				t.Fatalf("expected model format %q, got %q", tc.modelFormat, payload.ModelFormat)
			}
			if !strings.HasSuffix(payload.Endpoint, tc.endpointTail) {
				t.Fatalf("expected endpoint %q to end with %q", payload.Endpoint, tc.endpointTail)
			}
			if payload.Env[tc.envKey] == "" {
				t.Fatalf("expected env key %q to be populated", tc.envKey)
			}
		})
	}
}

func TestGetDesktopConfigTemplatesReturnsAllSupportedTools(t *testing.T) {
	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/config/templates", nil, 1)
	GetDesktopConfigTemplates(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var payload struct {
		BaseURL string                            `json:"base_url"`
		Tools   map[string]desktopTemplatePayload `json:"tools"`
	}
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop config templates: %v", err)
	}
	if payload.BaseURL == "" {
		t.Fatalf("expected base url")
	}
	if len(payload.Tools) != 6 {
		t.Fatalf("expected six tool templates, got %d", len(payload.Tools))
	}
	if payload.Tools["codex"].Endpoint == "" ||
		payload.Tools["claude"].Endpoint == "" ||
		payload.Tools["gemini"].Endpoint == "" ||
		payload.Tools["opencode"].Endpoint == "" ||
		payload.Tools["openclaw"].Endpoint == "" ||
		payload.Tools["hermes"].Endpoint == "" {
		t.Fatalf("expected all tool endpoints to be populated: %#v", payload.Tools)
	}
}

func TestGetDesktopConfigTemplateRejectsUnsupportedTool(t *testing.T) {
	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/config/template?tool=cursor", nil, 1)
	ctx.Request.URL.RawQuery = "tool=cursor"
	GetDesktopConfigTemplate(ctx)

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected unsupported tool template request to fail")
	}
	if !strings.Contains(response.Message, "unsupported tool") {
		t.Fatalf("expected unsupported tool error message, got %q", response.Message)
	}
}

func TestGetDesktopServiceStatusReturnsSummary(t *testing.T) {
	originalNotice := common.OptionMap["Notice"]
	originalMaintenance := common.OptionMap["Maintenance"]
	common.OptionMap["Notice"] = "Desktop maintenance notice"
	common.OptionMap["Maintenance"] = "true"
	t.Cleanup(func() {
		common.OptionMap["Notice"] = originalNotice
		common.OptionMap["Maintenance"] = originalMaintenance
	})

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/service/status", nil, 1)
	GetDesktopServiceStatus(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var payload struct {
		Status            string   `json:"status"`
		Notice            string   `json:"notice"`
		Maintenance       bool     `json:"maintenance"`
		RecommendedAction string   `json:"recommended_action"`
		AffectedScopes    []string `json:"affected_scopes"`
	}
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop service status: %v", err)
	}
	if payload.Status != "maintenance" {
		t.Fatalf("expected maintenance status, got %q", payload.Status)
	}
	if payload.Notice != "Desktop maintenance notice" {
		t.Fatalf("expected notice payload, got %q", payload.Notice)
	}
	if !payload.Maintenance {
		t.Fatalf("expected maintenance flag to be enabled")
	}
	if payload.RecommendedAction == "" {
		t.Fatalf("expected recommended action")
	}
	if len(payload.AffectedScopes) == 0 {
		t.Fatalf("expected affected scopes")
	}
}

func TestDesktopServiceMaintenanceEnabledParsesCommonTruthies(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want bool
	}{
		{name: "true", raw: "true", want: true},
		{name: "one", raw: "1", want: true},
		{name: "enabled", raw: "enabled", want: true},
		{name: "false", raw: "false", want: false},
		{name: "empty", raw: "", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := desktopServiceMaintenanceEnabled(map[string]string{
				"Maintenance": tc.raw,
			})
			if got != tc.want {
				t.Fatalf("expected %v, got %v", tc.want, got)
			}
		})
	}
}

func TestGetDesktopTokenConfigReturnsPerToolPayloads(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-config-user",
		Password:    "password123",
		DisplayName: "Desktop Config User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	token := seedToken(t, db, 1, "desktop-config-token", "desktopconfigkey123456")
	if err := db.Create(&[]*model.Ability{
		{Group: "default", Model: "gpt-5.5", Enabled: true},
		{Group: "default", Model: "claude-sonnet-4-5", Enabled: true},
		{Group: "default", Model: "gemini-2.5-pro", Enabled: true},
	}).Error; err != nil {
		t.Fatalf("failed to seed abilities: %v", err)
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/tokens/1/config", nil, 1)
	ctx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(token.Id)}}
	GetDesktopTokenConfig(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var payload struct {
		Token struct {
			ID   int    `json:"id"`
			Name string `json:"name"`
			Key  string `json:"key"`
		} `json:"token"`
		ServerAddress string                                 `json:"server_address"`
		Tools         map[string]desktopImportConfigResponse `json:"tools"`
	}
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop token config response: %v", err)
	}
	if payload.Token.ID != token.Id {
		t.Fatalf("expected token id %d, got %d", token.Id, payload.Token.ID)
	}
	if payload.ServerAddress == "" {
		t.Fatalf("expected server address")
	}
	if len(payload.Tools) != 6 {
		t.Fatalf("expected 6 tool configs, got %d", len(payload.Tools))
	}
	if payload.Tools["codex"].APIKey != token.GetFullKey() {
		t.Fatalf("expected codex api key to use full token key")
	}
	if payload.Tools["claude"].Model != "claude-sonnet-4-5" {
		t.Fatalf("expected claude recommended model, got %q", payload.Tools["claude"].Model)
	}
	if payload.Tools["gemini"].Model != "gemini-2.5-pro" {
		t.Fatalf("expected gemini recommended model, got %q", payload.Tools["gemini"].Model)
	}
	if payload.Tools["opencode"].Model != "gpt-5.5" {
		t.Fatalf("expected opencode recommended model, got %q", payload.Tools["opencode"].Model)
	}
	if payload.Tools["openclaw"].Model != "gpt-5.5" {
		t.Fatalf("expected openclaw recommended model, got %q", payload.Tools["openclaw"].Model)
	}
	if payload.Tools["hermes"].Model != "gpt-5.5" {
		t.Fatalf("expected hermes recommended model, got %q", payload.Tools["hermes"].Model)
	}
}

func TestGetDesktopTokenConfigUsesTokenGroupModels(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-token-group-models",
		Password:    "password123",
		DisplayName: "Desktop Token Group Models",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	token := seedToken(t, db, 1, "vip-token", "viptokenkey1234567890")
	if err := db.Model(&model.Token{}).Where("id = ?", token.Id).Update("group", "vip").Error; err != nil {
		t.Fatalf("failed to set token group: %v", err)
	}
	if err := db.Create(&[]*model.Ability{
		{Group: "default", Model: "gpt-5-default", Enabled: true},
		{Group: "vip", Model: "gpt-5-vip", Enabled: true},
	}).Error; err != nil {
		t.Fatalf("failed to seed abilities: %v", err)
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/tokens/1/config", nil, 1)
	ctx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(token.Id)}}
	GetDesktopTokenConfig(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}
	var payload struct {
		Tools map[string]desktopImportConfigResponse `json:"tools"`
	}
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop token config response: %v", err)
	}
	if payload.Tools["codex"].Model != "gpt-5-vip" {
		t.Fatalf("expected token group model gpt-5-vip, got %q", payload.Tools["codex"].Model)
	}
}

func TestGetDesktopTokenConfigRejectsInvalidTokenID(t *testing.T) {
	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/tokens/not-a-number/config", nil, 1)
	ctx.Params = gin.Params{{Key: "id", Value: "not-a-number"}}
	GetDesktopTokenConfig(ctx)

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected invalid token id request to fail")
	}
	if !strings.Contains(response.Message, "invalid token id") {
		t.Fatalf("expected invalid token id error message, got %q", response.Message)
	}
}

func TestGetDesktopTokenConfigRejectsOtherUsersToken(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	users := []*model.User{
		{
			Id:          1,
			Username:    "token-owner-a",
			Password:    "password123",
			DisplayName: "Token Owner A",
			Role:        common.RoleCommonUser,
			Status:      common.UserStatusEnabled,
			Group:       "default",
			AffCode:     "toka",
		},
		{
			Id:          2,
			Username:    "token-owner-b",
			Password:    "password123",
			DisplayName: "Token Owner B",
			Role:        common.RoleCommonUser,
			Status:      common.UserStatusEnabled,
			Group:       "default",
			AffCode:     "tokb",
		},
	}
	for _, user := range users {
		if err := db.Create(user).Error; err != nil {
			t.Fatalf("failed to seed user %d: %v", user.Id, err)
		}
	}

	token := seedToken(t, db, 1, "owner-a-token", "owneratoken123456")
	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, fmt.Sprintf("/api/desktop/tokens/%d/config", token.Id), nil, 2)
	ctx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(token.Id)}}
	GetDesktopTokenConfig(ctx)

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected other user's token config request to fail")
	}
	if !strings.Contains(response.Message, "token not found") {
		t.Fatalf("expected token not found error message, got %q", response.Message)
	}
}

func TestGetDesktopUsageLogsPassesThroughUserLogsPage(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-log-user",
		Password:    "password123",
		DisplayName: "Desktop Log User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	if err := model.RecordLogTx(nil, user.Id, model.LogTypeConsume, "first log"); err != nil {
		t.Fatalf("failed to seed first log: %v", err)
	}
	if err := model.RecordLogTx(nil, user.Id, model.LogTypeError, "second log"); err != nil {
		t.Fatalf("failed to seed second log: %v", err)
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/usage/logs?p=1&size=10", nil, 1)
	GetDesktopUsageLogs(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var page struct {
		Items []struct {
			Content string `json:"content"`
		} `json:"items"`
		Total int `json:"total"`
	}
	if err := common.Unmarshal(response.Data, &page); err != nil {
		t.Fatalf("failed to decode page payload: %v", err)
	}
	if page.Total != 2 {
		t.Fatalf("expected total 2 logs, got %d", page.Total)
	}
	if len(page.Items) != 2 {
		t.Fatalf("expected 2 log items, got %d", len(page.Items))
	}
	joined := page.Items[0].Content + " " + page.Items[1].Content
	if !strings.Contains(joined, "first log") || !strings.Contains(joined, "second log") {
		t.Fatalf("expected both seeded log entries in response: %#v", page.Items)
	}
}

func TestGetDesktopUsageTrendsReturnsFilledDailySeries(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-trend-user",
		Password:    "password123",
		DisplayName: "Desktop Trend User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	now := time.Now().In(time.Local)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	yesterday := today.AddDate(0, 0, -1)
	rows := []*model.QuotaData{
		{
			UserID:    user.Id,
			Username:  user.Username,
			ModelName: "gpt-5.5",
			CreatedAt: yesterday.Unix(),
			Count:     2,
			Quota:     int(common.QuotaPerUnit),
			TokenUsed: 300,
		},
		{
			UserID:    user.Id,
			Username:  user.Username,
			ModelName: "claude-sonnet-4",
			CreatedAt: today.Unix(),
			Count:     1,
			Quota:     int(common.QuotaPerUnit / 2),
			TokenUsed: 120,
		},
	}
	if err := db.Create(&rows).Error; err != nil {
		t.Fatalf("failed to seed quota data: %v", err)
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/usage/trends?days=7", nil, 1)
	ctx.Request.URL.RawQuery = "days=7"
	GetDesktopUsageTrends(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected success response, got message: %s", response.Message)
	}

	var payload struct {
		Days  int `json:"days"`
		Trend []struct {
			Date      string  `json:"date"`
			Requests  int64   `json:"requests"`
			Quota     int64   `json:"quota"`
			TokenUsed int64   `json:"token_used"`
			QuotaUSD  float64 `json:"quota_usd"`
		} `json:"trend"`
	}
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop usage trends: %v", err)
	}
	if payload.Days != 7 {
		t.Fatalf("expected days=7, got %d", payload.Days)
	}
	if len(payload.Trend) != 7 {
		t.Fatalf("expected 7 trend items, got %d", len(payload.Trend))
	}

	var yesterdayRow, todayRow *struct {
		Date      string  `json:"date"`
		Requests  int64   `json:"requests"`
		Quota     int64   `json:"quota"`
		TokenUsed int64   `json:"token_used"`
		QuotaUSD  float64 `json:"quota_usd"`
	}
	yesterdayKey := yesterday.Format("2006-01-02")
	todayKey := today.Format("2006-01-02")
	for i := range payload.Trend {
		item := &payload.Trend[i]
		if item.Date == yesterdayKey {
			yesterdayRow = item
		}
		if item.Date == todayKey {
			todayRow = item
		}
	}
	if yesterdayRow == nil || todayRow == nil {
		t.Fatalf("expected today and yesterday in trend payload: %#v", payload.Trend)
	}
	if yesterdayRow.Requests != 2 || yesterdayRow.TokenUsed != 300 {
		t.Fatalf("unexpected yesterday row: %#v", yesterdayRow)
	}
	if todayRow.Requests != 1 || todayRow.TokenUsed != 120 {
		t.Fatalf("unexpected today row: %#v", todayRow)
	}
	if yesterdayRow.QuotaUSD != 1 {
		t.Fatalf("expected yesterday quota usd 1, got %v", yesterdayRow.QuotaUSD)
	}
	if todayRow.QuotaUSD != 0.5 {
		t.Fatalf("expected today quota usd 0.5, got %v", todayRow.QuotaUSD)
	}
}

func TestStartDesktopAuthSessionReturnsVerificationPayload(t *testing.T) {
	db := setupDesktopControllerTestDB(t)
	system_setting.ServerAddress = "https://shu26.cfd"
	t.Cleanup(func() {
		system_setting.ServerAddress = "http://localhost:3000"
	})

	body := map[string]any{
		"device_name": "QA Laptop",
		"platform":    "windows",
		"app_version": "0.1.0",
	}
	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/auth/session", body, 0)
	StartDesktopAuthSession(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected desktop auth session create success, got %s", response.Message)
	}

	var payload desktopAuthStartResponse
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop auth start payload: %v", err)
	}
	if payload.SessionID == "" || payload.UserCode == "" {
		t.Fatalf("expected session id and user code, got %#v", payload)
	}
	if !strings.Contains(payload.VerificationURI, "/desktop/authorize?") {
		t.Fatalf("expected verification uri, got %q", payload.VerificationURI)
	}
	if payload.Interval != desktopAuthDefaultPollDelay {
		t.Fatalf("expected poll interval %d, got %d", desktopAuthDefaultPollDelay, payload.Interval)
	}

	var stored model.DesktopAuthSession
	if err := db.First(&stored, "session_id = ?", payload.SessionID).Error; err != nil {
		t.Fatalf("failed to reload created auth session: %v", err)
	}
	if stored.DeviceName != "QA Laptop" {
		t.Fatalf("expected stored device name, got %q", stored.DeviceName)
	}
	if stored.Status != model.DesktopAuthSessionStatusPending {
		t.Fatalf("expected pending session status, got %q", stored.Status)
	}
}

func TestGetDesktopAuthSessionReturnsAuthorizePageMetadata(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-authorize-user",
		Password:    "password123",
		DisplayName: "Desktop Authorize User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	session := &model.DesktopAuthSession{
		SessionID:  "desktop-session-view",
		UserCode:   "ZXCV1122",
		DeviceName: "Review MacBook",
		Platform:   "macos",
		AppVersion: "2.0.0",
		Status:     model.DesktopAuthSessionStatusPending,
		CreatedAt:  common.GetTimestamp(),
		ExpiresAt:  common.GetTimestamp() + 600,
	}
	if err := db.Create(session).Error; err != nil {
		t.Fatalf("failed to seed desktop auth session: %v", err)
	}

	target := "/api/desktop/auth/session?session_id=" + url.QueryEscape(session.SessionID) + "&code=" + url.QueryEscape(session.UserCode)
	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, target, nil, 1)
	ctx.Request.URL.RawQuery = "session_id=" + url.QueryEscape(session.SessionID) + "&code=" + url.QueryEscape(session.UserCode)
	GetDesktopAuthSession(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected desktop auth session details success, got %s", response.Message)
	}

	var payload struct {
		SessionID   string   `json:"session_id"`
		UserCode    string   `json:"user_code"`
		DeviceName  string   `json:"device_name"`
		Platform    string   `json:"platform"`
		AppVersion  string   `json:"app_version"`
		Status      string   `json:"status"`
		Permissions []string `json:"permissions"`
	}
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode desktop auth session payload: %v", err)
	}
	if payload.SessionID != session.SessionID || payload.UserCode != session.UserCode {
		t.Fatalf("expected session identity to round-trip, got %#v", payload)
	}
	if payload.DeviceName != session.DeviceName || payload.Platform != session.Platform {
		t.Fatalf("expected device metadata to round-trip, got %#v", payload)
	}
	if payload.AppVersion != session.AppVersion {
		t.Fatalf("expected app version %q, got %q", session.AppVersion, payload.AppVersion)
	}
	if payload.Status != model.DesktopAuthSessionStatusPending {
		t.Fatalf("expected pending status, got %q", payload.Status)
	}
	if len(payload.Permissions) == 0 {
		t.Fatalf("expected desktop authorization permissions to be populated")
	}
}

func TestApproveDesktopAuthSessionAndPollReturnsDesktopAccessToken(t *testing.T) {
	db := setupDesktopControllerTestDB(t)
	system_setting.ServerAddress = "https://shu26.cfd"
	t.Cleanup(func() {
		system_setting.ServerAddress = "http://localhost:3000"
	})

	user := &model.User{
		Id:          1,
		Username:    "desktop-auth-user",
		Password:    "password123",
		DisplayName: "Desktop Auth User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	session := &model.DesktopAuthSession{
		SessionID:  "desktop-session-1",
		UserCode:   "ABCD1234",
		DeviceName: "Office Mac",
		Platform:   "macos",
		AppVersion: "1.2.3",
		Status:     model.DesktopAuthSessionStatusPending,
		CreatedAt:  common.GetTimestamp(),
		ExpiresAt:  common.GetTimestamp() + 600,
	}
	if err := db.Create(session).Error; err != nil {
		t.Fatalf("failed to seed desktop auth session: %v", err)
	}

	approveCtx, approveRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/auth/approve", map[string]any{
		"session_id": session.SessionID,
	}, 1)
	ApproveDesktopAuthSession(approveCtx)

	approveResponse := decodeAPIResponse(t, approveRecorder)
	if !approveResponse.Success {
		t.Fatalf("expected approve desktop auth success, got %s", approveResponse.Message)
	}

	var approvePayload struct {
		DeviceID    int      `json:"device_id"`
		AccessToken string   `json:"access_token"`
		Scopes      []string `json:"scopes"`
		Status      string   `json:"status"`
	}
	if err := common.Unmarshal(approveResponse.Data, &approvePayload); err != nil {
		t.Fatalf("failed to decode approve payload: %v", err)
	}
	if approvePayload.DeviceID <= 0 || approvePayload.AccessToken == "" {
		t.Fatalf("expected device id and access token, got %#v", approvePayload)
	}
	if approvePayload.Status != model.DesktopAuthSessionStatusApproved {
		t.Fatalf("expected approved status, got %q", approvePayload.Status)
	}
	if len(approvePayload.Scopes) != len(model.DefaultDesktopScopes()) {
		t.Fatalf("expected default scopes on approved device, got %#v", approvePayload.Scopes)
	}

	pollCtx, pollRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/auth/poll", map[string]any{
		"session_id": session.SessionID,
	}, 0)
	PollDesktopAuthSession(pollCtx)

	pollResponse := decodeAPIResponse(t, pollRecorder)
	if !pollResponse.Success {
		t.Fatalf("expected poll success, got %s", pollResponse.Message)
	}

	var pollPayload desktopAuthPollResponse
	if err := common.Unmarshal(pollResponse.Data, &pollPayload); err != nil {
		t.Fatalf("failed to decode poll payload: %v", err)
	}
	if !pollPayload.Authenticated {
		t.Fatalf("expected authenticated poll payload")
	}
	if pollPayload.AccessToken != approvePayload.AccessToken {
		t.Fatalf("expected same access token, got %q != %q", pollPayload.AccessToken, approvePayload.AccessToken)
	}
	if pollPayload.DeviceID != approvePayload.DeviceID {
		t.Fatalf("expected device id %d, got %d", approvePayload.DeviceID, pollPayload.DeviceID)
	}
	if pollPayload.LastUsername != user.Username {
		t.Fatalf("expected username %q, got %q", user.Username, pollPayload.LastUsername)
	}
	if len(pollPayload.Scopes) != len(model.DefaultDesktopScopes()) {
		t.Fatalf("expected poll payload scopes, got %#v", pollPayload.Scopes)
	}
}

func TestRejectDesktopAuthSessionMarksSessionRejected(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-reject-user",
		Password:    "password123",
		DisplayName: "Desktop Reject User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	session := &model.DesktopAuthSession{
		SessionID:  "desktop-session-reject",
		UserCode:   "WXYZ5678",
		DeviceName: "QA Desktop",
		Platform:   "windows",
		AppVersion: "1.0.0",
		Status:     model.DesktopAuthSessionStatusPending,
		CreatedAt:  common.GetTimestamp(),
		ExpiresAt:  common.GetTimestamp() + 600,
	}
	if err := db.Create(session).Error; err != nil {
		t.Fatalf("failed to seed desktop auth session: %v", err)
	}

	rejectCtx, rejectRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/auth/reject", map[string]any{
		"session_id": session.SessionID,
	}, 1)
	RejectDesktopAuthSession(rejectCtx)

	rejectResponse := decodeAPIResponse(t, rejectRecorder)
	if !rejectResponse.Success {
		t.Fatalf("expected reject desktop auth success, got %s", rejectResponse.Message)
	}

	var rejectPayload struct {
		Status string `json:"status"`
	}
	if err := common.Unmarshal(rejectResponse.Data, &rejectPayload); err != nil {
		t.Fatalf("failed to decode reject payload: %v", err)
	}
	if rejectPayload.Status != model.DesktopAuthSessionStatusRejected {
		t.Fatalf("expected rejected status, got %q", rejectPayload.Status)
	}

	var refreshed model.DesktopAuthSession
	if err := db.First(&refreshed, "session_id = ?", session.SessionID).Error; err != nil {
		t.Fatalf("failed to reload session: %v", err)
	}
	if refreshed.Status != model.DesktopAuthSessionStatusRejected {
		t.Fatalf("expected stored session status rejected, got %q", refreshed.Status)
	}
}

func TestPollDesktopAuthSessionMarksExpiredPendingSession(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	session := &model.DesktopAuthSession{
		SessionID:  "desktop-session-expired",
		UserCode:   "EXPD0001",
		DeviceName: "Old Desktop",
		Platform:   "windows",
		AppVersion: "0.8.0",
		Status:     model.DesktopAuthSessionStatusPending,
		CreatedAt:  common.GetTimestamp() - 1200,
		ExpiresAt:  common.GetTimestamp() - 60,
	}
	if err := db.Create(session).Error; err != nil {
		t.Fatalf("failed to seed desktop auth session: %v", err)
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/auth/poll", map[string]any{
		"session_id": session.SessionID,
	}, 0)
	PollDesktopAuthSession(ctx)

	response := decodeAPIResponse(t, recorder)
	if !response.Success {
		t.Fatalf("expected poll success for expired session, got %s", response.Message)
	}

	var payload desktopAuthPollResponse
	if err := common.Unmarshal(response.Data, &payload); err != nil {
		t.Fatalf("failed to decode poll payload: %v", err)
	}
	if payload.Status != model.DesktopAuthSessionStatusExpired {
		t.Fatalf("expected expired status, got %q", payload.Status)
	}
	if payload.Authenticated {
		t.Fatalf("expected expired session not to authenticate")
	}

	var refreshed model.DesktopAuthSession
	if err := db.First(&refreshed, "session_id = ?", session.SessionID).Error; err != nil {
		t.Fatalf("failed to reload expired session: %v", err)
	}
	if refreshed.Status != model.DesktopAuthSessionStatusExpired {
		t.Fatalf("expected stored session status expired, got %q", refreshed.Status)
	}
}

func TestListAndRevokeDesktopAuthorizedDevice(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-device-owner",
		Password:    "password123",
		DisplayName: "Desktop Device Owner",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	device := &model.DesktopAuthorizedDevice{
		UserID:      user.Id,
		DeviceName:  "ThinkPad",
		Platform:    "windows",
		AppVersion:  "0.9.0",
		AccessToken: "desktop_test_token",
		Scopes:      model.SerializeDesktopScopes([]string{model.DesktopScopeAccountRead, model.DesktopScopeConfigRead}),
		Status:      model.DesktopAuthorizedDeviceStatusActive,
		CreatedAt:   common.GetTimestamp(),
		LastUsedAt:  common.GetTimestamp(),
		ExpiresAt:   common.GetTimestamp() + 3600,
	}
	if err := db.Create(device).Error; err != nil {
		t.Fatalf("failed to seed desktop device: %v", err)
	}

	listCtx, listRecorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/devices", nil, 1)
	ListDesktopAuthorizedDevices(listCtx)

	listResponse := decodeAPIResponse(t, listRecorder)
	if !listResponse.Success {
		t.Fatalf("expected list devices success, got %s", listResponse.Message)
	}

	var listPayload []desktopAuthorizedDeviceItem
	if err := common.Unmarshal(listResponse.Data, &listPayload); err != nil {
		t.Fatalf("failed to decode list devices payload: %v", err)
	}
	if len(listPayload) != 1 || listPayload[0].ID != device.Id {
		t.Fatalf("expected one device, got %#v", listPayload)
	}
	if len(listPayload[0].Scopes) != 2 {
		t.Fatalf("expected scopes in device list payload, got %#v", listPayload[0].Scopes)
	}

	revokeCtx, revokeRecorder := newAuthenticatedContext(t, http.MethodDelete, fmt.Sprintf("/api/desktop/devices/%d", device.Id), nil, 1)
	revokeCtx.Params = gin.Params{{Key: "id", Value: strconv.Itoa(device.Id)}}
	RevokeDesktopAuthorizedDevice(revokeCtx)

	revokeResponse := decodeAPIResponse(t, revokeRecorder)
	if !revokeResponse.Success {
		t.Fatalf("expected revoke device success, got %s", revokeResponse.Message)
	}

	var refreshed model.DesktopAuthorizedDevice
	if err := db.First(&refreshed, device.Id).Error; err != nil {
		t.Fatalf("failed to reload device: %v", err)
	}
	if refreshed.Status != model.DesktopAuthorizedDeviceStatusRevoked {
		t.Fatalf("expected revoked status, got %q", refreshed.Status)
	}
	if refreshed.RevokedAt <= 0 {
		t.Fatalf("expected revoked timestamp to be set")
	}
}

func TestDesktopRouteScopeEnforcementRejectsMissingScope(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-scope-user",
		Password:    "password123",
		DisplayName: "Desktop Scope User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	device := &model.DesktopAuthorizedDevice{
		UserID:      user.Id,
		DeviceName:  "Scoped Device",
		Platform:    "windows",
		AppVersion:  "1.0.0",
		AccessToken: "desktop_scope_token",
		Scopes:      model.SerializeDesktopScopes([]string{model.DesktopScopeAccountRead}),
		Status:      model.DesktopAuthorizedDeviceStatusActive,
		CreatedAt:   common.GetTimestamp(),
		LastUsedAt:  common.GetTimestamp(),
		ExpiresAt:   common.GetTimestamp() + 3600,
	}
	if err := db.Create(device).Error; err != nil {
		t.Fatalf("failed to seed desktop device: %v", err)
	}

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodGet, "/api/desktop/usage/logs", nil)
	req.Header.Set("Authorization", "Bearer "+device.AccessToken)
	req.Header.Set("New-Api-User", strconv.Itoa(user.Id))
	ctx.Request = req

	middleware.DesktopAuth()(ctx)
	if ctx.IsAborted() {
		t.Fatalf("expected desktop auth to pass before scope check")
	}

	middleware.RequireDesktopScope(model.DesktopScopeLogsRead)(ctx)
	if !ctx.IsAborted() {
		t.Fatalf("expected scope middleware to abort request")
	}

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected missing scope response to fail")
	}
	if !strings.Contains(response.Message, model.DesktopScopeLogsRead) {
		t.Fatalf("expected missing scope error to mention required scope, got %q", response.Message)
	}
}

func TestCreateDesktopImportConfigAndConsumeCodeOnce(t *testing.T) {
	db := setupDesktopControllerTestDB(t)
	resetDesktopImportCacheForTest(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-import-user",
		Password:    "password123",
		DisplayName: "Desktop Import User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	token := seedToken(t, db, 1, "codex-key", "importkey1234567890")
	system_setting.ServerAddress = "https://shu26.cfd"
	t.Cleanup(func() {
		system_setting.ServerAddress = "http://localhost:3000"
		resetDesktopImportCacheForTest(t)
	})

	body := map[string]any{
		"tool":     "codex",
		"token_id": token.Id,
		"name":     "Code Go Codex Import",
		"model":    "gpt-5.5",
	}
	createCtx, createRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/import/deeplink", body, 1)
	CreateDesktopImportConfig(createCtx)

	createResponse := decodeAPIResponse(t, createRecorder)
	if !createResponse.Success {
		t.Fatalf("expected create import config success, got %s", createResponse.Message)
	}

	var created desktopImportCreatePayload
	if err := common.Unmarshal(createResponse.Data, &created); err != nil {
		t.Fatalf("failed to decode create import response: %v", err)
	}
	if created.Code == "" {
		t.Fatalf("expected code to be populated")
	}
	if created.Tool != "codex" {
		t.Fatalf("expected tool codex, got %q", created.Tool)
	}
	if !strings.HasPrefix(created.DeepLink, "codego://v1/import?") {
		t.Fatalf("expected deep link to use codego scheme, got %q", created.DeepLink)
	}
	if !strings.Contains(created.DeepLink, "configUrl=") {
		t.Fatalf("expected deep link to include configUrl, got %q", created.DeepLink)
	}
	if !strings.Contains(created.DeepLink, "tokenId="+strconv.Itoa(token.Id)) {
		t.Fatalf("expected deep link to include tokenId, got %q", created.DeepLink)
	}
	if !strings.Contains(created.DeepLink, "codegoAction=applyToolConfig") {
		t.Fatalf("expected deep link to include codegoAction, got %q", created.DeepLink)
	}
	if strings.Contains(created.DeepLink, "apiKey=") {
		t.Fatalf("deep link must not include apiKey: %q", created.DeepLink)
	}
	if !strings.Contains(created.ConfigURL, "code="+created.Code) {
		t.Fatalf("expected config url to include code, got %q", created.ConfigURL)
	}

	codeQuery := "code=" + url.QueryEscape(created.Code)
	getCtx, getRecorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/import/config?"+codeQuery, nil, 0)
	getCtx.Request.URL.RawQuery = codeQuery
	GetDesktopImportConfig(getCtx)

	getResponse := decodeAPIResponse(t, getRecorder)
	if !getResponse.Success {
		t.Fatalf("expected import config fetch success, got %s", getResponse.Message)
	}

	var payload desktopImportConfigResponse
	if err := common.Unmarshal(getResponse.Data, &payload); err != nil {
		t.Fatalf("failed to decode import config payload: %v", err)
	}
	if payload.APIKey != token.GetFullKey() {
		t.Fatalf("expected api key %q, got %q", token.GetFullKey(), payload.APIKey)
	}
	if payload.Endpoint != "https://shu26.cfd/v1" {
		t.Fatalf("expected codex endpoint to target /v1, got %q", payload.Endpoint)
	}
	if payload.Config == "" || payload.ConfigFormat != "json" {
		t.Fatalf("expected encoded config json payload")
	}

	getAgainCtx, getAgainRecorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/import/config?"+codeQuery, nil, 0)
	getAgainCtx.Request.URL.RawQuery = codeQuery
	GetDesktopImportConfig(getAgainCtx)

	getAgainResponse := decodeAPIResponse(t, getAgainRecorder)
	if getAgainResponse.Success {
		t.Fatalf("expected one-time code to fail on second fetch")
	}
}

func TestCreateDesktopImportConfigSupportsAllDesktopTools(t *testing.T) {
	db := setupDesktopControllerTestDB(t)
	resetDesktopImportCacheForTest(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-import-matrix",
		Password:    "password123",
		DisplayName: "Desktop Import Matrix",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	token := seedToken(t, db, 1, "matrix-token", "matriximport1234567890")
	system_setting.ServerAddress = "https://shu26.cfd"
	t.Cleanup(func() {
		system_setting.ServerAddress = "http://localhost:3000"
		resetDesktopImportCacheForTest(t)
	})

	tests := []struct {
		name               string
		tool               string
		requestName        string
		model              string
		wantEndpoint       string
		wantProviderName   string
		wantConfigContains string
		assertDecoded      func(t *testing.T, payload desktopImportConfigResponse, decoded string)
	}{
		{
			name:               "claude",
			tool:               "claude",
			requestName:        "Code Go Claude Import",
			model:              "claude-sonnet-4-5",
			wantEndpoint:       "https://shu26.cfd",
			wantProviderName:   "Code Go Claude Import",
			wantConfigContains: "ANTHROPIC_AUTH_TOKEN",
			assertDecoded: func(t *testing.T, payload desktopImportConfigResponse, decoded string) {
				t.Helper()
				var body map[string]map[string]string
				if err := common.Unmarshal([]byte(decoded), &body); err != nil {
					t.Fatalf("failed to decode claude import config: %v", err)
				}
				if body["env"]["ANTHROPIC_BASE_URL"] != payload.Endpoint {
					t.Fatalf("expected claude base url %q, got %q", payload.Endpoint, body["env"]["ANTHROPIC_BASE_URL"])
				}
				if body["env"]["ANTHROPIC_MODEL"] != payload.Model {
					t.Fatalf("expected claude model %q, got %q", payload.Model, body["env"]["ANTHROPIC_MODEL"])
				}
			},
		},
		{
			name:               "codex",
			tool:               "codex",
			requestName:        "Code Go Codex Import",
			model:              "gpt-5.5",
			wantEndpoint:       "https://shu26.cfd/v1",
			wantProviderName:   "Code Go Codex Import",
			wantConfigContains: "\"auth\"",
			assertDecoded: func(t *testing.T, payload desktopImportConfigResponse, decoded string) {
				t.Helper()
				var body codexImportConfigBody
				if err := common.Unmarshal([]byte(decoded), &body); err != nil {
					t.Fatalf("failed to decode codex import config: %v", err)
				}
				if body.Auth["OPENAI_API_KEY"] != payload.APIKey {
					t.Fatalf("expected codex API key %q, got %q", payload.APIKey, body.Auth["OPENAI_API_KEY"])
				}
				if !strings.Contains(body.Config, "model_provider = \"custom\"") {
					t.Fatalf("expected codex TOML config to enable custom provider, got %q", body.Config)
				}
				if !strings.Contains(body.Config, payload.Endpoint) {
					t.Fatalf("expected codex config to contain endpoint %q, got %q", payload.Endpoint, body.Config)
				}
			},
		},
		{
			name:               "gemini",
			tool:               "gemini",
			requestName:        "Code Go Gemini Import",
			model:              "gemini-2.5-pro",
			wantEndpoint:       "https://shu26.cfd",
			wantProviderName:   "Code Go Gemini Import",
			wantConfigContains: "GOOGLE_GEMINI_BASE_URL",
			assertDecoded: func(t *testing.T, payload desktopImportConfigResponse, decoded string) {
				t.Helper()
				var body map[string]string
				if err := common.Unmarshal([]byte(decoded), &body); err != nil {
					t.Fatalf("failed to decode gemini import config: %v", err)
				}
				if body["GOOGLE_GEMINI_BASE_URL"] != payload.Endpoint {
					t.Fatalf("expected gemini base url %q, got %q", payload.Endpoint, body["GOOGLE_GEMINI_BASE_URL"])
				}
				if body["GEMINI_MODEL"] != payload.Model {
					t.Fatalf("expected gemini model %q, got %q", payload.Model, body["GEMINI_MODEL"])
				}
			},
		},
		{
			name:               "opencode",
			tool:               "opencode",
			requestName:        "Code Go OpenCode Import",
			model:              "gpt-5.5",
			wantEndpoint:       "https://shu26.cfd/v1",
			wantProviderName:   "Code Go OpenCode Import",
			wantConfigContains: "\"baseURL\":\"https://shu26.cfd/v1\"",
			assertDecoded: func(t *testing.T, payload desktopImportConfigResponse, decoded string) {
				t.Helper()
				var body map[string]any
				if err := common.Unmarshal([]byte(decoded), &body); err != nil {
					t.Fatalf("failed to decode opencode import config: %v", err)
				}
				options, _ := body["options"].(map[string]any)
				if options["baseURL"] != payload.Endpoint {
					t.Fatalf("expected opencode endpoint %q, got %#v", payload.Endpoint, options["baseURL"])
				}
			},
		},
		{
			name:               "openclaw",
			tool:               "openclaw",
			requestName:        "Code Go OpenClaw Import",
			model:              "gpt-5.5",
			wantEndpoint:       "https://shu26.cfd/v1",
			wantProviderName:   "Code Go OpenClaw Import",
			wantConfigContains: "\"baseUrl\":\"https://shu26.cfd/v1\"",
			assertDecoded: func(t *testing.T, payload desktopImportConfigResponse, decoded string) {
				t.Helper()
				var body map[string]any
				if err := common.Unmarshal([]byte(decoded), &body); err != nil {
					t.Fatalf("failed to decode openclaw import config: %v", err)
				}
				if body["baseUrl"] != payload.Endpoint {
					t.Fatalf("expected openclaw endpoint %q, got %#v", payload.Endpoint, body["baseUrl"])
				}
			},
		},
		{
			name:               "hermes",
			tool:               "hermes",
			requestName:        "Code Go Hermes Import",
			model:              "gpt-5.5",
			wantEndpoint:       "https://shu26.cfd/v1",
			wantProviderName:   "Code Go Hermes Import",
			wantConfigContains: "\"api_mode\":\"chat_completions\"",
			assertDecoded: func(t *testing.T, payload desktopImportConfigResponse, decoded string) {
				t.Helper()
				var body map[string]any
				if err := common.Unmarshal([]byte(decoded), &body); err != nil {
					t.Fatalf("failed to decode hermes import config: %v", err)
				}
				if body["base_url"] != payload.Endpoint {
					t.Fatalf("expected hermes endpoint %q, got %#v", payload.Endpoint, body["base_url"])
				}
				if body["api_mode"] != "chat_completions" {
					t.Fatalf("expected hermes api_mode chat_completions, got %#v", body["api_mode"])
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			body := map[string]any{
				"tool":     tc.tool,
				"token_id": token.Id,
				"name":     tc.requestName,
				"model":    tc.model,
			}

			createCtx, createRecorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/import/deeplink", body, 1)
			CreateDesktopImportConfig(createCtx)

			createResponse := decodeAPIResponse(t, createRecorder)
			if !createResponse.Success {
				t.Fatalf("expected create import config success, got %s", createResponse.Message)
			}

			var created desktopImportCreatePayload
			if err := common.Unmarshal(createResponse.Data, &created); err != nil {
				t.Fatalf("failed to decode create import response: %v", err)
			}
			if created.Tool != tc.tool {
				t.Fatalf("expected tool %q, got %q", tc.tool, created.Tool)
			}
			if !strings.Contains(created.DeepLink, "app="+tc.tool) {
				t.Fatalf("expected deep link to mention app %q, got %q", tc.tool, created.DeepLink)
			}
			if strings.Contains(created.DeepLink, "apiKey=") {
				t.Fatalf("deep link must not include apiKey: %q", created.DeepLink)
			}
			if created.Provider != tc.wantProviderName {
				t.Fatalf("expected provider name %q, got %q", tc.wantProviderName, created.Provider)
			}

			codeQuery := "code=" + url.QueryEscape(created.Code)
			getCtx, getRecorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/import/config?"+codeQuery, nil, 0)
			getCtx.Request.URL.RawQuery = codeQuery
			GetDesktopImportConfig(getCtx)

			getResponse := decodeAPIResponse(t, getRecorder)
			if !getResponse.Success {
				t.Fatalf("expected import config fetch success, got %s", getResponse.Message)
			}

			var payload desktopImportConfigResponse
			if err := common.Unmarshal(getResponse.Data, &payload); err != nil {
				t.Fatalf("failed to decode import config payload: %v", err)
			}
			if payload.APIKey != token.GetFullKey() {
				t.Fatalf("expected api key %q, got %q", token.GetFullKey(), payload.APIKey)
			}
			if payload.Endpoint != tc.wantEndpoint {
				t.Fatalf("expected endpoint %q, got %q", tc.wantEndpoint, payload.Endpoint)
			}
			if payload.Name != tc.wantProviderName {
				t.Fatalf("expected import payload name %q, got %q", tc.wantProviderName, payload.Name)
			}
			rawConfig, err := base64.StdEncoding.DecodeString(payload.Config)
			if err != nil {
				t.Fatalf("failed to decode base64 config for %s: %v", tc.tool, err)
			}
			decoded := string(rawConfig)
			if !strings.Contains(decoded, tc.wantConfigContains) {
				t.Fatalf("expected decoded config for %s to contain %q, got %q", tc.tool, tc.wantConfigContains, decoded)
			}
			tc.assertDecoded(t, payload, decoded)
		})
	}
}

func TestGetDesktopImportConfigRequiresCode(t *testing.T) {
	resetDesktopImportCacheForTest(t)
	t.Cleanup(func() {
		resetDesktopImportCacheForTest(t)
	})

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/import/config", nil, 0)
	GetDesktopImportConfig(ctx)

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected missing code request to fail")
	}
	if !strings.Contains(response.Message, "missing code") {
		t.Fatalf("expected missing code error message, got %q", response.Message)
	}
}

func TestCreateDesktopImportConfigRejectsOtherUsersToken(t *testing.T) {
	db := setupDesktopControllerTestDB(t)
	resetDesktopImportCacheForTest(t)
	t.Cleanup(func() {
		resetDesktopImportCacheForTest(t)
	})

	users := []*model.User{
		{
			Id:          1,
			Username:    "owner-a",
			Password:    "password123",
			DisplayName: "Owner A",
			Role:        common.RoleCommonUser,
			Status:      common.UserStatusEnabled,
			Group:       "default",
			AffCode:     "affa",
		},
		{
			Id:          2,
			Username:    "owner-b",
			Password:    "password123",
			DisplayName: "Owner B",
			Role:        common.RoleCommonUser,
			Status:      common.UserStatusEnabled,
			Group:       "default",
			AffCode:     "affb",
		},
	}
	for _, user := range users {
		if err := db.Create(user).Error; err != nil {
			t.Fatalf("failed to seed user %d: %v", user.Id, err)
		}
	}

	token := seedToken(t, db, 1, "owned-token", "privatekey123456")
	body := map[string]any{
		"tool":     "claude",
		"token_id": token.Id,
		"name":     "Code Go Claude",
		"model":    "claude-sonnet-4-5",
	}
	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/import/deeplink", body, 2)
	CreateDesktopImportConfig(ctx)

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected unauthorized token access to fail")
	}
}

func TestCreateDesktopImportConfigRejectsUnsupportedTool(t *testing.T) {
	db := setupDesktopControllerTestDB(t)
	resetDesktopImportCacheForTest(t)
	t.Cleanup(func() {
		resetDesktopImportCacheForTest(t)
	})

	user := &model.User{
		Id:          1,
		Username:    "unsupported-tool-user",
		Password:    "password123",
		DisplayName: "Unsupported Tool User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	token := seedToken(t, db, 1, "supported-token", "supportedtoken123456")
	body := map[string]any{
		"tool":     "cursor",
		"token_id": token.Id,
		"name":     "Code Go Cursor",
	}
	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/import/deeplink", body, 1)
	CreateDesktopImportConfig(ctx)

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected unsupported tool import config creation to fail")
	}
	if !strings.Contains(response.Message, "unsupported tool") {
		t.Fatalf("expected unsupported tool error message, got %q", response.Message)
	}
}

func TestCreateDesktopImportConfigRejectsDisabledToken(t *testing.T) {
	db := setupDesktopControllerTestDB(t)
	resetDesktopImportCacheForTest(t)
	t.Cleanup(func() {
		resetDesktopImportCacheForTest(t)
	})

	user := &model.User{
		Id:          1,
		Username:    "disabled-token-user",
		Password:    "password123",
		DisplayName: "Disabled Token User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	token := seedToken(t, db, 1, "disabled-import-token", "disabledimport123456")
	if err := db.Model(&model.Token{}).Where("id = ?", token.Id).Update("status", common.TokenStatusDisabled).Error; err != nil {
		t.Fatalf("failed to disable token: %v", err)
	}

	body := map[string]any{
		"tool":     "gemini",
		"token_id": token.Id,
		"name":     "Code Go Gemini",
		"model":    "gemini-2.5-pro",
	}
	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/import/deeplink", body, 1)
	CreateDesktopImportConfig(ctx)

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected disabled token import config creation to fail")
	}
	if !strings.Contains(response.Message, "token is not enabled") {
		t.Fatalf("expected disabled token error message, got %q", response.Message)
	}
}
