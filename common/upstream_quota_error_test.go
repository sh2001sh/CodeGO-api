package common

import "testing"

func TestSanitizeUpstreamQuotaErrorMessage(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "sanitize upstream 403 quota leak",
			input:    "status_code=403, 预扣费额度失败, 用户剩余额度: 0.000750, 需要预扣费额度: 0.002364 (request id: 202606170140313551875538268d9d6mB3fntBc)",
			expected: UpstreamQuotaGenericMessage,
		},
		{
			name:     "keep local user arrears message",
			input:    "用户额度不足, 剩余额度: 0.000750",
			expected: "用户额度不足, 剩余额度: 0.000750",
		},
		{
			name:     "keep ordinary error",
			input:    "请求参数错误",
			expected: "请求参数错误",
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := SanitizeUpstreamQuotaErrorMessage(tc.input); got != tc.expected {
				t.Fatalf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}

func TestIsUpstreamQuotaLeakMessage(t *testing.T) {
	t.Parallel()

	if !IsUpstreamQuotaLeakMessage("status_code=403, 预扣费额度失败, 用户剩余额度: 0.000750, 需要预扣费额度: 0.002364 (request id: abc)") {
		t.Fatal("expected upstream quota leak message to be detected")
	}
	if IsUpstreamQuotaLeakMessage("用户额度不足, 剩余额度: 0.000750") {
		t.Fatal("expected local user quota message not to be treated as upstream leak")
	}
}
