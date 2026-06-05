package controller

import (
	"errors"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type imageWorkspaceItemResponse struct {
	Id            int    `json:"id"`
	SessionId     string `json:"session_id"`
	BatchId       string `json:"batch_id"`
	SourceItemId  int    `json:"source_item_id"`
	Model         string `json:"model"`
	Prompt        string `json:"prompt"`
	RevisedPrompt string `json:"revised_prompt"`
	ImageIndex    int    `json:"image_index"`
	Status        string `json:"status"`
	ImageURL      string `json:"image_url"`
	DownloadURL   string `json:"download_url"`
	OriginalURL   string `json:"original_url"`
	ExpiresAt     int64  `json:"expires_at"`
	CreatedAt     int64  `json:"created_at"`
	ErrorMessage  string `json:"error_message"`
}

func GetImageWorkspaceModels(c *gin.Context) {
	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	groups := service.GetUserUsableGroups(user.Group)
	modelSet := make(map[string]struct{})
	for group := range groups {
		for _, modelName := range model.GetGroupEnabledModels(group) {
			modelSet[modelName] = struct{}{}
		}
	}
	models := make([]string, 0, len(modelSet))
	for modelName := range modelSet {
		models = append(models, modelName)
	}
	models = service.FilterImageModels(models)
	sort.Strings(models)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    models,
	})
}

func GetImageWorkspaceItems(c *gin.Context) {
	userId := c.GetInt("id")
	page, _ := strconv.Atoi(c.Query("p"))
	pageSize, _ := strconv.Atoi(c.Query("page_size"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	sessionId := strings.TrimSpace(c.Query("session_id"))
	items, total, err := model.GetImageWorkspaceItemsByUser(userId, sessionId, (page-1)*pageSize, pageSize)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	resp := make([]imageWorkspaceItemResponse, 0, len(items))
	now := common.GetTimestamp()
	for _, item := range items {
		imageURL := ""
		downloadURL := ""
		if item.Status == model.ImageWorkspaceStatusReady && item.ExpiresAt > now && item.FilePath != "" {
			imageURL = service.BuildImageWorkspaceAssetURL(item.Id)
			downloadURL = service.BuildImageWorkspaceDownloadURL(item.Id)
		}
		resp = append(resp, imageWorkspaceItemResponse{
			Id:            item.Id,
			SessionId:     item.SessionId,
			BatchId:       item.BatchId,
			SourceItemId:  item.SourceItemId,
			Model:         item.Model,
			Prompt:        item.Prompt,
			RevisedPrompt: item.RevisedPrompt,
			ImageIndex:    item.ImageIndex,
			Status:        item.Status,
			ImageURL:      imageURL,
			DownloadURL:   downloadURL,
			OriginalURL:   item.OriginalURL,
			ExpiresAt:     item.ExpiresAt,
			CreatedAt:     item.CreatedAt,
			ErrorMessage:  item.ErrorMessage,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    resp,
		"total":   total,
	})
}

func GetImageWorkspaceItemContent(c *gin.Context) {
	userId := c.GetInt("id")
	itemId, err := strconv.Atoi(c.Param("id"))
	if err != nil || itemId <= 0 {
		common.ApiErrorMsg(c, "invalid image item id")
		return
	}

	item, err := model.GetImageWorkspaceItemByUser(userId, itemId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "image not found")
			return
		}
		if errors.Is(err, os.ErrNotExist) {
			common.ApiErrorMsg(c, "image not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	if item.Status != model.ImageWorkspaceStatusReady || item.ExpiresAt <= common.GetTimestamp() || item.FilePath == "" {
		common.ApiErrorMsg(c, "image has expired")
		return
	}

	if _, statErr := os.Stat(item.FilePath); statErr != nil {
		common.ApiErrorMsg(c, "image file not found")
		return
	}

	download := c.Query("download") == "1"
	if err := service.WriteImageWorkspaceAsset(c, item, download); err != nil {
		common.ApiError(c, fmt.Errorf("failed to read image: %w", err))
	}
}
