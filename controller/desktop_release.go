package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

const (
	desktopReleaseManifestJSONEnv = "CODEGO_DESKTOP_RELEASE_MANIFEST_JSON"
	desktopReleaseManifestFileEnv = "CODEGO_DESKTOP_RELEASE_MANIFEST_FILE"
	desktopReleaseDefaultPagePath = "/download"
)

var errDesktopReleaseNotConfigured = errors.New("desktop release channel is not configured")

type desktopReleaseAsset struct {
	Name               string `json:"name"`
	Size               int64  `json:"size"`
	Digest             string `json:"digest,omitempty"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Platform           string `json:"platform,omitempty"`
	Arch               string `json:"arch,omitempty"`
	TauriTarget        string `json:"tauri_target,omitempty"`
}

type desktopReleasePlatform struct {
	Signature string `json:"signature"`
	URL       string `json:"url"`
}

type desktopReleaseManifest struct {
	TagName     string                            `json:"tag_name"`
	Version     string                            `json:"version"`
	HTMLURL     string                            `json:"html_url"`
	PublishedAt string                            `json:"published_at,omitempty"`
	Notes       string                            `json:"notes,omitempty"`
	HomebrewURL string                            `json:"homebrew_url,omitempty"`
	Assets      []desktopReleaseAsset             `json:"assets"`
	Platforms   map[string]desktopReleasePlatform `json:"platforms,omitempty"`
}

type desktopUpdaterManifest struct {
	Version   string                            `json:"version"`
	Notes     string                            `json:"notes,omitempty"`
	PubDate   string                            `json:"pub_date,omitempty"`
	Platforms map[string]desktopReleasePlatform `json:"platforms"`
}

func desktopReleaseDefaultPageURL() string {
	return common.BuildURL(normalizeDesktopServerAddress(""), desktopReleaseDefaultPagePath)
}

func normalizeDesktopReleaseURL(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}
	base := normalizeDesktopServerAddress("")
	resolved := common.BuildURL(base, value)
	parsed, err := url.Parse(resolved)
	if err != nil {
		return "", fmt.Errorf("invalid release url %q: %w", raw, err)
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return "", fmt.Errorf("release url must resolve to an absolute URL: %s", raw)
	}
	return strings.TrimRight(parsed.String(), "/"), nil
}

func deriveDesktopReleaseVersion(tagName string) string {
	version := strings.TrimSpace(tagName)
	version = strings.TrimPrefix(version, "v")
	version = strings.TrimPrefix(version, "V")
	return strings.TrimSpace(version)
}

func readDesktopReleaseManifestSource() ([]byte, error) {
	if raw := strings.TrimSpace(os.Getenv(desktopReleaseManifestJSONEnv)); raw != "" {
		return []byte(raw), nil
	}

	path := strings.TrimSpace(os.Getenv(desktopReleaseManifestFileEnv))
	if path == "" {
		return nil, errDesktopReleaseNotConfigured
	}

	content, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read desktop release manifest file %q: %w", path, err)
	}
	return content, nil
}

func normalizeDesktopReleaseManifest(manifest *desktopReleaseManifest) error {
	if manifest == nil {
		return errors.New("desktop release manifest is empty")
	}

	manifest.TagName = strings.TrimSpace(manifest.TagName)
	manifest.Version = strings.TrimSpace(manifest.Version)
	if manifest.Version == "" {
		manifest.Version = deriveDesktopReleaseVersion(manifest.TagName)
	}
	if manifest.Version == "" {
		return errors.New("desktop release manifest is missing version")
	}
	if manifest.TagName == "" {
		manifest.TagName = "v" + manifest.Version
	}

	if published := strings.TrimSpace(manifest.PublishedAt); published != "" {
		if _, err := time.Parse(time.RFC3339, published); err != nil {
			return fmt.Errorf("desktop release published_at must be RFC3339: %w", err)
		}
		manifest.PublishedAt = published
	}

	if htmlURL := strings.TrimSpace(manifest.HTMLURL); htmlURL != "" {
		resolved, err := normalizeDesktopReleaseURL(htmlURL)
		if err != nil {
			return err
		}
		manifest.HTMLURL = resolved
	} else {
		manifest.HTMLURL = desktopReleaseDefaultPageURL()
	}

	if homebrewURL := strings.TrimSpace(manifest.HomebrewURL); homebrewURL != "" {
		resolved, err := normalizeDesktopReleaseURL(homebrewURL)
		if err != nil {
			return err
		}
		manifest.HomebrewURL = resolved
	}

	for i := range manifest.Assets {
		asset := &manifest.Assets[i]
		asset.Name = strings.TrimSpace(asset.Name)
		if asset.Name == "" {
			return fmt.Errorf("desktop release asset %d is missing name", i)
		}
		resolved, err := normalizeDesktopReleaseURL(asset.BrowserDownloadURL)
		if err != nil {
			return err
		}
		if resolved == "" {
			return fmt.Errorf("desktop release asset %q is missing browser_download_url", asset.Name)
		}
		asset.BrowserDownloadURL = resolved
		asset.Platform = strings.TrimSpace(asset.Platform)
		asset.Arch = strings.TrimSpace(asset.Arch)
		asset.TauriTarget = strings.TrimSpace(asset.TauriTarget)
		asset.Digest = strings.TrimSpace(asset.Digest)
	}

	if manifest.Platforms == nil {
		manifest.Platforms = map[string]desktopReleasePlatform{}
	}
	normalizedPlatforms := make(map[string]desktopReleasePlatform, len(manifest.Platforms))
	for key, platform := range manifest.Platforms {
		target := strings.TrimSpace(key)
		if target == "" {
			return errors.New("desktop release platforms contains an empty target")
		}
		resolved, err := normalizeDesktopReleaseURL(platform.URL)
		if err != nil {
			return err
		}
		if resolved == "" {
			return fmt.Errorf("desktop release platform %q is missing url", target)
		}
		signature := strings.TrimSpace(platform.Signature)
		if signature == "" {
			return fmt.Errorf("desktop release platform %q is missing signature", target)
		}
		normalizedPlatforms[target] = desktopReleasePlatform{
			Signature: signature,
			URL:       resolved,
		}
	}
	manifest.Platforms = normalizedPlatforms
	return nil
}

func loadConfiguredDesktopReleaseManifest() (*desktopReleaseManifest, error) {
	content, err := readDesktopReleaseManifestSource()
	if err != nil {
		return nil, err
	}

	var manifest desktopReleaseManifest
	if err = json.Unmarshal(content, &manifest); err != nil {
		return nil, fmt.Errorf("failed to decode desktop release manifest: %w", err)
	}
	if err = normalizeDesktopReleaseManifest(&manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

func writeDesktopReleaseError(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	message := "failed to load desktop release metadata"
	if errors.Is(err, errDesktopReleaseNotConfigured) {
		status = http.StatusServiceUnavailable
		message = err.Error()
	} else if err != nil {
		message = err.Error()
	}
	c.JSON(status, gin.H{
		"error":   message,
		"success": false,
	})
}

// GetDesktopReleaseLatest exposes the current public desktop release metadata
// for the website download page and any other unauthenticated consumers.
func GetDesktopReleaseLatest(c *gin.Context) {
	manifest, err := loadDesktopReleaseManifest()
	if err != nil {
		writeDesktopReleaseError(c, err)
		return
	}
	c.JSON(http.StatusOK, manifest)
}

// GetDesktopReleaseLatestJSON serves the updater-compatible latest.json
// payload that the Tauri desktop app consumes for in-app updates.
func GetDesktopReleaseLatestJSON(c *gin.Context) {
	manifest, err := loadDesktopUpdaterReleaseManifest()
	if err != nil {
		writeDesktopReleaseError(c, err)
		return
	}
	if len(manifest.Platforms) == 0 {
		writeDesktopReleaseError(c, errors.New("desktop release manifest is missing updater platforms"))
		return
	}

	c.JSON(http.StatusOK, desktopUpdaterManifest{
		Version:   manifest.Version,
		Notes:     manifest.Notes,
		PubDate:   manifest.PublishedAt,
		Platforms: manifest.Platforms,
	})
}
