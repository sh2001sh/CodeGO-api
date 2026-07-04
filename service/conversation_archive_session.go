package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/types"
)

const (
	conversationArchiveClaudeDir    = "claude"
	conversationArchiveNonClaudeDir = "non-claude"
)

var conversationArchiveMu sync.Mutex

func conversationArchivePath() string {
	return common.GetEnvOrDefaultString(conversationArchivePathEnv, defaultConversationArchivePath)
}

func conversationArchiveRootPath() string {
	path := strings.TrimSpace(conversationArchivePath())
	if path == "" {
		return ""
	}
	if strings.EqualFold(filepath.Ext(path), ".txt") {
		return strings.TrimSuffix(path, filepath.Ext(path))
	}
	return path
}

func appendConversationArchive(relayInfo *relaycommon.RelayInfo, text string) error {
	path, err := conversationArchiveSessionPath(relayInfo)
	if err != nil {
		return err
	}
	return appendConversationArchiveFile(path, text)
}

func appendConversationArchiveFile(path string, text string) error {
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
	category := conversationArchiveNonClaudeDir
	if conversationArchiveIsClaude(relayInfo) {
		category = conversationArchiveClaudeDir
	}
	fileName := sanitizeConversationArchiveFileName(conversationArchiveSessionID(relayInfo)) + ".txt"
	return filepath.Join(root, category, fileName), nil
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
		candidates = append(candidates,
			req.PromptCacheKey,
			rawMessageSessionValue(req.Metadata),
			rawMessageSessionValue(req.User),
		)
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
			return common.Interface2String(value)
		}
	}
	return ""
}

func rawMessageSessionValue(raw json.RawMessage) string {
	if len(raw) == 0 {
		return ""
	}
	var text string
	if err := common.Unmarshal(raw, &text); err == nil {
		return text
	}
	var data map[string]interface{}
	if err := common.Unmarshal(raw, &data); err != nil {
		return ""
	}
	for _, key := range []string{"session_id", "conversation_id", "id", "prompt_cache_key", "user_id"} {
		if value := common.Interface2String(data[key]); strings.TrimSpace(value) != "" {
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
