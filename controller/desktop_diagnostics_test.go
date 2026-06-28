package controller

import (
	"net/http"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func TestCreateDesktopDiagnosticReportStoresSanitizedPayload(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-diagnostic-user",
		Password:    "password123",
		DisplayName: "Desktop Diagnostic User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	body := map[string]any{
		"report_type": "crash",
		"source":      "panic_hook",
		"summary":     `panic while calling Authorization: Bearer sk-secret-token-1234567890`,
		"payload": "Message: panic at C:\\Users\\alice\\workspace\\app.rs\n" +
			`Authorization: Bearer desktop-secret-token-123456` + "\n" +
			`api_key="sk-another-secret-123456"` + "\n" +
			`Working Dir: /Users/alice/project`,
		"app_version": "3.16.4",
		"platform":    "windows",
		"locale":      "en-US",
		"consent":     true,
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/diagnostics/report", body, 1)
	ctx.Set("desktop_device_id", 77)
	ctx.Set("desktop_device_name", "QA Desktop")
	CreateDesktopDiagnosticReport(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var report model.DesktopDiagnosticReport
	if err := db.First(&report).Error; err != nil {
		t.Fatalf("failed to load diagnostic report: %v", err)
	}

	if report.DeviceID != 77 || report.DeviceName != "QA Desktop" {
		t.Fatalf("unexpected device metadata: %+v", report)
	}
	if strings.Contains(report.Payload, "desktop-secret-token") || strings.Contains(report.Payload, "sk-another-secret") {
		t.Fatalf("payload should be redacted, got %s", report.Payload)
	}
	if strings.Contains(report.Payload, `C:\Users\alice`) || strings.Contains(report.Payload, `/Users/alice/`) {
		t.Fatalf("payload should redact local paths, got %s", report.Payload)
	}
	if !strings.Contains(report.Payload, "[REDACTED]") || !strings.Contains(report.Payload, "[REDACTED_PATH]") {
		t.Fatalf("payload redaction markers missing: %s", report.Payload)
	}
}

func TestCreateDesktopDiagnosticReportRequiresConsent(t *testing.T) {
	setupDesktopControllerTestDB(t)

	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/diagnostics/report", map[string]any{
		"report_type": "crash",
		"payload":     "panic",
		"consent":     false,
	}, 1)
	ctx.Set("desktop_device_id", 7)
	ctx.Set("desktop_device_name", "QA Desktop")
	CreateDesktopDiagnosticReport(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 api envelope, got %d", recorder.Code)
	}

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected api failure when consent missing")
	}
	if !strings.Contains(response.Message, "explicit consent") {
		t.Fatalf("unexpected message: %s", response.Message)
	}
}
