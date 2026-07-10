package app

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/sh2001sh/new-api/dto"
	relaycommon "github.com/sh2001sh/new-api/internal/gateway/runtime"
	"github.com/sh2001sh/new-api/types"
)

func TestSanitizeConversationText(t *testing.T) {
	input := "email dev@example.com password=abc123 sk-proj-1234567890abcdefghijklmn phone 13800138000"
	output := sanitizeConversationText(input)

	for _, leaked := range []string{"dev@example.com", "abc123", "sk-proj-1234567890abcdefghijklmn", "13800138000"} {
		if strings.Contains(output, leaked) {
			t.Fatalf("sanitized output leaked %q: %s", leaked, output)
		}
	}
}

func TestFormatConversationArchiveOnlyContainsContent(t *testing.T) {
	text := formatConversationArchive([]conversationArchiveMessage{
		{role: "user", content: "hello token=secret-value"},
		{role: "assistant", content: "done"},
	})

	if !strings.Contains(text, "user:\nhello token=[REDACTED]") {
		t.Fatalf("missing sanitized user content: %s", text)
	}
	if !strings.Contains(text, "assistant:\ndone") {
		t.Fatalf("missing assistant content: %s", text)
	}
	if strings.Contains(text, "secret-value") {
		t.Fatalf("secret was not redacted: %s", text)
	}
}

func TestArchiveConversationWritesStandaloneTxtForClaude(t *testing.T) {
	dir := t.TempDir()
	t.Setenv(conversationArchiveEnabledEnv, "true")
	t.Setenv(conversationArchivePathEnv, dir)

	archiveConversation(t.Context(), &relaycommon.RelayInfo{
		RelayFormat:    types.RelayFormatClaude,
		RequestHeaders: map[string]string{"session_id": "session-1"},
		Request: &dto.ClaudeRequest{
			Model: "claude-opus-4",
			Messages: []dto.ClaudeMessage{
				{Role: "user", Content: "question with api_key=topsecret"},
			},
		},
		ConversationResponseText: "answer",
	})

	data, err := os.ReadFile(filepath.Join(dir, conversationArchiveClaudeDir, "session-1.txt"))
	if err != nil {
		t.Fatalf("read archive file: %v", err)
	}
	text := string(data)
	if !strings.Contains(text, "user:\nquestion with api_key=[REDACTED]") {
		t.Fatalf("archive missing request content: %s", text)
	}
	if !strings.Contains(text, "assistant:\nanswer") {
		t.Fatalf("archive missing response content: %s", text)
	}
}

func TestArchiveConversationSkipsNonClaudeRequests(t *testing.T) {
	dir := t.TempDir()
	t.Setenv(conversationArchiveEnabledEnv, "true")
	t.Setenv(conversationArchivePathEnv, dir)

	archiveConversation(t.Context(), &relaycommon.RelayInfo{
		RequestHeaders: map[string]string{"session_id": "openai-session"},
		Request: &dto.GeneralOpenAIRequest{
			Model: "gpt-5",
			Messages: []dto.Message{
				{Role: "user", Content: "first question"},
			},
		},
		ConversationResponseText: "first question answer",
	})

	if _, err := os.Stat(filepath.Join(dir, conversationArchiveClaudeDir, "openai-session.txt")); !os.IsNotExist(err) {
		t.Fatalf("expected non-claude archive to be skipped, got err=%v", err)
	}
}

func TestArchiveConversationAppendsSameClaudeSessionTxt(t *testing.T) {
	dir := t.TempDir()
	t.Setenv(conversationArchiveEnabledEnv, "true")
	t.Setenv(conversationArchivePathEnv, filepath.Join(dir, "conversation_archive.txt"))

	for _, content := range []string{"first question", "second question"} {
		archiveConversation(t.Context(), &relaycommon.RelayInfo{
			RelayFormat:    types.RelayFormatClaude,
			RequestHeaders: map[string]string{"Session_Id": "same/session"},
			Request: &dto.ClaudeRequest{
				Model: "claude-opus-4",
				Messages: []dto.ClaudeMessage{
					{Role: "user", Content: content},
				},
			},
			ConversationResponseText: content + " answer",
		})
	}

	data, err := os.ReadFile(filepath.Join(dir, "conversation_archive", conversationArchiveClaudeDir, "same_session.txt"))
	if err != nil {
		t.Fatalf("read archive file: %v", err)
	}
	text := string(data)
	for _, expected := range []string{"first question", "first question answer", "second question", "second question answer"} {
		if !strings.Contains(text, expected) {
			t.Fatalf("archive missing %q: %s", expected, text)
		}
	}
}

func TestArchiveConversationOnlyWritesClaudeFolder(t *testing.T) {
	dir := t.TempDir()
	t.Setenv(conversationArchiveEnabledEnv, "true")
	t.Setenv(conversationArchivePathEnv, dir)

	archiveConversation(t.Context(), &relaycommon.RelayInfo{
		RelayFormat: types.RelayFormatClaude,
		RequestHeaders: map[string]string{
			"session_id": "claude-session",
		},
		Request: &dto.ClaudeRequest{
			Model: "claude-opus-4",
			Messages: []dto.ClaudeMessage{
				{Role: "user", Content: "claude question"},
			},
		},
		ConversationResponseText: "claude answer",
	})
	archiveConversation(t.Context(), &relaycommon.RelayInfo{
		RequestHeaders: map[string]string{
			"session_id": "openai-session",
		},
		Request: &dto.GeneralOpenAIRequest{
			Model: "gpt-5",
			Messages: []dto.Message{
				{Role: "user", Content: "openai question"},
			},
		},
		ConversationResponseText: "openai answer",
	})

	if _, err := os.Stat(filepath.Join(dir, conversationArchiveClaudeDir, "claude-session.txt")); err != nil {
		t.Fatalf("claude archive file missing: %v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, conversationArchiveClaudeDir, "openai-session.txt")); !os.IsNotExist(err) {
		t.Fatalf("expected non-claude archive to be skipped, got err=%v", err)
	}
}
