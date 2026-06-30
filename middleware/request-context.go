package middleware

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

var heavyGlobalAPIRateLimitedRequests = map[string]struct{}{
	"GET /api/user/self":                            {},
	"GET /api/user/self/groups":                     {},
	"GET /api/user/self/group-status":               {},
	"GET /api/user/topup/info":                      {},
	"GET /api/user/topup/self":                      {},
	"GET /api/subscription/self":                    {},
	"GET /api/subscription/self/claude-conversions": {},
	"POST /api/user/amount":                         {},
	"POST /api/user/stripe/amount":                  {},
	"POST /api/user/waffo/amount":                   {},
	"POST /api/user/waffo-pancake/amount":           {},
	"POST /api/blind-box/amount":                    {},
}

func IsHeavyGlobalAPIRateLimitedRequest(method, path string) bool {
	_, ok := heavyGlobalAPIRateLimitedRequests[fmt.Sprintf("%s %s", method, path)]
	return ok
}

func GlobalAPIRateLimitExceptReadPaths() gin.HandlerFunc {
	return func(c *gin.Context) {
		if IsHeavyGlobalAPIRateLimitedRequest(c.Request.Method, c.Request.URL.Path) {
			c.Next()
			return
		}
		GlobalAPIRateLimit()(c)
	}
}

func ConfigureTrustedProxies(router *gin.Engine) {
	if router == nil {
		return
	}
	if len(common.TrustedProxies) == 0 {
		if err := router.SetTrustedProxies(nil); err != nil {
			common.SysError("failed to clear trusted proxies: " + err.Error())
		}
		return
	}
	if err := router.SetTrustedProxies(common.TrustedProxies); err != nil {
		common.SysError("failed to set trusted proxies: " + err.Error())
	}
	if len(common.TrustedProxies) > 0 {
		router.ForwardedByClientIP = true
		router.RemoteIPHeaders = []string{"X-Forwarded-For", "X-Real-IP"}
	}
}
