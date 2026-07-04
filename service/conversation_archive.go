package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/logger"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

const (
	conversationArchiveEnabledEnv  = "CONVERSATION_ARCHIVE_ENABLED"
	conversationArchivePathEnv     = "CONVERSATION_ARCHIVE_PATH"
	defaultConversationArchivePath = "data/conversation_archive"
)

type conversationArchiveMessage struct {
	role    string
	content string
}

func archiveConversation(ctx context.Context, relayInfo *relaycommon.RelayInfo) {
	if !conversationArchiveEnabled() {
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

func conversationArchiveEnabled() bool {
	return common.GetEnvOrDefaultBool(conversationArchiveEnabledEnv, true)
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
	if err := common.Unmarshal(raw, &text); err == nil {
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
		data, err := common.Marshal(typed)
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
