package types

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
)

func TestNewAPIErrorStatusStringsSanitizeUpstreamQuotaLeak(t *testing.T) {
	t.Parallel()

	apiErr := NewOpenAIError(
		fmt.Errorf("预扣费额度失败, 用户剩余额度: ＄0.002290, 需要预扣费额度: ＄0.005418 (request id: abc)"),
		ErrorCodeBadResponseStatusCode,
		http.StatusForbidden,
	)

	require.Equal(t, common.UpstreamQuotaGenericMessage, apiErr.ErrorWithStatusCode())
	require.Equal(t, common.UpstreamQuotaGenericMessage, apiErr.MaskSensitiveErrorWithStatusCode())
}

func TestNewAPIErrorStatusStringsKeepLocalQuotaMessage(t *testing.T) {
	t.Parallel()

	apiErr := NewErrorWithStatusCode(
		fmt.Errorf("站内余额不足, 当前余额: ＄0.002290, 本次所需: ＄0.005418"),
		ErrorCodeInsufficientUserQuota,
		http.StatusForbidden,
	)

	require.Equal(t, "status_code=403, 站内余额不足, 当前余额: ＄0.002290, 本次所需: ＄0.005418", apiErr.ErrorWithStatusCode())
	require.Equal(t, "status_code=403, 站内余额不足, 当前余额: ＄0.002290, 本次所需: ＄0.005418", apiErr.MaskSensitiveErrorWithStatusCode())
}
