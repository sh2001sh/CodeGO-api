/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { getCurrencyLabel, isCurrencyDisplayEnabled } from '@/lib/currency'
import { formatNumber, formatQuota } from '@/lib/format'
import { computeTimeRange } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'
import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { useSummaryCardsConfig } from '@/features/dashboard/hooks/use-dashboard-config'
import type { QuotaDataItem } from '@/features/dashboard/types'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
} from '@/features/subscriptions/api'
import {
  formatResetPeriod,
  formatSubscriptionQuotaAmount,
  getSubscriptionPlanSubtitle,
} from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  SelfSubscriptionData,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import { StatCard } from '../ui/stat-card'

const SUMMARY_SPARKLINE_BUCKETS = 12

type SummarySparklineKey = 'balance' | 'usage' | 'requests'

function getBucketIndex(
  timestamp: number,
  start: number,
  end: number,
  bucketCount: number
): number {
  if (end <= start) return 0
  const ratio = (timestamp - start) / (end - start)
  return Math.min(bucketCount - 1, Math.max(0, Math.floor(ratio * bucketCount)))
}

function buildSummarySparklines(
  data: QuotaDataItem[],
  currentBalance: number,
  start: number,
  end: number
): Record<SummarySparklineKey, number[]> {
  const usage = Array.from({ length: SUMMARY_SPARKLINE_BUCKETS }, () => 0)
  const requests = Array.from({ length: SUMMARY_SPARKLINE_BUCKETS }, () => 0)

  for (const item of data) {
    const timestamp = Number(item.created_at) || start
    const index = getBucketIndex(
      timestamp,
      start,
      end,
      SUMMARY_SPARKLINE_BUCKETS
    )
    usage[index] += Number(item.quota) || 0
    requests[index] += Number(item.count) || 0
  }

  let balance = currentBalance
  const balanceTrend = Array.from(
    { length: SUMMARY_SPARKLINE_BUCKETS },
    () => 0
  )

  for (let index = SUMMARY_SPARKLINE_BUCKETS - 1; index >= 0; index--) {
    balanceTrend[index] = Math.max(0, balance)
    balance += usage[index]
  }

  return {
    balance: balanceTrend,
    usage,
    requests,
  }
}

function getSummarySparkline(
  key: string,
  sparklineData: Record<SummarySparklineKey, number[]>
): number[] | undefined {
  if (key === 'usage') return sparklineData.usage
  if (key === 'requests') return sparklineData.requests
  return undefined
}

function getRunwayDays(
  remainQuota: number,
  recentUsage: number
): number | null {
  if (remainQuota <= 0 || recentUsage <= 0) return null
  const days = remainQuota / recentUsage
  if (!Number.isFinite(days)) return null
  return days
}

type HealthLevel = 'healthy' | 'caution' | 'critical'

function getHealthLevel(remainQuota: number, recentUsage: number): HealthLevel {
  if (remainQuota <= 0) return 'critical'
  const days = getRunwayDays(remainQuota, recentUsage)
  if (days !== null && days < 3) return 'caution'
  return 'healthy'
}

const HEALTH_CONFIG: Record<
  HealthLevel,
  { dotClass: string; labelKey: string }
> = {
  healthy: {
    dotClass: 'bg-success',
    labelKey: '状态正常',
  },
  caution: {
    dotClass: 'bg-warning',
    labelKey: '余额偏低',
  },
  critical: {
    dotClass: 'bg-destructive',
    labelKey: '余额不足',
  },
}

function getOrderedSubscriptions(
  subscriptions: UserSubscriptionRecord[],
  orderIds: number[]
): UserSubscriptionRecord[] {
  if (subscriptions.length === 0) return []
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

function getSubscriptionStatusKey(
  record: UserSubscriptionRecord
): 'Active' | 'Expired' | 'Cancelled' {
  const subscription = record.subscription
  if (subscription.status === 'cancelled') return 'Cancelled'
  if (
    subscription.status !== 'active' ||
    Number(subscription.end_time || 0) <= Date.now() / 1000
  ) {
    return 'Expired'
  }
  return 'Active'
}

function getRemainingDays(timestamp?: number): number {
  if (!timestamp) return 0
  const now = Date.now() / 1000
  return Math.max(0, Math.ceil((timestamp - now) / 86400))
}

const SUBSCRIPTION_STATUS_BADGE_CLASS: Record<string, string> = {
  Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Expired: 'border-amber-200 bg-amber-50 text-amber-700',
  Cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
}

function SummaryMetricTile(props: {
  title: string
  value: string
  hint?: string
}) {
  return (
    <div className='bg-background/60 rounded-lg border px-3 py-2.5'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.title}
      </div>
      <div className='mt-1 text-sm font-semibold tabular-nums'>
        {props.value}
      </div>
      {props.hint ? (
        <div className='text-muted-foreground mt-1 text-[11px]'>
          {props.hint}
        </div>
      ) : null}
    </div>
  )
}

