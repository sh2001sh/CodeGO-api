import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { formatNumber, formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
import { computeTimeRange } from '@/lib/time'
import { getUserQuotaDates } from '@/features/dashboard/api'
import type { QuotaDataItem } from '@/features/dashboard/types'
import { getGamificationDashboard } from '@/features/gamification/api'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
} from '@/features/subscriptions/api'
import {
  EMPTY_SUBSCRIPTIONS,
  getOrderedSubscriptions,
  getSubscriptionPlanSubtitle,
  isMonthlyCardPlan,
} from '@/features/subscriptions/lib'
import type { PlanRecord } from '@/features/subscriptions/types'
import { getBlindBoxSelf } from '@/features/wallet/api'
import { UsageChart } from './summary-card-parts'
import {
  BalanceWorkspace,
  PackageStatusCard,
  StatusInfoCard,
  type MetricDef,
} from './summary-sections'

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '--'
  return new Date(timestamp * 1000).toLocaleString()
}

function getRemainingDays(timestamp?: number): number {
  if (!timestamp) return 0
  const now = Date.now() / 1000
  return Math.max(0, Math.ceil((timestamp - now) / 86400))
}

function formatUsageHourLabel(timestamp?: number) {
  if (!timestamp) return '--'
  const date = new Date(timestamp * 1000)
  return `${String(date.getHours()).padStart(2, '0')}:00`
}

