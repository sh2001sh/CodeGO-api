import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Crown,
  Egg,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavigationCardPath = '/blind-box' | '/packages' | '/wallet'

interface NavigationCardItem {
  id: string
  eyebrow: string
  title: string
  description: string
  note: string
  ctaLabel: string
  to: NavigationCardPath
  walletType?: 'claude'
  icon: LucideIcon
  theme: {
    frame: string
    eyebrow: string
    title: string
    body: string
    note: string
    button: string
    iconTile: string
  }
}

const NAVIGATION_ITEMS: NavigationCardItem[] = [
  {
    id: 'blind-box',
    eyebrow: '盲盒活动',
    title: '去开盲盒，直接处理额度和开奖',
    description:
      '盲盒页集中展示购买数量、奖池、保底进度和最近掉落，适合快速补短期额度。',
    note: '盲盒额度会优先于套餐和钱包余额消耗。',
    ctaLabel: '进入盲盒活动',
    to: '/blind-box',
    icon: Egg,
    theme: {
      frame:
        'border-amber-200 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.2),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.16),transparent_24%),linear-gradient(145deg,rgba(255,251,235,0.98),rgba(255,247,237,0.98),rgba(255,255,255,0.98))] dark:border-amber-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_24%),linear-gradient(145deg,rgba(41,24,8,0.94),rgba(15,23,42,0.95),rgba(17,24,39,0.94))]',
      eyebrow: 'text-amber-700 dark:text-amber-200',
      title: 'text-slate-950 dark:text-white',
      body: 'text-slate-700 dark:text-slate-200',
      note: 'border-amber-200/80 bg-white/72 text-amber-800 dark:border-amber-500/20 dark:bg-slate-950/45 dark:text-amber-100',
      button:
        'bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-500 dark:text-white dark:hover:bg-amber-400',
      iconTile: 'bg-amber-500 text-white',
    },
  },
  {
    id: 'packages',
    eyebrow: '套餐购买',
    title: '去选月卡和日卡，适合稳定主力调用',
    description:
      '套餐页单独展示可购买套餐和已购套餐进度，适合长期高频使用的常规模型消费。',
    note: '套餐额度不能用于 Claude 模型，请单独走 Claude 额度充值。',
    ctaLabel: '进入套餐购买',
    to: '/packages',
    icon: Crown,
    theme: {
      frame:
        'border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_24%),linear-gradient(145deg,rgba(239,248,255,0.98),rgba(248,250,252,0.98),rgba(255,255,255,0.98))] dark:border-sky-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_24%),linear-gradient(145deg,rgba(8,47,73,0.78),rgba(15,23,42,0.95),rgba(17,24,39,0.94))]',
      eyebrow: 'text-sky-700 dark:text-sky-200',
      title: 'text-slate-950 dark:text-white',
      body: 'text-slate-700 dark:text-slate-200',
      note: 'border-sky-200/80 bg-white/72 text-sky-800 dark:border-sky-500/20 dark:bg-slate-950/45 dark:text-sky-100',
      button:
        'bg-sky-600 text-white hover:bg-sky-500 dark:bg-sky-500 dark:text-white dark:hover:bg-sky-400',
      iconTile: 'bg-sky-500 text-white',
    },
  },
  {
    id: 'claude-wallet',
    eyebrow: 'Claude 额度充值',
    title: '直达 Claude 专用余额池',
    description:
      '进入钱包后默认切到 Claude 额度模式，适合需要单独给 Claude 模型充值和管理余额的场景。',
    note: 'Claude 额度仅用于 Claude 模型，按 1:1 充值，不走普通余额折扣。',
    ctaLabel: '进入 Claude 充值',
    to: '/wallet',
    walletType: 'claude',
    icon: Sparkles,
    theme: {
      frame:
        'border-rose-200 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.14),transparent_24%),linear-gradient(145deg,rgba(255,241,242,0.98),rgba(255,247,237,0.98),rgba(255,255,255,0.98))] dark:border-rose-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.14),transparent_24%),linear-gradient(145deg,rgba(76,5,25,0.78),rgba(15,23,42,0.95),rgba(17,24,39,0.94))]',
      eyebrow: 'text-rose-700 dark:text-rose-200',
      title: 'text-slate-950 dark:text-white',
      body: 'text-slate-700 dark:text-slate-200',
      note: 'border-rose-200/80 bg-white/72 text-rose-800 dark:border-rose-500/20 dark:bg-slate-950/45 dark:text-rose-100',
      button:
        'bg-rose-600 text-white hover:bg-rose-500 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400',
      iconTile: 'bg-rose-500 text-white',
    },
  },
]

function NavigationCard(props: { item: NavigationCardItem }) {
  const Icon = props.item.icon

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-[28px] border p-5 shadow-[0_24px_72px_rgba(15,23,42,0.08)]',
        props.item.theme.frame
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div
            className={cn(
              'text-[11px] font-semibold uppercase tracking-[0.24em]',
              props.item.theme.eyebrow
            )}
          >
            {props.item.eyebrow}
          </div>
          <h3
            className={cn(
              'mt-3 text-xl font-semibold tracking-tight',
              props.item.theme.title
            )}
          >
            {props.item.title}
          </h3>
        </div>
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm',
            props.item.theme.iconTile
          )}
        >
          <Icon className='size-5' aria-hidden='true' />
        </div>
      </div>

      <p className={cn('mt-3 text-sm leading-7', props.item.theme.body)}>
        {props.item.description}
      </p>

      <div
        className={cn(
          'mt-4 rounded-2xl border px-3 py-3 text-sm leading-6',
          props.item.theme.note
        )}
      >
        {props.item.note}
      </div>

      <Button
        size='lg'
        className={cn(
          'mt-5 h-12 justify-between rounded-full px-5 shadow-[0_18px_38px_rgba(15,23,42,0.18)]',
          props.item.theme.button
        )}
        render={
          <Link
            to={props.item.to}
            search={
              props.item.walletType
                ? { wallet_type: props.item.walletType }
                : undefined
            }
          />
        }
      >
        <span>{props.item.ctaLabel}</span>
        <ArrowRight data-icon='inline-end' />
      </Button>
    </div>
  )
}

export function PrimaryActionCard() {
  return (
    <section className='grid gap-4 xl:grid-cols-3'>
      {NAVIGATION_ITEMS.map((item) => (
        <NavigationCard key={item.id} item={item} />
      ))}
    </section>
  )
}
