package app

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestDailyFundingEconomicsEmptySourcesSerializesAsArray(t *testing.T) {
	report, err := DailyFundingEconomics(time.Now(), 1)
	require.NoError(t, err)

	payload, err := json.Marshal(report)
	require.NoError(t, err)
	require.Contains(t, string(payload), `"sources":[]`)
}
