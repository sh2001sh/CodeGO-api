package app

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	identitystore "github.com/sh2001sh/new-api/internal/identity/store"
	platformconfig "github.com/sh2001sh/new-api/internal/platform/config"
	"github.com/sh2001sh/new-api/internal/platform/logger"
	platformnotify "github.com/sh2001sh/new-api/internal/platform/notifyx"
	platformvalidation "github.com/sh2001sh/new-api/internal/platform/validation"
	"strings"
)

var (
	ErrInvalidEmailParameter    = errors.New("无效的参数")
	ErrInvalidEmailAddress      = errors.New("无效的邮箱地址")
	ErrEmailAlreadyTaken        = errors.New("邮箱地址已被占用")
	ErrEmailDomainNotAllowed    = errors.New("The administrator has enabled the email domain name whitelist, and your email address is not allowed due to special symbols or it's not in the whitelist.")
	ErrEmailAliasNotAllowed     = errors.New("管理员已启用邮箱地址别名限制，您的邮箱地址由于包含特殊符号而被拒绝。")
	ErrPasswordResetLinkInvalid = errors.New("重置链接非法或已过期")
)

// PasswordResetRequest captures the public password-reset completion payload.
type PasswordResetRequest struct {
	Email string `json:"email"`
	Token string `json:"token"`
}

var sendEmail = platformnotify.SendEmail

func setPasswordRecoveryEmailSender(fn func(subject string, receiver string, content string) error) func(subject string, receiver string, content string) error {
	previous := sendEmail
	sendEmail = fn
	return previous
}

// SetPasswordRecoveryEmailSenderForTest overrides the mail sender for transport tests.
func SetPasswordRecoveryEmailSenderForTest(fn func(subject string, receiver string, content string) error) func(subject string, receiver string, content string) error {
	return setPasswordRecoveryEmailSender(fn)
}

// DecodePasswordResetRequest parses the loose legacy request body into a typed request.
func DecodePasswordResetRequest(raw []byte) (PasswordResetRequest, error) {
	var req PasswordResetRequest
	if err := json.Unmarshal(raw, &req); err != nil {
		return PasswordResetRequest{}, ErrInvalidParams
	}
	if req.Email == "" || req.Token == "" {
		return PasswordResetRequest{}, ErrInvalidEmailParameter
	}
	return req, nil
}

// SendRegistrationVerification sends a registration verification code to an unclaimed email address.
func SendRegistrationVerification(email string) error {
	if err := validateVerificationEmail(email); err != nil {
		return err
	}
	if identitystore.IsEmailTaken(email) {
		return ErrEmailAlreadyTaken
	}

	code := GenerateVerificationCode(6)
	RegisterVerificationCodeWithKey(email, code, EmailVerificationPurpose)
	subject := fmt.Sprintf("%s邮箱验证邮件", platformconfig.SystemName)
	content := fmt.Sprintf(
		"<p>您好，你正在进行%s邮箱验证。</p><p>您的验证码为: <strong>%s</strong></p><p>验证码 %d 分钟内有效，如果不是本人操作，请忽略。</p>",
		platformconfig.SystemName,
		code,
		VerificationValidMinutes,
	)
	return sendEmail(subject, email, content)
}

// SendPasswordResetEmail sends a password reset email when the address exists.
func SendPasswordResetEmail(ctx context.Context, email string) error {
	if err := platformvalidation.Validate.Var(email, "required,email"); err != nil {
		return ErrInvalidEmailParameter
	}
	if !identitystore.IsEmailTaken(email) {
		return nil
	}

	code := GenerateVerificationCode(0)
	RegisterVerificationCodeWithKey(email, code, PasswordResetPurpose)
	link := fmt.Sprintf("%s/user/reset?email=%s&token=%s", platformconfig.ServerAddress, email, code)
	subject := fmt.Sprintf("%s密码重置", platformconfig.SystemName)
	content := fmt.Sprintf(
		"<p>您好，你正在进行%s密码重置。</p><p>点击 <a href='%s'>此处</a> 进行密码重置。</p><p>如果链接无法点击，请尝试点击下面的链接或将其复制到浏览器中打开：<br> %s </p><p>重置链接 %d 分钟内有效，如果不是本人操作，请忽略。</p>",
		platformconfig.SystemName,
		link,
		link,
		VerificationValidMinutes,
	)
	if err := sendEmail(subject, email, content); err != nil {
		logger.LogError(ctx, fmt.Sprintf("failed to send password reset email to %s: %s", email, err.Error()))
	}
	return nil
}

// ResetPassword rotates the user's password from a valid password-reset token and returns the temporary password.
func ResetPassword(req PasswordResetRequest) (string, error) {
	if !VerifyCodeWithKey(req.Email, req.Token, PasswordResetPurpose) {
		return "", ErrPasswordResetLinkInvalid
	}

	password := GenerateVerificationCode(12)
	if err := identitystore.ResetUserPasswordByEmail(req.Email, password); err != nil {
		return "", err
	}
	DeleteVerificationKey(req.Email, PasswordResetPurpose)
	return password, nil
}

func validateVerificationEmail(email string) error {
	if err := platformvalidation.Validate.Var(email, "required,email"); err != nil {
		return ErrInvalidEmailParameter
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return ErrInvalidEmailAddress
	}
	localPart := parts[0]
	domainPart := parts[1]

	if platformconfig.EmailDomainRestrictionEnabled {
		allowed := false
		for _, domain := range platformconfig.EmailDomainWhitelist {
			if domainPart == domain {
				allowed = true
				break
			}
		}
		if !allowed {
			return ErrEmailDomainNotAllowed
		}
	}

	if platformconfig.EmailAliasRestrictionEnabled {
		if strings.Contains(localPart, "+") || strings.Contains(localPart, ".") {
			return ErrEmailAliasNotAllowed
		}
	}
	return nil
}
