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
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { ArrowRight, Crown, RefreshCw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { getPublicPlans } from '@/features/subscriptions/api'
import { SubscriptionPurchaseDialog } from '@/features/subscriptions/components/dialogs/subscription-purchase-dialog'
import {
  formatDuration,
  formatSubscriptionPlanPrice,
  formatSubscriptionQuotaAmount,
  getSubscriptionPlanActionLabel,
  getSubscriptionPlanDescription,
  getSubscriptionPlanDiscountText,
  getSubscriptionPlanDetailText,
  getSubscriptionPlanSubtitle,
  isDayPassPlan,
  normalizeSubscriptionText,
} from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  SelfSubscriptionData,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import type { PaymentMethod, TopupInfo } from '../types'

interface SubscriptionPlansCardProps {
  topupInfo: TopupInfo | null
  subscriptionData?: SelfSubscriptionData | null
  subscriptionLoading?: boolean
  onAvailabilityChange?: (available: boolean) => void
  onSubscriptionRefresh?: () => Promise<void>
}

interface PlanPresentation {
  badge: string
  summary: string
}

function getEpayMethods(payMethods: PaymentMethod[] = []): PaymentMethod[] {
  return payMethods.filter(
    (method) =>
      method?.type && method.type !== 'stripe' && method.type !== 'creem'
  )
}

function getPlanPresentation(plan: PlanRecord['plan']): PlanPresentation {
  const title = normalizeSubscriptionText(plan?.title).toLowerCase()

  if (isDayPassPlan(plan)) {
    return title.includes('100')
      ? {
          badge: '高峰补量',
          summary: '适合当天高频调用、模型压力测试或临时加量场景。',
        }
      : {
          badge: '临时补充',
          summary: '适合单日使用、临时救急和短时任务冲量。',
        }
  }

  if (title.includes('ultra')) {
    return {
      badge: '旗舰月卡',
      summary: '面向高频 Codex 开发、长链路代理调用和团队协作场景。',
    }
  }
  if (title.includes('pro')) {
    return {
      badge: '重度月卡',
      summary: '适合每天高频使用 Codex、长上下文编程和持续补全。',
    }
  }
  if (title.includes('standard')) {
    return {
      badge: '主力月卡',
      summary: '适合日常开发主力使用，兼顾成本、频率和总额度。',
    }
  }
  if (title.includes('lite')) {
    return {
      badge: '入门月卡',
      summary: '适合第一次购买套餐，先建立稳定的 Codex 使用节奏。',
    }
  }
  return {
    badge: isDayPassPlan(plan) ? '日卡' : '月卡',
    summary: '适合需要明确额度边界和固定预算的使用场景。',
  }
}

function getRemainingDays(sub: UserSubscriptionRecord) {
  const endTime = sub?.subscription?.end_time || 0
  if (!endTime) return 0
  const now = Date.now() / 1000
  return Math.max(0, Math.ceil((endTime - now) / 86400))
}

function getUsagePercent(used: number, total: number) {
  if (total <= 0) return 0
  return Math.round((used / total) * 100)
}

export function SubscriptionPlansCard({
  topupInfo,
  subscriptionData,
  subscriptionLoading = false,
  onAvailabilityChange,
  onSubscriptionRefresh,
}: SubscriptionPlansCardProps) {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
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
  const allSubscriptions = subscriptionData?.all_subscriptions || []

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true)
    try {
      const response = await getPublicPlans()
      setPlans(response.success ? response.data || [] : [])
    } catch {
      setPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }, [])

  useEffect(() => {
    void fetchPlans()
  }, [fetchPlans])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleSubscriptionChanged = () => {
      void fetchPlans()
    }
    window.addEventListener('subscription:changed', handleSubscriptionChanged)
    return () => {
      window.removeEventListener(
        'subscription:changed',
        handleSubscriptionChanged
      )
    }
  }, [fetchPlans])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchPlans(), onSubscriptionRefresh?.()])
    } finally {
      setRefreshing(false)
    }
  }

  const isAvailable =
    loadingPlans ||
    subscriptionLoading ||
    plans.length > 0 ||
    allSubscriptions.length > 0

  useEffect(() => {
    onAvailabilityChange?.(isAvailable)
  }, [isAvailable, onAvailabilityChange])

  const groupedPlans = useMemo(() => {
    const monthPlans: PlanRecord[] = []
    const dayPlans: PlanRecord[] = []
    for (const item of plans) {
      if (!item.plan) continue
      if (isDayPassPlan(item.plan)) {
        dayPlans.push(item)
      } else {
        monthPlans.push(item)
      }
    }
    return { monthPlans, dayPlans }
  }, [plans])

  const planPurchaseCountMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of allSubscriptions) {
      const planId = item?.subscription?.plan_id
      if (!planId) continue
      map.set(planId, (map.get(planId) || 0) + 1)
    }
    return map
  }, [allSubscriptions])

  const planTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of plans) {
      if (!item?.plan?.id) continue
      map.set(item.plan.id, normalizeSubscriptionText(item.plan.title))
    }
    return map
  }, [plans])

  const renderPlanCard = (record: PlanRecord, index: number) => {
    const plan = record.plan
    if (!plan) return null

    const title = normalizeSubscriptionText(plan.title) || '套餐'
    const totalAmount = Number(plan.total_amount || 0)
    const periodAmount = Number(plan.period_amount || 0)
    const priceAmount = Number(plan.price_amount || 0)
    const effectiveAmount = Number(record.amount_due ?? priceAmount ?? 0)
    const displayPrice = formatSubscriptionPlanPrice(
      effectiveAmount,
      plan.currency
    )
    const presentation = getPlanPresentation(plan)
    const isRecommended = index === 0 && !isDayPassPlan(plan)
    const limit = Number(plan.max_purchase_per_user || 0)
    const count = planPurchaseCountMap.get(plan.id) || 0
    const limitReached = limit > 0 && count >= limit
    const actionLabel = getSubscriptionPlanActionLabel(record.action, t)
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
    const discountText = getSubscriptionPlanDiscountText(plan)
    const blockedReason =
      normalizeSubscriptionText(record.disabled_reason) ||
      '当前已有生效中的更高等级套餐，暂不支持降级订阅。'

    return (
      <Card
        key={plan.id}
        className={cn(
          'overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_16px_36px_rgba(2,6,23,0.4)]',
          isRecommended &&
            'border-sky-300 ring-2 ring-sky-100 dark:border-sky-500/80 dark:ring-sky-500/20'
        )}
      >
        <CardContent className='space-y-4 p-4'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <p className='text-primary text-[11px] font-semibold tracking-[0.22em] uppercase'>
                {getSubscriptionPlanSubtitle(plan)}
              </p>
              <div className='mt-1.5 flex flex-wrap items-center gap-2'>
                <span className='rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-white dark:bg-slate-100 dark:text-slate-900'>
                  套餐
                </span>
                <h4 className='truncate text-xl font-semibold tracking-tight text-foreground'>
                  {title}
                </h4>
                <span className='rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200'>
                  {presentation.badge}
                </span>
              </div>
              {discountText ? (
                <div className='mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'>
                  {discountText}
                </div>
              ) : null}
              <p className='mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300'>
                {presentation.summary}
              </p>
            </div>

            <div className='text-right'>
              {isRecommended ? (
                <div className='inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-200'>
                  <Sparkles className='mr-1 h-3.5 w-3.5' />
                  推荐
                </div>
              ) : null}
              <div className='text-primary mt-2 text-2xl font-semibold tracking-tight'>
                {displayPrice}
              </div>
              <div className='text-muted-foreground mt-1 text-xs'>
                人民币 / 套餐
              </div>
            </div>
          </div>

          {effectiveAmount !== priceAmount ? (
            <div className='text-muted-foreground text-xs'>
              原价 {formatSubscriptionPlanPrice(priceAmount, plan.currency)}
            </div>
          ) : null}

          <div className='grid grid-cols-2 gap-2'>
            <MetricCard label='有效期' value={formatDuration(plan, t)} />
            <MetricCard
              label={periodAmount > 0 ? '每周额度' : '套餐额度'}
              value={
                periodAmount > 0
                  ? formatSubscriptionQuotaAmount(periodAmount)
                  : totalAmount > 0
                    ? formatSubscriptionQuotaAmount(totalAmount)
                    : '不限'
              }
            />
            <MetricCard
              label='总额度'
              value={
                totalAmount > 0 ? formatSubscriptionQuotaAmount(totalAmount) : '不限'
              }
            />
            <MetricCard
              label='套餐类型'
              value={isDayPassPlan(plan) ? '独立日卡' : '周刷月卡'}
            />
          </div>

          <div className='rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/70'>
            <div className='text-sm font-semibold text-foreground'>套餐介绍</div>
            <p className='text-muted-foreground mt-1.5 text-sm leading-6'>
              {summaryText}
            </p>
            <p className='text-muted-foreground mt-2 text-xs leading-5'>
              {detailText}
            </p>
          </div>

          <div className='space-y-2'>
            <Button
              className='w-full rounded-full'
              disabled={limitReached || record.action === 'disabled'}
              onClick={() => {
                setSelectedPlan(record)
                setPurchaseOpen(true)
              }}
            >
              {limitReached ? '已达购买上限' : actionLabel}
              {!limitReached && record.action !== 'disabled' ? (
                <ArrowRight className='ml-1 h-4 w-4' />
              ) : null}
            </Button>
            {limitReached ? (
              <p className='text-xs text-amber-700'>
                已达到该套餐购买上限（{count}/{limit}）。
              </p>
            ) : null}
            {record.action === 'disabled' ? (
              <p className='text-xs text-amber-700'>{blockedReason}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isAvailable) {
    return null
  }

  return (
    <>
      <div id='wallet-subscriptions' className='scroll-mt-4'>
        <TitledCard
          title='套餐购买'
          icon={<Crown className='h-4 w-4' />}
          action={
            <Button
              variant='outline'
              size='icon'
              className='h-9 w-9 shrink-0'
              onClick={() => void handleRefresh()}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
          }
          contentClassName='space-y-4'
        >
          <PlanSection
            title='月卡套餐'
            description='适合长期使用 Codex。月卡有效期 1 个月，周额度每 7 天刷新一次，总额度限制整个月的上限。'
            loading={loadingPlans}
            emptyText='当前没有可购买的月卡套餐。'
          >
            {groupedPlans.monthPlans.map((record, index) =>
              renderPlanCard(record, index)
            )}
          </PlanSection>

          <PlanSection
            title='日卡套餐'
            description='适合临时补量。日卡额度独立结算，不并入月卡总额度，扣费时默认优先于月卡。'
            loading={loadingPlans}
            emptyText='当前没有可购买的日卡套餐。'
          >
            {groupedPlans.dayPlans.map((record, index) =>
              renderPlanCard(record, index)
            )}
          </PlanSection>

          <Card className='rounded-[22px] border-slate-200 shadow-none dark:border-slate-800 dark:bg-slate-950/70'>
            <CardContent className='space-y-4 p-4'>
              <div>
                <div className='text-base font-semibold text-foreground'>
                  已购套餐使用情况
                </div>
                <p className='text-muted-foreground mt-1 text-sm'>
                  在这里查看每个订阅的剩余天数、周额度与总额度消耗。
                </p>
              </div>

              {subscriptionLoading ? (
                <div className='grid gap-3 xl:grid-cols-2'>
                  {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className='h-36 w-full rounded-2xl' />
                  ))}
                </div>
              ) : allSubscriptions.length === 0 ? (
                <div className='rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300'>
                  当前还没有任何订阅记录。购买套餐后，这里会显示每张套餐的额度使用进度。
                </div>
              ) : (
                <div className='grid gap-3 xl:grid-cols-2'>
                  {allSubscriptions.map((record) => {
                    const subscription = record.subscription
                    const title =
                      planTitleMap.get(subscription.plan_id) ||
                      `订阅 #${subscription.id}`
                    const totalAmount = Number(subscription.amount_total || 0)
                    const usedAmount = Number(subscription.amount_used || 0)
                    const totalRemain =
                      totalAmount > 0
                        ? Math.max(0, totalAmount - usedAmount)
                        : 0
                    const periodAmount = Number(subscription.period_amount || 0)
                    const periodUsed = Number(subscription.period_used || 0)
                    const periodRemain =
                      periodAmount > 0
                        ? Math.max(0, periodAmount - periodUsed)
                        : 0
                    const totalPercent = getUsagePercent(usedAmount, totalAmount)
                    const periodPercent = getUsagePercent(
                      periodUsed,
                      periodAmount
                    )
                    const remainDays = getRemainingDays(record)
                    const active =
                      subscription.status === 'active' &&
                      subscription.end_time > Date.now() / 1000

                    return (
                      <Card
                        key={subscription.id}
                        className='rounded-2xl border-slate-200 shadow-none dark:border-slate-800 dark:bg-slate-950/50'
                      >
                        <CardContent className='space-y-3 p-4'>
                          <div className='flex flex-wrap items-start justify-between gap-2'>
                            <div>
                              <div className='flex flex-wrap items-center gap-2'>
                                <div className='font-semibold text-foreground'>
                                  {title}
                                </div>
                                <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'>
                                  {active
                                    ? '生效中'
                                    : subscription.status === 'cancelled'
                                      ? '已取消'
                                      : '已过期'}
                                </span>
                              </div>
                              <p className='text-muted-foreground mt-1 text-xs'>
                                {active ? `剩余 ${remainDays} 天` : '该订阅已结束'} · 到期时间{' '}
                                {new Date(
                                  subscription.end_time * 1000
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {periodAmount > 0 ? (
                            <UsageBlock
                              label='本周额度'
                              used={periodUsed}
                              total={periodAmount}
                              remain={periodRemain}
                              percent={periodPercent}
                              toneClass='[&_[data-slot=progress-indicator]]:bg-emerald-500'
                            />
                          ) : null}

                          <UsageBlock
                            label='总额度'
                            used={usedAmount}
                            total={totalAmount}
                            remain={totalRemain}
                            percent={totalPercent}
                            toneClass='[&_[data-slot=progress-indicator]]:bg-sky-500'
                          />

                          <div className='grid gap-2 sm:grid-cols-2'>
                            <InfoItem
                              label='下一次重置'
                              value={
                                subscription.next_reset_time
                                  ? new Date(
                                      subscription.next_reset_time * 1000
                                    ).toLocaleString()
                                  : '--'
                              }
                            />
                            <InfoItem
                              label='订阅状态'
                              value={
                                active
                                  ? '生效中'
                                  : subscription.status === 'cancelled'
                                    ? '已取消'
                                    : '已过期'
                              }
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TitledCard>
      </div>

      <SubscriptionPurchaseDialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          setPurchaseOpen(open)
          if (!open) {
            void fetchPlans()
            void onSubscriptionRefresh?.()
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

function PlanSection(props: {
  title: string
  description: string
  loading: boolean
  emptyText: string
  children: ReactNode
}) {
  const childArray = Array.isArray(props.children)
    ? props.children
    : [props.children].filter(Boolean)

  return (
    <section className='rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(255,255,255,0.94))] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.82))] dark:shadow-[0_20px_48px_rgba(2,6,23,0.4)]'>
      <div className='mb-4'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-white dark:bg-slate-100 dark:text-slate-900'>
            套餐
          </span>
          <p className='text-primary text-[11px] font-semibold tracking-[0.24em] uppercase'>
            {props.title}
          </p>
        </div>
        <p className='text-muted-foreground mt-2 text-sm leading-6'>
          {props.description}
        </p>
      </div>

      {props.loading ? (
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3'>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className='h-[280px] w-full rounded-[22px]' />
          ))}
        </div>
      ) : childArray.length > 0 ? (
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3'>
          {childArray}
        </div>
      ) : (
        <div className='rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300'>
          {props.emptyText}
        </div>
      )}
    </section>
  )
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border bg-white px-3 py-3 shadow-[0_6px_20px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_6px_20px_rgba(2,6,23,0.35)]'>
      <div className='text-muted-foreground text-[11px] font-medium tracking-wide'>
        {props.label}
      </div>
      <div className='mt-1 text-sm font-semibold text-foreground'>
        {props.value}
      </div>
    </div>
  )
}

function UsageBlock(props: {
  label: string
  used: number
  total: number
  remain: number
  percent: number
  toneClass?: string
}) {
  if (props.total <= 0) {
    return (
      <div className='rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300'>
        {props.label}：不限
      </div>
    )
  }
  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
        <span className='font-medium text-foreground'>{props.label}</span>
        <span className='text-muted-foreground text-xs'>
          {formatSubscriptionQuotaAmount(props.used)}/
          {formatSubscriptionQuotaAmount(props.total)} · 剩余{' '}
          {formatSubscriptionQuotaAmount(props.remain)}
        </span>
      </div>
      <Progress className={props.toneClass} value={props.percent} />
    </div>
  )
}

function InfoItem(props: { label: string; value: string }) {
  return (
    <div className='rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/70'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='mt-1 text-xs font-medium text-foreground'>
        {props.value}
      </div>
    </div>
  )
}
