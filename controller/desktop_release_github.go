package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
)

const (
	desktopReleaseGitHubEnabledEnv  = "CODEGO_DESKTOP_RELEASE_GITHUB_FALLBACK_ENABLED"
	desktopReleaseGitHubRepoEnv     = "CODEGO_DESKTOP_RELEASE_GITHUB_REPOSITORY"
	defaultDesktopReleaseGitHubRepo = "sh2001sh/CodeGO"
)

var desktopReleaseHTTPClient = &http.Client{Timeout: 10 * time.Second}
var desktopReleaseGitHubAPIBaseURL = "https://api.github.com"

type desktopGitHubRelease struct {
	TagName     string               `json:"tag_name"`
	Name        string               `json:"name"`
	HTMLURL     string               `json:"html_url"`
	PublishedAt string               `json:"published_at"`
	Assets      []desktopGitHubAsset `json:"assets"`
}

type desktopGitHubAsset struct {
	Name               string `json:"name"`
	Size               int64  `json:"size"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

func desktopReleaseGitHubFallbackEnabled() bool {
	value := strings.TrimSpace(os.Getenv(desktopReleaseGitHubEnabledEnv))
	return strings.EqualFold(value, "true") || value == "1"
}

func desktopReleaseGitHubRepository() string {
	repository := strings.TrimSpace(os.Getenv(desktopReleaseGitHubRepoEnv))
	if repository == "" {
		repository = defaultDesktopReleaseGitHubRepo
	}
	if !isSafeGitHubRepository(repository) {
		return defaultDesktopReleaseGitHubRepo
	}
	return repository
}

func isSafeGitHubRepository(repository string) bool {
	parts := strings.Split(repository, "/")
	if len(parts) != 2 {
		return false
	}
	for _, part := range parts {
		if !isSafeGitHubRepositoryPart(part) {
			return false
		}
	}
	return true
}

func isSafeGitHubRepositoryPart(part string) bool {
	if part == "" || strings.Contains(part, "..") {
		return false
	}
	for _, r := range part {
		if r != '-' && r != '_' && r != '.' && (r < '0' || r > '9') && (r < 'A' || r > 'Z') && (r < 'a' || r > 'z') {
			return false
		}
	}
	return true
}

func fetchDesktopGitHubReleaseManifest() (*desktopReleaseManifest, error) {
	repository := desktopReleaseGitHubRepository()
	endpoint := strings.TrimRight(desktopReleaseGitHubAPIBaseURL, "/") + "/repos/" + repository + "/releases/latest"
	req, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "CodeGoDesktopReleaseChannel")

	resp, err := desktopReleaseHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch desktop release from GitHub: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub release request failed with HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("failed to read GitHub release response: %w", err)
	}
	return decodeDesktopGitHubReleaseManifest(body)
}

func decodeDesktopGitHubReleaseManifest(body []byte) (*desktopReleaseManifest, error) {
	var release desktopGitHubRelease
	if err := json.Unmarshal(body, &release); err != nil {
		return nil, fmt.Errorf("failed to decode GitHub release response: %w", err)
	}
	manifest := desktopReleaseManifest{
		TagName:     strings.TrimSpace(release.TagName),
		HTMLURL:     strings.TrimSpace(release.HTMLURL),
		PublishedAt: strings.TrimSpace(release.PublishedAt),
		Notes:       strings.TrimSpace(release.Name),
		Assets:      buildDesktopReleaseAssetsFromGitHub(release.Assets),
		Platforms:   map[string]desktopReleasePlatform{},
	}
	if manifest.Notes == "" {
		manifest.Notes = "Code Go Desktop " + manifest.TagName
	}
	if err := normalizeDesktopReleaseManifest(&manifest); err != nil {
		return nil, err
	}
	return &manifest, nil
}

func buildDesktopReleaseAssetsFromGitHub(assets []desktopGitHubAsset) []desktopReleaseAsset {
	releaseAssets := make([]desktopReleaseAsset, 0, len(assets))
	for _, asset := range assets {
		if !strings.HasPrefix(asset.Name, "CodeGo_") {
			continue
		}
		platform, arch, tauriTarget := inferDesktopReleaseAssetTarget(asset.Name)
		if platform == "" {
			continue
		}
		releaseAssets = append(releaseAssets, desktopReleaseAsset{
			Name:               asset.Name,
			Size:               asset.Size,
			BrowserDownloadURL: asset.BrowserDownloadURL,
			Platform:           platform,
			Arch:               arch,
			TauriTarget:        tauriTarget,
		})
	}
	return releaseAssets
}

func inferDesktopReleaseAssetTarget(name string) (platform string, arch string, tauriTarget string) {
	lowerName := strings.ToLower(name)
	arch = "x64"
	if strings.Contains(lowerName, "_arm64") || strings.Contains(lowerName, "_aarch64") {
		arch = "arm64"
	}
	switch {
	case strings.HasSuffix(lowerName, ".msi") || strings.Contains(lowerName, "portable"):
		platform = "windows"
	case strings.HasSuffix(lowerName, ".dmg") || strings.HasSuffix(lowerName, ".app.tar.gz"):
		platform = "macos"
	case strings.HasSuffix(lowerName, ".appimage") || strings.HasSuffix(lowerName, ".deb") || strings.HasSuffix(lowerName, ".rpm"):
		platform = "linux"
	}
	if platform == "" {
		return "", arch, ""
	}
	return platform, arch, desktopReleaseTauriTarget(platform, arch)
}

func desktopReleaseTauriTarget(platform string, arch string) string {
	switch platform {
	case "windows":
		if arch == "arm64" {
			return "windows-aarch64"
		}
		return "windows-x86_64"
	case "linux":
		if arch == "arm64" {
			return "linux-aarch64"
		}
		return "linux-x86_64"
	case "macos":
		return "darwin-universal"
	default:
		return ""
	}
}

func isDesktopReleaseManifestNewer(candidate *desktopReleaseManifest, current *desktopReleaseManifest) bool {
	if candidate == nil || current == nil {
		return candidate != nil
	}
	candidateTime, candidateErr := time.Parse(time.RFC3339, candidate.PublishedAt)
	currentTime, currentErr := time.Parse(time.RFC3339, current.PublishedAt)
	if candidateErr == nil && currentErr == nil && !candidateTime.Equal(currentTime) {
		return candidateTime.After(currentTime)
	}
	return compareDesktopReleaseVersions(candidate.Version, current.Version) > 0
}

func compareDesktopReleaseVersions(left string, right string) int {
	leftParts := desktopReleaseVersionParts(left)
	rightParts := desktopReleaseVersionParts(right)
	for i := 0; i < len(leftParts) || i < len(rightParts); i++ {
		leftValue, rightValue := 0, 0
		if i < len(leftParts) {
			leftValue = leftParts[i]
		}
		if i < len(rightParts) {
			rightValue = rightParts[i]
		}
		if leftValue != rightValue {
			return leftValue - rightValue
		}
	}
	return 0
}

func desktopReleaseVersionParts(version string) []int {
	version = strings.TrimPrefix(strings.TrimPrefix(strings.TrimSpace(version), "v"), "V")
	parts := strings.Split(version, ".")
	values := make([]int, 0, len(parts))
	for _, part := range parts {
		value := 0
		for _, r := range part {
			if r < '0' || r > '9' {
				break
			}
			value = value*10 + int(r-'0')
		}
		values = append(values, value)
	}
	return values
}

func loadDesktopReleaseManifest() (*desktopReleaseManifest, error) {
	configured, err := loadConfiguredDesktopReleaseManifest()
	if !desktopReleaseGitHubFallbackEnabled() {
		return configured, err
	}

	githubManifest, githubErr := fetchDesktopGitHubReleaseManifest()
	if githubErr != nil {
		if configured != nil {
			common.SysLog(fmt.Sprintf("desktop release GitHub fallback failed: %v", githubErr))
			return configured, nil
		}
		return nil, githubErr
	}
	if err != nil && errors.Is(err, errDesktopReleaseNotConfigured) {
		return githubManifest, nil
	}
	if err != nil {
		return nil, err
	}
	if isDesktopReleaseManifestNewer(githubManifest, configured) {
		return githubManifest, nil
	}
	return configured, nil
}
