package app

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/sh2001sh/new-api/dto"
	relaycommon "github.com/sh2001sh/new-api/internal/gateway/runtime"
	platformconfig "github.com/sh2001sh/new-api/internal/platform/config"
	platformencoding "github.com/sh2001sh/new-api/internal/platform/encodingx"
	"github.com/sh2001sh/new-api/internal/platform/logger"
	"github.com/sh2001sh/new-api/types"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

const (
	conversationArchiveEnabledEnv  = "CONVERSATION_ARCHIVE_ENABLED"
	conversationArchivePathEnv     = "CONVERSATION_ARCHIVE_PATH"
	defaultConversationArchivePath = "data/conversation_archive"
	conversationArchiveClaudeDir   = "claude"
)

var (
	conversationArchiveMu sync.Mutex

	secretPairPattern     = regexp.MustCompile(`(?i)\b(password|passwd|pwd|api[_-]?key|token|access[_-]?token|refresh[_-]?token|secret|session|authorization)\b\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;]+)`)
	bearerPattern         = regexp.MustCompile(`(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{10,}`)
	apiKeyPattern         = regexp.MustCompile(`\b(?:sk|sess|rk|pk)-(?:proj-)?[A-Za-z0-9_-]{16,}\b`)
	jwtPattern            = regexp.MustCompile(`\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b`)
	emailPattern          = regexp.MustCompile(`(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b`)
	cnPhonePattern        = regexp.MustCompile(`(^|[^\d])1[3-9]\d{9}([^\d]|$)`)
	idCardPattern         = regexp.MustCompile(`(?i)\b\d{17}[0-9x]\b`)
	longDigitsPattern     = regexp.MustCompile(`(^|[^\d])\d(?:[ -]?\d){15,}([^\d]|$)`)
	urlSecretParamPattern = regexp.MustCompile(`(?i)([?&](?:token|key|secret|password|passwd|pwd|access_token|refresh_token|api_key)=)[^&\s]+`)
)

type conversationArchiveMessage struct {
	role    string
	content string
}

func archiveConversation(ctx context.Context, relayInfo *relaycommon.RelayInfo) {
	if !platformconfig.GetEnvOrDefaultBool(conversationArchiveEnabledEnv, true) || !conversationArchiveIsClaude(relayInfo) {
		return
	}
	text := buildConversationArchiveText(relayInfo)
	if strings.TrimSpace(text) == "" {
		return
	}
	if err := appendConversationArchive(relayInfo, text); err != nil {
		logger.LogWarn(ctx, "conversation archive write failed: "+err.Error())
	}
}

func buildConversationArchiveText(relayInfo *relaycommon.RelayInfo) string {
	if relayInfo == nil {
		return ""
	}
	messages := extractConversationMessages(relayInfo.Request)
	if relayInfo.ConversationResponseText != "" {
		messages = append(messages, conversationArchiveMessage{
			role:    "assistant",
			content: relayInfo.ConversationResponseText,
		})
	}
	return formatConversationArchive(messages)
}

func formatConversationArchive(messages []conversationArchiveMessage) string {
	var builder strings.Builder
	for _, message := range messages {
		content := sanitizeConversationText(message.content)
		if strings.TrimSpace(content) == "" {
			continue
		}
		if builder.Len() == 0 {
			builder.WriteString("=== conversation ===\n")
		} else {
			builder.WriteString("\n")
		}
		builder.WriteString(normalizeArchiveRole(message.role))
		builder.WriteString(":\n")
		builder.WriteString(content)
		builder.WriteString("\n")
	}
	if builder.Len() == 0 {
		return ""
	}
	builder.WriteString("\n")
	return builder.String()
}

func extractConversationMessages(request dto.Request) []conversationArchiveMessage {
	switch req := request.(type) {
	case *dto.GeneralOpenAIRequest:
		return extractOpenAIConversationMessages(req)
	case *dto.OpenAIResponsesRequest:
		return extractResponsesConversationMessages(req)
	case *dto.ClaudeRequest:
		return extractClaudeConversationMessages(req)
	case *dto.GeminiChatRequest:
		return extractGeminiConversationMessages(req)
	default:
		return nil
	}
}

func extractOpenAIConversationMessages(req *dto.GeneralOpenAIRequest) []conversationArchiveMessage {
	if req == nil {
		return nil
	}
	var messages []conversationArchiveMessage
	for _, message := range req.Messages {
		messages = appendArchiveMessage(messages, message.Role, message.StringContent())
	}
	if req.Prompt != nil {
		messages = appendArchiveMessage(messages, "user", stringifyArchiveValue(req.Prompt))
	}
	for _, input := range req.ParseInput() {
		messages = appendArchiveMessage(messages, "user", input)
	}
	if req.Instruction != "" {
		messages = appendArchiveMessage(messages, "system", req.Instruction)
	}
	return messages
}

func extractResponsesConversationMessages(req *dto.OpenAIResponsesRequest) []conversationArchiveMessage {
	if req == nil {
		return nil
	}
	var messages []conversationArchiveMessage
	messages = appendArchiveMessage(messages, "system", rawMessageString(req.Instructions))
	for _, input := range req.ParseInput() {
		messages = appendArchiveMessage(messages, "user", input.Text)
	}
	return messages
}

