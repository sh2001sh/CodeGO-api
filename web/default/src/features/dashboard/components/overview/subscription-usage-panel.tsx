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
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Crown,
  ListOrdered,
  RotateCw,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
  updateBillingPreference,
} from '@/features/subscriptions/api'
import {
  getBillingPreferenceFromFundingSourceOrder,
  getFundingSourceDescription,
  getFundingSourceLabel,
  normalizeFundingSourceOrder,
} from '@/features/subscriptions/billing'
import {
  formatSubscriptionQuotaAmount,
  getSubscriptionPlanSubtitle,
  isMonthlyCardPlan,
} from '@/features/subscriptions/lib'
import type {
  FundingSource,
  PlanRecord,
  SelfSubscriptionData,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'

const ALL_FUNDING_SOURCES: FundingSource[] = [
  'blind_box',
  'subscription',
  'wallet',
]

function clampPercent(used: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)))
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

function getSubscriptionUsageStatus(
  record: UserSubscriptionRecord,
  isMonthlyPlan = false
): {
  label: string
  note: string | null
} {
  const subscription = record.subscription
  const active =
    subscription.status === 'active' &&
    Number(subscription.end_time || 0) > Date.now() / 1000
  if (!active) {
    return {
      label: subscription.status === 'cancelled' ? '已取消' : '已过期',
      note: null,
    }
  }

  const totalAmount = Number(subscription.amount_total || 0)
  const usedAmount = Number(subscription.amount_used || 0)
  const totalRemain =
    totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
  const periodAmount = Number(subscription.period_amount || 0)
  const periodUsed = Number(subscription.period_used || 0)
  const periodRemain =
    periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0

  if (totalAmount > 0 && totalRemain <= 0) {
    return {
      label: '已耗尽',
      note: '总额度用完后，系统会自动跳过这份订阅。',
    }
  }
  if (!isMonthlyPlan && periodAmount > 0 && periodRemain <= 0) {
    return {
      label: '待重置',
      note: '本期额度已用完，重置后会继续参与扣费。',
    }
  }
  return { label: '可用', note: null }
}

