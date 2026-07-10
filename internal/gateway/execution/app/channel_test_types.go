package app

import (
	"github.com/gin-gonic/gin"
	"github.com/sh2001sh/new-api/types"
)

type channelTestResult struct {
	context     *gin.Context
	localErr    error
	newAPIError *types.NewAPIError
}