export function SummaryCards() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { status, loading } = useStatus()

  const summaryTimeRange = useMemo(() => computeTimeRange(1), [])
  const remainQuota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const requestCount = Number(user?.request_count ?? 0)

  const usageTrendQuery = useQuery({
    queryKey: [
      'dashboard',
      'overview',
      'summary-sparklines',
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
        ? (result.data ?? {
            billing_preference: 'subscription_first',
            funding_source_order: ['blind_box', 'subscription', 'wallet'],
            subscription_order_ids: [],
            subscriptions: [],
            all_subscriptions: [],
          })
        : ({
            billing_preference: 'subscription_first',
            funding_source_order: ['blind_box', 'subscription', 'wallet'],
            subscription_order_ids: [],
            subscriptions: [],
            all_subscriptions: [],
          } satisfies SelfSubscriptionData)
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

  const summaryValues = useMemo(() => {
    return {
      usedDisplay: formatQuota(usedQuota),
      requestCountDisplay: formatNumber(requestCount),
    }
  }, [requestCount, usedQuota])

  const currencyEnabledFromStore = isCurrencyDisplayEnabled()
  const statusCurrencyFlag =
    typeof status?.display_in_currency === 'boolean'
      ? Boolean(status.display_in_currency)
      : undefined
  const currencyEnabled =
    statusCurrencyFlag !== undefined
      ? statusCurrencyFlag
      : currencyEnabledFromStore
  const currencyLabel = currencyEnabled ? getCurrencyLabel() : 'Tokens'

  const sparklineData = useMemo(
    () =>
      buildSummarySparklines(
        usageTrendQuery.data?.data ?? [],
        remainQuota,
        summaryTimeRange.start_timestamp,
        summaryTimeRange.end_timestamp
      ),
    [
      remainQuota,
      summaryTimeRange.end_timestamp,
      summaryTimeRange.start_timestamp,
      usageTrendQuery.data?.data,
    ]
  )

  const recentUsage = useMemo(
    () =>
      (usageTrendQuery.data?.data ?? []).reduce(
        (total, item) => total + (Number(item.quota) || 0),
        0
      ),
    [usageTrendQuery.data?.data]
  )

  const healthLevel = getHealthLevel(remainQuota, recentUsage)
  const healthCfg = HEALTH_CONFIG[healthLevel]
  const runwayDays = getRunwayDays(remainQuota, recentUsage)

  const todayUsageDisplay = formatQuota(recentUsage)

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
    const subscriptionData = subscriptionsQuery.data
    const activeSubscriptions = subscriptionData?.subscriptions ?? []
    const fallbackIds = activeSubscriptions.map((item) => item.subscription.id)
    const orderIds = subscriptionData?.subscription_order_ids?.length
      ? subscriptionData.subscription_order_ids
      : fallbackIds
    return getOrderedSubscriptions(activeSubscriptions, orderIds)
  }, [subscriptionsQuery.data])

  const primarySubscription = orderedSubscriptions[0]
  const primaryPlanMeta = primarySubscription
    ? planMetaMap.get(primarySubscription.subscription.plan_id)
    : undefined

  const primarySubscriptionSummary = useMemo(() => {
    if (!primarySubscription) return null

    const subscription = primarySubscription.subscription
    const plan = primaryPlanMeta?.plan
    const totalAmount = Number(subscription.amount_total || 0)
    const usedAmount = Number(subscription.amount_used || 0)
    const totalRemain =
      totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
    const periodAmount = Number(subscription.period_amount || 0)
    const periodUsed = Number(subscription.period_used || 0)
    const periodRemain =
      periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0
    const remainingDays = getRemainingDays(subscription.end_time)

    return {
      title:
        primaryPlanMeta?.title ||
        `套餐 #${subscription.plan_id || subscription.id}`,
      subtitle: primaryPlanMeta?.subtitle || '订阅',
      statusKey: getSubscriptionStatusKey(primarySubscription),
      statusLabel: t(getSubscriptionStatusKey(primarySubscription)),
      validityText:
        remainingDays > 999
          ? '剩余 999+ 天'
          : remainingDays < 1
            ? '不足 1 天'
            : `约剩 ${remainingDays} 天`,
      totalQuotaText:
        totalAmount > 0
          ? formatSubscriptionQuotaAmount(totalAmount)
          : '无限额度',
      remainingQuotaText:
        totalAmount > 0
          ? `${formatSubscriptionQuotaAmount(totalRemain)} / ${formatSubscriptionQuotaAmount(totalAmount)}`
          : '无限额度',
      periodQuotaTitle: plan ? formatResetPeriod(plan, t) : '额度重置',
      periodQuotaText:
        periodAmount > 0
          ? `${formatSubscriptionQuotaAmount(periodRemain)} / ${formatSubscriptionQuotaAmount(periodAmount)}`
          : '无需重置',
      nextResetText:
        Number(subscription.next_reset_time || 0) > 0 ? '下次重置' : '无需重置',
    }
  }, [primaryPlanMeta, primarySubscription, t])

  const items = useSummaryCardsConfig({
    ...summaryValues,
    todayUsageDisplay,
    currencyEnabled,
    currencyLabel,
  }).map((config, index) => {
    const tones = ['rose', 'teal', 'gray'] as const

    return {
      key: config.key,
      title: config.title,
      value: config.value,
      desc: config.description,
      icon: config.icon,
      tone: tones[index] ?? 'gray',
      sparkline:
        config.key === 'todayUsage'
          ? sparklineData.usage
          : getSummarySparkline(config.key, sparklineData),
      sparklineVariant: 'line' as const,
    }
  })

  return (
    <div className='bg-card overflow-hidden rounded-2xl border shadow-xs'>
      <div className='grid xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]'>
        <div className='flex flex-col gap-3 p-4 sm:p-5'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='flex flex-col gap-1'>
              <h3 className='text-base font-semibold'>用量总览</h3>
              <p className='text-muted-foreground text-sm'>
                快速查看余额、消耗和请求量
              </p>
            </div>
          </div>
          <StaggerContainer className='grid gap-3 md:grid-cols-3'>
            {items.map((it) => (
              <StaggerItem
                key={it.key}
                className='bg-background/60 rounded-xl border p-3'
              >
                <StatCard
                  title={it.title}
                  value={it.value}
                  description={it.desc}
                  icon={it.icon}
                  tone={it.tone}
                  sparkline={it.sparkline}
                  sparklineVariant={it.sparklineVariant}
                  loading={loading}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        <div className='bg-warning/10 flex flex-col justify-between gap-4 border-t p-4 sm:p-5 xl:border-t-0 xl:border-l'>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-xs font-medium'>
                可用额度
              </span>
              <span className='flex items-center gap-1.5'>
                <span
                  className={cn('size-1.5 rounded-full', healthCfg.dotClass)}
                  aria-hidden='true'
                />
                <span className='text-muted-foreground text-[11px] font-medium'>
                  {t(healthCfg.labelKey)}
                </span>
              </span>
            </div>

            <div className='font-mono text-2xl font-semibold tracking-tight'>
              {formatQuota(remainQuota)}
            </div>

            {subscriptionsQuery.isLoading || plansQuery.isLoading ? (
              <div className='bg-background/60 min-h-36 animate-pulse rounded-xl border' />
            ) : primarySubscriptionSummary ? (
              <div className='bg-background/70 rounded-xl border p-3'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='text-muted-foreground text-[11px] font-medium'>
                      主套餐
                    </div>
                    <div className='mt-1 truncate text-sm font-semibold'>
                      {primarySubscriptionSummary.title}
                    </div>
                    <div className='text-muted-foreground mt-1 text-xs'>
                      {primarySubscriptionSummary.subtitle}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      SUBSCRIPTION_STATUS_BADGE_CLASS[
                        primarySubscriptionSummary.statusKey
                      ]
                    )}
                  >
                    {primarySubscriptionSummary.statusLabel}
                  </span>
                </div>

                <div className='text-muted-foreground mt-3 text-xs'>
                  {primarySubscriptionSummary.validityText}
                </div>

                <div className='mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2'>
                  <SummaryMetricTile
                    title='总额度'
                    value={primarySubscriptionSummary.totalQuotaText}
                  />
                  <SummaryMetricTile
                    title='剩余额度'
                    value={primarySubscriptionSummary.remainingQuotaText}
                  />
                  <SummaryMetricTile
                    title={primarySubscriptionSummary.periodQuotaTitle}
                    value={primarySubscriptionSummary.periodQuotaText}
                    hint={primarySubscriptionSummary.nextResetText}
                  />
                  <SummaryMetricTile
                    title='按近 24 小时可用'
                    value={
                      runwayDays !== null
                        ? runwayDays < 1
                          ? '不足 1 天'
                          : runwayDays > 999
                            ? '999+ 天'
                            : `约 ${formatNumber(Math.floor(runwayDays))} 天`
                        : remainQuota <= 0
                          ? '余额不足'
                          : '最近 24 小时暂无消耗'
                    }
                    hint={`近 24 小时消耗：${formatQuota(recentUsage)}`}
                  />
                </div>
              </div>
            ) : (
              <div className='bg-background/60 rounded-xl border border-dashed p-3'>
                <div className='text-sm font-semibold'>暂无生效套餐</div>
                <div className='text-muted-foreground mt-1 text-xs leading-5'>
                  购买套餐后，这里会显示主套餐额度摘要。
                </div>
              </div>
            )}
          </div>

          <Button className='justify-between' render={<Link to='/wallet' />}>
            <span>钱包</span>
            <ArrowRight data-icon='inline-end' />
          </Button>
        </div>
      </div>
    </div>
  )
}
