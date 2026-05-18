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
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
  updateBillingPreference,
} from '@/features/subscriptions/api'
import {
  formatSubscriptionQuotaAmount,
  getSubscriptionPlanSubtitle,
} from '@/features/subscriptions/lib'
import type {
  SelfSubscriptionData,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'

type BillingPreference =
  | 'subscription_first'
  | 'wallet_first'
  | 'subscription_only'
  | 'wallet_only'

const BILLING_OPTIONS: Array<{
  value: BillingPreference
  label: string
  description: string
  requiresSubscription: boolean
}> = [
  {
    value: 'subscription_first',
    label: '订阅优先，余额兜底',
    description: '先按已订阅套餐顺序扣费，订阅不够时再从余额扣费。',
    requiresSubscription: true,
  },
  {
    value: 'wallet_first',
    label: '余额优先，订阅兜底',
    description: '优先消耗余额，余额不足时再按订阅顺序扣费。',
    requiresSubscription: false,
  },
  {
    value: 'subscription_only',
    label: '仅从订阅扣费',
    description: '只允许从已订阅套餐扣费，不会动用余额。',
    requiresSubscription: true,
  },
  {
    value: 'wallet_only',
    label: '仅从余额扣费',
    description: '只允许从余额扣费，不会消耗任何订阅额度。',
    requiresSubscription: false,
  },
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

function getBillingLabel(value: string): string {
  return BILLING_OPTIONS.find((item) => item.value === value)?.label || value
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

export function SubscriptionUsagePanel() {
  const { t } = useTranslation()
  const [draftPreference, setDraftPreference] =
    useState<BillingPreference>('subscription_first')
  const [draftOrderIds, setDraftOrderIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const subscriptionsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscriptions'],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      return result.success
        ? (result.data ?? {
            billing_preference: 'subscription_first',
            subscription_order_ids: [],
            subscriptions: [],
            all_subscriptions: [],
          })
        : ({
            billing_preference: 'subscription_first',
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

  const subscriptionData = subscriptionsQuery.data
  const activeSubscriptions = subscriptionData?.subscriptions ?? []
  const hasActiveSubscriptions = activeSubscriptions.length > 0

  useEffect(() => {
    if (!subscriptionData) return
    setDraftPreference(
      (subscriptionData.billing_preference as BillingPreference) ||
        'subscription_first'
    )
    const fallbackIds = activeSubscriptions.map((item) => item.subscription.id)
    setDraftOrderIds(
      subscriptionData.subscription_order_ids?.length
        ? subscriptionData.subscription_order_ids
        : fallbackIds
    )
  }, [activeSubscriptions, subscriptionData])

  const planMetaMap = useMemo(() => {
    const map = new Map<number, { title: string; subtitle: string }>()
    for (const item of plansQuery.data ?? []) {
      if (!item?.plan?.id) continue
      map.set(item.plan.id, {
        title: item.plan.title || '',
        subtitle: getSubscriptionPlanSubtitle(item.plan),
      })
    }
    return map
  }, [plansQuery.data])

  const orderedSubscriptions = useMemo(
    () => getOrderedSubscriptions(activeSubscriptions, draftOrderIds),
    [activeSubscriptions, draftOrderIds]
  )

  const subscriptionModeEnabled = draftPreference !== 'wallet_only'
  const showSubscriptionPreferenceNote =
    !hasActiveSubscriptions &&
    (draftPreference === 'subscription_first' ||
      draftPreference === 'subscription_only')

  const isLoading = subscriptionsQuery.isLoading || plansQuery.isLoading

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

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await updateBillingPreference(
        draftPreference,
        hasActiveSubscriptions ? draftOrderIds : []
      )
      if (!response.success) {
        toast.error(response.message || '保存扣费策略失败')
        return
      }
      toast.success('扣费策略已更新')
      await subscriptionsQuery.refetch()
    } catch {
      toast.error('保存扣费策略失败')
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
            <h3 className='text-base font-semibold'>订阅与扣费</h3>
            <p className='text-muted-foreground text-sm'>
              在这里管理套餐扣费顺序，并查看每个订阅的额度使用情况。
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
          {t('Refresh')}
        </Button>
      </div>

      <div className='space-y-4 p-4 sm:p-5'>
        <div className='rounded-2xl border bg-slate-50/70 p-4'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2 text-sm font-semibold text-slate-950'>
                <ListOrdered className='h-4 w-4 text-sky-600' />
                扣费顺序设置
              </div>
              <p className='text-muted-foreground text-sm leading-6'>
                默认顺序为日卡优先，其次月卡；余额与订阅的先后关系由下方扣费模式决定。
              </p>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                onClick={resetSubscriptionOrder}
                disabled={!hasActiveSubscriptions || saving}
              >
                恢复默认顺序
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                <Save className='mr-1 h-4 w-4' />
                保存设置
              </Button>
            </div>
          </div>

          <div className='mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
            <div className='space-y-2'>
              <div className='text-sm font-medium text-slate-900'>扣费模式</div>
              <Select
                value={draftPreference}
                onValueChange={(value) =>
                  value !== null && setDraftPreference(value as BillingPreference)
                }
              >
                <SelectTrigger className='h-11'>
                  <SelectValue>{getBillingLabel(draftPreference)}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {BILLING_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={
                          option.requiresSubscription && !hasActiveSubscriptions
                        }
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className='text-muted-foreground text-xs leading-5'>
                {BILLING_OPTIONS.find((item) => item.value === draftPreference)
                  ?.description || '请选择合适的扣费模式。'}
              </p>
              {showSubscriptionPreferenceNote ? (
                <p className='text-xs text-amber-700'>
                  当前没有有效订阅，涉及“订阅”的模式会自动回退为余额扣费。
                </p>
              ) : null}
            </div>

            <div className='space-y-3'>
              <div className='text-sm font-medium text-slate-900'>
                订阅扣费顺序
              </div>
              {!subscriptionModeEnabled ? (
                <div className='text-muted-foreground rounded-2xl border border-dashed px-4 py-5 text-sm'>
                  当前为“仅从余额扣费”，不会消耗任何订阅额度。
                </div>
              ) : !hasActiveSubscriptions ? (
                <div className='text-muted-foreground rounded-2xl border border-dashed px-4 py-5 text-sm'>
                  当前没有可排序的有效订阅。购买套餐后才能设置订阅扣费顺序。
                </div>
              ) : (
                <div className='space-y-2'>
                  {orderedSubscriptions.map((record, index) => {
                    const subscription = record.subscription
                    const meta = planMetaMap.get(subscription.plan_id)
                    const remainDays = getRemainingDays(subscription.end_time)
                    return (
                      <div
                        key={subscription.id}
                        className='flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3'
                      >
                        <div className='min-w-0'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='text-sm font-semibold text-slate-950'>
                              {index + 1}. {meta?.title || `订阅 #${subscription.id}`}
                            </span>
                            <span className='rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700'>
                              {meta?.subtitle || '订阅'}
                            </span>
                          </div>
                          <p className='text-muted-foreground mt-1 text-xs'>
                            剩余 {remainDays} 天，到期时间 {formatDateTime(subscription.end_time)}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Button
                            variant='outline'
                            size='icon'
                            className='h-8 w-8'
                            onClick={() => moveSubscription(subscription.id, -1)}
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
                              index === orderedSubscriptions.length - 1 || saving
                            }
                          >
                            <ArrowDown className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  <p className='text-muted-foreground text-xs'>
                    保存后会按这里的顺序依次尝试订阅扣费；如果模式允许，余额会作为兜底或优先项参与扣费。
                  </p>
                </div>
              )}
            </div>
          </div>
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
              <div className='font-medium'>暂无有效订阅</div>
              <p className='text-muted-foreground mt-1 text-sm'>
                购买套餐后，这里会显示每个订阅的周期额度、总额度与重置时间。
              </p>
            </div>
            <Button size='sm' render={<Link to='/wallet' />}>
              前往钱包购买套餐
            </Button>
          </div>
        ) : (
          <div className='grid gap-3 xl:grid-cols-2'>
            {orderedSubscriptions.map((record) => {
              const subscription = record.subscription
              const totalAmount = Number(subscription?.amount_total || 0)
              const usedAmount = Number(subscription?.amount_used || 0)
              const periodAmount = Number(subscription?.period_amount || 0)
              const periodUsed = Number(subscription?.period_used || 0)
              const totalRemain =
                totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
              const periodRemain =
                periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0
              const totalPercent = clampPercent(usedAmount, totalAmount)
              const periodPercent = clampPercent(periodUsed, periodAmount)
              const remainDays = getRemainingDays(subscription?.end_time)
              const planMeta = planMetaMap.get(subscription?.plan_id)

              return (
                <SubscriptionCard
                  key={subscription?.id}
                  record={record}
                  planTitle={planMeta?.title || `订阅 #${subscription?.id}`}
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
}) {
  const subscription = props.record.subscription

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
            剩余 {props.remainDays} 天
          </div>
        </div>
        <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'>
          生效中
        </span>
      </div>

      <div className='mt-4 space-y-3'>
        {props.periodAmount > 0 && (
          <QuotaProgressBlock
            title='本周额度'
            current={props.periodUsed}
            total={props.periodAmount}
            remain={props.periodRemain}
            percent={props.periodPercent}
            toneClass='[&_[data-slot=progress-indicator]]:bg-emerald-500'
          />
        )}

        <QuotaProgressBlock
          title='总额度'
          current={props.usedAmount}
          total={props.totalAmount}
          remain={props.totalRemain}
          percent={props.totalPercent}
          unlimitedLabel='不限'
          toneClass='[&_[data-slot=progress-indicator]]:bg-sky-500'
        />
      </div>

      <div className='mt-4 grid gap-2 text-xs sm:grid-cols-2'>
        <InfoItem
          label='下次额度重置'
          value={
            (subscription?.next_reset_time ?? 0) > 0
              ? formatDateTime(subscription?.next_reset_time)
              : '--'
          }
        />
        <InfoItem label='到期时间' value={formatDateTime(subscription?.end_time)} />
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
            ? `${formatSubscriptionQuotaAmount(props.current)}/${formatSubscriptionQuotaAmount(props.total)} · 已用 ${props.percent}% · 剩余 ${formatSubscriptionQuotaAmount(props.remain)}`
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
