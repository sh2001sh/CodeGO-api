package controller

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

type desktopReleaseLatestPayload struct {
	TagName     string `json:"tag_name"`
	Version     string `json:"version"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
	Notes       string `json:"notes"`
	HomebrewURL string `json:"homebrew_url"`
	Assets      []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
		Platform           string `json:"platform"`
		Arch               string `json:"arch"`
		Digest             string `json:"digest"`
	} `json:"assets"`
	Platforms map[string]struct {
		Signature string `json:"signature"`
		URL       string `json:"url"`
	} `json:"platforms"`
}

type desktopReleaseLatestJSONPayload struct {
	Version   string `json:"version"`
	Notes     string `json:"notes"`
	PubDate   string `json:"pub_date"`
	Platforms map[string]struct {
		Signature string `json:"signature"`
		URL       string `json:"url"`
	} `json:"platforms"`
}

func decodeDesktopReleasePayload[T any](t *testing.T, recorderBody []byte) T {
	t.Helper()
	var payload T
	if err := common.Unmarshal(recorderBody, &payload); err != nil {
		t.Fatalf("failed to decode desktop release payload: %v", err)
	}
	return payload
}

func setDesktopReleaseServerAddressForTest(t *testing.T, value string) {
	t.Helper()
	original := system_setting.ServerAddress
	system_setting.ServerAddress = value
	t.Cleanup(func() {
		system_setting.ServerAddress = original
	})
}

func setDesktopReleaseGitHubServerForTest(t *testing.T, server *httptest.Server) {
	t.Helper()
	originalBaseURL := desktopReleaseGitHubAPIBaseURL
	originalClient := desktopReleaseHTTPClient
	desktopReleaseGitHubAPIBaseURL = server.URL
	desktopReleaseHTTPClient = server.Client()
	t.Cleanup(func() {
		desktopReleaseGitHubAPIBaseURL = originalBaseURL
		desktopReleaseHTTPClient = originalClient
	})
}

func TestGetDesktopReleaseLatestReturnsConfiguredManifest(t *testing.T) {
	t.Setenv(desktopReleaseManifestJSONEnv, `{
		"tag_name":"v3.16.3",
		"html_url":"/download/releases/v3.16.3",
		"published_at":"2026-06-28T00:00:00Z",
		"notes":"Code Go Desktop stable release",
		"homebrew_url":"https://brew.example.test/codego-desktop",
		"assets":[
			{
				"name":"Code-Go-Desktop-v3.16.3-Windows.msi",
				"size":10485760,
				"digest":"sha256:windows",
				"platform":"windows",
				"arch":"x86_64",
				"browser_download_url":"/downloads/codego/windows.msi"
			}
		],
		"platforms":{
			"windows-x86_64":{
				"signature":"windows-signature",
				"url":"/updates/codego/windows-x86_64.zip"
			}
		}
	}`)
	t.Setenv(desktopReleaseManifestFileEnv, "")
	setDesktopReleaseServerAddressForTest(t, "https://shu26.cfd")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/release/latest", nil, 0)
	GetDesktopReleaseLatest(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", recorder.Code)
	}

	payload := decodeDesktopReleasePayload[desktopReleaseLatestPayload](t, recorder.Body.Bytes())
	if payload.TagName != "v3.16.3" {
		t.Fatalf("expected tag_name v3.16.3, got %q", payload.TagName)
	}
	if payload.Version != "3.16.3" {
		t.Fatalf("expected version 3.16.3, got %q", payload.Version)
	}
	if payload.HTMLURL != "https://shu26.cfd/download/releases/v3.16.3" {
		t.Fatalf("expected resolved html_url, got %q", payload.HTMLURL)
	}
	if payload.HomebrewURL != "https://brew.example.test/codego-desktop" {
		t.Fatalf("expected homebrew_url to remain absolute, got %q", payload.HomebrewURL)
	}
	if len(payload.Assets) != 1 {
		t.Fatalf("expected exactly one asset, got %d", len(payload.Assets))
	}
	if payload.Assets[0].BrowserDownloadURL != "https://shu26.cfd/downloads/codego/windows.msi" {
		t.Fatalf("expected resolved asset download url, got %q", payload.Assets[0].BrowserDownloadURL)
	}
	if payload.Platforms["windows-x86_64"].URL != "https://shu26.cfd/updates/codego/windows-x86_64.zip" {
		t.Fatalf("expected resolved updater url, got %q", payload.Platforms["windows-x86_64"].URL)
	}
}

func TestGetDesktopReleaseLatestJSONReturnsUpdaterManifest(t *testing.T) {
	t.Setenv(desktopReleaseManifestJSONEnv, `{
		"version":"3.16.4",
		"html_url":"https://shu26.cfd/download/releases/v3.16.4",
		"published_at":"2026-06-28T08:00:00Z",
		"notes":"Desktop updater test release",
		"assets":[],
		"platforms":{
			"windows-x86_64":{"signature":"sig-win","url":"https://downloads.example.test/windows.zip"},
			"darwin-aarch64":{"signature":"sig-mac","url":"https://downloads.example.test/macos.zip"}
		}
	}`)
	t.Setenv(desktopReleaseManifestFileEnv, "")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/release/latest.json", nil, 0)
	GetDesktopReleaseLatestJSON(ctx)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", recorder.Code)
	}

	payload := decodeDesktopReleasePayload[desktopReleaseLatestJSONPayload](t, recorder.Body.Bytes())
	if payload.Version != "3.16.4" {
		t.Fatalf("expected updater version 3.16.4, got %q", payload.Version)
	}
	if payload.PubDate != "2026-06-28T08:00:00Z" {
		t.Fatalf("expected updater pub_date to match manifest, got %q", payload.PubDate)
	}
	if len(payload.Platforms) != 2 {
		t.Fatalf("expected two updater platforms, got %d", len(payload.Platforms))
	}
	if payload.Platforms["darwin-aarch64"].Signature != "sig-mac" {
		t.Fatalf("expected darwin signature to survive passthrough")
	}
}

func TestGetDesktopReleaseLatestReturnsServiceUnavailableWhenMissing(t *testing.T) {
	t.Setenv(desktopReleaseManifestJSONEnv, "")
	t.Setenv(desktopReleaseManifestFileEnv, "")

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/release/latest", nil, 0)
	GetDesktopReleaseLatest(ctx)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected HTTP 503 when manifest is missing, got %d", recorder.Code)
	}
}

func TestGetDesktopReleaseLatestUsesNewerGitHubReleaseFallback(t *testing.T) {
	githubServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/repos/sh2001sh/CodeGO/releases/latest" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"tag_name":"v1.0.1",
			"name":"Code Go Desktop v1.0.1",
			"html_url":"https://github.com/sh2001sh/CodeGO/releases/tag/v1.0.1",
			"published_at":"2026-07-02T11:58:07Z",
			"assets":[
				{
					"name":"CodeGo_1.0.1_x64_zh-CN.msi",
					"size":16560128,
					"browser_download_url":"https://github.com/sh2001sh/CodeGO/releases/download/v1.0.1/CodeGo_1.0.1_x64_zh-CN.msi"
				},
				{
					"name":"CodeGo_1.0.1_x64.AppImage",
					"size":95377912,
					"browser_download_url":"https://github.com/sh2001sh/CodeGO/releases/download/v1.0.1/CodeGo_1.0.1_x64.AppImage"
				},
				{
					"name":"latest.json",
					"size":119,
					"browser_download_url":"https://github.com/sh2001sh/CodeGO/releases/download/v1.0.1/latest.json"
				}
			]
		}`))
	}))
	defer githubServer.Close()

	setDesktopReleaseGitHubServerForTest(t, githubServer)
	t.Setenv(desktopReleaseGitHubEnabledEnv, "true")
	t.Setenv(desktopReleaseGitHubRepoEnv, "sh2001sh/CodeGO")
	t.Setenv(desktopReleaseManifestFileEnv, "")
	t.Setenv(desktopReleaseManifestJSONEnv, `{
		"tag_name":"v3.16.4",
		"published_at":"2026-06-28T12:00:00Z",
		"notes":"Code Go Desktop v3.16.4",
		"assets":[
			{
				"name":"CodeGo_3.16.4_x64_en-US.msi",
				"size":10485760,
				"platform":"windows",
				"arch":"x64",
				"browser_download_url":"/downloads/codego/CodeGo_3.16.4_x64_en-US.msi"
			}
		],
		"platforms":{
			"windows-x86_64":{"signature":"sig-3164","url":"/downloads/codego/CodeGo_3.16.4_x64_en-US.msi"}
		}
	}`)

	ctx, recorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/release/latest", nil, 0)
	GetDesktopReleaseLatest(ctx)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", recorder.Code)
	}

	payload := decodeDesktopReleasePayload[desktopReleaseLatestPayload](t, recorder.Body.Bytes())
	if payload.Version != "1.0.1" {
		t.Fatalf("expected GitHub fallback version 1.0.1, got %q", payload.Version)
	}
	if len(payload.Assets) != 2 {
		t.Fatalf("expected two CodeGo release assets, got %d", len(payload.Assets))
	}
	if payload.Assets[0].BrowserDownloadURL != "https://github.com/sh2001sh/CodeGO/releases/download/v1.0.1/CodeGo_1.0.1_x64_zh-CN.msi" {
		t.Fatalf("expected GitHub download URL, got %q", payload.Assets[0].BrowserDownloadURL)
	}
	if payload.Assets[0].Platform != "windows" || payload.Assets[0].Arch != "x64" {
		t.Fatalf("expected inferred Windows x64 asset metadata, got %#v", payload.Assets[0])
	}
}

