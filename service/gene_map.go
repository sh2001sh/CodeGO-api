package service

import (
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

type GeneMapModelSlice struct {
	Model     string  `json:"model"`
	Requests  int64   `json:"requests"`
	Quota     int64   `json:"quota"`
	TokenUsed int64   `json:"token_used"`
	Share     float64 `json:"share"`
}

type GeneMapTimeBand struct {
	Key         string  `json:"key"`
	Label       string  `json:"label"`
	StartHour   int     `json:"start_hour"`
	EndHour     int     `json:"end_hour"`
	Requests    int64   `json:"requests"`
	ActiveShare float64 `json:"active_share"`
	Weight      float64 `json:"weight"`
	IsPeak      bool    `json:"is_peak"`
}

type GeneMapRareModel struct {
	Model    string `json:"model"`
	Requests int64  `json:"requests"`
	Badge    string `json:"badge"`
}

type GeneMapSnapshot struct {
	GeneratedAt   int64               `json:"generated_at"`
	WindowDays    int                 `json:"window_days"`
	OwnerLabel    string              `json:"owner_label"`
	Archetype     string              `json:"archetype"`
	Tagline       string              `json:"tagline"`
	ShareCaption  string              `json:"share_caption"`
	DominantModel string              `json:"dominant_model"`
	TotalRequests int64               `json:"total_requests"`
	TotalQuota    int64               `json:"total_quota"`
	TotalTokens   int64               `json:"total_tokens"`
	Models        []GeneMapModelSlice `json:"models"`
	TimeBands     []GeneMapTimeBand   `json:"time_bands"`
	RareModels    []GeneMapRareModel  `json:"rare_models"`
}

type GeneMapSharePayload struct {
	Token      string          `json:"token"`
	ShareURL   string          `json:"share_url"`
	ShareText  string          `json:"share_text"`
	Snapshot   GeneMapSnapshot `json:"snapshot"`
	Rewarded   bool            `json:"rewarded"`
	RewardUSD  float64         `json:"reward_usd"`
	OwnerLabel string          `json:"owner_label"`
}

type GeneMapPublicShare struct {
	Token     string          `json:"token"`
	Headline  string          `json:"headline"`
	ShareText string          `json:"share_text"`
	Snapshot  GeneMapSnapshot `json:"snapshot"`
}

type GeneMapComparison struct {
	Token         string          `json:"token"`
	Headline      string          `json:"headline"`
	Owner         GeneMapSnapshot `json:"owner"`
	Viewer        GeneMapSnapshot `json:"viewer"`
	SharedModels  []string        `json:"shared_models"`
	ViewerIsOwner bool            `json:"viewer_is_owner"`
	CallToAction  string          `json:"call_to_action"`
}

type geneMapModelAggregate struct {
	Model     string
	Requests  int64
	Quota     int64
	TokenUsed int64
}

type geneMapBandSeed struct {
	Key       string
	Label     string
	StartHour int
	EndHour   int
}

var geneMapBands = []geneMapBandSeed{
	{Key: "night", Label: "00:00-04:00", StartHour: 0, EndHour: 4},
	{Key: "dawn", Label: "04:00-08:00", StartHour: 4, EndHour: 8},
	{Key: "morning", Label: "08:00-12:00", StartHour: 8, EndHour: 12},
	{Key: "afternoon", Label: "12:00-16:00", StartHour: 12, EndHour: 16},
	{Key: "evening", Label: "16:00-20:00", StartHour: 16, EndHour: 20},
	{Key: "late", Label: "20:00-24:00", StartHour: 20, EndHour: 24},
}

// GenerateGeneMapSnapshot builds the current user's API gene map.
func GenerateGeneMapSnapshot(userId int, lookbackDays int) (*GeneMapSnapshot, error) {
	if userId <= 0 {
		return nil, fmt.Errorf("invalid user id")
	}
	if lookbackDays <= 0 {
		lookbackDays = 30
	}

	user, err := model.GetUserById(userId, false)
	if err != nil {
		return nil, err
	}

	now := time.Now().In(time.Local)
	start := now.AddDate(0, 0, -lookbackDays).Unix()
	rows, err := model.GetQuotaDataByUserId(userId, start, now.Unix())
	if err != nil {
		return nil, err
	}

	modelSlices, totalRequests, totalQuota, totalTokens := aggregateGeneMapModels(rows)
	timeBands := aggregateGeneMapTimeBands(rows, totalRequests)
	rareModels := pickRareModels(modelSlices, totalRequests)
	ownerLabel := maskGeneMapOwnerLabel(user.DisplayName, user.Username)

	dominantModel := ""
	if len(modelSlices) > 0 {
		dominantModel = modelSlices[0].Model
	}
	archetype, tagline := buildGeneMapArchetype(dominantModel, timeBands, rareModels)

	return &GeneMapSnapshot{
		GeneratedAt:   common.GetTimestamp(),
		WindowDays:    lookbackDays,
		OwnerLabel:    ownerLabel,
		Archetype:     archetype,
		Tagline:       tagline,
		ShareCaption:  buildGeneMapShareCaption(archetype),
		DominantModel: dominantModel,
		TotalRequests: totalRequests,
		TotalQuota:    totalQuota,
		TotalTokens:   totalTokens,
		Models:        modelSlices,
		TimeBands:     timeBands,
		RareModels:    rareModels,
	}, nil
}

// CreateGeneMapShare snapshots the current map and stores a public share record.
func CreateGeneMapShare(userId int, lookbackDays int, baseURL string) (*GeneMapSharePayload, error) {
	snapshot, err := GenerateGeneMapSnapshot(userId, lookbackDays)
	if err != nil {
		return nil, err
	}

	share := &model.GeneMapShare{
		UserId:       userId,
		OwnerLabel:   snapshot.OwnerLabel,
		Headline:     snapshot.Archetype,
		SnapshotJSON: common.GetJsonString(snapshot),
	}
	if err := model.DB.Create(share).Error; err != nil {
		return nil, err
	}

	rewarded, rewardErr := ClaimShareLinkMission(userId)
	if rewardErr != nil {
		return nil, rewardErr
	}

	shareURL := buildGeneMapShareURL(baseURL, share.ShareToken)
	return &GeneMapSharePayload{
		Token:      share.ShareToken,
		ShareURL:   shareURL,
		ShareText:  fmt.Sprintf("%s\n%s", snapshot.ShareCaption, shareURL),
		Snapshot:   *snapshot,
		Rewarded:   rewarded,
		RewardUSD:  0.2,
		OwnerLabel: snapshot.OwnerLabel,
	}, nil
}

// GetPublicGeneMapShare returns a stored public share snapshot.
func GetPublicGeneMapShare(token string) (*GeneMapPublicShare, error) {
	share, err := model.GetGeneMapShareByToken(strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}

	var snapshot GeneMapSnapshot
	if err := common.UnmarshalJsonStr(share.SnapshotJSON, &snapshot); err != nil {
		return nil, err
	}

	return &GeneMapPublicShare{
		Token:     share.ShareToken,
		Headline:  share.Headline,
		ShareText: snapshot.ShareCaption,
		Snapshot:  snapshot,
	}, nil
}

// CompareGeneMapShare returns the owner snapshot and the current viewer snapshot side by side.
func CompareGeneMapShare(token string, viewerUserId int) (*GeneMapComparison, error) {
	share, err := model.GetGeneMapShareByToken(strings.TrimSpace(token))
	if err != nil {
		return nil, err
	}

	var ownerSnapshot GeneMapSnapshot
	if err := common.UnmarshalJsonStr(share.SnapshotJSON, &ownerSnapshot); err != nil {
		return nil, err
	}

	viewerSnapshot, err := GenerateGeneMapSnapshot(viewerUserId, ownerSnapshot.WindowDays)
	if err != nil {
		return nil, err
	}

	return &GeneMapComparison{
		Token:         share.ShareToken,
		Headline:      share.Headline,
		Owner:         ownerSnapshot,
		Viewer:        *viewerSnapshot,
		SharedModels:  buildSharedModelList(ownerSnapshot.Models, viewerSnapshot.Models),
		ViewerIsOwner: share.UserId == viewerUserId,
		CallToAction:  "创建你自己的基因图，看看和高手差在哪",
	}, nil
}

func aggregateGeneMapModels(rows []*model.QuotaData) ([]GeneMapModelSlice, int64, int64, int64) {
	modelMap := make(map[string]*geneMapModelAggregate)
	var totalRequests int64
	var totalQuota int64
	var totalTokens int64

	for _, row := range rows {
		if row == nil {
			continue
		}

		modelName := strings.TrimSpace(row.ModelName)
		if modelName == "" {
			modelName = "unknown"
		}

		entry, ok := modelMap[modelName]
		if !ok {
			entry = &geneMapModelAggregate{Model: modelName}
			modelMap[modelName] = entry
		}

		entry.Requests += int64(row.Count)
		entry.Quota += int64(row.Quota)
		entry.TokenUsed += int64(row.TokenUsed)
		totalRequests += int64(row.Count)
		totalQuota += int64(row.Quota)
		totalTokens += int64(row.TokenUsed)
	}

	aggregates := make([]geneMapModelAggregate, 0, len(modelMap))
	for _, entry := range modelMap {
		aggregates = append(aggregates, *entry)
	}

	sort.SliceStable(aggregates, func(i, j int) bool {
		if aggregates[i].Requests == aggregates[j].Requests {
			return aggregates[i].Quota > aggregates[j].Quota
		}
		return aggregates[i].Requests > aggregates[j].Requests
	})

	slices := make([]GeneMapModelSlice, 0, len(aggregates))
	for _, entry := range aggregates {
		share := 0.0
		if totalRequests > 0 {
			share = float64(entry.Requests) / float64(totalRequests)
		}
		slices = append(slices, GeneMapModelSlice{
			Model:     entry.Model,
			Requests:  entry.Requests,
			Quota:     entry.Quota,
			TokenUsed: entry.TokenUsed,
			Share:     share,
		})
	}

	return slices, totalRequests, totalQuota, totalTokens
}

func aggregateGeneMapTimeBands(rows []*model.QuotaData, totalRequests int64) []GeneMapTimeBand {
	bands := make([]GeneMapTimeBand, 0, len(geneMapBands))
	weights := make([]int64, len(geneMapBands))
	var peak int64

	for _, seed := range geneMapBands {
		bands = append(bands, GeneMapTimeBand{
			Key:       seed.Key,
			Label:     seed.Label,
			StartHour: seed.StartHour,
			EndHour:   seed.EndHour,
		})
	}

	for _, row := range rows {
		if row == nil {
			continue
		}
		hour := time.Unix(row.CreatedAt, 0).In(time.Local).Hour()
		for index, band := range geneMapBands {
			if hour >= band.StartHour && hour < band.EndHour {
				weights[index] += int64(row.Count)
				if weights[index] > peak {
					peak = weights[index]
				}
				break
			}
		}
	}

	for index := range bands {
		bands[index].Requests = weights[index]
		if totalRequests > 0 {
			bands[index].ActiveShare = float64(weights[index]) / float64(totalRequests)
		}
		if peak > 0 {
			bands[index].Weight = float64(weights[index]) / float64(peak)
		}
		if peak > 0 && bands[index].Requests == peak {
			bands[index].IsPeak = true
		}
	}

	return bands
}

func pickRareModels(models []GeneMapModelSlice, totalRequests int64) []GeneMapRareModel {
	if len(models) == 0 {
		return []GeneMapRareModel{}
	}

	rare := make([]GeneMapRareModel, 0, 3)
	for _, item := range models {
		if len(rare) >= 3 {
			break
		}
		if item.Requests > 5 {
			continue
		}
		if item.Share > 0.12 && item.Requests > 2 {
			continue
		}

		badge := "稀有模型调用"
		if totalRequests > 0 && item.Requests == 1 {
			badge = "一次性探索"
		}
		rare = append(rare, GeneMapRareModel{
			Model:    item.Model,
			Requests: item.Requests,
			Badge:    badge,
		})
	}

	return rare
}

func buildGeneMapArchetype(
	dominantModel string,
	bands []GeneMapTimeBand,
	rareModels []GeneMapRareModel,
) (string, string) {
	if len(rareModels) >= 2 {
		return "好奇心裂变者", "你会把流量分散到更多模型上做实验，像在维护一份持续更新的开发实验记录。"
	}

	peakBand := "steady"
	for _, band := range bands {
		if band.IsPeak {
			peakBand = band.Key
			break
		}
	}

	modelLower := strings.ToLower(dominantModel)
	switch {
	case strings.Contains(modelLower, "claude"):
		if peakBand == "late" || peakBand == "night" {
			return "夜航架构师", "长上下文编码和深夜高强度工作占据主轴，调用曲线集中而稳定。"
		}
		return "规格驱动构建者", "你偏好结构化推理模型，白天节奏稳定，调用行为非常成体系。"
	case strings.Contains(modelLower, "gemini"):
		return "闪电调参手", "你更偏向快速试错和多时段 burst 式实验，讲究反馈速度。"
	case strings.Contains(modelLower, "gpt"):
		return "全栈均衡派", "你把通用模型用得很均衡，全天都有稳定请求，是典型的生产型开发者。"
	case strings.Contains(modelLower, "deepseek"):
		return "研究流量挖掘者", "你擅长在成本和效果之间做组合测试，调用更像一条研究流。"
	default:
		switch peakBand {
		case "morning", "afternoon":
			return "白昼操盘手", "大部分请求集中在白天高效时段，模型选择稳定，输出节奏清晰。"
		case "late", "night":
			return "深夜黑客", "你的 API 流量在夜里最活跃，调用高峰集中，节奏很有个人风格。"
		default:
			return "稳定路由者", "你的调用分布均衡，没有单一模式压倒其它轨迹，像一张平衡的工作图谱。"
		}
	}
}

func buildGeneMapShareCaption(archetype string) string {
	return fmt.Sprintf("我的 API 基因图谱是「%s」，测测你是什么类型的开发者？", archetype)
}

func buildSharedModelList(owner []GeneMapModelSlice, viewer []GeneMapModelSlice) []string {
	if len(owner) == 0 || len(viewer) == 0 {
		return []string{}
	}

	viewerSet := make(map[string]struct{}, len(viewer))
	for _, item := range viewer {
		viewerSet[item.Model] = struct{}{}
	}

	shared := make([]string, 0, 4)
	for _, item := range owner {
		if _, ok := viewerSet[item.Model]; !ok {
			continue
		}
		shared = append(shared, item.Model)
		if len(shared) >= 4 {
			break
		}
	}

	return shared
}

func buildGeneMapShareURL(baseURL string, token string) string {
	trimmed := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if trimmed == "" {
		return "/gene-map/" + token
	}
	return trimmed + "/gene-map/" + token
}

func maskGeneMapOwnerLabel(displayName string, username string) string {
	name := strings.TrimSpace(displayName)
	if name == "" {
		name = strings.TrimSpace(username)
	}
	if name == "" {
		return "匿名开发者"
	}

	runes := []rune(name)
	switch len(runes) {
	case 1:
		return string(runes)
	case 2:
		return string(runes[0]) + "*"
	default:
		return string(runes[0]) + strings.Repeat("*", len(runes)-2) + string(runes[len(runes)-1])
	}
}
