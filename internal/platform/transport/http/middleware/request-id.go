package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/constant"
	platformruntime "github.com/sh2001sh/new-api/internal/platform/runtime"
	"runtime/debug"
)

var _bp = func() string {
	if bi, ok := debug.ReadBuildInfo(); ok && bi.Main.Path != "" {
		h := sha256.Sum256([]byte(bi.Main.Path))
		return hex.EncodeToString(h[:4])
	}
	return platformruntime.GetRandomString(8)
}()

func RequestId() func(c *gin.Context) {
	return func(c *gin.Context) {
		id := platformruntime.GetTimeString() + _bp + platformruntime.GetRandomString(8)
		c.Set(constant.RequestIdKey, id)
		ctx := context.WithValue(c.Request.Context(), constant.RequestIdKey, id)
		c.Request = c.Request.WithContext(ctx)
		c.Header(constant.RequestIdKey, id)
		c.Next()
	}
}
