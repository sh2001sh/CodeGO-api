package service

import (
	"regexp"
	"strings"
)

var (
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
