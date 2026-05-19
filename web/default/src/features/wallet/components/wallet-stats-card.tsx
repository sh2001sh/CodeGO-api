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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { getPublicPlans, updateBillingPreference } from '@/features/subscriptions/api'
import { getSubscriptionPlanSubtitle } from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  SelfSubscriptionData,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import type { UserWalletData } from '../types'

type BillingPreference =
  | 'subscription_first'
  | 'wallet_first'
  | 'subscription_only'
  | 'wallet_only'

const BILLING_OPTIONS: Array<{
  value: BillingPreference
  label: string
  requiresSubscription: boolean
}> = [
  {
    value: 'subscription_first',
    label: '订阅优先，余额兜底',
    requiresSubscription: true,
  },
  {
    value: 'wallet_first',
    label: '余额优先，订阅兜底',
    requiresSubscription: false,
  },
  {
    value: 'subscription_only',
    label: '仅从订阅扣费',
    requiresSubscription: true,
  },
  {
    value: 'wallet_only',
    label: '仅从余额扣费',
    requiresSubscription: false,
  },
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

function getBillingLabel(value: BillingPreference): string {
  return BILLING_OPTIONS.find((item) => item.value === value)?.label || value
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const [draftPreference, setDraftPreference] =
    useState<BillingPreference>('subscription_first')
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
    setDraftPreference(
      (props.subscriptionData.billing_preference as BillingPreference) ||
        'subscription_first'
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

  const isLoadingSidebar =
    props.loading || props.subscriptionLoading || loadingPlans

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
      await props.onSubscriptionRefresh?.()
    } catch {
      toast.error('保存扣费策略失败')
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
        <div className='flex items-center gap-2 text-sm font-semibold text-foreground'>
          <Gift className='h-4 w-4 text-sky-600' />
          兑换码兑换
        </div>
        <div className='mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
          <Input
            value={props.redemptionCode}
            onChange={(event) => props.onRedemptionCodeChange(event.target.value)}
            placeholder='输入兑换码'
            className='h-10'
          />
          <Button
            onClick={props.onRedeem}
            disabled={props.redeeming}
            className='h-10 px-4'
          >
            {props.redeeming ? <Loader2 className='h-4 w-4 animate-spin' /> : '兑换'}
          </Button>
        </div>
        {props.topupLink ? (
          <a
            href={props.topupLink}
            target='_blank'
            rel='noopener noreferrer'
            className='text-muted-foreground mt-3 inline-flex text-xs hover:text-foreground'
          >
            去获取兑换码
          </a>
        ) : null}
      </div>

      <div className='rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_16px_36px_rgba(2,6,23,0.4)]'>
        <div className='flex items-center gap-2 text-sm font-semibold text-foreground'>
          <WalletCards className='h-4 w-4 text-sky-600' />
          当前余额
        </div>
        <div className='mt-3 font-mono text-3xl font-bold tracking-tight text-foreground tabular-nums'>
          {formatQuota(props.user?.quota ?? 0)}
        </div>
        <div className='mt-4 grid gap-2'>
          <StatItem label='总用量' value={formatQuota(props.user?.used_quota ?? 0)} />
          <StatItem
            label='API 请求'
            value={(props.user?.request_count ?? 0).toLocaleString()}
            icon={<Activity className='h-4 w-4 text-slate-500 dark:text-slate-400' />}
          />
          <StatItem label='生效订阅' value={`${activeSubscriptions.length}`} />
        </div>
      </div>

      <div className='rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_16px_36px_rgba(2,6,23,0.4)]'>
        <div className='flex items-center justify-between gap-3'>
          <div className='text-sm font-semibold text-foreground'>扣费优先顺序</div>
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
            <Label className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
              扣费模式
            </Label>
            <Select
              value={draftPreference}
              onValueChange={(value) =>
                value !== null && setDraftPreference(value as BillingPreference)
              }
            >
              <SelectTrigger className='h-10'>
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
          </div>

          <div className='space-y-2'>
            <div className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
              订阅顺序
            </div>
            {isLoadingSidebar ? (
              <div className='space-y-2'>
                <Skeleton className='h-14 rounded-2xl' />
                <Skeleton className='h-14 rounded-2xl' />
              </div>
            ) : draftPreference === 'wallet_only' ? (
              <div className='rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300'>
                当前为仅从余额扣费，订阅不会参与扣费。
              </div>
            ) : !hasActiveSubscriptions ? (
              <div className='rounded-2xl border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300'>
                当前没有可排序的生效订阅。
              </div>
            ) : (
              <div className='space-y-2'>
                {orderedSubscriptions.map((record, index) => {
                  const subscription = record.subscription
                  const meta = planMetaMap.get(subscription.plan_id)
                  return (
                    <div
                      key={subscription.id}
                      className='rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-semibold text-foreground'>
                            {index + 1}. {meta?.title || `订阅 #${subscription.id}`}
                          </div>
                          <div className='text-muted-foreground mt-1 text-xs'>
                            {meta?.subtitle || '订阅'} · 剩余{' '}
                            {getRemainingDays(subscription.end_time)} 天
                          </div>
                          <div className='text-muted-foreground mt-1 text-xs'>
                            到期：{formatDateTime(subscription.end_time)}
                          </div>
                        </div>
                        <div className='flex shrink-0 items-center gap-1'>
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
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className='flex gap-2'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={resetSubscriptionOrder}
              disabled={!hasActiveSubscriptions || saving}
            >
              恢复默认
            </Button>
            <Button className='flex-1' onClick={() => void handleSave()} disabled={saving}>
              <Save className='mr-1 h-4 w-4' />
              保存
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function StatItem(props: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70'>
      <div className='flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300'>
        {props.icon}
        <span>{props.label}</span>
      </div>
      <div className='font-mono text-sm font-semibold text-foreground tabular-nums'>
        {props.value}
      </div>
    </div>
  )
}
