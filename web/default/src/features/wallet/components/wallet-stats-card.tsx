import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Gift,
  Loader2,
  RefreshCw,
  Save,
  WalletCards,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getPublicPlans,
  updateBillingPreference,
} from '@/features/subscriptions/api'
import {
  getBillingPreferenceFromFundingSourceOrder,
  getFundingSourceDescription,
  getFundingSourceLabel,
  normalizeFundingSourceOrder,
} from '@/features/subscriptions/billing'
import { getSubscriptionPlanSubtitle } from '@/features/subscriptions/lib'
import type {
  FundingSource,
  PlanRecord,
  SelfSubscriptionData,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import type { UserWalletData } from '../types'

const ALL_FUNDING_SOURCES: FundingSource[] = [
  'blind_box',
  'subscription',
  'wallet',
]

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
  topupLink?: string
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  subscriptionData?: SelfSubscriptionData | null
  subscriptionLoading?: boolean
  onSubscriptionRefresh?: () => Promise<void>
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

function getSubscriptionUsageStatus(record: UserSubscriptionRecord): {
  label: string
  note: string | null
} {
  const subscription = record.subscription
  const active =
    subscription.status === 'active' &&
    Number(subscription.end_time || 0) > Date.now() / 1000
  if (!active) {
    return {
      label: subscription.status === 'cancelled' ? 'Cancelled' : 'Expired',
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
      label: 'Quota exhausted',
      note: 'Billing skips this subscription automatically when its total quota is empty.',
    }
  }
  if (periodAmount > 0 && periodRemain <= 0) {
    return {
      label: 'Waiting for reset',
      note: 'This period quota is empty and will recover after the next reset.',
    }
  }
  return { label: 'Active', note: null }
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const [draftFundingSourceOrder, setDraftFundingSourceOrder] = useState<
    FundingSource[]
  >(['blind_box', 'subscription', 'wallet'])
  const [draftOrderIds, setDraftOrderIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [planRecords, setPlanRecords] = useState<PlanRecord[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  const activeSubscriptions = props.subscriptionData?.subscriptions || []
  const hasActiveSubscriptions = activeSubscriptions.length > 0

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        setLoadingPlans(true)
        const result = await getPublicPlans()
        if (!mounted) return
        setPlanRecords(result.success ? result.data || [] : [])
      } catch {
        if (!mounted) return
        setPlanRecords([])
      } finally {
        if (mounted) {
          setLoadingPlans(false)
        }
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!props.subscriptionData) return
    setDraftFundingSourceOrder(
      normalizeFundingSourceOrder(
        props.subscriptionData.funding_source_order,
        props.subscriptionData.billing_preference
      )
    )
    const fallbackIds = activeSubscriptions.map((item) => item.subscription.id)
    setDraftOrderIds(
      props.subscriptionData.subscription_order_ids?.length
        ? props.subscriptionData.subscription_order_ids
        : fallbackIds
    )
  }, [activeSubscriptions, props.subscriptionData])

  const planMetaMap = useMemo(() => {
    const map = new Map<number, { title: string; subtitle: string }>()
    for (const item of planRecords) {
      if (!item?.plan?.id) continue
      map.set(item.plan.id, {
        title: item.plan.title || '',
        subtitle: getSubscriptionPlanSubtitle(item.plan),
      })
    }
    return map
  }, [planRecords])

  const orderedSubscriptions = useMemo(
    () => getOrderedSubscriptions(activeSubscriptions, draftOrderIds),
    [activeSubscriptions, draftOrderIds]
  )

  const disabledFundingSources = ALL_FUNDING_SOURCES.filter(
    (source) => !draftFundingSourceOrder.includes(source)
  )
  const subscriptionModeEnabled =
    draftFundingSourceOrder.includes('subscription')
  const isLoadingSidebar =
    props.loading || props.subscriptionLoading || loadingPlans

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
          toast.error('Keep at least one primary billing source enabled')
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

  const resetFundingSourceOrder = () => {
    setDraftFundingSourceOrder(['blind_box', 'subscription', 'wallet'])
  }

  const resetSubscriptionOrder = () => {
    setDraftOrderIds(activeSubscriptions.map((item) => item.subscription.id))
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
        toast.error(response.message || 'Failed to save billing settings')
        return
      }
      toast.success('Billing settings updated')
      await props.onSubscriptionRefresh?.()
    } catch {
      toast.error('Failed to save billing settings')
    } finally {
      setSaving(false)
    }
  }

  if (props.loading) {
    return (
      <aside className='space-y-4 lg:sticky lg:top-4'>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className='rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_16px_36px_rgba(2,6,23,0.4)]'
          >
            <Skeleton className='h-5 w-28' />
            <Skeleton className='mt-3 h-10 w-full' />
            <Skeleton className='mt-3 h-10 w-full' />
          </div>
        ))}
      </aside>
    )
  }

  return (
    <aside className='space-y-4 lg:sticky lg:top-4'>
      <div className='rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_16px_36px_rgba(2,6,23,0.4)]'>
        <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
          <Gift className='h-4 w-4 text-sky-600' />
          Redeem code
        </div>
        <div className='mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
          <Input
            value={props.redemptionCode}
            onChange={(event) =>
              props.onRedemptionCodeChange(event.target.value)
            }
            placeholder='Enter a redeem code'
            className='h-10'
          />
          <Button
            onClick={props.onRedeem}
            disabled={props.redeeming}
            className='h-10 px-4'
          >
            {props.redeeming ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Redeem'
            )}
          </Button>
        </div>
        {props.topupLink ? (
          <a
            href={props.topupLink}
            target='_blank'
            rel='noopener noreferrer'
            className='text-muted-foreground hover:text-foreground mt-3 inline-flex text-xs'
          >
            Get a redeem code
          </a>
        ) : null}
      </div>

      <div className='rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_16px_36px_rgba(2,6,23,0.4)]'>
        <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
          <WalletCards className='h-4 w-4 text-sky-600' />
          Wallet balance
        </div>
        <div className='text-foreground mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums'>
          {formatQuota(props.user?.quota ?? 0)}
        </div>
        <div className='mt-4 grid gap-2'>
          <StatItem
            label='Total used'
            value={formatQuota(props.user?.used_quota ?? 0)}
          />
          <StatItem
            label='API requests'
            value={(props.user?.request_count ?? 0).toLocaleString()}
            icon={
              <Activity className='h-4 w-4 text-slate-500 dark:text-slate-400' />
            }
          />
          <StatItem
            label='Active subscriptions'
            value={`${activeSubscriptions.length}`}
          />
        </div>
      </div>

      <div className='rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_16px_36px_rgba(2,6,23,0.4)]'>
        <div className='flex items-center justify-between gap-3'>
          <div className='text-foreground text-sm font-semibold'>
            Billing priority
          </div>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => void props.onSubscriptionRefresh?.()}
            disabled={isLoadingSidebar || saving}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                (props.subscriptionLoading || saving) && 'animate-spin'
              )}
            />
          </Button>
        </div>

        <div className='mt-3 space-y-3'>
          <div className='space-y-2'>
            <div className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
              Funding source order
            </div>
            {draftFundingSourceOrder.map((source, index) => (
              <div
                key={source}
                className='rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='text-foreground truncate text-sm font-semibold'>
                      {index + 1}.{' '}
                      {getFundingSourceLabel(source, (value) => String(value))}
                    </div>
                    <div className='text-muted-foreground mt-1 text-xs'>
                      {getFundingSourceDescription(source, (value) =>
                        String(value)
                      )}
                    </div>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    {source === 'blind_box' ? null : (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => toggleFundingSource(source)}
                        disabled={saving}
                      >
                        Disable
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
              </div>
            ))}
            {disabledFundingSources.length > 0 ? (
              <div className='rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300'>
                <div className='text-foreground font-medium'>
                  Disabled sources
                </div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {disabledFundingSources.map((source) => (
                    <Button
                      key={source}
                      variant='outline'
                      size='sm'
                      onClick={() => toggleFundingSource(source)}
                      disabled={saving}
                    >
                      Enable{' '}
                      {getFundingSourceLabel(source, (value) => String(value))}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className='space-y-2'>
            <div className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
              Subscription order
            </div>
            {isLoadingSidebar ? (
              <div className='space-y-2'>
                <Skeleton className='h-14 rounded-2xl' />
                <Skeleton className='h-14 rounded-2xl' />
              </div>
            ) : !subscriptionModeEnabled ? (
              <div className='rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300'>
                Subscription deduction is disabled right now.
              </div>
            ) : !hasActiveSubscriptions ? (
              <div className='rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300'>
                No active subscriptions are available to reorder.
              </div>
            ) : (
              <div className='space-y-2'>
                {orderedSubscriptions.map((record, index) => {
                  const subscription = record.subscription
                  const meta = planMetaMap.get(subscription.plan_id)
                  const usageStatus = getSubscriptionUsageStatus(record)
                  return (
                    <div
                      key={subscription.id}
                      className='rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <div className='text-foreground truncate text-sm font-semibold'>
                            {index + 1}.{' '}
                            {meta?.title || `Subscription #${subscription.id}`}
                          </div>
                          <div className='text-muted-foreground mt-1 text-xs'>
                            {meta?.subtitle || 'Subscription'} ·{' '}
                            {getRemainingDays(subscription.end_time)} days left
                          </div>
                          <div className='mt-1 text-xs text-amber-700'>
                            {usageStatus.note || usageStatus.label}
                          </div>
                          <div className='text-muted-foreground mt-1 text-xs'>
                            Expires: {formatDateTime(subscription.end_time)}
                          </div>
                        </div>
                        <div className='flex shrink-0 items-center gap-1'>
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
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={resetFundingSourceOrder}
              disabled={saving}
            >
              Reset sources
            </Button>
            <Button
              variant='outline'
              className='flex-1'
              onClick={resetSubscriptionOrder}
              disabled={!hasActiveSubscriptions || saving}
            >
              Reset subscriptions
            </Button>
          </div>

          <Button
            className='w-full'
            onClick={() => void handleSave()}
            disabled={saving}
          >
            <Save className='mr-1 h-4 w-4' />
            Save billing settings
          </Button>
        </div>
      </div>
    </aside>
  )
}

function StatItem(props: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70'>
      <div className='flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300'>
        {props.icon}
        <span>{props.label}</span>
      </div>
      <div className='text-foreground font-mono text-sm font-semibold tabular-nums'>
        {props.value}
      </div>
    </div>
  )
}
