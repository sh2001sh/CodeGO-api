import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { formatNumber, formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
import { computeTimeRange } from '@/lib/time'
import { getUserQuotaDates } from '@/features/dashboard/api'
import type { QuotaDataItem } from '@/features/dashboard/types'
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
import { UsageChart } from './summary-card-parts'
import {
  BalanceWorkspace,
  PackageStatusCard,
  StatusInfoCard,
  type BalanceSegment,
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

  const usageRows = usageTrendQuery.data?.data ?? []
  const chartValues = usageRows.map(
    (item: QuotaDataItem) => Number(item.quota) || 0
  )
  const chartPoints = usageRows.slice(-12).map((item: QuotaDataItem) => ({
    label: formatUsageHourLabel(item.created_at),
    value: Number(item.quota) || 0,
  }))
  const recentUsage = chartValues.reduce((total, value) => total + value, 0)
  const availableUsd = quotaUnitsToUsd(remainQuota)
  const walletUsd = quotaUnitsToUsd(remainQuota)
  const claudeUsd = quotaUnitsToUsd(claudeQuota)
  const recentUsageUsd = quotaUnitsToUsd(recentUsage)
  const usedQuotaUsd = quotaUnitsToUsd(usedQuota)

  const balanceSegments: BalanceSegment[] = [
    {
      label: '钱包',
      display: formatUsdAmount(walletUsd),
      value: walletUsd,
      dot: 'bg-primary',
      bar: 'bg-primary',
    },
  ]

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
          segments={balanceSegments}
          claudeQuota={formatUsdAmount(claudeUsd)}
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

      <UsageChart points={chartPoints} />
    </div>
  )
}
