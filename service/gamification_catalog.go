package service

type achievementDefinition struct {
	Key               string
	Name              string
	Description       string
	Hint              string
	Icon              string
	Tier              string
	RewardUSD         float64
	RewardTitle       string
	RewardDescription string
}

type missionDefinition struct {
	Key          string
	Name         string
	Description  string
	Icon         string
	RewardUSD    float64
	PetExpReward int64
	Target       int64
}

type companionStage struct {
	Name            string
	Title           string
	Flavor          string
	MinUnlocks      int
	NextUnlocksGoal int
}

var achievementCatalog = []achievementDefinition{
	{
		Key:               "first-call",
		Name:              "火花犬",
		Description:       "完成首次成功调用，点亮你的第一只代码伙伴",
		Hint:              "任意模型成功调用一次即可解锁",
		Icon:              "sparkles",
		Tier:              "common",
		RewardUSD:         0.5,
		RewardTitle:       "新手火花补给",
		RewardDescription: "奖励 0.5 美元额度，作为第一只伙伴的见面礼",
	},
	{
		Key:               "ten-calls",
		Name:              "字节獭",
		Description:       "累计完成 10 次调用，解锁抱着键帽打滚的字节獭",
		Hint:              "今天多跑几次调用，很快就能把它带回工位",
		Icon:              "mouse-pointer-click",
		Tier:              "common",
		RewardUSD:         0.8,
		RewardTitle:       "十连调度补签",
		RewardDescription: "奖励 0.8 美元额度，适合继续熟悉调用节奏",
	},
	{
		Key:               "hundred-calls",
		Name:              "回声猫",
		Description:       "累计完成 100 次调用，解锁稳定输出的回声猫",
		Hint:              "多用几次 Playground 或接入你自己的项目",
		Icon:              "orbit",
		Tier:              "rare",
		RewardUSD:         1.2,
		RewardTitle:       "百次调度礼盒",
		RewardDescription: "奖励 1.2 美元额度，鼓励继续高频调用",
	},
	{
		Key:               "thousand-calls",
		Name:              "夜巡枭",
		Description:       "累计完成 1000 次调用，解锁爱熬夜盯日志的夜巡枭",
		Hint:              "把 Code Go 接进真实工作流，累计调用量会自然增长",
		Icon:              "moon-star",
		Tier:              "epic",
		RewardUSD:         1.6,
		RewardTitle:       "千次巡航补给",
		RewardDescription: "奖励 1.6 美元额度，适合作为长期使用里的续航补贴",
	},
	{
		Key:               "quota-scout",
		Name:              "薄荷蜥",
		Description:       "累计消耗达到 50 美元额度，解锁会叼着代码便签跑来跑去的薄荷蜥",
		Hint:              "保持稳定使用，累计消耗到 50 美元额度即可解锁",
		Icon:              "leaf",
		Tier:              "common",
		RewardUSD:         0.9,
		RewardTitle:       "轻量消耗返还",
		RewardDescription: "奖励 0.9 美元额度，作为前期活跃的返场奖励",
	},
	{
		Key:               "quota-smith",
		Name:              "可可豚",
		Description:       "累计消耗达到 300 美元额度，解锁看起来笨笨却很能扛的可可豚",
		Hint:              "高频开发使用一段时间后会自动点亮",
		Icon:              "pickaxe",
		Tier:              "rare",
		RewardUSD:         1.4,
		RewardTitle:       "中程消耗回礼",
		RewardDescription: "奖励 1.4 美元额度，用于继续推进中高强度开发",
	},
	{
		Key:               "thousand-forge",
		Name:              "铸光虎机",
		Description:       "累计消耗达到 1000 美元额度，解锁重度开发伙伴",
		Hint:              "持续稳定使用后会自动解锁",
		Icon:              "anvil",
		Tier:              "epic",
		RewardUSD:         3.5,
		RewardTitle:       "千锻增幅器",
		RewardDescription: "奖励 3.5 美元额度，用于下一轮重载任务",
	},
	{
		Key:               "contract-power",
		Name:              "契约龟",
		Description:       "拥有任意套餐订阅记录，点亮持续作战的契约龟",
		Hint:              "购买一次套餐即可解锁",
		Icon:              "shield-check",
		Tier:              "rare",
		RewardUSD:         1.8,
		RewardTitle:       "订阅契约奖励",
		RewardDescription: "奖励 1.8 美元额度，并标记为付费玩家伙伴",
	},
	{
		Key:               "plan-collector",
		Name:              "缎带狐",
		Description:       "拥有 3 条及以上套餐记录，解锁爱囤福利的缎带狐",
		Hint:              "多次订阅月卡或日卡后即可点亮",
		Icon:              "crown",
		Tier:              "epic",
		RewardUSD:         2.4,
		RewardTitle:       "套餐收藏奖励",
		RewardDescription: "奖励 2.4 美元额度，适合持续使用中的补充加成",
	},
	{
		Key:               "blind-box-rookie",
		Name:              "软糖鲨",
		Description:       "首次开启盲盒后解锁，属于最先闻到活动味道的小鲨鱼",
		Hint:              "打开一次盲盒即可点亮",
		Icon:              "gift",
		Tier:              "common",
		RewardUSD:         0.7,
		RewardTitle:       "初开盲盒返礼",
		RewardDescription: "奖励 0.7 美元额度，给第一次参与活动的用户一点甜头",
	},
	{
		Key:               "blind-box-regular",
		Name:              "棱团怪",
		Description:       "累计开启 10 次盲盒，解锁总在盒子边打滚的棱团怪",
		Hint:              "持续参与盲盒活动并累计开启 10 次",
		Icon:              "dice-5",
		Tier:              "rare",
		RewardUSD:         1.1,
		RewardTitle:       "十开回馈包",
		RewardDescription: "奖励 1.1 美元额度，鼓励继续体验盲盒活动",
	},
	{
		Key:               "lucky-star",
		Name:              "流星啾",
		Description:       "盲盒开出单次 30 美元及以上大奖，解锁高光伙伴",
		Hint:              "在盲盒中开出一次大奖即可解锁",
		Icon:              "star",
		Tier:              "legendary",
		RewardUSD:         5,
		RewardTitle:       "幸运星返场礼",
		RewardDescription: "额外奖励 5 美元额度，放大奖励感",
	},
	{
		Key:               "social-crafter",
		Name:              "联机鹦",
		Description:       "成功邀请 3 位伙伴，解锁社交型精灵",
		Hint:              "把邀请码分享出去，并完成至少 3 次成功邀请",
		Icon:              "users",
		Tier:              "rare",
		RewardUSD:         2.2,
		RewardTitle:       "组队扩列奖励",
		RewardDescription: "奖励 2.2 美元额度，鼓励继续邀请",
	},
	{
		Key:               "community-core",
		Name:              "彩纸豚",
		Description:       "成功邀请 10 位伙伴，解锁最爱热闹和庆祝的彩纸豚",
		Hint:              "把邀请码分享给更多伙伴并完成 10 次成功邀请",
		Icon:              "party-popper",
		Tier:              "epic",
		RewardUSD:         3.2,
		RewardTitle:       "社群扩编礼包",
		RewardDescription: "奖励 3.2 美元额度，作为高质量分享传播的回礼",
	},
	{
		Key:               "seven-day-streak",
		Name:              "云团兔",
		Description:       "单日完成 30 次调用后解锁，属于把高频使用变成增长冲刺的轻快伙伴",
		Hint:              "在一天内集中完成 30 次成功调用，就能把它带回工位",
		Icon:              "cloud",
		Tier:              "common",
		RewardUSD:         2.8,
		RewardTitle:       "冲刺活跃补给",
		RewardDescription: "奖励 2.8 美元额度，鼓励把首次高频使用跑起来",
	},
	{
		Key:               "month-streak",
		Name:              "像素龙",
		Description:       "累计消耗达到 2000 美元额度后解锁，是整套图鉴里最强的消费终阶主宠之一",
		Hint:              "把 Code Go 接进真实工作流，累计消耗到 2000 美元额度即可点亮最终守护者",
		Icon:              "flame",
		Tier:              "legendary",
		RewardUSD:         6.6,
		RewardTitle:       "消费终阶奖励",
		RewardDescription: "奖励 6.6 美元额度，作为高强度使用与持续消费的终阶回报",
	},
}

