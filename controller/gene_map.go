package controller

import (
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type geneMapRequest struct {
	Days int `json:"days"`
}

func getGeneMapLookbackDays(c *gin.Context, bodyDays int) int {
	if bodyDays > 0 {
		return bodyDays
	}
	queryDays, _ := strconv.Atoi(strings.TrimSpace(c.Query("days")))
	if queryDays > 0 {
		return queryDays
	}
	return 30
}

func GenerateGeneMap(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	snapshot, err := service.GenerateGeneMapSnapshot(
		userId,
		getGeneMapLookbackDays(c, 0),
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, snapshot)
}

func ShareGeneMap(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	var req geneMapRequest
	_ = c.ShouldBindJSON(&req)
	data, err := service.CreateGeneMapShare(
		userId,
		getGeneMapLookbackDays(c, req.Days),
		service.GetCallbackAddress(),
	)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func GetGeneMapShare(c *gin.Context) {
	data, err := service.GetPublicGeneMapShare(c.Param("token"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func CompareGeneMapShare(c *gin.Context) {
	userId := c.GetInt("id")
	if userId <= 0 {
		common.ApiErrorMsg(c, "invalid user id")
		return
	}
	data, err := service.CompareGeneMapShare(c.Param("token"), userId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}
