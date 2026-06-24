package service

import (
	"encoding/json"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"testing/fstest"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFindIndexNowKey(t *testing.T) {
	distFS := fstest.MapFS{
		"9ace5684d7fa4ef3abc536fab4c298ba.txt": {
			Data: []byte("9ace5684d7fa4ef3abc536fab4c298ba"),
		},
	}

	name, value, err := findIndexNowKey(distFS)
	require.NoError(t, err)
	assert.Equal(t, "9ace5684d7fa4ef3abc536fab4c298ba.txt", name)
	assert.Equal(t, "9ace5684d7fa4ef3abc536fab4c298ba", value)
}

func TestBuildIndexNowPayload(t *testing.T) {
	buildFS := fstest.MapFS{
		"web/default/dist/9ace5684d7fa4ef3abc536fab4c298ba.txt": {
			Data: []byte("9ace5684d7fa4ef3abc536fab4c298ba"),
		},
		"web/default/dist/sitemap.xml": {
			Data: []byte(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://shu26.cfd/pricing</loc></url>
  <url><loc>https://shu26.cfd/topics/codex-api</loc></url>
</urlset>`),
		},
	}

	payload, err := buildIndexNowPayload(buildFS)
	require.NoError(t, err)

	assert.Equal(t, "shu26.cfd", payload.Host)
	assert.Equal(t, "9ace5684d7fa4ef3abc536fab4c298ba", payload.Key)
	assert.Equal(t, "https://shu26.cfd/9ace5684d7fa4ef3abc536fab4c298ba.txt", payload.KeyLocation)
	assert.Equal(t, []string{
		"https://shu26.cfd/",
		"https://shu26.cfd/pricing",
		"https://shu26.cfd/topics/codex-api",
	}, payload.URLList)
}

func TestLoadIndexNowURLsSkipsOtherHostsAndDuplicates(t *testing.T) {
	distFS := fstest.MapFS{
		"sitemap.xml": {
			Data: []byte(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://shu26.cfd/pricing</loc></url>
  <url><loc>https://shu26.cfd/pricing</loc></url>
  <url><loc>https://other.example.com/outside</loc></url>
  <url><loc>https://shu26.cfd/about</loc></url>
</urlset>`),
		},
	}

	urls, err := loadIndexNowURLs(distFS)
	require.NoError(t, err)
	assert.Equal(t, []string{
		"https://shu26.cfd/",
		"https://shu26.cfd/pricing",
		"https://shu26.cfd/about",
	}, urls)
}

func TestBuildIndexNowPayloadRequiresMatchingKeyFile(t *testing.T) {
	buildFS := fstest.MapFS{
		"web/default/dist/mismatch.txt": {
			Data: []byte("not-the-file-name"),
		},
		"web/default/dist/sitemap.xml": {
			Data: []byte(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://shu26.cfd/</loc></url>
</urlset>`),
		},
	}

	_, err := buildIndexNowPayload(buildFS)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "indexnow key file not found")
}

func TestBuildIndexNowPayloadRequiresDistRoot(t *testing.T) {
	emptyFS := fstest.MapFS{}

	_, err := buildIndexNowPayload(fs.FS(emptyFS))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "read dist root for indexnow key")
}

func TestSubmitIndexNowFromFSSendsPayload(t *testing.T) {
	InitHttpClient()

	buildFS := fstest.MapFS{
		"web/default/dist/9ace5684d7fa4ef3abc536fab4c298ba.txt": {
			Data: []byte("9ace5684d7fa4ef3abc536fab4c298ba"),
		},
		"web/default/dist/sitemap.xml": {
			Data: []byte(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://shu26.cfd/pricing</loc></url>
</urlset>`),
		},
	}

	var captured indexNowPayload
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "application/json; charset=utf-8", r.Header.Get("Content-Type"))

		body, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		require.NoError(t, r.Body.Close())
		require.NoError(t, json.Unmarshal(body, &captured))

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	}))
	defer server.Close()

	originalEndpoint, hadEndpoint := os.LookupEnv("INDEXNOW_ENDPOINT")
	require.NoError(t, os.Setenv("INDEXNOW_ENDPOINT", server.URL))
	defer func() {
		if hadEndpoint {
			_ = os.Setenv("INDEXNOW_ENDPOINT", originalEndpoint)
			return
		}
		_ = os.Unsetenv("INDEXNOW_ENDPOINT")
	}()

	err := submitIndexNowFromFS(t.Context(), fs.FS(buildFS))
	require.NoError(t, err)

	assert.Equal(t, "shu26.cfd", captured.Host)
	assert.Equal(t, "9ace5684d7fa4ef3abc536fab4c298ba", captured.Key)
	assert.Equal(t, "https://shu26.cfd/9ace5684d7fa4ef3abc536fab4c298ba.txt", captured.KeyLocation)
	assert.Equal(t, []string{
		"https://shu26.cfd/",
		"https://shu26.cfd/pricing",
	}, captured.URLList)
}