var missionCatalog = []missionDefinition{
	{
		Key:          "daily-share-link",
		Name:         "今日分享邀请链接",
		Description:  "复制一次邀请链接，让更多伙伴看到你的工坊",
		Icon:         "users",
		RewardUSD:    0.05,
		PetExpReward: 6,
		Target:       1,
	},
	{
		Key:          "daily-calls",
		Name:         "今日调用 10 次",
		Description:  "任意成功调用累计达到 10 次",
		Icon:         "zap",
		RewardUSD:    0.15,
		PetExpReward: 12,
		Target:       10,
	},
	{
		Key:          "daily-blind-box",
		Name:         "今日开启盲盒 1 次",
		Description:  "今天开启一次盲盒，补充临时额度或抽中套餐大奖",
		Icon:         "gift",
		RewardUSD:    0.20,
		PetExpReward: 10,
		Target:       1,
	},
}

var companionStages = []companionStage{
	{
		Name:            "火花犬",
		Title:           "像素训导员",
		Flavor:          "第一批伙伴开始围在控制台边上，等着你继续发出新的调用指令。",
		MinUnlocks:      0,
		NextUnlocksGoal: 3,
	},
	{
		Name:            "回声猫",
		Title:           "代码饲育师",
		Flavor:          "你已经不只是在调用模型，而是在持续养成自己的伙伴编队。",
		MinUnlocks:      3,
		NextUnlocksGoal: 6,
	},
	{
		Name:            "契约龟",
		Title:           "宠物工位长",
		Flavor:          "伙伴们开始承担不同职责，订阅、盲盒、分享和消费都能转化成图鉴进度。",
		MinUnlocks:      6,
		NextUnlocksGoal: 10,
	},
	{
		Name:            "联机鹦",
		Title:           "图鉴编队长",
		Flavor:          "你的宠物编队已经成形，开始覆盖活跃、订阅、盲盒与社交四条成长线。",
		MinUnlocks:      10,
		NextUnlocksGoal: 14,
	},
	{
		Name:            "像素龙",
		Title:           "图鉴总训练师",
		Flavor:          "16 只伙伴几乎已经全部归队，剩下的是最难也最有纪念感的终阶解锁。",
		MinUnlocks:      14,
		NextUnlocksGoal: len(achievementCatalog),
	},
}
