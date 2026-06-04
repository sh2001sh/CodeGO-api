import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Gift, Ticket } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getCurrencyLabel, isCurrencyDisplayEnabled } from '@/lib/currency'
import { formatNumber, formatQuota } from '@/lib/format'
import { computeTimeRange } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/copy-button'
import { getUserQuotaDates } from '@/features/dashboard/api'
import type { QuotaDataItem } from '@/features/dashboard/types'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
} from '@/features/subscriptions/api'
import {
  formatSubscriptionQuotaAmount,
  getSubscriptionPlanSubtitle,
  isMonthlyCardPlan,
} from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  SelfSubscriptionData,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import { getAffiliateCode, getBlindBoxSelf } from '@/features/wallet/api'
import { generateAffiliateLink } from '@/features/wallet/lib'
import { DataMetric, ProgressBlock, UsageChart } from './summary-card-parts'

const EMPTY_SUBSCRIPTIONS: SelfSubscriptionData = {
  billing_preference: 'subscription_first',
  funding_source_order: ['blind_box', 'subscription', 'wallet'],
  subscription_order_ids: [],
  subscriptions: [],
  all_subscriptions: [],
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '--'
  return new Date(timestamp * 1000).toLocaleString()
}

function getRemainingDays(timestamp?: number): number {
  if (!timestamp) return 0
  const now = Date.now() / 1000
  return Math.max(0, Math.ceil((timestamp - now) / 86400))
}

