package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/dto"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRespondTaskErrorMapsUpstreamQuota403To503(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	taskErr := &dto.TaskError{
		Code:       "bad_response_status_code",
		Message:    "status_code=403, 预扣费额度失败, 用户剩余额度: 0.000750, 需要预扣费额度: 0.002364 (request id: abc)",
		StatusCode: http.StatusForbidden,
	}

	respondTaskError(c, taskErr)

	require.Equal(t, http.StatusServiceUnavailable, recorder.Code)
	require.Equal(t, http.StatusServiceUnavailable, taskErr.StatusCode)
}

func TestRespondTaskErrorKeepsLocalQuota403(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	taskErr := &dto.TaskError{
		Code:       "insufficient_user_quota",
		Message:    "用户额度不足, 剩余额度: 0.000750",
		StatusCode: http.StatusForbidden,
	}

	respondTaskError(c, taskErr)

	require.Equal(t, http.StatusForbidden, recorder.Code)
	require.Equal(t, http.StatusForbidden, taskErr.StatusCode)
}
