package service

import (
	"crypto/hmac"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const miniProgramSessionTTL = 7 * 24 * time.Hour

// MiniProgramSessionClaims stores the signed mini program session payload.
type MiniProgramSessionClaims struct {
	OpenID      string `json:"openid"`
	UnionID     string `json:"unionid,omitempty"`
	BoundUserID int    `json:"bound_user_id,omitempty"`
	IssuedAt    int64  `json:"issued_at"`
	ExpiresAt   int64  `json:"expires_at"`
}

type miniProgramCode2SessionResponse struct {
	OpenID     string `json:"openid"`
	UnionID    string `json:"unionid"`
	SessionKey string `json:"session_key"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

func getMiniProgramCredentials() (string, string, error) {
	appID := strings.TrimSpace(os.Getenv("WECHAT_MINIPROGRAM_APP_ID"))
	appSecret := strings.TrimSpace(os.Getenv("WECHAT_MINIPROGRAM_APP_SECRET"))
	if appID == "" || appSecret == "" {
		return "", "", errors.New("mini program credentials are not configured")
	}
	return appID, appSecret, nil
}

// ExchangeMiniProgramCode exchanges a wx.login code for openid/unionid.
func ExchangeMiniProgramCode(code string) (string, string, error) {
	code = strings.TrimSpace(code)
	if code == "" {
		return "", "", errors.New("login code is required")
	}

	appID, appSecret, err := getMiniProgramCredentials()
	if err != nil {
		return "", "", err
	}

	requestURL := fmt.Sprintf(
		"https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
		url.QueryEscape(appID),
		url.QueryEscape(appSecret),
		url.QueryEscape(code),
	)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(requestURL)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	var payload miniProgramCode2SessionResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", "", err
	}
	if payload.ErrCode != 0 {
		return "", "", fmt.Errorf("wechat code2session failed: %s", payload.ErrMsg)
	}
	if strings.TrimSpace(payload.OpenID) == "" {
		return "", "", errors.New("wechat code2session returned empty openid")
	}

	return payload.OpenID, payload.UnionID, nil
}

// BuildMiniProgramSessionToken signs a standard mini program session token.
func BuildMiniProgramSessionToken(openID string, unionID string, boundUserID int) (string, int64, error) {
	return SignMiniProgramSessionToken(openID, unionID, boundUserID, miniProgramSessionTTL)
}

// SignMiniProgramSessionToken signs a mini program session payload with HMAC.
func SignMiniProgramSessionToken(openID string, unionID string, boundUserID int, ttl time.Duration) (string, int64, error) {
	openID = strings.TrimSpace(openID)
	unionID = strings.TrimSpace(unionID)
	if openID == "" {
		return "", 0, errors.New("openid is required")
	}
	if ttl <= 0 {
		ttl = miniProgramSessionTTL
	}

	now := time.Now().Unix()
	expiresAt := now + int64(ttl.Seconds())
	claims := MiniProgramSessionClaims{
		OpenID:      openID,
		UnionID:     unionID,
		BoundUserID: boundUserID,
		IssuedAt:    now,
		ExpiresAt:   expiresAt,
	}

	payload, err := json.Marshal(claims)
	if err != nil {
		return "", 0, err
	}

	payloadEncoded := base64.RawURLEncoding.EncodeToString(payload)
	signature := common.HmacSha256(payloadEncoded, common.SessionSecret)
	return payloadEncoded + "." + signature, expiresAt, nil
}

// ParseMiniProgramSessionToken verifies and decodes a signed mini program session token.
func ParseMiniProgramSessionToken(raw string) (*MiniProgramSessionClaims, error) {
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(strings.ToLower(raw), "bearer ") {
		raw = strings.TrimSpace(raw[7:])
	}
	if raw == "" {
		return nil, errors.New("session token is required")
	}

	parts := strings.Split(raw, ".")
	if len(parts) != 2 {
		return nil, errors.New("session token format is invalid")
	}

	expectedSignature := common.HmacSha256(parts[0], common.SessionSecret)
	if !hmac.Equal([]byte(parts[1]), []byte(expectedSignature)) {
		return nil, errors.New("session token signature is invalid")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, err
	}

	var claims MiniProgramSessionClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, err
	}
	if strings.TrimSpace(claims.OpenID) == "" {
		return nil, errors.New("session token payload is invalid")
	}
	if claims.ExpiresAt <= time.Now().Unix() {
		return nil, errors.New("session token has expired")
	}

	return &claims, nil
}
