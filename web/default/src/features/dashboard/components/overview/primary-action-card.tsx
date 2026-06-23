import { Link } from '@tanstack/react-router'
import { ArrowRight, Crown, Egg, WalletCards, type LucideIcon } from 'lucide-react'
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
    id: 'wallet',
    eyebrow: '钱包',
    title: '查看余额与 Claude 额度',
    description:
      '进入钱包查看普通余额和 Claude 专用额度，适合先确认当前可用资产。',
    note: '普通余额和 Claude 额度是分开管理的，购买前先看清当前余额。',
    ctaLabel: '进入钱包',
    to: '/wallet',
    icon: WalletCards,
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
    id: 'packages',
    eyebrow: '套餐',
    title: '购买月卡和日卡',
    description:
      '进入套餐页选择适合的订阅方案，适合稳定的主力调用场景。',
    note: '套餐购买后会按当前规则进入对应账户，Claude 单独使用钱包额度。',
    ctaLabel: '进入套餐',
    to: '/packages',
    icon: Crown,
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
  {
    id: 'blind-box',
    eyebrow: '盲盒抽取',
    title: '抽盲盒拿额度和道具',
    description:
      '抽中普通额度会直接进入钱包，Claude 额度会直接进入 Claude 额度池，道具可在结果弹窗中启用。',
    note: '抽取后先看结果弹窗，再决定是否启用道具。',
    ctaLabel: '进入盲盒',
    to: '/blind-box',
    icon: Egg,
    theme: {
      frame: 'border-border/70 bg-muted/34',
      eyebrow: 'text-muted-foreground',
      title: 'text-foreground',
      body: 'text-muted-foreground',
      note: 'border-border/70 bg-background/72 text-muted-foreground',
      button: 'bg-primary text-primary-foreground hover:bg-primary/90',
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
