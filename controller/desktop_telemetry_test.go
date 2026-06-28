package controller

import (
	"net/http"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func TestCreateDesktopTelemetryEventStoresSanitizedPayload(t *testing.T) {
	db := setupDesktopControllerTestDB(t)

	user := &model.User{
		Id:          1,
		Username:    "desktop-telemetry-user",
		Password:    "password123",
		DisplayName: "Desktop Telemetry User",
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Group:       "default",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	body := map[string]any{
		"event_name":  "summary_refreshed",
		"source":      "dashboard",
		"app_version": "3.16.4",
		"platform":    "windows",
		"locale":      "en-US",
		"consent":     true,
		"payload": map[string]any{
			"trigger":       "manual",
			"serviceStatus": "ok",
			"path":          `C:\Users\alice\workspace`,
			"token":         "Bearer sk-secret-telemetry-token-123456",
			"lowBalance":    true,
		},
	}

	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/telemetry/events", body, 1)
	ctx.Set("desktop_device_id", 88)
	ctx.Set("desktop_device_name", "QA Desktop")
	CreateDesktopTelemetryEvent(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}

	var event model.DesktopTelemetryEvent
	if err := db.First(&event).Error; err != nil {
		t.Fatalf("failed to load telemetry event: %v", err)
	}

	if event.DeviceID != 88 || event.EventName != "summary_refreshed" {
		t.Fatalf("unexpected telemetry event: %+v", event)
	}
	if strings.Contains(event.Payload, "alice") || strings.Contains(event.Payload, "sk-secret") {
		t.Fatalf("payload should be sanitized, got %s", event.Payload)
	}
	if !strings.Contains(event.Payload, "[REDACTED_PATH]") || !strings.Contains(event.Payload, "[REDACTED]") {
		t.Fatalf("expected redaction markers in payload: %s", event.Payload)
	}
}

func TestCreateDesktopTelemetryEventRejectsUnknownEvent(t *testing.T) {
	setupDesktopControllerTestDB(t)

	ctx, recorder := newAuthenticatedContext(t, http.MethodPost, "/api/desktop/telemetry/events", map[string]any{
		"event_name": "unknown_event",
		"payload":    map[string]any{"trigger": "manual"},
		"consent":    true,
	}, 1)
	ctx.Set("desktop_device_id", 88)
	ctx.Set("desktop_device_name", "QA Desktop")
	CreateDesktopTelemetryEvent(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200 api envelope, got %d", recorder.Code)
	}

	response := decodeAPIResponse(t, recorder)
	if response.Success {
		t.Fatalf("expected api failure for unknown telemetry event")
	}
	if !strings.Contains(response.Message, "invalid telemetry event") {
		t.Fatalf("unexpected message: %s", response.Message)
	}
}
