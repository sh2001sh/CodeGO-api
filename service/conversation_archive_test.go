package service

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
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

func TestArchiveConversationWritesStandaloneTxt(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "conversation_archive.txt")
	t.Setenv(conversationArchiveEnabledEnv, "true")
	t.Setenv(conversationArchivePathEnv, path)

	archiveConversation(t.Context(), &relaycommon.RelayInfo{
		Request: &dto.GeneralOpenAIRequest{
			Messages: []dto.Message{
				{Role: "user", Content: "question with api_key=topsecret"},
			},
		},
		ConversationResponseText: "answer",
	})

	data, err := os.ReadFile(path)
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

func TestAppendConversationArchiveRotatesAtMaxSize(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "conversation_archive.txt")
	t.Setenv(conversationArchivePathEnv, path)

	originalMaxSize := conversationArchiveMaxSize
	conversationArchiveMaxSize = 32
	t.Cleanup(func() {
		conversationArchiveMaxSize = originalMaxSize
	})

	if err := appendConversationArchive(strings.Repeat("a", 24)); err != nil {
		t.Fatalf("write initial archive: %v", err)
	}
	if err := appendConversationArchive(strings.Repeat("b", 16)); err != nil {
		t.Fatalf("write rotated archive: %v", err)
	}

	baseData, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read base archive: %v", err)
	}
	rotatedData, err := os.ReadFile(filepath.Join(dir, "conversation_archive_0001.txt"))
	if err != nil {
		t.Fatalf("read rotated archive: %v", err)
	}
	if string(baseData) != strings.Repeat("a", 24) {
		t.Fatalf("base archive changed unexpectedly: %q", string(baseData))
	}
	if string(rotatedData) != strings.Repeat("b", 16) {
		t.Fatalf("rotated archive mismatch: %q", string(rotatedData))
	}
}
