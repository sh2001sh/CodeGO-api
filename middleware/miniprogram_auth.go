package middleware

import (
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
)

func abortMiniProgramAuth(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{
		"success": false,
		"message": message,
	})
	c.Abort()
}

// MiniProgramAuth validates the mini program bearer token and loads binding context.
func MiniProgramAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		rawToken := strings.TrimSpace(c.Request.Header.Get("Authorization"))
		claims, err := service.ParseMiniProgramSessionToken(rawToken)
		if err != nil {
			abortMiniProgramAuth(c, http.StatusUnauthorized, err.Error())
			return
		}

		c.Set("mini_openid", claims.OpenID)
		c.Set("mini_unionid", claims.UnionID)
		c.Set("mini_token_expires_at", claims.ExpiresAt)

		if err := model.TouchUserWeChatBindingByOpenID(claims.OpenID); err != nil {
			common.SysLog("failed to update mini program binding last_seen_at: " + err.Error())
		}

		binding, err := model.GetActiveUserWeChatBindingByOpenID(claims.OpenID)
		if err != nil {
			abortMiniProgramAuth(c, http.StatusInternalServerError, "failed to load mini program binding")
			return
		}
		if binding != nil {
			user, userErr := model.GetUserById(binding.UserId, false)
			if userErr == nil && user != nil && user.Status == common.UserStatusEnabled {
				c.Set("mini_bound_user_id", user.Id)
				c.Set("mini_binding_status", binding.Status)
				c.Set("id", user.Id)
				c.Set("username", user.Username)
				c.Set("group", user.Group)
				c.Set("user_group", user.Group)
			}
		}

		c.Next()
	}
}

// MiniProgramBoundAuth requires the mini program session to be bound to a website account.
func MiniProgramBoundAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		if c.GetInt("id") <= 0 {
			abortMiniProgramAuth(c, http.StatusForbidden, "mini program account is not bound")
			return
		}
		c.Next()
	}
}
