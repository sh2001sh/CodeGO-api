package app

import (
	"errors"
	"net/http"
	"testing"

	"github.com/sh2001sh/new-api/types"
	"github.com/stretchr/testify/require"
)

func TestIsModelUnavailableError(t *testing.T) {
	require.True(t, IsModelUnavailableError(types.NewOpenAIError(
		errors.New("The model does not exist"), types.ErrorCodeModelNotFound, http.StatusNotFound,
	)))
	require.True(t, IsModelUnavailableError(types.NewOpenAIError(
		errors.New("model not supported"), types.ErrorCodeBadResponseStatusCode, http.StatusNotFound,
	)))
	require.False(t, IsModelUnavailableError(types.NewOpenAIError(
		errors.New("invalid API key"), types.ErrorCodeBadResponseStatusCode, http.StatusUnauthorized,
	)))
	require.False(t, IsModelUnavailableError(types.NewOpenAIError(
		errors.New("resource not found"), types.ErrorCodeBadResponseStatusCode, http.StatusNotFound,
	)))
}
