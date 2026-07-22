package bootstrap

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/bytedance/gopkg/util/gopool"
	"github.com/gin-contrib/sessions"
	sessionredis "github.com/gin-contrib/sessions/redis"
	"github.com/gin-gonic/gin"
	auditprojection "github.com/sh2001sh/new-api/internal/audit/projection"
	gatewaystore "github.com/sh2001sh/new-api/internal/gateway/store"
	platformcache "github.com/sh2001sh/new-api/internal/platform/cache"
	platformconfig "github.com/sh2001sh/new-api/internal/platform/config"
	platformobservability "github.com/sh2001sh/new-api/internal/platform/observability"
	platformstore "github.com/sh2001sh/new-api/internal/platform/store"
	"github.com/sh2001sh/new-api/internal/platform/transport/http/middleware"

	_ "net/http/pprof"
)

type httpRouteRegistrar func(*gin.Engine)

func prepareRuntime(component string) error {
	if err := initResources(); err != nil {
		platformobservability.FatalLog("failed to initialize resources: " + err.Error())
		return err
	}
	logStartupMode(component)
	initCaches()
	return nil
}

func logStartupMode(component string) {
	platformobservability.SysLog(component + " " + platformconfig.Version + " started")
	if os.Getenv("GIN_MODE") != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}
	if platformconfig.DebugEnabled {
		platformobservability.SysLog("running in debug mode")
	}
}

func closeDatabase() {
	if err := platformstore.CloseDatabases(); err != nil {
		platformobservability.FatalLog("failed to close database: " + err.Error())
	}
}

func initCaches() {
	if platformcache.RedisEnabled {
		platformconfig.MemoryCacheEnabled = true
	}
	if !platformconfig.MemoryCacheEnabled {
		return
	}

	platformobservability.SysLog("memory cache enabled")
	platformobservability.SysLog(fmt.Sprintf("sync frequency: %d seconds", platformconfig.SyncFrequency))
	func() {
		defer func() {
			if r := recover(); r != nil {
				platformobservability.SysLog(fmt.Sprintf("InitChannelCache panic: %v, retrying once", r))
				if _, _, fixErr := gatewaystore.RebuildChannelAbilities(); fixErr != nil {
					platformobservability.FatalLog(fmt.Sprintf("InitChannelCache failed: %s", fixErr.Error()))
				}
			}
		}()
		gatewaystore.InitChannelCache()
	}()
	go gatewaystore.SyncChannelCache(platformconfig.SyncFrequency)
}

func startOptionSyncLoop() {
	go platformstore.SyncOptions(platformconfig.SyncFrequency)
}

func startDiagnostics() {
	if os.Getenv("ENABLE_PPROF") == "true" {
		gopool.Go(func() {
			log.Println(http.ListenAndServe("0.0.0.0:8005", nil))
		})
		platformobservability.StartPprofCPUMonitor()
		platformobservability.SysLog("pprof enabled")
	}

	if err := platformobservability.StartPyroscope(); err != nil {
		platformobservability.SysError(fmt.Sprintf("start pyroscope error : %v", err))
	}

	auditprojection.Init()
}

func buildHTTPServer(registerRoutes httpRouteRegistrar) *gin.Engine {
	server := gin.New()
	middleware.ConfigureTrustedProxies(server)
	server.Use(gin.CustomRecovery(func(c *gin.Context, err any) {
		platformobservability.SysLog(fmt.Sprintf("panic detected: %v", err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"message": fmt.Sprintf("Panic detected, error: %v. Please submit a issue here: https://github.com/Calcium-Ion/new-api", err),
				"type":    "new_api_panic",
			},
		})
	}))
	server.Use(middleware.RequestId())
	server.Use(middleware.PoweredBy())
	server.Use(middleware.I18n())
	middleware.SetUpLogger(server)
	server.Use(sessions.Sessions("session", buildSessionStore()))
	registerRoutes(server)
	return server
}

func buildSessionStore() sessions.Store {
	redisURL, err := url.Parse(os.Getenv("REDIS_CONN_STRING"))
	if err != nil || redisURL.Host == "" || !platformcache.RedisReady() {
		log.Fatal("Redis-backed sessions require a reachable REDIS_CONN_STRING")
	}
	password, _ := redisURL.User.Password()
	database := strings.TrimPrefix(redisURL.Path, "/")
	if database == "" {
		database = "0"
	}
	store, err := sessionredis.NewStoreWithDB(
		10,
		"tcp",
		redisURL.Host,
		password,
		database,
		[]byte(platformconfig.SessionSecret),
	)
	if err != nil {
		log.Fatal("failed to initialize Redis session store: " + err.Error())
	}
	if err := sessionredis.SetKeyPrefix(store, "codego:session:"); err != nil {
		log.Fatal("failed to configure Redis session store: " + err.Error())
	}
	store.Options(sessions.Options{
		Path:     "/",
		MaxAge:   2592000,
		HttpOnly: true,
		Secure:   platformconfig.SessionCookieSecure(),
		SameSite: http.SameSiteStrictMode,
	})
	return store
}

func resolvePort(primaryEnv string) string {
	port := os.Getenv(primaryEnv)
	if port == "" {
		port = os.Getenv("PORT")
	}
	if port == "" {
		port = strconv.Itoa(*platformconfig.Port)
	}
	return port
}
