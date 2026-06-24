package router

import (
	"embed"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

// ThemeAssets holds the embedded default frontend assets.
type ThemeAssets struct {
	DefaultBuildFS   embed.FS
	DefaultIndexPage []byte
}

func SetWebRouter(router *gin.Engine, assets ThemeAssets) {
	defaultFS := common.EmbedFolder(assets.DefaultBuildFS, "web/default/dist")
	staticHandler := static.Serve("/", defaultFS)

	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())
	topicsIndexHandler := func(c *gin.Context) {
		serveEmbeddedHtml(c, defaultFS, "/topics/index.html")
	}
	topicDetailHandler := func(c *gin.Context) {
		serveEmbeddedHtml(c, defaultFS, "/topics/"+c.Param("slug")+"/index.html")
	}
	homeHandler := func(c *gin.Context) {
		serveIndexPage(c, assets.DefaultIndexPage)
	}
	router.GET("/", homeHandler)
	router.HEAD("/", homeHandler)
	router.GET("/index.html", homeHandler)
	router.HEAD("/index.html", homeHandler)
	router.GET("/topics", topicsIndexHandler)
	router.HEAD("/topics", topicsIndexHandler)
	router.GET("/topics/:slug", topicDetailHandler)
	router.HEAD("/topics/:slug", topicDetailHandler)
	router.Use(func(c *gin.Context) {
		path := c.Request.URL.Path
		if path == "/topics" || strings.HasPrefix(path, "/topics/") {
			c.Next()
			return
		}
		staticHandler(c)
	})
	router.NoRoute(func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") {
			controller.RelayNotFound(c)
			return
		}
		serveIndexPage(c, assets.DefaultIndexPage)
	})
}

func serveEmbeddedHtml(c *gin.Context, fs static.ServeFileSystem, assetPath string) {
	file, err := fs.Open(assetPath)
	if err != nil {
		controller.RelayNotFound(c)
		return
	}
	defer file.Close()

	content, err := io.ReadAll(file)
	if err != nil {
		controller.RelayNotFound(c)
		return
	}

	c.Header("Cache-Control", "no-cache")
	c.Data(http.StatusOK, "text/html; charset=utf-8", content)
}

func serveIndexPage(c *gin.Context, indexPage []byte) {
	c.Header("Cache-Control", "no-cache")
	c.Data(http.StatusOK, "text/html; charset=utf-8", indexPage)
}
