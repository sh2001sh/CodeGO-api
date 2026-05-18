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
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Crown, RefreshCw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  StatusBadge,
  dotColorMap,
  textColorMap,
} from '@/components/status-badge'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
  updateBillingPreference,
} from '@/features/subscriptions/api'
import { SubscriptionPurchaseDialog } from '@/features/subscriptions/components/dialogs/subscription-purchase-dialog'
import {
  formatDuration,
  formatResetPeriod,
  formatSubscriptionPlanPrice,
  getSubscriptionPlanActionLabel,
  getSubscriptionPlanDescription,
  getSubscriptionPlanDetailText,
  getSubscriptionPlanSubtitle,
  isDayPassPlan,
} from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import type { PaymentMethod, TopupInfo } from '../types'

interface SubscriptionPlansCardProps {
  topupInfo: TopupInfo | null
  onAvailabilityChange?: (available: boolean) => void
}

function getEpayMethods(payMethods: PaymentMethod[] = []): PaymentMethod[] {
  return payMethods.filter(
    (m) => m?.type && m.type !== 'stripe' && m.type !== 'creem'
  )
}

function getBillingPreferenceLabel(
  preference: string,
  t: (key: string) => string
): string {
  switch (preference) {
    case 'subscription_first':
      return t('Subscription First')
    case 'wallet_first':
      return t('Wallet First')
    case 'subscription_only':
      return t('Subscription Only')
    case 'wallet_only':
      return t('Wallet Only')
    default:
      return preference
  }
}

