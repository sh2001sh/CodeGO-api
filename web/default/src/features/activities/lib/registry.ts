import {
  RefreshCcw,
  Sparkles,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react'

export type ActivitySlug =
  | 'invite-rewards'
  | 'point-mall'
  | 'claude-convert'

export type ActivityHandling = 'redirect' | 'inline'

export type ActivityDefinition = {
  slug: ActivitySlug
  name: string
  /** Short tag rendered in the corner badge. */
  badge: string
  /** One-line value proposition shown on the hub card. */
  tagline: string
  /** Full paragraph used on the detail hero. */
  intro: string
  icon: LucideIcon
  /** Whether the core action is handled here or on a dedicated page. */
  handling: ActivityHandling
  /** Label for the primary call-to-action button. */
  primaryActionLabel: string
  /** Surface gradient for the hub card + detail hero (light + dark). */
  posterTone: string
  /** Accent ring used on the icon chip. */
  accentChip: string
}

const POSTER_INVITE =
  'bg-[radial-gradient(circle_at_top_left,rgba(62,118,210,0.2),transparent_55%),linear-gradient(135deg,rgba(237,244,255,0.92),rgba(255,253,249,0.94))] dark:bg-[radial-gradient(circle_at_top_left,rgba(119,174,249,0.24),transparent_52%),linear-gradient(135deg,rgba(22,31,45,0.98),rgba(17,21,28,0.95))]'

const POSTER_POINT_MALL =
  'bg-[radial-gradient(circle_at_top_left,rgba(216,146,40,0.2),transparent_55%),linear-gradient(135deg,rgba(255,252,244,0.96),rgba(255,253,249,0.94))] dark:bg-[radial-gradient(circle_at_top_left,rgba(240,181,82,0.24),transparent_52%),linear-gradient(135deg,rgba(34,29,20,0.95),rgba(17,21,28,0.96))]'

const POSTER_CLAUDE =
  'bg-[radial-gradient(circle_at_top_left,rgba(67,181,141,0.2),transparent_55%),linear-gradient(135deg,rgba(240,255,249,0.96),rgba(255,253,249,0.94))] dark:bg-[radial-gradient(circle_at_top_left,rgba(82,196,154,0.22),transparent_52%),linear-gradient(135deg,rgba(19,33,30,0.95),rgba(17,21,28,0.96))]'

export const ACTIVITY_LIST: ActivityDefinition[] = [
  {
    slug: 'invite-rewards',
    name: '邀请与刷新',
    badge: '邀请',
    tagline: '邀请好友加入并首购套餐，即可获得刷新主订阅额度的机会。',
    intro:
      '邀请好友加入并完成首次套餐购买，即可获得一次订阅刷新机会。刷新会重置当前主力订阅的已用额度，每月可用次数有限。邀请链接可在本页直接复制。',
    icon: RefreshCcw,
    handling: 'inline',
    primaryActionLabel: '立即邀请好友',
    posterTone: POSTER_INVITE,
    accentChip: 'bg-[#3e76d2]/14 text-[#3e76d2] dark:text-[#77aef9]',
  },
  {
    slug: 'point-mall',
    name: '积分商城',
    badge: '积分',
    tagline: '将赠送额度兑换为积分，获取卡密、兑换券与套餐权益。',
    intro:
      '将赠送额度或特定资产按比例兑换为积分，并用积分兑换卡密、兑换券与专享套餐权益。每月转换额度有上限，兑换在积分商城完成。',
    icon: ShoppingBag,
    handling: 'redirect',
    primaryActionLabel: '进入积分商城',
    posterTone: POSTER_POINT_MALL,
    accentChip: 'bg-[#d89228]/16 text-[#b5781f] dark:text-[#f0b552]',
  },
  {
    slug: 'claude-convert',
    name: 'Claude 专属转换',
    badge: '转换',
    tagline: '将闲置订阅额度按比例转换为 Claude 专属永久额度。',
    intro:
      '将闲置的普通订阅额度按固定比例转换为 Claude 模型专属额度。适合主力套餐额度充足、又主要使用 Claude 模型的场景，转换在钱包页完成。',
    icon: Sparkles,
    handling: 'redirect',
    primaryActionLabel: '去转换额度',
    posterTone: POSTER_CLAUDE,
    accentChip: 'bg-[#43b58d]/16 text-[#2f8f6c] dark:text-[#52c49a]',
  },
]

export const ACTIVITY_MAP: Record<ActivitySlug, ActivityDefinition> =
  ACTIVITY_LIST.reduce(
    (acc, item) => {
      acc[item.slug] = item
      return acc
    },
    {} as Record<ActivitySlug, ActivityDefinition>
  )