export function SubscriptionUsagePanel() {
  const [draftFundingSourceOrder, setDraftFundingSourceOrder] = useState<
    FundingSource[]
  >(['blind_box', 'subscription', 'wallet'])
  const [draftOrderIds, setDraftOrderIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

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
            reset_opportunity: {
              available_count: 0,
              earned_total: 0,
              used_total: 0,
              used_this_month: false,
              current_month: '',
              last_used_month: '',
            },
          })
        : ({
            billing_preference: 'subscription_first',
            funding_source_order: ['blind_box', 'subscription', 'wallet'],
            subscription_order_ids: [],
            subscriptions: [],
            all_subscriptions: [],
            reset_opportunity: {
              available_count: 0,
              earned_total: 0,
              used_total: 0,
              used_this_month: false,
              current_month: '',
              last_used_month: '',
            },
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

  const subscriptionData = subscriptionsQuery.data
  const activeSubscriptions = subscriptionData?.subscriptions ?? []
  const hasActiveSubscriptions = activeSubscriptions.length > 0

  useEffect(() => {
    if (!subscriptionData) return
    setDraftFundingSourceOrder(
      normalizeFundingSourceOrder(
        subscriptionData.funding_source_order,
        subscriptionData.billing_preference
      )
    )
    const fallbackIds = activeSubscriptions.map((item) => item.subscription.id)
    setDraftOrderIds(
      subscriptionData.subscription_order_ids?.length
        ? subscriptionData.subscription_order_ids
        : fallbackIds
    )
  }, [activeSubscriptions, subscriptionData])

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

  const orderedSubscriptions = useMemo(
    () => getOrderedSubscriptions(activeSubscriptions, draftOrderIds),
    [activeSubscriptions, draftOrderIds]
  )

  const subscriptionModeEnabled =
    draftFundingSourceOrder.includes('subscription')
  const disabledFundingSources = ALL_FUNDING_SOURCES.filter(
    (source) => !draftFundingSourceOrder.includes(source)
  )
  const isLoading = subscriptionsQuery.isLoading || plansQuery.isLoading

  const moveFundingSource = (source: FundingSource, direction: -1 | 1) => {
    setDraftFundingSourceOrder((current) => {
      const next = [...current]
      const index = next.indexOf(source)
      if (index < 0) return current
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) return current
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const toggleFundingSource = (source: FundingSource) => {
    if (source === 'blind_box') return
    setDraftFundingSourceOrder((current) => {
      if (current.includes(source)) {
        const next = current.filter((item) => item !== source)
        const hasPrimarySource = next.some(
          (item) => item === 'subscription' || item === 'wallet'
        )
        if (!hasPrimarySource) {
          toast.error('至少保留一种主要扣费来源')
          return current
        }
        return next
      }
      return [...current, source]
    })
  }

  const moveSubscription = (id: number, direction: -1 | 1) => {
    setDraftOrderIds((current) => {
      const next = [...current]
      const index = next.indexOf(id)
      if (index < 0) return current
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) return current
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const resetSubscriptionOrder = () => {
    setDraftOrderIds(activeSubscriptions.map((item) => item.subscription.id))
  }

  const resetFundingSourceOrder = () => {
    setDraftFundingSourceOrder(['blind_box', 'subscription', 'wallet'])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const fundingSourceOrder = normalizeFundingSourceOrder(
        draftFundingSourceOrder,
        getBillingPreferenceFromFundingSourceOrder(draftFundingSourceOrder)
      )
      const response = await updateBillingPreference({
        billingPreference:
          getBillingPreferenceFromFundingSourceOrder(fundingSourceOrder),
        fundingSourceOrder,
        subscriptionOrderIds: hasActiveSubscriptions ? draftOrderIds : [],
      })
      if (!response.success) {
        toast.error(response.message || '保存扣费顺序失败')
        return
      }
      toast.success('扣费顺序已更新')
      await subscriptionsQuery.refetch()
    } catch {
      toast.error('保存扣费顺序失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='bg-card overflow-hidden rounded-2xl border shadow-xs'>
      <div className='flex flex-wrap items-start justify-between gap-3 border-b p-4 sm:p-5'>
        <div className='flex min-w-0 items-start gap-3'>
          <span className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl'>
            <Crown className='size-4' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <h3 className='text-base font-semibold'>套餐与扣费</h3>
            <p className='text-muted-foreground text-sm'>
              调整扣费顺序，并查看每份套餐的额度进度。
            </p>
          </div>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            void subscriptionsQuery.refetch()
            void plansQuery.refetch()
          }}
          disabled={subscriptionsQuery.isFetching || plansQuery.isFetching}
        >
          <RotateCw
            data-icon='inline-start'
            className={cn(
              (subscriptionsQuery.isFetching || plansQuery.isFetching) &&
                'animate-spin'
            )}
          />
          刷新
        </Button>
      </div>

      <div className='space-y-4 p-4 sm:p-5'>
        <div className='rounded-2xl border bg-slate-50/70 p-4'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2 text-sm font-semibold text-slate-950'>
                <ListOrdered className='h-4 w-4 text-sky-600' />
                扣费顺序
              </div>
              <p className='text-muted-foreground text-sm leading-6'>
                盲盒额度、订阅额度和钱包余额现在共用一套扣费顺序。
              </p>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                onClick={resetFundingSourceOrder}
                disabled={saving}
              >
                重置来源顺序
              </Button>
              <Button
                variant='outline'
                onClick={resetSubscriptionOrder}
                disabled={!hasActiveSubscriptions || saving}
              >
                重置订阅顺序
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                <Save className='mr-1 h-4 w-4' />
                保存设置
              </Button>
            </div>
          </div>

          <div className='mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
            <div className='space-y-3'>
              <div className='text-sm font-medium text-slate-900'>
                扣费来源顺序
              </div>
              <div className='space-y-2'>
                {draftFundingSourceOrder.map((source, index) => (
                  <div
                    key={source}
                    className='flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3'
                  >
                    <div className='min-w-0'>
                      <div className='text-sm font-semibold text-slate-950'>
                        {index + 1}.{' '}
                        {getFundingSourceLabel(source, (value) =>
                          String(value)
                        )}
                      </div>
                      <p className='text-muted-foreground mt-1 text-xs'>
                        {getFundingSourceDescription(source, (value) =>
                          String(value)
                        )}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      {source === 'blind_box' ? (
                        <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600'>
                          固定启用
                        </span>
                      ) : (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => toggleFundingSource(source)}
                          disabled={saving}
                        >
                          停用
                        </Button>
                      )}
                      <Button
                        variant='outline'
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => moveFundingSource(source, -1)}
                        disabled={index === 0 || saving}
                      >
                        <ArrowUp className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='outline'
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => moveFundingSource(source, 1)}
                        disabled={
                          index === draftFundingSourceOrder.length - 1 || saving
                        }
                      >
                        <ArrowDown className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {disabledFundingSources.length > 0 ? (
                <div className='rounded-2xl border border-dashed px-4 py-3'>
                  <div className='text-sm font-medium text-slate-900'>
                    已停用来源
                  </div>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    {disabledFundingSources.map((source) => (
                      <Button
                        key={source}
                        variant='outline'
                        size='sm'
                        onClick={() => toggleFundingSource(source)}
                        disabled={saving}
                      >
                        启用{' '}
                        {getFundingSourceLabel(source, (value) =>
                          String(value)
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className='space-y-3'>
              <div className='text-sm font-medium text-slate-900'>
                订阅扣费顺序
              </div>
              {!subscriptionModeEnabled ? (
                <div className='text-muted-foreground rounded-2xl border border-dashed px-4 py-5 text-sm'>
                  你已停用订阅扣费，结算时会跳过所有订阅。
                </div>
              ) : !hasActiveSubscriptions ? (
                <div className='text-muted-foreground rounded-2xl border border-dashed px-4 py-5 text-sm'>
                  还没有可排序的生效订阅，先购买套餐后再回来调整。
                </div>
              ) : (
                <div className='space-y-2'>
                  {orderedSubscriptions.map((record, index) => {
                    const subscription = record.subscription
                    const meta = planMetaMap.get(subscription.plan_id)
                    const remainDays = getRemainingDays(subscription.end_time)
                  const usageStatus = getSubscriptionUsageStatus(
                    record,
                    isMonthlyCardPlan(meta?.plan)
                  )
                    return (
                      <div
                        key={subscription.id}
                        className='flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3'
                      >
                        <div className='min-w-0'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='text-sm font-semibold text-slate-950'>
                              {index + 1}.{' '}
                              {meta?.title || `套餐 #${subscription.id}`}
                            </span>
                            <span className='rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700'>
                              {meta?.subtitle || '订阅'}
                            </span>
                          </div>
                          <p className='text-muted-foreground mt-1 text-xs'>
                            约剩 {remainDays} 天 ·{' '}
                            {formatDateTime(subscription.end_time)}
                          </p>
                          {usageStatus.note ? (
                            <p className='mt-1 text-xs text-amber-700'>
                              {usageStatus.note}
                            </p>
                          ) : null}
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600'>
                            {usageStatus.label}
                          </span>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() =>
                              moveSubscription(subscription.id, -1)
                            }
                            disabled={index === 0 || saving}
                          >
                            <ArrowUp className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() => moveSubscription(subscription.id, 1)}
                            disabled={
                              index === orderedSubscriptions.length - 1 ||
                              saving
                            }
                          >
                            <ArrowDown className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  <p className='text-muted-foreground text-xs'>
                    当扣费走到订阅来源时，会按这里的顺序逐个消耗。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='text-muted-foreground rounded-2xl border border-dashed px-4 py-3 text-sm'>
          总消耗显示的是账号累计用量；下面的卡片显示的是每份订阅自己的额度进度。
        </div>

        {isLoading ? (
          <div className='grid gap-3 lg:grid-cols-2'>
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className='bg-background/60 min-h-44 animate-pulse rounded-xl border'
              />
            ))}
          </div>
        ) : orderedSubscriptions.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center'>
            <div className='bg-muted flex size-12 items-center justify-center rounded-full'>
              <CalendarClock className='text-muted-foreground size-5' />
            </div>
            <div>
              <div className='font-medium'>暂无生效订阅</div>
              <p className='text-muted-foreground mt-1 text-sm'>
                购买套餐后，这里会显示每份订阅的额度进度和到期时间。
              </p>
            </div>
            <Button size='sm' render={<Link to='/wallet' />}>
              前往钱包
            </Button>
          </div>
        ) : (
          <div className='grid gap-3 xl:grid-cols-2'>
            {orderedSubscriptions.map((record) => {
              const subscription = record.subscription
              const planMeta = planMetaMap.get(subscription?.plan_id)
              const totalAmount = Number(subscription?.amount_total || 0)
              const usedAmount = Number(subscription?.amount_used || 0)
              const periodAmount = Number(subscription?.period_amount || 0)
              const periodUsed = Number(subscription?.period_used || 0)
              const isMonthlyPlan = isMonthlyCardPlan(planMeta?.plan)
              const totalRemain =
                totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
              const periodRemain =
                periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0
              const totalPercent = clampPercent(usedAmount, totalAmount)
              const periodPercent = clampPercent(periodUsed, periodAmount)
              const remainDays = getRemainingDays(subscription?.end_time)

              return (
                <SubscriptionCard
                  key={subscription?.id}
                  record={record}
                  planTitle={planMeta?.title || `套餐 #${subscription?.id}`}
                  planSubtitle={planMeta?.subtitle || '订阅'}
                  remainDays={remainDays}
                  totalAmount={totalAmount}
                  usedAmount={usedAmount}
                  totalRemain={totalRemain}
                  totalPercent={totalPercent}
                  periodAmount={periodAmount}
                  periodUsed={periodUsed}
                  periodRemain={periodRemain}
                  periodPercent={periodPercent}
                  isMonthlyPlan={isMonthlyPlan}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SubscriptionCard(props: {
  record: UserSubscriptionRecord
  planTitle: string
  planSubtitle: string
  remainDays: number
  totalAmount: number
  usedAmount: number
  totalRemain: number
  totalPercent: number
  periodAmount: number
  periodUsed: number
  periodRemain: number
  periodPercent: number
  isMonthlyPlan: boolean
}) {
  const subscription = props.record.subscription
  const usageStatus = getSubscriptionUsageStatus(
    props.record,
    props.isMonthlyPlan
  )
  const showPeriodQuota = !props.isMonthlyPlan && props.periodAmount > 0

  return (
    <div className='bg-background/60 rounded-xl border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='font-medium'>{props.planTitle}</div>
            <span className='rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600'>
              {props.planSubtitle}
            </span>
          </div>
          <div className='text-muted-foreground mt-1 text-xs'>
            约剩 {props.remainDays} 天
          </div>
        </div>
        <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'>
          {usageStatus.label}
        </span>
      </div>
      {usageStatus.note ? (
        <div className='mt-2 text-xs text-amber-700'>{usageStatus.note}</div>
      ) : null}

      <div className='mt-4 space-y-3'>
        {showPeriodQuota && (
          <QuotaProgressBlock
            title='本期额度'
            current={props.periodUsed}
            total={props.periodAmount}
            remain={props.periodRemain}
            percent={props.periodPercent}
            toneClass='[&_[data-slot=progress-indicator]]:bg-emerald-500'
          />
        )}

        <QuotaProgressBlock
          title={props.isMonthlyPlan ? '本月可用额度' : '总额度'}
          current={props.usedAmount}
          total={props.totalAmount}
          remain={props.totalRemain}
          percent={props.totalPercent}
          unlimitedLabel='无限额度'
          toneClass='[&_[data-slot=progress-indicator]]:bg-sky-500'
        />
      </div>

      <div className='mt-4 grid gap-2 text-xs sm:grid-cols-2'>
        {!props.isMonthlyPlan ? (
          <InfoItem
            label='下次重置'
            value={
              (subscription?.next_reset_time ?? 0) > 0
                ? formatDateTime(subscription?.next_reset_time)
                : '--'
            }
          />
        ) : null}
        <InfoItem
          label='到期时间'
          value={formatDateTime(subscription?.end_time)}
        />
      </div>
    </div>
  )
}

function QuotaProgressBlock(props: {
  title: string
  current: number
  total: number
  remain: number
  percent: number
  toneClass?: string
  unlimitedLabel?: string
}) {
  const hasLimit = props.total > 0

  return (
    <div className='space-y-1.5'>
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs'>
        <span className='text-foreground font-medium'>{props.title}</span>
        <span className='text-muted-foreground'>
          {hasLimit
            ? `已用 ${formatSubscriptionQuotaAmount(props.current)}/${formatSubscriptionQuotaAmount(props.total)} · 剩余 ${formatSubscriptionQuotaAmount(props.remain)} · ${props.percent}%`
            : props.unlimitedLabel}
        </span>
      </div>
      {hasLimit ? (
        <Progress className={props.toneClass} value={props.percent} />
      ) : (
        <div className='bg-muted h-1 rounded-full' />
      )}
    </div>
  )
}

function InfoItem(props: { label: string; value: string }) {
  return (
    <div className='rounded-lg border px-3 py-2'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='mt-1 text-xs font-medium'>{props.value}</div>
    </div>
  )
}
