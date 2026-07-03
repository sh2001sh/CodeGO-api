package controller

import (
	"errors"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type GroupBuyJoinRequest struct {
	GroupBuyId int64 `json:"group_buy_id"`
	OrderId    int   `json:"order_id"`
}

func ListGroupBuys(c *gin.Context) {
	items, err := model.ListActiveGroupBuys(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"data":  items,
		"total": len(items),
	})
}

func ListMyGroupBuys(c *gin.Context) {
	items, err := model.ListUserGroupBuys(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"data":  items,
		"total": len(items),
	})
}

func GetGroupBuy(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		common.ApiErrorMsg(c, "invalid group buy id")
		return
	}
	item, err := model.GetGroupBuyDetail(id, c.GetInt("id"))
	if err != nil {
		if errors.Is(err, model.ErrGroupBuyNotFound) {
			common.ApiErrorMsg(c, "group buy not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, item)
}

func JoinGroupBuy(c *gin.Context) {
	var req GroupBuyJoinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.GroupBuyId <= 0 {
		common.ApiErrorMsg(c, "invalid group buy id")
		return
	}
	if err := model.JoinGroupBuy(c.GetInt("id"), req.GroupBuyId, req.OrderId); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"joined": true})
}
