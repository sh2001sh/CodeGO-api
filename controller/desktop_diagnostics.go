package controller

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const (
	maxDesktopDiagnosticSummaryLength = 500
	maxDesktopDiagnosticPayloadLength = 12000
)

var (
	desktopDiagnosticBearerPattern      = regexp.MustCompile(`(?i)bearer\s+[A-Za-z0-9._-]+`)
	desktopDiagnosticAuthHeaderPattern  = regexp.MustCompile(`(?im)(authorization\s*[:=]\s*)([^\s"']+)`)
	desktopDiagnosticAPIKeyPattern      = regexp.MustCompile(`(?im)((?:api[_ -]?key|access[_ -]?token)\s*[:=]\s*["']?)([^"'\s,;]+)`)
	desktopDiagnosticOpenAIKeyPattern   = regexp.MustCompile(`\bsk-[A-Za-z0-9_-]{12,}\b`)
	desktopDiagnosticWindowsPathPattern = regexp.MustCompile(`[A-Za-z]:\\(?:[^\\\r\n\t ]+\\)*[^\\\r\n\t ]*`)
	desktopDiagnosticMacHomePattern     = regexp.MustCompile(`/Users/[^/\s]+(?:/[^\s]*)?`)
	desktopDiagnosticLinuxHomePattern   = regexp.MustCompile(`/home/[^/\s]+(?:/[^\s]*)?`)
)

type desktopDiagnosticReportRequest struct {
	ReportType string `json:"report_type"`
	Source     string `json:"source"`
	Summary    string `json:"summary"`
	Payload    string `json:"payload"`
	AppVersion string `json:"app_version"`
	Platform   string `json:"platform"`
	Locale     string `json:"locale"`
	Consent    bool   `json:"consent"`
}

func sanitizeDesktopDiagnosticText(raw string, limit int) string {
	value := strings.TrimSpace(strings.ReplaceAll(raw, "\r\n", "\n"))
	if value == "" {
		return ""
	}

	value = desktopDiagnosticBearerPattern.ReplaceAllString(value, "Bearer [REDACTED]")
	value = desktopDiagnosticAuthHeaderPattern.ReplaceAllString(value, "${1}[REDACTED]")
	value = desktopDiagnosticAPIKeyPattern.ReplaceAllString(value, "${1}[REDACTED]")
	value = desktopDiagnosticOpenAIKeyPattern.ReplaceAllString(value, "[REDACTED_API_KEY]")
	value = desktopDiagnosticWindowsPathPattern.ReplaceAllString(value, "[REDACTED_PATH]")
	value = desktopDiagnosticMacHomePattern.ReplaceAllString(value, "[REDACTED_PATH]")
	value = desktopDiagnosticLinuxHomePattern.ReplaceAllString(value, "[REDACTED_PATH]")

	if limit > 0 && len(value) > limit {
		value = strings.TrimSpace(value[:limit]) + "\n[TRUNCATED]"
	}
	return value
}

func normalizeDesktopDiagnosticType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "panic", "crash":
		return "crash"
	case "manual", "support":
		return "manual"
	default:
		return ""
	}
}

func normalizeDesktopDiagnosticSource(raw string) string {
	value := strings.ToLower(strings.TrimSpace(raw))
	if value == "" {
		return "desktop"
	}
	if len(value) > 64 {
		value = value[:64]
	}
	return value
}

func CreateDesktopDiagnosticReport(c *gin.Context) {
	var req desktopDiagnosticReportRequest
	if err := common.UnmarshalBodyReusable(c, &req); err != nil {
		common.ApiError(c, err)
		return
	}

	reportType := normalizeDesktopDiagnosticType(req.ReportType)
	if reportType == "" {
		common.ApiErrorMsg(c, "invalid diagnostic report type")
		return
	}
	if !req.Consent {
		common.ApiErrorMsg(c, "diagnostic report requires explicit consent")
		return
	}

	summary := sanitizeDesktopDiagnosticText(req.Summary, maxDesktopDiagnosticSummaryLength)
	payload := sanitizeDesktopDiagnosticText(req.Payload, maxDesktopDiagnosticPayloadLength)
	if payload == "" {
		common.ApiErrorMsg(c, "diagnostic report payload is required")
		return
	}

	report := &model.DesktopDiagnosticReport{
		UserID:     c.GetInt("id"),
		DeviceID:   c.GetInt("desktop_device_id"),
		DeviceName: c.GetString("desktop_device_name"),
		ReportType: reportType,
		Source:     normalizeDesktopDiagnosticSource(req.Source),
		Summary:    summary,
		Payload:    payload,
		AppVersion: strings.TrimSpace(req.AppVersion),
		Platform:   strings.TrimSpace(req.Platform),
		Locale:     strings.TrimSpace(req.Locale),
		Consent:    true,
		CreatedAt:  common.GetTimestamp(),
	}

	if len(report.AppVersion) > 64 {
		report.AppVersion = report.AppVersion[:64]
	}
	if len(report.Platform) > 64 {
		report.Platform = report.Platform[:64]
	}
	if len(report.Locale) > 32 {
		report.Locale = report.Locale[:32]
	}

	if err := model.DB.Create(report).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	model.RecordLog(report.UserID, model.LogTypeManage, fmt.Sprintf("submitted desktop diagnostic report %d", report.Id))
	common.ApiSuccess(c, gin.H{
		"id":     report.Id,
		"status": "received",
	})
}