export function SummaryCards() {
  const user = useAuthStore((state) => state.auth.user)
  const summaryTimeRange = useMemo(() => computeTimeRange(1), [])
  const remainQuota = Number(user?.quota ?? 0)
  const claudeQuota = Number(user?.claude_quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const requestCount = Number(user?.request_count ?? 0)

  const usageTrendQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'single-usage-chart',
      summaryTimeRange.start_timestamp,
      summaryTimeRange.end_timestamp,
    ],
    queryFn: async () =>
      getUserQuotaDates({
        start_timestamp: summaryTimeRange.start_timestamp,
        end_timestamp: summaryTimeRange.end_timestamp,
        default_time: 'hour',
      }),
    staleTime: 60 * 1000,
  })

  const subscriptionsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscriptions'],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      return result.success
        ? (result.data ?? EMPTY_SUBSCRIPTIONS)
        : EMPTY_SUBSCRIPTIONS
    },
    staleTime: 60 * 1000,
  })

  const plansQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscription-plans'],
    queryFn: async () => {
      const result = await getPublicPlans()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const blindBoxQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'blind-box-summary'],
    queryFn: async () => {
      const result = await getBlindBoxSelf()
      return result.success ? (result.data ?? null) : null
    },
    staleTime: 60 * 1000,
  })

  const gamificationQuery = useQuery({
    queryKey: ['gamification', 'dashboard', 'overview-light-summary'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })

  const usageRows = usageTrendQuery.data?.data ?? []
  const chartValues = usageRows.map(
    (item: QuotaDataItem) => Number(item.quota) || 0
  )
  const chartPoints = usageRows.slice(-12).map((item: QuotaDataItem) => ({
    label: formatUsageHourLabel(item.created_at),
    value: Number(item.quota) || 0,
  }))
  const recentUsage = chartValues.reduce((total, value) => total + value, 0)
  const blindBoxQuota = Number(blindBoxQuery.data?.overview?.remaining_quota ?? 0)
  const totalAvailableQuota = remainQuota + blindBoxQuota
  const availableBoxes = Number(blindBoxQuery.data?.overview?.available_boxes ?? 0)
  const availableUsd = quotaUnitsToUsd(totalAvailableQuota)
  const walletUsd = quotaUnitsToUsd(remainQuota)
  const claudeUsd = quotaUnitsToUsd(claudeQuota)
  const recentUsageUsd = quotaUnitsToUsd(recentUsage)
  const usedQuotaUsd = quotaUnitsToUsd(usedQuota)
  const blindBoxQuotaUsd = quotaUnitsToUsd(blindBoxQuota)

  const planMetaMap = useMemo(() => {
    const map = new Map<
      number,
      { title: string; subtitle: string; plan: PlanRecord['plan'] }
    >()

    for (const item of plansQuery.data ?? []) {
      if (!item?.plan?.id) continue
      map.set(item.plan.id, {
        title: item.plan.title || '',
        subtitle: getSubscriptionPlanSubtitle(item.plan),
        plan: item.plan,
      })
    }

    return map
  }, [plansQuery.data])

  const orderedSubscriptions = useMemo(() => {
    const data = subscriptionsQuery.data
    const subscriptions = data?.subscriptions ?? []
    const fallbackIds = subscriptions.map((item) => item.subscription.id)
    const orderIds = data?.subscription_order_ids?.length
      ? data.subscription_order_ids
      : fallbackIds
    return getOrderedSubscriptions(subscriptions, orderIds)
  }, [subscriptionsQuery.data])

  const primarySubscription = orderedSubscriptions[0]
  const primaryPlanMeta = primarySubscription
    ? planMetaMap.get(primarySubscription.subscription.plan_id)
    : undefined
  const subscription = primarySubscription?.subscription
  const totalAmount = Number(subscription?.amount_total || 0)
  const totalUsed = Number(subscription?.amount_used || 0)
  const periodAmount = Number(subscription?.period_amount || 0)
  const periodUsed = Number(subscription?.period_used || 0)
  const isMonthlyPlan = isMonthlyCardPlan(primaryPlanMeta?.plan)
  const showPeriodQuota = !isMonthlyPlan && periodAmount > 0
  const hasSubscription = Boolean(subscription)
  const heroMetrics: MetricDef[] = [
    {
      label: '24 小时消耗',
      value: formatUsdAmount(recentUsageUsd),
      hint: '滚动统计最近 24 小时的美元消耗',
    },
    {
      label: '历史累计',
      value: formatUsdAmount(usedQuotaUsd),
      hint: '账户历史累计消耗（美元）',
    },
    {
      label: '请求次数',
      value: formatNumber(requestCount),
      hint: '账户累计请求次数',
    },
    {
      label: 'Claude 余额',
      value: formatUsdAmount(claudeUsd),
      hint: 'Claude 模型专用余额池',
    },
  ]

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]'>
        <BalanceWorkspace
          available={formatUsdAmount(availableUsd)}
          walletQuota={formatUsdAmount(walletUsd)}
          claudeQuota={formatUsdAmount(claudeUsd)}
          blindBoxQuota={formatUsdAmount(blindBoxQuotaUsd)}
          metrics={heroMetrics}
        />

        <PackageStatusCard
          hasSubscription={hasSubscription}
          title={
            hasSubscription
              ? primaryPlanMeta?.title || `套餐 #${subscription?.id}`
              : '当前套餐状态'
          }
          subtitle={
            hasSubscription
              ? primaryPlanMeta?.subtitle || '订阅额度'
              : '购买后这里会显示额度进度'
          }
          remainingDays={getRemainingDays(subscription?.end_time)}
          totalUsed={totalUsed}
          totalAmount={totalAmount}
          totalHint={`到期时间：${formatDateTime(subscription?.end_time)}`}
          periodUsed={showPeriodQuota ? periodUsed : undefined}
          periodAmount={showPeriodQuota ? periodAmount : undefined}
          periodHint={
            showPeriodQuota
              ? `下次重置：${formatDateTime(subscription?.next_reset_time)}`
              : undefined
          }
        >
          <StatusInfoCard
            label='状态'
            value={hasSubscription ? '正常' : '未订阅'}
            hint='展示当前主套餐状态，完整排序与扣费规则在管理页查看。'
          />
          <StatusInfoCard
            label='额度策略'
            value={showPeriodQuota ? '周期管理' : '总量管理'}
            hint='根据套餐类型展示总额度或周期额度。'
          />
        </PackageStatusCard>
      </div>

      <section className='overview-glass-card p-5 xl:p-6'>
        <div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] xl:items-center'>
          <div className='min-w-0'>
            <div className='text-foreground flex items-center gap-2 text-base font-semibold'>
              <Gift className='text-primary size-4' />
              活动与成长
            </div>
            <p className='text-muted-foreground mt-1 max-w-xl text-sm leading-6'>
              这里显示邀请、积分和任务摘要，盲盒入口已单独放到导航中。
            </p>

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
              <div className='overview-soft-card px-3 py-3'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  已邀请人数
                </div>
                <div className='text-foreground mt-1 text-base font-semibold'>
                  {formatNumber(Number(user?.aff_count ?? 0))}
                </div>
              </div>
              <div className='overview-soft-card px-3 py-3'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  可用刷新
                </div>
                <div className='text-foreground mt-1 text-base font-semibold'>
                  {subscriptionsQuery.data?.reset_opportunity?.available_count ?? 0} 次
                </div>
              </div>
              <div className='overview-soft-card px-3 py-3'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  活动摘要
                </div>
                <div className='text-foreground mt-1 text-base font-semibold'>
                  {gamificationQuery.data?.data?.daily_missions?.length ?? 0} 项
                </div>
              </div>
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

      <UsageChart points={chartPoints} />
    </div>
  )
}
