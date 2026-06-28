package controller

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	desktopAuthSessionTTL       = 10 * time.Minute
	desktopAuthDeviceTokenTTL   = 7 * 24 * time.Hour
	desktopAuthDefaultPollDelay = 5
)

type desktopAuthStartRequest struct {
	DeviceName string `json:"device_name"`
	Platform   string `json:"platform"`
	AppVersion string `json:"app_version"`
}

type desktopAuthStartResponse struct {
	SessionID       string `json:"session_id"`
	UserCode        string `json:"user_code"`
	VerificationURI string `json:"verification_uri"`
	ExpiresIn       int64  `json:"expires_in"`
	Interval        int    `json:"interval"`
}

type desktopAuthPollRequest struct {
	SessionID string `json:"session_id"`
}

type desktopAuthPollResponse struct {
	Status       string `json:"status"`
	Authenticated bool   `json:"authenticated"`
	AccessToken  string `json:"access_token,omitempty"`
	UserID       int    `json:"user_id,omitempty"`
	ServerAddress string `json:"server_address,omitempty"`
	LastUsername string `json:"last_username,omitempty"`
	DeviceID     int    `json:"device_id,omitempty"`
	Scopes       []string `json:"scopes,omitempty"`
}

type desktopAuthorizeRequest struct {
	SessionID string `json:"session_id"`
}

func desktopAuthPermissions() []string {
	return []string{
		"View Code Go balance and account summary",
		"Read usage logs and trends",
		"Create and manage desktop tokens",
		"Read configuration templates for supported tools",
		"Apply desktop import and local tool configuration changes",
		"Revoke this desktop device later from profile security settings",
	}
}

type desktopAuthorizedDeviceItem struct {
	ID         int    `json:"id"`
	DeviceName string `json:"device_name"`
	Platform   string `json:"platform"`
	AppVersion string `json:"app_version"`
	Scopes     []string `json:"scopes"`
	Status     string `json:"status"`
	CreatedAt  int64  `json:"created_at"`
	LastUsedAt int64  `json:"last_used_at"`
	ExpiresAt  int64  `json:"expires_at"`
	RevokedAt  int64  `json:"revoked_at"`
}

func buildDesktopVerificationURI(sessionID string, userCode string) string {
	base := normalizeDesktopServerAddress("")
	return fmt.Sprintf("%s/desktop/authorize?session_id=%s&code=%s", base, sessionID, userCode)
}

func createDesktopUserCode() string {
	return strings.ToUpper(common.GetRandomString(8))
}

func createDesktopSessionID() string {
	return common.GetRandomString(40)
}

func createDesktopDeviceAccessToken() (string, error) {
	key, err := common.GenerateRandomKey(48)
	if err != nil {
		return "", err
	}
	return "desktop_" + key, nil
}

func StartDesktopAuthSession(c *gin.Context) {
	var req desktopAuthStartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	deviceName := strings.TrimSpace(req.DeviceName)
	if deviceName == "" {
		deviceName = "Code Go Desktop"
	}
	session := &model.DesktopAuthSession{
		SessionID:  createDesktopSessionID(),
		UserCode:   createDesktopUserCode(),
		DeviceName: deviceName,
		Platform:   strings.TrimSpace(req.Platform),
		AppVersion: strings.TrimSpace(req.AppVersion),
		Status:     model.DesktopAuthSessionStatusPending,
		CreatedAt:  common.GetTimestamp(),
		ExpiresAt:  common.GetTimestamp() + int64(desktopAuthSessionTTL/time.Second),
	}
	if err := model.DB.Create(session).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, desktopAuthStartResponse{
		SessionID:       session.SessionID,
		UserCode:        session.UserCode,
		VerificationURI: buildDesktopVerificationURI(session.SessionID, session.UserCode),
		ExpiresIn:       int64(desktopAuthSessionTTL / time.Second),
		Interval:        desktopAuthDefaultPollDelay,
	})
}

func GetDesktopAuthSession(c *gin.Context) {
	sessionID := strings.TrimSpace(c.Query("session_id"))
	userCode := strings.TrimSpace(c.Query("code"))
	if sessionID == "" || userCode == "" {
		common.ApiErrorMsg(c, "missing session_id or code")
		return
	}

	session, err := model.GetDesktopAuthSessionByID(sessionID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "desktop authorization session was not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	if session.UserCode != strings.ToUpper(userCode) {
		common.ApiErrorMsg(c, "desktop authorization code does not match")
		return
	}
	if session.ExpiresAt <= common.GetTimestamp() {
		_ = model.DB.Model(session).Update("status", model.DesktopAuthSessionStatusExpired).Error
		common.ApiErrorMsg(c, "desktop authorization session has expired")
		return
	}

	common.ApiSuccess(c, gin.H{
		"session_id":  session.SessionID,
		"user_code":   session.UserCode,
		"device_name": session.DeviceName,
		"platform":    session.Platform,
		"app_version": session.AppVersion,
		"status":      session.Status,
		"created_at":  session.CreatedAt,
		"approved_at": session.ApprovedAt,
		"expires_at":  session.ExpiresAt,
		"permissions": desktopAuthPermissions(),
	})
}