function getOrderedSubscriptions(
  subscriptions: UserSubscriptionRecord[],
  orderIds: number[]
) {
  const byId = new Map(
    subscriptions.map((record) => [record.subscription.id, record] as const)
  )
  const ordered: UserSubscriptionRecord[] = []

  for (const id of orderIds) {
    const record = byId.get(id)
    if (record) {
      ordered.push(record)
      byId.delete(id)
    }
  }

  for (const record of subscriptions) {
    if (byId.has(record.subscription.id)) {
      ordered.push(record)
      byId.delete(record.subscription.id)
    }
  }

  return ordered
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

  const affiliateCodeQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'affiliate-code'],
    queryFn: async () => {
      const result = await getAffiliateCode()
      return result.success ? (result.data ?? '') : ''
    },
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
  })

  const affiliateCode = affiliateCodeQuery.data || user?.aff_code || ''
  const affiliateLink = useMemo(
    () => (affiliateCode ? generateAffiliateLink(affiliateCode) : ''),
    [affiliateCode]
  )

  const currencyLabel = isCurrencyDisplayEnabled()
    ? getCurrencyLabel()
    : 'Tokens'
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
  const totalRemain =
    totalAmount > 0 ? Math.max(0, totalAmount - totalUsed) : 0
  const periodAmount = Number(subscription?.period_amount || 0)
  const periodUsed = Number(subscription?.period_used || 0)
  const periodRemain =
    periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0
  const isMonthlyPlan = isMonthlyCardPlan(primaryPlanMeta?.plan)
  const showPeriodQuota = !isMonthlyPlan && periodAmount > 0

  return (
    <div className='overflow-hidden rounded-[30px] border border-slate-200 bg-card shadow-[0_28px_90px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:shadow-[0_24px_80px_rgba(2,6,23,0.42)]'>
      <div className='grid gap-4 p-4 xl:grid-cols-[minmax(0,1.2fr)_380px] xl:p-5'>
        <div className='grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_240px]'>
          <UsageChart points={chartPoints} />

          <div className='space-y-3'>
            <DataMetric
              label='最近 24 小时'
              value={formatQuota(recentUsage)}
              hint={`最近 24 小时累计消耗（${currencyLabel}）`}
            />
            <DataMetric
              label='历史累计'
              value={formatQuota(usedQuota)}
              hint='账户历史累计消耗'
            />
            <DataMetric
              label='请求次数'
              value={formatNumber(requestCount)}
              hint='账户累计请求次数'
            />

            <div className='rounded-2xl border border-slate-200 bg-white/78 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/55'>
              <div className='flex items-center justify-between gap-3'>
                <div className='text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>
                  邀请链接
                </div>
                <div className='rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'>
                  已邀 {formatNumber(Number(user?.aff_count ?? 0))}
                </div>
              </div>
              <div className='mt-2 flex items-center gap-2'>
                <div className='min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'>
                  {affiliateLink || '登录后自动生成邀请链接'}
                </div>
                <CopyButton
                  value={affiliateLink}
                  variant='outline'
                  className='bg-background size-9'
                  iconClassName='size-4'
                  tooltip='复制邀请链接'
                  successTooltip='已复制'
                  aria-label='复制邀请链接'
                />
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8'
                  render={<Link to='/invite-rewards' />}
                >
                  <Gift data-icon='inline-start' />
                  邀请奖励
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  className='h-8'
                  render={<Link to='/point-mall' />}
                >
                  <ArrowRight data-icon='inline-start' />
                  积分商城
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-4 rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(145deg,rgba(255,255,255,0.98),rgba(240,253,250,0.98),rgba(248,250,252,0.98))] p-4 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(145deg,rgba(2,6,23,0.96),rgba(15,23,42,0.95),rgba(17,24,39,0.94))]'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <div className='text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400'>
                可用额度
              </div>
              <div className='mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                {formatQuota(totalAvailableQuota)}
              </div>
            </div>
            <div className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'>
              钱包 + 盲盒
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <DataMetric
              label='盲盒额度'
              value={formatQuota(blindBoxQuota)}
              hint={`最近到期：${formatDateTime(
                Number(blindBoxQuery.data?.overview?.next_expire_at ?? 0)
              )}`}
            />
            <DataMetric
              label={isMonthlyPlan ? '本月剩余' : '周期剩余'}
              value={
                isMonthlyPlan && totalAmount > 0
                  ? formatSubscriptionQuotaAmount(totalRemain)
                  : showPeriodQuota
                  ? formatSubscriptionQuotaAmount(periodRemain)
                  : '--'
              }
              hint={
                isMonthlyPlan
                  ? subscription
                    ? `到期时间：${formatDateTime(subscription.end_time)}`
                    : '当前没有生效月卡'
                  : showPeriodQuota
                  ? `下次重置：${formatDateTime(
                      Number(subscription?.next_reset_time || 0)
                    )}`
                  : '当前没有周期额度'
              }
            />
          </div>

          {availableBoxes > 0 ? (
            <div className='flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/10'>
              <div className='flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100'>
                <Ticket className='size-4' />
                你还有 {availableBoxes} 个盲盒待开启
              </div>
              <Button
                size='sm'
                variant='outline'
                className='border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10'
                render={<Link to='/blind-box' />}
              >
                立即处理
              </Button>
            </div>
          ) : null}

          {subscription ? (
            <div className='space-y-3'>
              <div className='rounded-2xl border border-slate-200 bg-white/82 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/55'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                      {primaryPlanMeta?.title || `套餐 #${subscription.id}`}
                    </div>
                    <div className='text-xs text-slate-500 dark:text-slate-400'>
                      {primaryPlanMeta?.subtitle || '订阅额度'}
                    </div>
                  </div>
                  <div className='text-xs text-slate-500 dark:text-slate-400'>
                    剩余 {getRemainingDays(subscription.end_time)} 天
                  </div>
                </div>
              </div>

              <ProgressBlock
                label={isMonthlyPlan ? '本月可用额度' : '总额度'}
                used={totalUsed}
                total={totalAmount}
                remainingLabel={
                  totalAmount > 0
                    ? `${formatSubscriptionQuotaAmount(totalRemain)} / ${formatSubscriptionQuotaAmount(totalAmount)}`
                    : '无限额度'
                }
                hint={`到期时间：${formatDateTime(subscription.end_time)}`}
                className='[&_[data-slot=progress-indicator]]:bg-sky-500'
              />

              {showPeriodQuota ? (
                <ProgressBlock
                  label='周期额度'
                  used={periodUsed}
                  total={periodAmount}
                  remainingLabel={`${formatSubscriptionQuotaAmount(periodRemain)} / ${formatSubscriptionQuotaAmount(periodAmount)}`}
                  hint={`下次重置：${formatDateTime(subscription.next_reset_time)}`}
                  className='[&_[data-slot=progress-indicator]]:bg-emerald-500'
                />
              ) : null}
            </div>
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400'>
              当前没有生效套餐。购买后这里会展示额度使用进度。
            </div>
          )}

          <Button className='justify-between' render={<Link to='/wallet' />}>
            <span>去钱包管理额度</span>
            <ArrowRight data-icon='inline-end' />
          </Button>
        </div>
      </div>
    </div>
  )
}