func extractClaudeConversationMessages(req *dto.ClaudeRequest) []conversationArchiveMessage {
	if req == nil {
		return nil
	}
	var messages []conversationArchiveMessage
	messages = appendArchiveMessage(messages, "system", claudeSystemText(req))
	messages = appendArchiveMessage(messages, "user", req.Prompt)
	for _, message := range req.Messages {
		messages = appendArchiveMessage(messages, message.Role, claudeMessageText(&message))
	}
	return messages
}

func extractGeminiConversationMessages(req *dto.GeminiChatRequest) []conversationArchiveMessage {
	if req == nil {
		return nil
	}
	var messages []conversationArchiveMessage
	if req.SystemInstructions != nil {
		messages = appendArchiveMessage(messages, "system", geminiPartsText(req.SystemInstructions.Parts))
	}
	for _, content := range req.Contents {
		messages = appendArchiveMessage(messages, content.Role, geminiPartsText(content.Parts))
	}
	return messages
}

func appendArchiveMessage(messages []conversationArchiveMessage, role string, content string) []conversationArchiveMessage {
	if strings.TrimSpace(content) == "" {
		return messages
	}
	return append(messages, conversationArchiveMessage{role: role, content: content})
}

func claudeSystemText(req *dto.ClaudeRequest) string {
	if req.IsStringSystem() {
		return req.GetStringSystem()
	}
	return claudeMediaText(req.ParseSystem())
}

func claudeMessageText(message *dto.ClaudeMessage) string {
	if message == nil {
		return ""
	}
	if message.IsStringContent() {
		return message.GetStringContent()
	}
	content, _ := message.ParseContent()
	return claudeMediaText(content)
}

func claudeMediaText(mediaMessages []dto.ClaudeMediaMessage) string {
	parts := make([]string, 0, len(mediaMessages))
	for _, media := range mediaMessages {
		switch media.Type {
		case "text":
			parts = append(parts, media.GetText())
		case "tool_result":
			parts = append(parts, stringifyArchiveValue(media.Content))
		}
	}
	return strings.Join(nonEmptyArchiveStrings(parts), "\n")
}

func geminiPartsText(parts []dto.GeminiPart) string {
	texts := make([]string, 0, len(parts))
	for _, part := range parts {
		if part.Text != "" {
			texts = append(texts, part.Text)
		}
	}
	return strings.Join(nonEmptyArchiveStrings(texts), "\n")
}

func rawMessageString(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var text string
	if err := platformencoding.Unmarshal(raw, &text); err == nil {
		return text
	}
	return string(raw)
}

func stringifyArchiveValue(value any) string {
	switch typed := value.(type) {
	case nil:
		return ""
	case string:
		return typed
	case []string:
		return strings.Join(typed, "\n")
	case []any:
		parts := make([]string, 0, len(typed))
		for _, item := range typed {
			parts = append(parts, stringifyArchiveValue(item))
		}
		return strings.Join(nonEmptyArchiveStrings(parts), "\n")
	default:
		data, err := platformencoding.Marshal(typed)
		if err != nil {
			return fmt.Sprintf("%v", typed)
		}
		return string(data)
	}
}

func normalizeArchiveRole(role string) string {
	role = strings.TrimSpace(strings.ToLower(role))
	switch role {
	case "model":
		return "assistant"
	case "":
		return "user"
	default:
		return role
	}
}

func nonEmptyArchiveStrings(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			result = append(result, value)
		}
	}
	return result
}

func sanitizeConversationText(text string) string {
	text = strings.ReplaceAll(text, "\r\n", "\n")
	text = strings.ReplaceAll(text, "\r", "\n")
	text = urlSecretParamPattern.ReplaceAllString(text, "$1[REDACTED]")
	text = secretPairPattern.ReplaceAllString(text, "$1=[REDACTED]")
	text = bearerPattern.ReplaceAllString(text, "Bearer [REDACTED]")
	text = apiKeyPattern.ReplaceAllString(text, "[REDACTED_API_KEY]")
	text = jwtPattern.ReplaceAllString(text, "[REDACTED_JWT]")
	text = emailPattern.ReplaceAllString(text, "[REDACTED_EMAIL]")
	text = cnPhonePattern.ReplaceAllString(text, "${1}[REDACTED_PHONE]${2}")
	text = idCardPattern.ReplaceAllString(text, "[REDACTED_ID_CARD]")
	return longDigitsPattern.ReplaceAllString(text, "${1}[REDACTED_NUMBER]${2}")
}

func appendConversationArchive(relayInfo *relaycommon.RelayInfo, text string) error {
	path, err := conversationArchiveSessionPath(relayInfo)
	if err != nil {
		return err
	}
	if strings.TrimSpace(path) == "" {
		return fmt.Errorf("%s is empty", conversationArchivePathEnv)
	}
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	conversationArchiveMu.Lock()
	defer conversationArchiveMu.Unlock()

	file, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.WriteString(text)
	return err
}