func ApproveDesktopAuthSession(c *gin.Context) {
	userID := c.GetInt("id")
	var req desktopAuthorizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	session, err := model.GetDesktopAuthSessionByID(strings.TrimSpace(req.SessionID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "desktop authorization session was not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	if session.ExpiresAt <= common.GetTimestamp() {
		_ = model.DB.Model(session).Update("status", model.DesktopAuthSessionStatusExpired).Error
		common.ApiErrorMsg(c, "desktop authorization session has expired")
		return
	}
	if session.Status != model.DesktopAuthSessionStatusPending {
		common.ApiErrorMsg(c, "desktop authorization session has already been handled")
		return
	}

	accessToken, err := createDesktopDeviceAccessToken()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	now := common.GetTimestamp()
	device := &model.DesktopAuthorizedDevice{
		UserID:      userID,
		DeviceName:  session.DeviceName,
		Platform:    session.Platform,
		AppVersion:  session.AppVersion,
		AccessToken: accessToken,
		Scopes:      model.SerializeDesktopScopes(model.DefaultDesktopScopes()),
		Status:      model.DesktopAuthorizedDeviceStatusActive,
		CreatedAt:   now,
		LastUsedAt:  now,
		ExpiresAt:   now + int64(desktopAuthDeviceTokenTTL/time.Second),
	}

	if err := model.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(device).Error; err != nil {
			return err
		}
		return tx.Model(session).Updates(map[string]any{
			"user_id":     userID,
			"device_id":   device.Id,
			"status":      model.DesktopAuthSessionStatusApproved,
			"approved_at": now,
		}).Error
	}); err != nil {
		common.ApiError(c, err)
		return
	}

	model.RecordLog(userID, model.LogTypeManage, fmt.Sprintf("approved desktop device %s", session.DeviceName))
	common.ApiSuccess(c, gin.H{
		"device_id":    device.Id,
		"device_name":  device.DeviceName,
		"scopes":       model.ParseDesktopScopes(device.Scopes),
		"status":       model.DesktopAuthSessionStatusApproved,
		"approved_at":  now,
		"expires_at":   device.ExpiresAt,
		"access_token": accessToken,
	})
}

func RejectDesktopAuthSession(c *gin.Context) {
	userID := c.GetInt("id")
	var req desktopAuthorizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	session, err := model.GetDesktopAuthSessionByID(strings.TrimSpace(req.SessionID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "desktop authorization session was not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	if session.ExpiresAt <= common.GetTimestamp() {
		_ = model.DB.Model(session).Update("status", model.DesktopAuthSessionStatusExpired).Error
		common.ApiErrorMsg(c, "desktop authorization session has expired")
		return
	}
	if session.Status != model.DesktopAuthSessionStatusPending {
		common.ApiErrorMsg(c, "desktop authorization session has already been handled")
		return
	}

	now := common.GetTimestamp()
	if err := model.DB.Model(session).Updates(map[string]any{
		"user_id":     userID,
		"status":      model.DesktopAuthSessionStatusRejected,
		"approved_at": now,
	}).Error; err != nil {
		common.ApiError(c, err)
		return
	}

	model.RecordLog(userID, model.LogTypeManage, fmt.Sprintf("rejected desktop device %s", session.DeviceName))
	common.ApiSuccess(c, gin.H{
		"session_id":  session.SessionID,
		"status":      model.DesktopAuthSessionStatusRejected,
		"approved_at": now,
	})
}

func PollDesktopAuthSession(c *gin.Context) {
	var req desktopAuthPollRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "invalid request")
		return
	}

	session, err := model.GetDesktopAuthSessionByID(strings.TrimSpace(req.SessionID))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "desktop authorization session was not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	if session.ExpiresAt <= common.GetTimestamp() && session.Status == model.DesktopAuthSessionStatusPending {
		_ = model.DB.Model(session).Update("status", model.DesktopAuthSessionStatusExpired).Error
		session.Status = model.DesktopAuthSessionStatusExpired
	}

	response := desktopAuthPollResponse{
		Status:        session.Status,
		Authenticated: false,
	}

	if session.Status == model.DesktopAuthSessionStatusApproved && session.DeviceID > 0 {
		device, err := model.GetDesktopAuthorizedDeviceByID(session.UserID, session.DeviceID)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		user, err := model.GetUserById(session.UserID, false)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		response.Authenticated = true
		response.AccessToken = device.AccessToken
		response.UserID = session.UserID
		response.ServerAddress = normalizeDesktopServerAddress("")
		response.LastUsername = user.Username
		response.DeviceID = device.Id
		response.Scopes = model.ParseDesktopScopes(device.Scopes)
	}

	common.ApiSuccess(c, response)
}

func ListDesktopAuthorizedDevices(c *gin.Context) {
	userID := c.GetInt("id")
	devices, err := model.ListDesktopAuthorizedDevicesByUserID(userID)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	items := make([]desktopAuthorizedDeviceItem, 0, len(devices))
	for _, device := range devices {
		items = append(items, desktopAuthorizedDeviceItem{
			ID:         device.Id,
			DeviceName: device.DeviceName,
			Platform:   device.Platform,
			AppVersion: device.AppVersion,
			Scopes:     model.ParseDesktopScopes(device.Scopes),
			Status:     device.Status,
			CreatedAt:  device.CreatedAt,
			LastUsedAt: device.LastUsedAt,
			ExpiresAt:  device.ExpiresAt,
			RevokedAt:  device.RevokedAt,
		})
	}
	common.ApiSuccess(c, items)
}

func RevokeDesktopAuthorizedDevice(c *gin.Context) {
	userID := c.GetInt("id")
	deviceID, err := strconv.Atoi(strings.TrimSpace(c.Param("id")))
	if err != nil {
		common.ApiErrorMsg(c, "invalid device id")
		return
	}
	if err := model.RevokeDesktopAuthorizedDevice(userID, deviceID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "desktop device was not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	model.RecordLog(userID, model.LogTypeManage, fmt.Sprintf("revoked desktop device %d", deviceID))
	common.ApiSuccess(c, true)
}
