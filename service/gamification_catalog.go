package service

type achievementDefinition struct {
	Key         string
	Name        string
	Description string
	Hint        string
	Icon        string
	Tier        string
}

type missionDefinition struct {
	Key         string
	Name        string
	Description string
	Icon        string
	RewardUSD   float64
	Target      int64
}

type companionStage struct {
	Title           string
	Flavor          string
	MinUnlocks      int
	NextUnlocksGoal int
}

var achievementCatalog = []achievementDefinition{
	{
		Key:         "first-call",
		Name:        "初出茅庐",
		Description: "完成首次成功调用",
		Hint:        "任意模型成功调用一次即可点亮",
		Icon:        "sparkles",
		Tier:        "common",
	},
	{
		Key:         "hundred-calls",
		Name:        "百次召唤",
		Description: "累计完成 100 次调用",
		Hint:        "多用几次 Playground 或接入你的应用",
		Icon:        "orbit",
		Tier:        "rare",
	},
	{
		Key:         "thousand-forge",
		Name:        "千锤百炼",
		Description: "累计消耗达到 1000 美元额度",
		Hint:        "持续稳定使用会自然解锁",
		Icon:        "anvil",
		Tier:        "epic",
	},
	{
		Key:         "contract-power",
		Name:        "契约之力",
		Description: "拥有任意套餐订阅记录",
		Hint:        "购买一次套餐即可解锁",
		Icon:        "shield-check",
		Tier:        "rare",
	},
	{
		Key:         "lucky-star",
		Name:        "欧皇附体",
		Description: "盲盒开出单次 30 美元及以上奖励",
		Hint:        "试试手气，大奖会自己找上门",
		Icon:        "star",
		Tier:        "legendary",
	},
	{
		Key:         "social-crafter",
		Name:        "社交达人",
		Description: "成功邀请 3 位伙伴",
		Hint:        "把你的邀请链接分享出去",
		Icon:        "users",
		Tier:        "rare",
	},
	{
		Key:         "seven-day-streak",
		Name:        "全勤工匠",
		Description: "历史上达成连续签到 7 天",
		Hint:        "连续签到一周即可点亮",
		Icon:        "calendar-range",
		Tier:        "epic",
	},
}

var missionCatalog = []missionDefinition{
	{
		Key:         "daily-share-link",
		Name:        "今日分享邀请链接",
		Description: "复制一次邀请链接，让更多伙伴看见你的工坊",
		Icon:        "users",
		RewardUSD:   0.2,
		Target:      1,
	},
	{
		Key:         "daily-calls",
		Name:        "今日调用 10 次",
		Description: "任意成功调用累计达到 10 次",
		Icon:        "zap",
		RewardUSD:   0.5,
		Target:      10,
	},
	{
		Key:         "daily-blind-box",
		Name:        "今日开启盲盒 1 次",
		Description: "今天开一次盲盒，给工坊添点惊喜",
		Icon:        "gift",
		RewardUSD:   0.3,
		Target:      1,
	},
}

var companionStages = []companionStage{
	{
		Title:           "见习召唤师",
		Flavor:          "你的工坊刚刚点亮，第一只小伙伴已经开始巡检线路。",
		MinUnlocks:      0,
		NextUnlocksGoal: 2,
	},
	{
		Title:           "灵感工匠",
		Flavor:          "工坊的齿轮开始咬合，伙伴们会把日常调用整理成可见的战绩。",
		MinUnlocks:      2,
		NextUnlocksGoal: 4,
	},
	{
		Title:           "驯灵师",
		Flavor:          "你已经能稳定驱动整座工坊，新的成就会更偏向长期经营。",
		MinUnlocks:      4,
		NextUnlocksGoal: 6,
	},
	{
		Title:           "星辉馆长",
		Flavor:          "图鉴逐渐完整，荣誉榜上的名字开始有了存在感。",
		MinUnlocks:      6,
		NextUnlocksGoal: len(achievementCatalog),
	},
}
