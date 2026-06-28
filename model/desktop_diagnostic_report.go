package model

type DesktopDiagnosticReport struct {
	Id         int    `json:"id" gorm:"primaryKey"`
	UserID     int    `json:"user_id" gorm:"index;not null"`
	DeviceID   int    `json:"device_id" gorm:"index;not null"`
	DeviceName string `json:"device_name" gorm:"type:varchar(128);default:''"`
	ReportType string `json:"report_type" gorm:"type:varchar(32);index;not null"`
	Source     string `json:"source" gorm:"type:varchar(64);default:''"`
	Summary    string `json:"summary" gorm:"type:text"`
	Payload    string `json:"payload" gorm:"type:text"`
	AppVersion string `json:"app_version" gorm:"type:varchar(64);default:''"`
	Platform   string `json:"platform" gorm:"type:varchar(64);default:''"`
	Locale     string `json:"locale" gorm:"type:varchar(32);default:''"`
	Consent    bool   `json:"consent" gorm:"default:false"`
	CreatedAt  int64  `json:"created_at" gorm:"bigint;index"`
}
