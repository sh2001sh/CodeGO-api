package common

import (
	"net/url"
	"strings"
)

var SessionCookieSecure bool
var SessionCookieTrustedURLs []string

func InitSessionCookieConfig() {
	SessionCookieSecure = GetEnvOrDefaultBool("SESSION_COOKIE_SECURE", false)

	rawTrusted := GetEnvOrDefaultString("SESSION_COOKIE_TRUSTED_URL", "")
	SessionCookieTrustedURLs = normalizeSessionCookieTrustedURLs(rawTrusted)

	if SessionCookieSecure {
		return
	}
	if len(SessionCookieTrustedURLs) == 0 {
		SysLog("SESSION_COOKIE_SECURE is disabled; session cookies will also be sent over HTTP")
		return
	}
	SysLog("SESSION_COOKIE_SECURE is disabled even though trusted HTTPS URLs are configured; review your deployment proxy/TLS setup")
}

func normalizeSessionCookieTrustedURLs(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		candidate := strings.TrimSpace(part)
		if candidate == "" {
			continue
		}
		if !strings.Contains(candidate, "://") {
			candidate = "https://" + candidate
		}
		parsed, err := url.Parse(candidate)
		if err != nil || parsed.Host == "" {
			continue
		}
		normalized := strings.ToLower(parsed.Scheme + "://" + parsed.Host)
		if parsed.Path != "" && parsed.Path != "/" {
			normalized += strings.TrimRight(parsed.Path, "/")
		}
		result = append(result, normalized)
	}
	return result
}