func TestGetDesktopReleaseLatestReloadsManifestFileWithoutRestart(t *testing.T) {
	manifestPath := filepath.Join(t.TempDir(), "codego-desktop-release-manifest.json")
	writeManifest := func(contents string) {
		t.Helper()
		if err := os.WriteFile(manifestPath, []byte(contents), 0o600); err != nil {
			t.Fatalf("failed to write manifest fixture: %v", err)
		}
	}

	writeManifest(`{
		"tag_name":"v3.16.4",
		"published_at":"2026-06-28T12:00:00Z",
		"notes":"Code Go Desktop v3.16.4",
		"assets":[
			{
				"name":"CodeGo_3.16.4_x64_en-US.msi",
				"size":10485760,
				"digest":"sha256:v3164",
				"platform":"windows",
				"arch":"x64",
				"browser_download_url":"/downloads/codego/CodeGo_3.16.4_x64_en-US.msi"
			}
		],
		"platforms":{
			"windows-x86_64":{
				"signature":"sig-3164",
				"url":"/downloads/codego/CodeGo_3.16.4_x64_en-US.msi"
			}
		}
	}`)

	t.Setenv(desktopReleaseManifestJSONEnv, "")
	t.Setenv(desktopReleaseManifestFileEnv, manifestPath)
	setDesktopReleaseServerAddressForTest(t, "https://shu26.cfd")

	firstCtx, firstRecorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/release/latest", nil, 0)
	GetDesktopReleaseLatest(firstCtx)
	if firstRecorder.Code != http.StatusOK {
		t.Fatalf("expected first HTTP 200, got %d", firstRecorder.Code)
	}

	firstPayload := decodeDesktopReleasePayload[desktopReleaseLatestPayload](t, firstRecorder.Body.Bytes())
	if firstPayload.Version != "3.16.4" {
		t.Fatalf("expected first version 3.16.4, got %q", firstPayload.Version)
	}
	if firstPayload.Platforms["windows-x86_64"].Signature != "sig-3164" {
		t.Fatalf("expected first signature sig-3164, got %q", firstPayload.Platforms["windows-x86_64"].Signature)
	}

	writeManifest(`{
		"tag_name":"v3.16.3",
		"published_at":"2026-06-20T08:30:00Z",
		"notes":"Code Go Desktop rollback target",
		"assets":[
			{
				"name":"CodeGo_3.16.3_x64_en-US.msi",
				"size":9437184,
				"digest":"sha256:v3163",
				"platform":"windows",
				"arch":"x64",
				"browser_download_url":"/downloads/codego/CodeGo_3.16.3_x64_en-US.msi"
			}
		],
		"platforms":{
			"windows-x86_64":{
				"signature":"sig-3163",
				"url":"/downloads/codego/CodeGo_3.16.3_x64_en-US.msi"
			}
		}
	}`)

	secondCtx, secondRecorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/release/latest", nil, 0)
	GetDesktopReleaseLatest(secondCtx)
	if secondRecorder.Code != http.StatusOK {
		t.Fatalf("expected second HTTP 200, got %d", secondRecorder.Code)
	}

	secondPayload := decodeDesktopReleasePayload[desktopReleaseLatestPayload](t, secondRecorder.Body.Bytes())
	if secondPayload.Version != "3.16.3" {
		t.Fatalf("expected reloaded version 3.16.3, got %q", secondPayload.Version)
	}
	if secondPayload.TagName != "v3.16.3" {
		t.Fatalf("expected reloaded tag_name v3.16.3, got %q", secondPayload.TagName)
	}
	if secondPayload.Assets[0].BrowserDownloadURL != "https://shu26.cfd/downloads/codego/CodeGo_3.16.3_x64_en-US.msi" {
		t.Fatalf("expected reloaded asset url to point to rollback version, got %q", secondPayload.Assets[0].BrowserDownloadURL)
	}

	updaterCtx, updaterRecorder := newAuthenticatedContext(t, http.MethodGet, "/api/desktop/release/latest.json", nil, 0)
	GetDesktopReleaseLatestJSON(updaterCtx)
	if updaterRecorder.Code != http.StatusOK {
		t.Fatalf("expected updater HTTP 200 after manifest replacement, got %d", updaterRecorder.Code)
	}

	updaterPayload := decodeDesktopReleasePayload[desktopReleaseLatestJSONPayload](t, updaterRecorder.Body.Bytes())
	if updaterPayload.Version != "3.16.3" {
		t.Fatalf("expected updater version 3.16.3 after manifest replacement, got %q", updaterPayload.Version)
	}
	if updaterPayload.Platforms["windows-x86_64"].Signature != "sig-3163" {
		t.Fatalf("expected updater signature sig-3163 after manifest replacement, got %q", updaterPayload.Platforms["windows-x86_64"].Signature)
	}
}
