import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Crown,
  Sparkles,
  Ticket,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSelfSubscriptionFull } from '@/features/subscriptions/api'
import {
  EMPTY_SUBSCRIPTIONS,
  formatSubscriptionQuotaAmount,
  getOrderedSubscriptions,
  getSubscriptionPlanSubtitle,
} from '@/features/subscriptions/lib'
import { getGamificationDashboard } from '@/features/gamification/api'

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '--'
  return new Date(timestamp * 1000).toLocaleString()
}

export function SubscriptionSummaryPanel() {
  const subscriptionsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscription-summary'],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      return result.success
        ? (result.data ?? EMPTY_SUBSCRIPTIONS)
        : EMPTY_SUBSCRIPTIONS
    },
    staleTime: 60 * 1000,
  })

  const orderedSubscriptions = useMemo(() => {
    const data = subscriptionsQuery.data
    const subscriptions = data?.subscriptions ?? []
    const fallbackIds = subscriptions.map((item) => item.subscription.id)
    const orderIds = data?.subscription_order_ids?.length
      ? data.subscription_order_ids
      : fallbackIds
    return getOrderedSubscriptions(subscriptions, orderIds)
  }, [subscriptionsQuery.data])

  const topSubscription = orderedSubscriptions[0]?.subscription

  return (
    <section className='app-page-shell p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
            <Crown className='text-primary size-4' />
            套餐摘要
          </div>
          <div className='text-muted-foreground mt-1 text-xs leading-5'>
            首页面只保留当前主套餐状态，完整排序和扣费管理移到独立管理区。
          </div>
        </div>
        <div className='border-border bg-background/80 text-foreground rounded-full border px-2.5 py-1 text-[11px] font-medium'>
          {orderedSubscriptions.length} 份生效
        </div>
      </div>

      {topSubscription ? (
        <div className='mt-4 space-y-2'>
          <div className='app-subtle-panel p-3'>
            <div className='text-foreground text-sm font-semibold'>
              {`套餐 #${topSubscription.id}`}
            </div>
            <div className='text-muted-foreground mt-1 text-xs'>
              {getSubscriptionPlanSubtitle({
                title: '',
                subtitle: '',
                duration_unit: 'month',
                duration_value: 1,
              })}
            </div>
            <div className='mt-3 grid gap-2 sm:grid-cols-2'>
              <div className='border-border/70 bg-background/72 rounded-xl border px-3 py-2'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  总额度剩余
                </div>
                <div className='text-foreground mt-1 text-sm font-semibold'>
                  {formatSubscriptionQuotaAmount(
                    Number(topSubscription.amount_total || 0) -
                      Number(topSubscription.amount_used || 0)
                  )}
                </div>
              </div>
              <div className='border-border/70 bg-background/72 rounded-xl border px-3 py-2'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  到期时间
                </div>
                <div className='text-foreground mt-1 text-sm font-semibold'>
                  {formatDateTime(topSubscription.end_time)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='text-muted-foreground border-border mt-4 rounded-2xl border border-dashed px-4 py-6 text-sm'>
          当前没有生效套餐。
        </div>
      )}

      <Button
        variant='outline'
        className='mt-4 w-full justify-between'
        render={<Link to='/wallet' />}
      >
        <span>进入套餐与扣费管理</span>
        <ArrowRight data-icon='inline-end' />
      </Button>
    </section>
  )
}

export function CompanionSummaryPanel() {
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard', 'overview-summary'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })

  const companion = dashboardQuery.data?.data?.companion
  const dailyMissions = dashboardQuery.data?.data?.daily_missions ?? []
  const completedMissions = dailyMissions.filter(
    (mission) => mission.claimed
  ).length

  return (
    <section className='app-page-shell p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
            <Sparkles className='text-primary size-4' />
            工坊摘要
          </div>
          <div className='text-muted-foreground mt-1 text-xs leading-5'>
            精灵图鉴和每日任务保留摘要，详情进入专门的成就页处理。
          </div>
        </div>
        <div className='border-border bg-background/80 text-foreground rounded-full border px-2.5 py-1 text-[11px] font-medium'>
          {completedMissions}/{dailyMissions.length} 已完成
        </div>
      </div>

      <div className='mt-4 grid gap-2 sm:grid-cols-2'>
        <div className='app-subtle-panel px-3 py-3'>
          <div className='text-muted-foreground flex items-center gap-2 text-[11px] font-medium'>
            <Ticket className='size-3.5' />
            当前伙伴
          </div>
          <div className='text-foreground mt-1 text-sm font-semibold'>
            {companion?.name || '未装备'}
          </div>
          <div className='text-muted-foreground mt-1 text-xs'>
            {companion?.active_buff
              ? `${companion.active_buff.name} ${companion.active_buff.value_text}`
              : '当前没有增益'}
          </div>
        </div>

        <div className='app-subtle-panel px-3 py-3'>
          <div className='text-muted-foreground flex items-center gap-2 text-[11px] font-medium'>
            <Trophy className='size-3.5' />
            今日任务
          </div>
          <div className='text-foreground mt-1 text-sm font-semibold'>
            {dailyMissions.length > 0 ? `${completedMissions}/${dailyMissions.length}` : '--'}
          </div>
          <div className='text-muted-foreground mt-1 text-xs'>
            首页不再展开任务列表，避免稀释主工作流。
          </div>
        </div>
      </div>

      <Button
        variant='outline'
        className='mt-4 w-full justify-between'
        render={<Link to='/dashboard/$section' params={{ section: 'achievements' }} />}
      >
        <span>进入成就页</span>
        <ArrowRight data-icon='inline-end' />
      </Button>
    </section>
  )
}
