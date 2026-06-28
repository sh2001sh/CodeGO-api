package model

import (
	"errors"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	DesktopAuthSessionStatusPending  = "pending"
	DesktopAuthSessionStatusApproved = "approved"
	DesktopAuthSessionStatusExpired  = "expired"
	DesktopAuthSessionStatusRejected = "rejected"

	DesktopAuthorizedDeviceStatusActive  = "active"
	DesktopAuthorizedDeviceStatusRevoked = "revoked"

	DesktopScopeAccountRead = "desktop:account:read"
	DesktopScopeLogsRead    = "desktop:logs:read"
	DesktopScopeTokensRead  = "desktop:tokens:read"
	DesktopScopeTokensWrite = "desktop:tokens:write"
	DesktopScopeConfigRead  = "desktop:config:read"
	DesktopScopeConfigWrite = "desktop:config:write"
	DesktopScopeTelemetryWrite = "desktop:telemetry:write"
)

var desktopDefaultScopes = []string{
	DesktopScopeAccountRead,
	DesktopScopeLogsRead,
	DesktopScopeTokensRead,
	DesktopScopeTokensWrite,
	DesktopScopeConfigRead,
	DesktopScopeConfigWrite,
	DesktopScopeTelemetryWrite,
}

type DesktopAuthSession struct {
	SessionID  string `json:"session_id" gorm:"primaryKey;type:varchar(64)"`
	UserCode   string `json:"user_code" gorm:"uniqueIndex;type:varchar(16);not null"`
	UserID     int    `json:"user_id" gorm:"index;default:0"`
	DeviceID   int    `json:"device_id" gorm:"index;default:0"`
	DeviceName string `json:"device_name" gorm:"type:varchar(128);not null"`
	Platform   string `json:"platform" gorm:"type:varchar(64);default:''"`
	AppVersion string `json:"app_version" gorm:"type:varchar(64);default:''"`
	Status     string `json:"status" gorm:"type:varchar(32);index;not null"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint;index"`
	ApprovedAt int64  `json:"approved_at" gorm:"bigint;default:0"`
	ExpiresAt  int64  `json:"expires_at" gorm:"bigint;index"`
}

type DesktopAuthorizedDevice struct {
	Id          int    `json:"id" gorm:"primaryKey"`
	UserID      int    `json:"user_id" gorm:"index;not null"`
	DeviceName  string `json:"device_name" gorm:"type:varchar(128);not null"`
	Platform    string `json:"platform" gorm:"type:varchar(64);default:''"`
	AppVersion  string `json:"app_version" gorm:"type:varchar(64);default:''"`
	AccessToken string `json:"access_token" gorm:"uniqueIndex;type:varchar(128);not null"`
	Scopes      string `json:"scopes" gorm:"type:text;default:''"`
	Status      string `json:"status" gorm:"type:varchar(32);index;not null"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint;index"`
	LastUsedAt  int64  `json:"last_used_at" gorm:"bigint;default:0"`
	ExpiresAt   int64  `json:"expires_at" gorm:"bigint;index"`
	RevokedAt   int64  `json:"revoked_at" gorm:"bigint;default:0"`
}

func DefaultDesktopScopes() []string {
	scopes := make([]string, len(desktopDefaultScopes))
	copy(scopes, desktopDefaultScopes)
	return scopes
}

func NormalizeDesktopScopes(scopes []string) []string {
	if len(scopes) == 0 {
		return nil
	}

	seen := make(map[string]struct{}, len(scopes))
	normalized := make([]string, 0, len(scopes))
	for _, scope := range scopes {
		value := strings.TrimSpace(scope)
		if value == "" {
			continue
		}
		if _, exists := seen[value]; exists {
			continue
		}
		seen[value] = struct{}{}
		normalized = append(normalized, value)
	}
	return normalized
}

func SerializeDesktopScopes(scopes []string) string {
	return strings.Join(NormalizeDesktopScopes(scopes), ",")
}

func ParseDesktopScopes(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	return NormalizeDesktopScopes(strings.Split(raw, ","))
}

func DesktopDeviceHasScope(device *DesktopAuthorizedDevice, required string) bool {
	if device == nil {
		return false
	}
	scope := strings.TrimSpace(required)
	if scope == "" {
		return true
	}

	scopes := ParseDesktopScopes(device.Scopes)
	if len(scopes) == 0 {
		// Legacy devices authorized before scopes were persisted keep full access
		// until they are re-approved with explicit grants.
		return true
	}
	for _, item := range scopes {
		if item == scope {
			return true
		}
	}
	if scope == DesktopScopeTelemetryWrite {
		for _, item := range scopes {
			if item == DesktopScopeConfigWrite {
				return true
			}
		}
	}
	return false
}

func GetDesktopAuthSessionByID(sessionID string) (*DesktopAuthSession, error) {
	var session DesktopAuthSession
	err := DB.Where("session_id = ?", strings.TrimSpace(sessionID)).First(&session).Error
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func GetDesktopAuthorizedDeviceByID(userID int, deviceID int) (*DesktopAuthorizedDevice, error) {
	var device DesktopAuthorizedDevice
	err := DB.Where("id = ? AND user_id = ?", deviceID, userID).First(&device).Error
	if err != nil {
		return nil, err
	}
	return &device, nil
}

func ListDesktopAuthorizedDevicesByUserID(userID int) ([]*DesktopAuthorizedDevice, error) {
	var devices []*DesktopAuthorizedDevice
	err := DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&devices).Error
	return devices, err
}

func ValidateDesktopAccessToken(accessToken string) (*DesktopAuthorizedDevice, error) {
	token := strings.TrimSpace(accessToken)
	if token == "" {
		return nil, gorm.ErrRecordNotFound
	}
	var device DesktopAuthorizedDevice
	err := DB.Where("access_token = ?", token).First(&device).Error
	if err != nil {
		return nil, err
	}
	if device.Status != DesktopAuthorizedDeviceStatusActive {
		return nil, errors.New("desktop device is not active")
	}
	now := common.GetTimestamp()
	if device.RevokedAt > 0 || (device.ExpiresAt > 0 && device.ExpiresAt <= now) {
		return nil, errors.New("desktop device is expired or revoked")
	}
	return &device, nil
}

func TouchDesktopAuthorizedDevice(deviceID int) error {
	return DB.Model(&DesktopAuthorizedDevice{}).
		Where("id = ?", deviceID).
		Update("last_used_at", common.GetTimestamp()).
		Error
}

func RevokeDesktopAuthorizedDevice(userID int, deviceID int) error {
	now := common.GetTimestamp()
	result := DB.Model(&DesktopAuthorizedDevice{}).
		Where("id = ? AND user_id = ?", deviceID, userID).
		Updates(map[string]any{
			"status":     DesktopAuthorizedDeviceStatusRevoked,
			"revoked_at": now,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