func conversationArchiveSessionPath(relayInfo *relaycommon.RelayInfo) (string, error) {
	root := conversationArchiveRootPath()
	if root == "" {
		return "", fmt.Errorf("%s is empty", conversationArchivePathEnv)
	}
	fileName := sanitizeConversationArchiveFileName(conversationArchiveSessionID(relayInfo)) + ".txt"
	return filepath.Join(root, conversationArchiveClaudeDir, fileName), nil
}

func conversationArchiveRootPath() string {
	path := strings.TrimSpace(platformconfig.GetEnvOrDefaultString(conversationArchivePathEnv, defaultConversationArchivePath))
	if path == "" {
		return ""
	}
	if strings.EqualFold(filepath.Ext(path), ".txt") {
		return strings.TrimSuffix(path, filepath.Ext(path))
	}
	return path
}

func conversationArchiveSessionID(relayInfo *relaycommon.RelayInfo) string {
	if relayInfo == nil {
		return "unknown-session"
	}
	for _, value := range conversationArchiveSessionCandidates(relayInfo) {
		value = strings.TrimSpace(value)
		if value != "" {
			return value
		}
	}
	if strings.TrimSpace(relayInfo.RequestId) != "" {
		return relayInfo.RequestId
	}
	return "unknown-session"
}

func conversationArchiveSessionCandidates(relayInfo *relaycommon.RelayInfo) []string {
	candidates := make([]string, 0, 12)
	keys := []string{
		"session_id",
		"x-session-id",
		"conversation_id",
		"x-conversation-id",
		"prompt_cache_key",
		"x-prompt-cache-key",
	}
	for _, key := range keys {
		candidates = append(candidates, lookupArchiveStringMap(relayInfo.RequestHeaders, key))
		candidates = append(candidates, lookupArchiveAnyMap(relayInfo.RuntimeHeadersOverride, key))
	}

	switch req := relayInfo.Request.(type) {
	case *dto.GeneralOpenAIRequest:
		candidates = append(candidates, req.PromptCacheKey, rawMessageSessionValue(req.Metadata), rawMessageSessionValue(req.User))
	case *dto.OpenAIResponsesRequest:
		candidates = append(candidates,
			rawMessageSessionValue(req.PromptCacheKey),
			rawMessageSessionValue(req.Conversation),
			req.PreviousResponseID,
			rawMessageSessionValue(req.Metadata),
			rawMessageSessionValue(req.User),
		)
	case *dto.ClaudeRequest:
		candidates = append(candidates, rawMessageSessionValue(req.Metadata))
	}
	return candidates
}

func conversationArchiveIsClaude(relayInfo *relaycommon.RelayInfo) bool {
	if relayInfo == nil {
		return false
	}
	if relayInfo.RelayFormat == types.RelayFormatClaude || relayInfo.GetFinalRequestRelayFormat() == types.RelayFormatClaude {
		return true
	}
	for _, model := range conversationArchiveModelNames(relayInfo) {
		if strings.Contains(strings.ToLower(model), "claude") {
			return true
		}
	}
	return false
}

func conversationArchiveModelNames(relayInfo *relaycommon.RelayInfo) []string {
	models := []string{relayInfo.OriginModelName}
	if relayInfo.ChannelMeta != nil {
		models = append(models, relayInfo.UpstreamModelName)
	}
	switch req := relayInfo.Request.(type) {
	case *dto.GeneralOpenAIRequest:
		models = append(models, req.Model)
	case *dto.OpenAIResponsesRequest:
		models = append(models, req.Model)
	case *dto.ClaudeRequest:
		models = append(models, req.Model)
	}
	return models
}

func lookupArchiveStringMap(values map[string]string, key string) string {
	if len(values) == 0 {
		return ""
	}
	for mapKey, value := range values {
		if strings.EqualFold(mapKey, key) {
			return value
		}
	}
	return ""
}

func lookupArchiveAnyMap(values map[string]interface{}, key string) string {
	if len(values) == 0 {
		return ""
	}
	for mapKey, value := range values {
		if strings.EqualFold(mapKey, key) {
			return platformencoding.Interface2String(value)
		}
	}
	return ""
}

func rawMessageSessionValue(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var text string
	if err := platformencoding.Unmarshal(raw, &text); err == nil {
		return text
	}
	var data map[string]interface{}
	if err := platformencoding.Unmarshal(raw, &data); err != nil {
		return ""
	}
	for _, key := range []string{"session_id", "conversation_id", "id", "prompt_cache_key", "user_id"} {
		if value := platformencoding.Interface2String(data[key]); strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func sanitizeConversationArchiveFileName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		value = "unknown-session"
	}

	var builder strings.Builder
	for _, r := range value {
		switch {
		case r < 32 || r == 127:
			builder.WriteByte('_')
		case strings.ContainsRune(`<>:"/\|?*`, r):
			builder.WriteByte('_')
		default:
			builder.WriteRune(r)
		}
	}

	name := strings.Trim(builder.String(), ". ")
	if name == "" || name == "." || name == ".." {
		return "unknown-session"
	}
	if len(name) > 128 {
		name = strings.TrimRight(name[:128], ". ")
	}
	if name == "" {
		return "unknown-session"
	}
	return name
}
