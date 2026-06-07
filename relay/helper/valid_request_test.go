package helper

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetAndValidateResponsesRequestDefaultsStreamTrue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := `{"model":"gpt-5","input":"hello"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = req

	responsesReq, err := GetAndValidateResponsesRequest(ctx)

	require.NoError(t, err)
	require.NotNil(t, responsesReq.Stream)
	require.True(t, *responsesReq.Stream)
}

func TestGetAndValidateResponsesRequestForcesExplicitStreamFalseToTrue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	body := `{"model":"gpt-5","input":"hello","stream":false}`
	req := httptest.NewRequest(http.MethodPost, "/v1/responses", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = req

	responsesReq, err := GetAndValidateResponsesRequest(ctx)

	require.NoError(t, err)
	require.NotNil(t, responsesReq.Stream)
	require.True(t, *responsesReq.Stream)
}
