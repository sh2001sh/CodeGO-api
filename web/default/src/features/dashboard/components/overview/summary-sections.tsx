import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Gift, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatSubscriptionQuotaAmount } from '@/features/subscriptions/lib'
import type { SubscriptionResetOpportunitySummary } from '@/features/subscriptions/types'
import { DataMetric } from './summary-card-parts'

export type MetricDef = {
  label: string
  value: string
  hint?: string
}

export function BalanceWorkspace(props: {
  available: string
  walletQuota: string
  claudeQuota: string
  blindBoxQuota?: string
  metrics: MetricDef[]
}) {
  return (
    <section className='overview-glass-card p-5 xl:p-6'>
      <div className='grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-stretch'>
        <div className='flex flex-col'>
          <div className='flex items-center gap-2'>
            <WalletCards className='text-primary size-4' />
            <span className='text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase'>
              账户余额
            </span>
            <span className='border-primary/30 bg-primary/10 text-primary ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-medium'>
              USD
            </span>
          </div>

          <div className='text-foreground mt-3 text-5xl font-semibold tracking-tight xl:text-6xl'>
            {props.available}
          </div>

          <div className='mt-4 flex flex-wrap gap-2 text-xs'>
            <span className='border-border/70 bg-background/72 text-muted-foreground rounded-full border px-2.5 py-1'>
              钱包 {props.walletQuota}
            </span>
            <span className='border-accent/60 bg-accent text-accent-foreground rounded-full border px-2.5 py-1'>
              Claude {props.claudeQuota}
            </span>
            {props.blindBoxQuota ? (
              <span className='border-border/70 bg-background/72 text-muted-foreground rounded-full border px-2.5 py-1'>
                盲盒 {props.blindBoxQuota}
              </span>
            ) : null}
          </div>

          <div className='mt-5 grid gap-2.5 sm:grid-cols-3'>
            <Button
              variant='outline'
              className='justify-between rounded-2xl'
              render={<Link to='/wallet' />}
            >
              <span>钱包</span>
              <ArrowRight data-icon='inline-end' />
            </Button>
            <Button
              variant='outline'
              className='justify-between rounded-2xl'
              render={<Link to='/packages' />}
            >
              <span>套餐</span>
              <ArrowRight data-icon='inline-end' />
            </Button>
            <Button
              className='justify-between rounded-2xl'
              render={<Link to='/blind-box' />}
            >
              <span>盲盒</span>
              <ArrowRight data-icon='inline-end' />
            </Button>
          </div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
          {props.metrics.map((metric) => (
            <DataMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function PackageStatusCard(props: {
  hasSubscription: boolean
  title: string
  subtitle: string
  remainingDays: number
  totalUsed: number
  totalAmount: number
  totalHint: string
  periodUsed?: number
  periodAmount?: number
  periodHint?: string
  children?: ReactNode
}) {
  const totalPercent =
    props.totalAmount > 0
      ? Math.min(100, Math.round((props.totalUsed / props.totalAmount) * 100))
      : 0
  const periodPercent =
    props.periodAmount && props.periodAmount > 0
      ? Math.min(
          100,
          Math.round(((props.periodUsed ?? 0) / props.periodAmount) * 100)
        )
      : 0

  return (
    <section className='overview-glass-card flex h-full flex-col gap-4 p-4 sm:p-5'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase'>
            套餐状态
          </div>
          <div className='text-foreground mt-1 text-lg font-semibold tracking-tight'>
            {props.title}
          </div>
          <div className='text-muted-foreground mt-1 text-sm leading-6'>
            {props.subtitle}
          </div>
        </div>
        <div className='border-border/70 bg-background/80 text-foreground rounded-full border px-2.5 py-1 text-xs font-medium'>
          {props.hasSubscription ? `剩余 ${props.remainingDays} 天` : '未订阅'}
        </div>
      </div>

      {props.hasSubscription ? (
        <div className='grid gap-3'>
          <div className='overview-soft-card p-3'>
            <div className='flex items-center justify-between gap-3 text-sm'>
              <div className='text-foreground font-medium'>总额度进度</div>
              <div className='text-muted-foreground text-xs'>
                {formatSubscriptionQuotaAmount(
                  Math.max(0, props.totalAmount - props.totalUsed)
                )}{' '}
                / {formatSubscriptionQuotaAmount(props.totalAmount)}
              </div>
            </div>
            <div className='mt-3'>
              <Progress value={totalPercent} />
            </div>
            <div className='text-muted-foreground mt-2 text-xs'>
              {props.totalHint}
            </div>
          </div>

          {props.periodAmount != null && props.periodAmount > 0 ? (
            <div className='overview-soft-card p-3'>
              <div className='flex items-center justify-between gap-3 text-sm'>
                <div className='text-foreground font-medium'>周期额度</div>
                <div className='text-muted-foreground text-xs'>
                  {formatSubscriptionQuotaAmount(
                    Math.max(0, props.periodAmount - (props.periodUsed ?? 0))
                  )}{' '}
                  / {formatSubscriptionQuotaAmount(props.periodAmount)}
                </div>
              </div>
              <div className='mt-3'>
                <Progress value={periodPercent} />
              </div>
              {props.periodHint ? (
                <div className='text-muted-foreground mt-2 text-xs'>
                  {props.periodHint}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className='grid gap-2 sm:grid-cols-2'>
            {props.children}
          </div>
        </div>
      ) : (
        <div className='border-border text-muted-foreground rounded-[22px] border border-dashed bg-background/65 px-4 py-6 text-sm'>
          当前没有生效套餐。购买后这里会展示额度使用进度。
        </div>
      )}

      <Button
        className='mt-auto justify-between rounded-2xl'
        render={<Link to='/wallet' />}
      >
        <span>进入套餐与扣费管理</span>
        <ArrowRight data-icon='inline-end' />
      </Button>
    </section>
  )
}

export function StatusInfoCard(props: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className='overview-soft-card px-3 py-3'>
      <div className='text-muted-foreground text-[11px] font-medium tracking-[0.14em] uppercase'>
        {props.label}
      </div>
      <div className='text-foreground mt-1 text-lg font-semibold'>
        {props.value}
      </div>
      <div className='text-muted-foreground mt-1 text-xs leading-5'>
        {props.hint}
      </div>
    </div>
  )
}

export function ActivityOverviewPanel(props: {
  availableBoxes: number
  affCount: string
  resetOpportunity: SubscriptionResetOpportunitySummary
  missionProgress?: string
  companionName?: string
}) {
  const highlights = [
    { label: '待处理盲盒', value: `${props.availableBoxes} 个` },
    { label: '已邀请人数', value: props.affCount },
    { label: '可用刷新', value: `${props.resetOpportunity.available_count} 次` },
    {
      label: '每日任务',
      value:
        props.missionProgress && props.companionName
          ? `${props.companionName} · ${props.missionProgress}`
          : props.companionName || props.missionProgress || '暂无进行中任务',
    },
  ]

  return (
    <section className='overview-glass-card p-5 xl:p-6'>
      <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] xl:items-center'>
        <div className='min-w-0'>
          <div className='text-foreground flex items-center gap-2 text-base font-semibold'>
            <Gift className='text-primary size-4' />
            活动与成长
          </div>
          <p className='text-muted-foreground mt-1 max-w-xl text-sm leading-6'>
            盲盒、邀请、积分与每日任务的进度概览，点击进入活动中心查看详情。
          </p>

          <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {highlights.map((item) => (
              <div key={item.label} className='overview-soft-card px-3 py-3'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  {item.label}
                </div>
                <div className='text-foreground mt-1 text-base font-semibold'>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button
          className='h-full min-h-28 w-full justify-between rounded-2xl'
          render={<Link to='/activities' />}
        >
          <span>进入活动中心</span>
          <ArrowRight data-icon='inline-end' />
        </Button>
      </div>
    </section>
  )
}
