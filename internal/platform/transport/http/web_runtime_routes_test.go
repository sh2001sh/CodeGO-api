package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gin-gonic/gin"
)

func TestHomeAndIndexHTMLServeSameEmbeddedShell(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()

	defaultPage := []byte(`<!doctype html><html lang="zh-CN"><head><title>Code Go | Codex API、Claude Code API、Codex 中转、Claude 中转</title></head><body><h1>Code Go home</h1><div id="root"></div></body></html>`)

	registerEmbeddedWebRoutes(engine, ThemeAssets{
		DefaultIndexPage: defaultPage,
	})

	for _, path := range []string{"/", "/index.html"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		engine.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("%s status = %d", path, rec.Code)
		}

		body := rec.Body.String()
		if !strings.Contains(body, "<title>Code Go | Codex API、Claude Code API、Codex 中转、Claude 中转</title>") {
			t.Fatalf("%s missing expected title: %s", path, body)
		}
		if !strings.Contains(body, "<h1>Code Go home</h1>") {
			t.Fatalf("%s missing expected h1: %s", path, body)
		}
	}
}

func TestEmbeddedStaticPagesUseCanonicalPaths(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	pageFS := &embedFileSystem{FileSystem: http.FS(fstest.MapFS{
		"pricing/index.html": &fstest.MapFile{Data: []byte("<html>pricing</html>")},
	})}

	engine.Use(func(c *gin.Context) {
		serveEmbeddedStaticPage(c, pageFS)
	})
	engine.NoRoute(func(c *gin.Context) {
		c.Status(http.StatusNotFound)
	})

	tests := []struct {
		path       string
		wantStatus int
		wantBody   string
		wantTarget string
	}{
		{path: "/pricing", wantStatus: http.StatusOK, wantBody: "pricing"},
		{path: "/pricing/", wantStatus: http.StatusPermanentRedirect, wantTarget: "/pricing"},
	}

	for _, test := range tests {
		req := httptest.NewRequest(http.MethodGet, test.path, nil)
		rec := httptest.NewRecorder()
		engine.ServeHTTP(rec, req)

		if rec.Code != test.wantStatus {
			t.Fatalf("%s status = %d, want %d", test.path, rec.Code, test.wantStatus)
		}
		if test.wantBody != "" && !strings.Contains(rec.Body.String(), test.wantBody) {
			t.Fatalf("%s body = %q, want %q", test.path, rec.Body.String(), test.wantBody)
		}
		if target := rec.Header().Get("Location"); target != test.wantTarget {
			t.Fatalf("%s location = %q, want %q", test.path, target, test.wantTarget)
		}
	}
}