export function SubscriptionPlansCard({
  topupInfo,
  onAvailabilityChange,
}: SubscriptionPlansCardProps) {
  const { t } = useTranslation()

  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [allSubscriptions, setAllSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [billingPreference, setBillingPreference] =
    useState('subscription_first')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null)

  const enableStripe = !!topupInfo?.enable_stripe_topup
  const enableCreem = !!topupInfo?.enable_creem_topup
  const enableOnlineTopUp = !!topupInfo?.enable_online_topup
  const epayMethods = useMemo(
    () => getEpayMethods(topupInfo?.pay_methods),
    [topupInfo?.pay_methods]
  )

  const fetchPlans = useCallback(async () => {
    try {
      const res = await getPublicPlans()
      if (res.success) {
        setPlans(res.data || [])
      }
    } catch {
      setPlans([])
    }
  }, [])

  const fetchSelfSubscription = useCallback(async () => {
    try {
      const res = await getSelfSubscriptionFull()
      if (res.success && res.data) {
        setBillingPreference(
          res.data.billing_preference || 'subscription_first'
        )
        setActiveSubscriptions(res.data.subscriptions || [])
        setAllSubscriptions(res.data.all_subscriptions || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchPlans(), fetchSelfSubscription()])
      setLoading(false)
    }
    init()
  }, [fetchPlans, fetchSelfSubscription])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSubscriptionChanged = () => {
      fetchSelfSubscription()
    }

    window.addEventListener('subscription:changed', handleSubscriptionChanged)
    return () => {
      window.removeEventListener(
        'subscription:changed',
        handleSubscriptionChanged
      )
    }
  }, [fetchSelfSubscription])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchSelfSubscription()
    } finally {
      setRefreshing(false)
    }
  }

  const handlePreferenceChange = async (pref: string) => {
    const previous = billingPreference
    setBillingPreference(pref)
    try {
      const res = await updateBillingPreference(pref)
      if (res.success) {
        toast.success(t('Updated successfully'))
        const normalized = res.data?.billing_preference || pref
        setBillingPreference(normalized)
      } else {
        toast.error(res.message || t('Update failed'))
        setBillingPreference(previous)
      }
    } catch {
      toast.error(t('Request failed'))
      setBillingPreference(previous)
    }
  }

  const hasActive = activeSubscriptions.length > 0
  const hasAny = allSubscriptions.length > 0
  const isAvailable = loading || plans.length > 0 || hasAny
  const disablePref = !hasActive
  const isSubPref =
    billingPreference === 'subscription_first' ||
    billingPreference === 'subscription_only'
  const displayPref =
    disablePref && isSubPref ? 'wallet_first' : billingPreference

  const planPurchaseCountMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const sub of allSubscriptions) {
      const planId = sub?.subscription?.plan_id
      if (!planId) continue
      map.set(planId, (map.get(planId) || 0) + 1)
    }
    return map
  }, [allSubscriptions])

  useEffect(() => {
    onAvailabilityChange?.(isAvailable)
  }, [isAvailable, onAvailabilityChange])

  const planTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of plans) {
      if (p?.plan?.id) {
        map.set(p.plan.id, p.plan.title || '')
      }
    }
    return map
  }, [plans])

  const groupedPlans = useMemo(() => {
    const month: PlanRecord[] = []
    const day: PlanRecord[] = []
    for (const record of plans) {
      if (!record?.plan) continue
      if (isDayPassPlan(record.plan)) {
        day.push(record)
      } else {
        month.push(record)
      }
    }
    return { month, day }
  }, [plans])

  const getRemainingDays = (sub: UserSubscriptionRecord) => {
    const endTime = sub?.subscription?.end_time || 0
    if (!endTime) return 0
    const now = Date.now() / 1000
    return Math.max(0, Math.ceil((endTime - now) / 86400))
  }

  const getUsagePercent = (sub: UserSubscriptionRecord) => {
    const total = Number(sub?.subscription?.amount_total || 0)
    const used = Number(sub?.subscription?.amount_used || 0)
    if (total <= 0) return 0
    return Math.round((used / total) * 100)
  }

  const renderPlanCard = (p: PlanRecord, index: number) => {
    const plan = p?.plan
    if (!plan) return null
    const totalAmount = Number(plan.total_amount || 0)
    const periodAmount = Number(plan.period_amount || 0)
    const priceAmount = Number(plan.price_amount || 0)
    const effectiveAmount = Number(p.amount_due ?? priceAmount ?? 0)
    const displayPrice = formatSubscriptionPlanPrice(
      effectiveAmount,
      plan.currency
    )
    const isPopular = index === 0 && !isDayPassPlan(plan)
    const limit = Number(plan.max_purchase_per_user || 0)
    const count = planPurchaseCountMap.get(plan.id) || 0
    const reached = limit > 0 && count >= limit
    const blockedByRule = p.action === 'disabled'
    const actionLabel = getSubscriptionPlanActionLabel(p.action, t)
    const detailText = getSubscriptionPlanDetailText(
      plan,
      totalAmount,
      periodAmount,
      t
    )
    const summaryText = getSubscriptionPlanDescription(
      plan,
      totalAmount,
      periodAmount,
      t
    )
    const resetValue = formatResetPeriod(plan, t)
    const metrics = [
      {
        label: t('Validity Period'),
        value: formatDuration(plan, t),
      },
      resetValue !== t('No Reset')
        ? {
            label: t('Quota Reset'),
            value: resetValue,
          }
        : null,
      {
        label: periodAmount > 0 ? t('Weekly Quota') : t('Total Quota'),
        value:
          periodAmount > 0
            ? formatQuota(periodAmount)
            : totalAmount > 0
              ? formatQuota(totalAmount)
              : t('Unlimited'),
      },
      periodAmount > 0
        ? {
            label: t('Total Quota'),
            value: totalAmount > 0 ? formatQuota(totalAmount) : t('Unlimited'),
          }
        : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>

    return (
      <Card
        key={plan.id}
        className={cn(
          'border-border/60 overflow-hidden rounded-[26px] border bg-white/95 shadow-[0_20px_55px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.12)]',
          isPopular && 'border-primary/40 ring-primary/10 ring-4'
        )}
      >
        <CardContent className='flex h-full flex-col p-0'>
          <div className='from-primary/[0.14] via-primary/[0.06] to-background border-b px-5 pt-5 pb-4 bg-gradient-to-br'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-muted-foreground text-[11px] font-semibold tracking-[0.22em] uppercase'>
                  {getSubscriptionPlanSubtitle(plan)}
                </p>
                <h4 className='mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950'>
                  {plan.title || t('Subscription Plans')}
                </h4>
                <p className='text-muted-foreground mt-2 text-sm leading-6'>
                  {summaryText}
                </p>
              </div>
              {isPopular && (
                <StatusBadge
                  variant='info'
                  copyable={false}
                  className='shrink-0 rounded-full'
                >
                  <Sparkles className='mr-1 h-3 w-3' />
                  {t('Recommended')}
                </StatusBadge>
              )}
            </div>
          </div>

          <div className='flex flex-1 flex-col px-5 pt-4 pb-5'>
            <div className='flex items-end gap-2'>
              <span className='text-primary text-3xl font-semibold tracking-tight'>
                {displayPrice}
              </span>
              <span className='text-muted-foreground pb-1 text-xs'>
                / {t('per plan')}
              </span>
            </div>
            {effectiveAmount !== priceAmount && (
              <div className='text-muted-foreground mt-1 text-xs'>
                \u539f\u4ef7{' '}
                {formatSubscriptionPlanPrice(priceAmount, plan.currency)}
              </div>
            )}

            {p.action && p.action !== 'subscribe' && (
              <div className='text-primary mt-3 text-xs font-semibold tracking-wide'>
                {actionLabel}
              </div>
            )}

            <div className='mt-4 grid grid-cols-2 gap-2.5'>
              {metrics.map((metric) => (
                <div
                  key={`${plan.id}-${metric.label}`}
                  className='rounded-2xl border bg-slate-50/80 p-3'
                >
                  <div className='text-muted-foreground text-[11px] tracking-wide'>
                    {metric.label}
                  </div>
                  <div className='mt-1 text-sm font-semibold text-slate-900'>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            <div className='mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3'>
              <div className='text-foreground text-xs font-medium'>
                {'\u5957\u9910\u8be6\u60c5'}
              </div>
              <div className='text-muted-foreground mt-1 text-xs leading-6'>
                {detailText}
              </div>
            </div>

            <div className='mt-auto pt-4'>
              {reached || blockedByRule ? (
                <Tooltip>
                  <TooltipTrigger render={<div />}>
                    <Button className='w-full rounded-full' disabled>
                      {reached ? t('Limit Reached') : actionLabel}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {reached
                      ? `${t('Purchase limit reached')} (${count}/${limit})`
                      : p.disabled_reason ||
                        '\u5f53\u524d\u5df2\u6709\u751f\u6548\u5957\u9910\uff0c\u4e0d\u652f\u6301\u964d\u7ea7\u8ba2\u8d2d\u3002'}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  className='w-full rounded-full'
                  onClick={() => {
                    setSelectedPlan(p)
                    setPurchaseOpen(true)
                  }}
                >
                  {actionLabel}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className='gap-0 overflow-hidden py-0'>
        <CardHeader className='border-b p-3 !pb-3 sm:p-5 sm:!pb-5'>
          <Skeleton className='h-6 w-32' />
        </CardHeader>
        <CardContent className='space-y-4 p-3 sm:p-5'>
          <Skeleton className='h-20 w-full' />
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-48 w-full' />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (plans.length === 0 && !hasAny) {
    return null
  }

  return (
    <>
      <div id='wallet-subscriptions' className='scroll-mt-4'>
        <TitledCard
          title={t('Subscription Plans')}
          description={t('Subscribe to a plan for model access')}
          icon={<Crown className='h-4 w-4' />}
          contentClassName='space-y-4 sm:space-y-5'
        >
        {/* My subscriptions & billing preference */}
        <div className='rounded-xl border p-3 sm:p-4'>
          <div className='flex flex-wrap items-center justify-between gap-2.5 sm:gap-3'>
            <div className='flex min-w-0 flex-wrap items-center gap-2'>
              <span className='text-sm font-medium'>
                {t('My Subscriptions')}
              </span>
              <span className='flex items-center gap-1.5 text-xs font-medium'>
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    hasActive ? dotColorMap.success : dotColorMap.neutral
                  )}
                  aria-hidden='true'
                />
                {hasActive ? (
                  <span className={cn(textColorMap.success)}>
                    {activeSubscriptions.length} {t('active')}
                  </span>
                ) : (
                  <span className='text-muted-foreground'>
                    {t('No Active')}
                  </span>
                )}
                {allSubscriptions.length > activeSubscriptions.length && (
                  <>
                    <span className='text-muted-foreground/30'>|</span>
                    <span className='text-muted-foreground'>
                      {allSubscriptions.length - activeSubscriptions.length}{' '}
                      {t('expired')}
                    </span>
                  </>
                )}
              </span>
            </div>
            <div className='flex w-full items-center gap-2 sm:w-auto'>
              <Select
                items={[
                  {
                    value: 'subscription_first',
                    label: (
                      <>
                        {getBillingPreferenceLabel('subscription_first', t)}
                        {disablePref ? ` (${t('No Active')})` : ''}
                      </>
                    ),
                  },
                  {
                    value: 'wallet_first',
                    label: getBillingPreferenceLabel('wallet_first', t),
                  },
                  {
                    value: 'subscription_only',
                    label: (
                      <>
                        {getBillingPreferenceLabel('subscription_only', t)}
                        {disablePref ? ` (${t('No Active')})` : ''}
                      </>
                    ),
                  },
                  {
                    value: 'wallet_only',
                    label: getBillingPreferenceLabel('wallet_only', t),
                  },
                ]}
                value={displayPref}
                onValueChange={(v) => v !== null && handlePreferenceChange(v)}
              >
                <SelectTrigger className='h-8 flex-1 text-xs sm:w-[140px] sm:flex-none'>
                  <SelectValue>
                    {getBillingPreferenceLabel(displayPref, t)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    <SelectItem
                      value='subscription_first'
                      disabled={disablePref}
                    >
                      {getBillingPreferenceLabel('subscription_first', t)}
                      {disablePref ? ` (${t('No Active')})` : ''}
                    </SelectItem>
                    <SelectItem value='wallet_first'>
                      {getBillingPreferenceLabel('wallet_first', t)}
                    </SelectItem>
                    <SelectItem
                      value='subscription_only'
                      disabled={disablePref}
                    >
                      {getBillingPreferenceLabel('subscription_only', t)}
                      {disablePref ? ` (${t('No Active')})` : ''}
                    </SelectItem>
                    <SelectItem value='wallet_only'>
                      {getBillingPreferenceLabel('wallet_only', t)}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>

          {disablePref && isSubPref && (
            <p className='text-muted-foreground mt-2 text-xs'>
              {t(
                'Preference saved as {{pref}}, but no active subscription. Wallet will be used automatically.',
                {
                  pref:
                    billingPreference === 'subscription_only'
                      ? t('Subscription Only')
                      : t('Subscription First'),
                }
              )}
            </p>
          )}

          {hasAny && (
            <>
              <Separator className='my-3' />
              <div className='max-h-64 space-y-3 overflow-y-auto pr-1'>
                {allSubscriptions.map((sub) => {
                  const subscription = sub.subscription
                  const totalAmount = Number(subscription?.amount_total || 0)
                  const usedAmount = Number(subscription?.amount_used || 0)
                  const periodAmount = Number(subscription?.period_amount || 0)
                  const periodUsed = Number(subscription?.period_used || 0)
                  const remainAmount =
                    totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
                  const remainPeriodAmount =
                    periodAmount > 0
                      ? Math.max(0, periodAmount - periodUsed)
                      : 0
                  const planTitle =
                    planTitleMap.get(subscription?.plan_id) || ''
                  const remainDays = getRemainingDays(sub)
                  const usagePercent = getUsagePercent(sub)
                  const now = Date.now() / 1000
                  const isExpired = (subscription?.end_time || 0) < now
                  const isCancelled = subscription?.status === 'cancelled'
                  const isActive =
                    subscription?.status === 'active' && !isExpired

                  return (
                    <div
                      key={subscription?.id}
                      className='bg-background rounded-md border p-3 text-xs'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium'>
                            {planTitle
                              ? `${planTitle} | ${t('Subscription')} #${subscription?.id}`
                              : `${t('Subscription')} #${subscription?.id}`}
                          </span>
                          {isActive ? (
                            <StatusBadge
                              label={t('Active')}
                              variant='success'
                              copyable={false}
                            />
                          ) : isCancelled ? (
                            <StatusBadge
                              label={t('Cancelled')}
                              variant='neutral'
                              copyable={false}
                            />
                          ) : (
                            <StatusBadge
                              label={t('Expired')}
                              variant='neutral'
                              copyable={false}
                            />
                          )}
                        </div>
                        {isActive && (
                          <span className='text-muted-foreground'>
                            {t('{{count}} days remaining', {
                              count: remainDays,
                            })}
                          </span>
                        )}
                      </div>
                      <div className='text-muted-foreground mt-1.5'>
                        {isActive
                          ? t('Until')
                          : isCancelled
                            ? t('Cancelled at')
                            : t('Expired at')}{' '}
                        {new Date(
                          (subscription?.end_time || 0) * 1000
                        ).toLocaleString()}
                      </div>
                      {periodAmount > 0 && (
                        <div className='text-muted-foreground mt-1'>
                          {t('Period')}:{' '}
                          <Tooltip>
                            <TooltipTrigger
                              render={<span className='cursor-help' />}
                            >
                              {formatQuota(periodUsed)}/
                              {formatQuota(periodAmount)} | {t('Remaining')}{' '}
                              {formatQuota(remainPeriodAmount)}
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('Raw Quota')}: {periodUsed}/{periodAmount} |{' '}
                              {t('Remaining')} {remainPeriodAmount}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {isActive && (subscription?.next_reset_time ?? 0) > 0 && (
                        <div className='text-muted-foreground mt-1'>
                          {t('Next reset')}:{' '}
                          {new Date(
                            subscription!.next_reset_time! * 1000
                          ).toLocaleString()}
                        </div>
                      )}
                      <div className='text-muted-foreground mt-1'>
                        {t('Total Quota')}:{' '}
                        {totalAmount > 0 ? (
                          <Tooltip>
                            <TooltipTrigger
                              render={<span className='cursor-help' />}
                            >
                              {formatQuota(usedAmount)}/
                              {formatQuota(totalAmount)} | {t('Remaining')}{' '}
                              {formatQuota(remainAmount)}
                            </TooltipTrigger>
                            <TooltipContent>
                              {t('Raw Quota')}: {usedAmount}/{totalAmount} |{' '}
                              {t('Remaining')} {remainAmount}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          t('Unlimited')
                        )}
                        {totalAmount > 0 && (
                          <span className='ml-2'>
                            {t('Used')} {usagePercent}%
                          </span>
                        )}
                      </div>
                      {totalAmount > 0 && isActive && (
                        <Progress value={usagePercent} className='mt-2 h-1.5' />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {!hasAny && (
            <p className='text-muted-foreground mt-2 text-xs'>
              {t('Subscribe to a plan for model access')}
            </p>
          )}
        </div>

        {plans.length > 0 ? (
          <div className='space-y-5'>
            {groupedPlans.month.length > 0 && (
              <div className='rounded-[30px] border border-sky-100 bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(255,255,255,0.94))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-5'>
                <div className='mb-4 flex items-end justify-between gap-4'>
                  <div>
                    <p className='text-primary text-[11px] font-semibold tracking-[0.24em] uppercase'>
                      {t('Monthly Plans')}
                    </p>
                    <h3 className='mt-2 text-xl font-semibold tracking-tight text-slate-950'>
                      {t('Long-running Codex usage with weekly refresh')}
                    </h3>
                  </div>
                </div>
                <div className='grid grid-cols-1 gap-4 2xl:grid-cols-2'>
                  {groupedPlans.month.map((plan, index) =>
                    renderPlanCard(plan, index)
                  )}
                </div>
              </div>
            )}

            {groupedPlans.day.length > 0 && (
              <div className='rounded-[30px] border border-sky-100 bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(255,255,255,0.94))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-5'>
                <div className='mb-4 flex items-end justify-between gap-4'>
                  <div>
                    <p className='text-primary text-[11px] font-semibold tracking-[0.24em] uppercase'>
                      {t('Day Passes')}
                    </p>
                    <h3 className='mt-2 text-xl font-semibold tracking-tight text-slate-950'>
                      {t('One-day quota packs for temporary bursts')}
                    </h3>
                  </div>
                </div>
                <div className='grid grid-cols-1 gap-4 xl:grid-cols-2'>
                  {groupedPlans.day.map((plan, index) =>
                    renderPlanCard(plan, index)
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className='text-muted-foreground py-4 text-center text-sm'>
            {t('No plans available')}
          </p>
        )}
        </TitledCard>
      </div>

      <SubscriptionPurchaseDialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          setPurchaseOpen(open)
          if (!open) {
            fetchSelfSubscription()
          }
        }}
        plan={selectedPlan}
        enableStripe={enableStripe}
        enableCreem={enableCreem}
        enableOnlineTopUp={enableOnlineTopUp}
        epayMethods={epayMethods}
        purchaseLimit={
          selectedPlan?.plan?.max_purchase_per_user
            ? Number(selectedPlan.plan.max_purchase_per_user)
            : undefined
        }
        purchaseCount={
          selectedPlan?.plan?.id
            ? planPurchaseCountMap.get(selectedPlan.plan.id)
            : undefined
        }
      />
    </>
  )
}
