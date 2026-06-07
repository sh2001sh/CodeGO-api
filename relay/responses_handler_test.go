package relay

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/require"
)

func TestForceResponsesStreamBodyAddsStreamTrue(t *testing.T) {
	storage, err := common.CreateBodyStorage([]byte(`{"model":"gpt-5","input":"hello"}`))
	require.NoError(t, err)
	defer storage.Close()

	body, err := forceResponsesStreamBody(storage)

	require.NoError(t, err)
	require.JSONEq(t, `{"model":"gpt-5","input":"hello","stream":true}`, string(body))
}

func TestForceResponsesStreamBodyOverridesStreamFalse(t *testing.T) {
	storage, err := common.CreateBodyStorage([]byte(`{"model":"gpt-5","input":"hello","stream":false}`))
	require.NoError(t, err)
	defer storage.Close()

	body, err := forceResponsesStreamBody(storage)

	require.NoError(t, err)
	require.JSONEq(t, `{"model":"gpt-5","input":"hello","stream":true}`, string(body))
}
