export type GuideImage = {
  src: string
  alt: string
  caption: string
}

export type GuideSection = {
  id: string
  eyebrow: string
  title: string
  summary: string
  steps?: string[]
  notes?: string[]
  diagram_title?: string
  diagram_steps?: string[]
  images: GuideImage[]
}

export const guideSections: GuideSection[] = [
  {
    id: 'support',
    eyebrow: '01',
    title: '售后 QQ 群',
    summary:
      '说明文档最前面先保留售后支持入口。遇到配置、套餐、盲盒、宠物升级或脚本使用问题时，可以直接扫码进群。',
    steps: [
      '优先使用手机 QQ 扫描下方二维码加入售后群。',
      '如果当前设备不方便扫码，也可以直接在 QQ 中搜索群号 996040309。',
      '进群后建议附上账号、页面位置和问题截图，方便快速定位。',
    ],
    images: [
      {
        src: '/guide/16-support-qq-group.png',
        alt: 'Code Go 售后 QQ 群二维码',
        caption: '售后 QQ 群号：996040309。扫码或手动搜索群号都可以进入。',
      },
    ],
    notes: [
      '群号：996040309',
      '建议把报错页面、控制台提示或具体操作步骤一并发群，沟通会更快。',
    ],
  },
  {
    id: 'home',
    eyebrow: '02',
    title: '主页与入口',
    summary:
      '主页已经改成宠物风格，首屏会集中展示 Code Go 的核心特点、套餐入口、宠物形象和玩法方向。',
    steps: [
      '先从首页了解站点定位、主要功能入口和套餐概览。',
      '首页会提前展示宠物体系、套餐信息和说明文档入口，便于新用户快速理解玩法。',
    ],
    images: [
      {
        src: '/guide/01-home.png',
        alt: 'Code Go 首页',
        caption: '首页首屏会先展示宠物风格视觉、核心特点与主要操作入口。',
      },
    ],
  },
  {
    id: 'register',
    eyebrow: '03',
    title: '注册账号',
    summary: '新用户先完成注册，再进入控制台配置自己的开发环境。',
    steps: [
      '打开注册页，填写用户名、邮箱和密码。',
      '提交后即可完成注册，并进入后续登录流程。',
    ],
    images: [
      {
        src: '/guide/02-sign-up.png',
        alt: '注册页面',
        caption: '注册页用于创建新的 Code Go 账号。',
      },
    ],
  },
  {
    id: 'signin',
    eyebrow: '04',
    title: '登录控制台',
    summary: '注册完成后使用账号密码登录，即可进入用户控制台。',
    steps: [
      '输入用户名或邮箱与密码。',
      '登录成功后会进入控制台概览页或系统指定页面。',
    ],
    images: [
      {
        src: '/guide/03-sign-in.png',
        alt: '登录页面',
        caption: '登录页支持使用账号密码进入站点。',
      },
    ],
  },
  {
    id: 'dashboard',
    eyebrow: '05',
    title: '控制台概览',
    summary:
      '概览页会展示当前资金状态、宠物入口、任务进度和常用功能，适合作为日常使用的起点。',
    steps: [
      '登录后先查看概览页，确认余额、套餐、盲盒和图鉴入口。',
      '左侧侧边栏已经将套餐购买和盲盒活动单独拆分出来，钱包只保留资金与扣费策略。',
    ],
    images: [
      {
        src: '/guide/04-dashboard-overview.png',
        alt: '控制台概览',
        caption: '控制台概览用于统一查看日常入口与当前状态。',
      },
    ],
  },
  {
    id: 'pets',
    eyebrow: '06',
    title: '宠物图鉴与增益',
    summary:
      '成就页里的每一只宠物都不再只是装饰。解锁后可以装备、升级，并把增益真实作用到任务、消费或盲盒链路。',
    steps: [
      '先在图鉴里查看已解锁和未解锁宠物，卡片会直接写清楚解锁方式。',
      '已解锁宠物可以选择出战，但同一时间只能装备一只。',
      '完成每日任务会给当前出战宠物发经验，满足条件后可以消耗额度手动升级。',
      '宠物满级为 5 级，升级成本前期较低，后期会逐步提高。',
    ],
    diagram_title: '玩法链路',
    diagram_steps: [
      '点亮图鉴',
      '选择一只出战',
      '每日任务拿经验',
      '消耗额度升级',
      '增益作用到实际功能',
    ],
    notes: [
      '当前出战宠物的增益会立即生效，切换宠物后会同步切换增益。',
      '图鉴卡片会同时展示宠物等级、经验、下次升级消耗，以及解锁后一级效果和满级效果。',
      '升级门槛与消耗按 1 到 5 级递增：40 / 130 / 310 / 630 经验，对应 0.5 / 1.2 / 3 / 6.5 美元额度。',
      '当前已经接入的宠物增益包含四类：每日任务额外奖励、开盒额外返还、盲盒保底推进、宠物升级折扣。',
    ],
    images: [
      {
        src: '/guide/14-pet-dex.png',
        alt: '宠物图鉴页面',
        caption: '宠物图鉴页会同时展示解锁状态、出战状态、等级进度和升级操作。',
      },
    ],
  },
  {
    id: 'keys',
    eyebrow: '07',
    title: '创建 API Key',
    summary: '进入 API 密钥页面，创建用于脚本和客户端接入的访问密钥。',
    steps: [
      '打开 API 密钥页面，点击创建。',
      '填写名称并选择分组后保存。',
      '创建成功后在列表中确认新密钥已经出现。',
    ],
    images: [
      {
        src: '/guide/05-create-key-drawer.png',
        alt: '创建 API Key 抽屉',
        caption: '通过抽屉表单创建新的 API Key。',
      },
      {
        src: '/guide/06-key-created.png',
        alt: 'API Key 创建成功',
        caption: '保存后可在列表中看到新创建的密钥。',
      },
    ],
  },
  {
    id: 'script',
    eyebrow: '08',
    title: '下载 Codex 配置脚本',
    summary:
      '在 API Key 列表的操作菜单中可以直接下载 Codex 配置脚本，用于快速完成本地 Codex 初始化。',
    steps: [
      '在目标 Key 的操作菜单中打开 Codex 配置脚本选项。',
      '按操作系统下载对应脚本。',
      'Windows 脚本双击运行后会自动配置好 Codex，并保留窗口显示成功提示，按任意键退出。',
      'Linux 脚本执行完成后会直接输出 Codex 配置成功提示。',
    ],
    images: [
      {
        src: '/guide/07-download-script-menu.png',
        alt: '下载脚本菜单',
        caption: '支持从 Key 列表直接下载 Codex 配置脚本。',
      },
    ],
    notes: [
      '脚本内容会基于当前 API Key 自动生成。',
      '下载后不需要再手动拼接 Codex 认证信息。',
    ],
  },
  {
    id: 'packages',
    eyebrow: '09',
    title: '套餐选择',
    summary:
      '套餐购买已经从钱包中拆分出来，页面会单独展示月卡、日卡和右侧状态面板。',
    steps: [
      '从左侧进入套餐购买页面。',
      '比较月卡和日卡的额度、周期和适用场景。',
      '按需选择目标套餐，进入购买前确认。',
    ],
    images: [
      {
        src: '/guide/08-packages-page.png',
        alt: '套餐购买页面',
        caption: '套餐页单独展示月卡与日卡，不再混入钱包。',
      },
      {
        src: '/guide/09-package-subscribe-dialog.png',
        alt: '套餐订阅弹窗',
        caption: '点击订阅后会先进入购买前确认弹窗。',
      },
    ],
    notes: [
      '选择前先确认周期、总额度和适用场景，再进入订阅确认弹窗。',
      '购买套餐本身也会推进成就解锁，部分宠物会因此进入图鉴。',
    ],
  },
  {
    id: 'blind-box',
    eyebrow: '10',
    title: '盲盒活动',
    summary:
      '盲盒页会单独展示活动规则、数量调节、保底说明和宠物对盲盒的影响。',
    steps: [
      '从左侧进入盲盒活动页面。',
      '查看奖励层级、保底说明和额度消耗顺序。',
      '自由调整购买数量，系统会实时联动应付金额。',
    ],
    diagram_title: '盲盒规则',
    diagram_steps: [
      '单个价格 2.5 元',
      '数量自由调整',
      '连续 5 次低于 5 美元触发保底',
      '下次必得 10 美元额度',
    ],
    images: [
      {
        src: '/guide/11-blind-box-page-enabled.png',
        alt: '盲盒活动页面',
        caption: '盲盒页集中展示规则、概率和活动状态。',
      },
      {
        src: '/guide/15-blind-box-pet-buff.png',
        alt: '盲盒宠物增益说明',
        caption: '盲盒页会说明当前宠物对保底机制的影响。',
      },
    ],
    notes: [
      '单个盲盒价格为 2.5 元，数量可以自由调整。',
      '如果连续 5 次都抽到低于 5 美元额度，则触发保底，下次必得 10 美元额度。',
      '若当前出战的是盲盒系或裂变系宠物，它会减少保底触发次数，或在每次开盒时额外返还额度。',
    ],
  },
  {
    id: 'wallet',
    eyebrow: '11',
    title: '钱包与扣费顺序',
    summary:
      '钱包页现在只负责余额、兑换码、账单和扣费优先顺序设置，右侧栏继续保留策略配置。',
    steps: [
      '进入钱包页查看余额和账单状态。',
      '在右侧栏设置订阅优先或余额兜底等扣费策略。',
      '通过兑换码入口补充额度或完成后续资金操作。',
    ],
    images: [
      {
        src: '/guide/13-wallet-page.png',
        alt: '钱包页面',
        caption: '钱包页保留资金与扣费策略管理，不再承载套餐与盲盒入口。',
      },
    ],
    notes: [
      '钱包页重点查看余额信息、兑换码入口和扣费优先顺序。',
      '设置完成后，系统会按保存后的扣费策略执行额度消耗。',
    ],
  },
]
