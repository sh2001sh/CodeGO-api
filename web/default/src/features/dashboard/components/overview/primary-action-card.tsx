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
      '购买盲盒抽取随机额度，连续未开出高额时累积保底，适合快速补充短期额度。',
    note: '盲盒额度会优先于套餐和钱包余额消耗。',
    ctaLabel: '进入盲盒活动',
    to: '/blind-box',
    icon: Egg,
    theme: {
      frame:
        'border-border/70 bg-background/76',
      eyebrow: 'text-muted-foreground',
      title: 'text-foreground',
      body: 'text-muted-foreground',
      note: 'border-border/70 bg-background/72 text-muted-foreground',
      button:
        'bg-primary text-primary-foreground hover:bg-primary/90',
      iconTile: 'bg-primary/12 text-primary',
    },
  },
  {
    id: 'packages',
    eyebrow: '套餐购买',
    title: '去选月卡和日卡，适合稳定主力调用',
    description:
      '购买月卡或日卡获得稳定额度，适合长期高频调用常规模型的日常消费。',
    note: '套餐额度不能用于 Claude 模型，请单独走 Claude 额度充值。',
    ctaLabel: '进入套餐购买',
    to: '/packages',
    icon: Crown,
    theme: {
      frame:
        'border-border/70 bg-accent/16 dark:bg-accent/10',
      eyebrow: 'text-muted-foreground',
      title: 'text-foreground',
      body: 'text-muted-foreground',
      note: 'border-border/70 bg-background/72 text-muted-foreground',
      button:
        'bg-primary text-primary-foreground hover:bg-primary/90',
      iconTile: 'bg-accent text-accent-foreground',
    },
  },
  {
    id: 'claude-wallet',
    eyebrow: 'Claude 额度充值',
    title: '直达 Claude 专用余额池',
    description:
      '为 Claude 模型单独充值和管理专用余额，进入钱包后默认切到 Claude 额度模式。',
    note: 'Claude 额度仅用于 Claude 模型，按 1:1 充值，不走普通余额折扣。',
    ctaLabel: '进入 Claude 充值',
    to: '/wallet',
    walletType: 'claude',
    icon: Sparkles,
    theme: {
      frame:
        'border-border/70 bg-muted/34',
      eyebrow: 'text-muted-foreground',
      title: 'text-foreground',
      body: 'text-muted-foreground',
      note: 'border-border/70 bg-background/72 text-muted-foreground',
      button:
        'bg-primary text-primary-foreground hover:bg-primary/90',
      iconTile: 'bg-primary/12 text-primary',
    },
  },
]

function NavigationCard(props: { item: NavigationCardItem }) {
  const Icon = props.item.icon

  return (
    <div
      className={cn(
        'app-subtle-panel flex h-full flex-col p-4',
        props.item.theme.frame
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div
            className={cn(
              'text-[11px] font-medium',
              props.item.theme.eyebrow
            )}
          >
            {props.item.eyebrow}
          </div>
          <h3
            className={cn(
              'mt-2 text-lg font-semibold tracking-tight',
              props.item.theme.title
            )}
          >
            {props.item.title}
          </h3>
        </div>
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-2xl',
            props.item.theme.iconTile
          )}
        >
          <Icon className='size-5' aria-hidden='true' />
        </div>
      </div>

      <p className={cn('mt-2.5 text-sm leading-6', props.item.theme.body)}>
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
          'mt-4 h-11 justify-between rounded-full px-5',
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
    <section className='app-page-shell p-4 sm:p-5'>
      <div className='app-section-kicker'>常用入口</div>
      <div className='mt-2 flex items-center justify-between gap-3'>
        <div>
          <div className='text-foreground text-lg font-semibold tracking-tight'>
            额度、套餐与 Claude 充值
          </div>
          <div className='text-muted-foreground mt-1 text-sm leading-6'>
            按使用场景选择补充额度的方式，进入对应页面完成购买与管理。
          </div>
        </div>
      </div>
      <div className='mt-4 grid gap-4 xl:grid-cols-3'>
        {NAVIGATION_ITEMS.map((item) => (
          <NavigationCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  )
}
