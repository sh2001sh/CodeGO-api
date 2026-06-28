package controller

import (
	"encoding/json"
	"fmt"
	"regexp"
	"slices"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const (
	maxDesktopTelemetryPayloadLength = 4000
	maxDesktopTelemetryProperties    = 12
)

var (
	allowedDesktopTelemetryEvents = []string{
		"auth_connected",
		"summary_refreshed",
		"diagnostic_report_submitted",
	}
	desktopTelemetryBearerPattern      = regexp.MustCompile(`(?i)bearer\s+[A-Za-z0-9._-]+`)
	desktopTelemetryAuthHeaderPattern  = regexp.MustCompile(`(?im)(authorization\s*[:=]\s*)([^\s"']+)`)
	desktopTelemetryAPIKeyPattern      = regexp.MustCompile(`(?im)((?:api[_ -]?key|access[_ -]?token)\s*[:=]\s*["']?)([^"'\s,;]+)`)
	desktopTelemetryOpenAIKeyPattern   = regexp.MustCompile(`\bsk-[A-Za-z0-9_-]{12,}\b`)
	desktopTelemetryWindowsPathPattern = regexp.MustCompile(`[A-Za-z]:\\(?:[^\\\r\n\t ]+\\)*[^\\\r\n\t ]*`)
	desktopTelemetryMacHomePattern     = regexp.MustCompile(`/Users/[^/\s]+(?:/[^\s]*)?`)
	desktopTelemetryLinuxHomePattern   = regexp.MustCompile(`/home/[^/\s]+(?:/[^\s]*)?`)
)

type desktopTelemetryEventRequest struct {
	EventName  string         `json:"event_name"`
	Source     string         `json:"source"`
	Payload    map[string]any `json:"payload"`
	AppVersion string         `json:"app_version"`
	Platform   string         `json:"platform"`
	Locale     string         `json:"locale"`
	Consent    bool           `json:"consent"`
}

func sanitizeDesktopTelemetryString(raw string) string {
	value := strings.TrimSpace(strings.ReplaceAll(raw, "\r\n", "\n"))
	if value == "" {
		return ""
	}

	value = desktopTelemetryBearerPattern.ReplaceAllString(value, "Bearer [REDACTED]")
	value = desktopTelemetryAuthHeaderPattern.ReplaceAllString(value, "${1}[REDACTED]")
	value = desktopTelemetryAPIKeyPattern.ReplaceAllString(value, "${1}[REDACTED]")
	value = desktopTelemetryOpenAIKeyPattern.ReplaceAllString(value, "[REDACTED_API_KEY]")
	value = desktopTelemetryWindowsPathPattern.ReplaceAllString(value, "[REDACTED_PATH]")
	value = desktopTelemetryMacHomePattern.ReplaceAllString(value, "[REDACTED_PATH]")
	value = desktopTelemetryLinuxHomePattern.ReplaceAllString(value, "[REDACTED_PATH]")
	return value
}

func normalizeDesktopTelemetryEventName(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if !slices.Contains(allowedDesktopTelemetryEvents, value) {
		return ""
	}
	return value
}

func normalizeDesktopTelemetrySource(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "" {
		return "desktop"
	}
	if len(value) > 64 {
		value = value[:64]
	}
	return value
}

func sanitizeDesktopTelemetryPayload(raw map[string]any) (string, error) {
	if len(raw) == 0 {
		return "{}", nil
	}

	payload := make(map[string]any, min(len(raw), maxDesktopTelemetryProperties))
	count := 0
	for key, value := range raw {
		if count >= maxDesktopTelemetryProperties {
			break
		}
		normalizedKey := strings.TrimSpace(key)
		if normalizedKey == "" {
			continue
		}
		if len(normalizedKey) > 64 {
			normalizedKey = normalizedKey[:64]
		}

		switch typed := value.(type) {
		case string:
			payload[normalizedKey] = sanitizeDesktopTelemetryString(typed)
		case bool:
			payload[normalizedKey] = typed
		case float64, float32, int, int32, int64, uint, uint32, uint64:
			payload[normalizedKey] = typed
		case nil:
			payload[normalizedKey] = nil
		default:
			payload[normalizedKey] = sanitizeDesktopTelemetryString(fmt.Sprint(typed))
		}
		count++
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	value := string(encoded)
	if len(value) > maxDesktopTelemetryPayloadLength {
		value = value[:maxDesktopTelemetryPayloadLength]
	}
	return value, nil
}

func CreateDesktopTelemetryEvent(c *gin.Context) {
	var req desktopTelemetryEventRequest
	if err := common.UnmarshalBodyReusable(c, &req); err != nil {
		common.ApiError(c, err)
		return
	}

	eventName := normalizeDesktopTelemetryEventName(req.EventName)
	if eventName == "" {
		common.ApiErrorMsg(c, "invalid telemetry event name")
		return
	}
	if !req.Consent {
		common.ApiErrorMsg(c, "telemetry event requires explicit consent")
		return
	}

	payload, err := sanitizeDesktopTelemetryPayload(req.Payload)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	event := &model.DesktopTelemetryEvent{
		UserID:     c.GetInt("id"),
		DeviceID:   c.GetInt("desktop_device_id"),
		DeviceName: c.GetString("desktop_device_name"),
		EventName:  eventName,
		Source:     normalizeDesktopTelemetrySource(req.Source),
		Payload:    payload,
		AppVersion: strings.TrimSpace(req.AppVersion),
		Platform:   strings.TrimSpace(req.Platform),
		Locale:     strings.TrimSpace(req.Locale),
		Consent:    true,
		CreatedAt:  common.GetTimestamp(),
	}

	if len(event.AppVersion) > 64 {
		event.AppVersion = event.AppVersion[:64]
	}
	if len(event.Platform) > 64 {
		event.Platform = event.Platform[:64]
	}
	if len(event.Locale) > 32 {
		event.Locale = event.Locale[:32]
	}

	if err := model.DB.Create(event).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, true)
}
