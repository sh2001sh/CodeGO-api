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
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { getPublicPlans } from '@/features/subscriptions/api'
import { SubscriptionPurchaseDialog } from '@/features/subscriptions/components/dialogs/subscription-purchase-dialog'
import {
  formatDuration,
  formatSubscriptionPlanPrice,
  formatSubscriptionQuotaAmount,
  getSubscriptionPlanActionLabel,
  getSubscriptionPlanDescription,
  getSubscriptionPlanDetailText,
  getSubscriptionPlanDiscountText,
  getSubscriptionPlanSubtitle,
  isDayPassPlan,
  isMonthlyCardPlan,
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
          summary: '适合当天高频开发、模型压力测试和临时加量场景。',
        }
      : {
          badge: '临时补充',
          summary: '适合单日使用、应急续航和短时专项任务。',
        }
  }

  if (title.includes('ultra')) {
    return {
      badge: '旗舰月卡',
      summary: '面向高频 Code Go 开发、长链路代理调用和团队协作场景。',
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
      summary: '适合第一次购买套餐，先建立稳定的开发节奏。',
    }
  }
  return {
    badge: isDayPassPlan(plan) ? '日卡' : '月卡',
    summary: '适合希望额度边界明确、预算稳定的使用场景。',
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

  const planMap = useMemo(() => {
    const map = new Map<number, PlanRecord['plan']>()
    for (const item of plans) {
      if (!item?.plan?.id) continue
      map.set(item.plan.id, item.plan)
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
    const isMonthlyPlan = isMonthlyCardPlan(plan)
    const blockedReason =
      normalizeSubscriptionText(record.disabled_reason) ||
      '当前已有更高等级的生效套餐，暂不支持降级订阅。'

    return (
      <CardStaggerItem key={plan.id} className='h-full'>
        <Card
          className={cn(
            'border-border bg-card flex h-full flex-col overflow-hidden rounded-[20px] shadow-none',
            isRecommended && 'border-primary/50 ring-primary/15 ring-2'
          )}
        >
          <CardContent className='flex flex-1 flex-col gap-4 p-5'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-primary text-[11px] font-medium'>
                  {getSubscriptionPlanSubtitle(plan)}
                </p>
                <div className='mt-1.5 flex flex-wrap items-center gap-2'>
                  <h4 className='text-foreground truncate text-xl font-semibold tracking-tight'>
                    {title}
                  </h4>
                  <span className='border-border bg-accent text-accent-foreground rounded-full border px-2.5 py-1 text-[11px]'>
                    {presentation.badge}
                  </span>
                </div>
                <p className='text-muted-foreground mt-2 text-sm leading-6'>
                  {presentation.summary}
                </p>
              </div>

              <div className='shrink-0 text-right'>
                {isRecommended ? (
                  <div className='bg-primary/10 text-primary mb-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium'>
                    <Sparkles className='mr-1 h-3.5 w-3.5' />
                    推荐
                  </div>
                ) : null}
                <div className='text-primary text-2xl font-semibold tracking-tight'>
                  {displayPrice}
                </div>
                <div className='text-muted-foreground mt-1 text-xs'>
                  人民币 / 套餐
                </div>
                {effectiveAmount !== priceAmount ? (
                  <div className='text-muted-foreground mt-1 text-xs line-through'>
                    {formatSubscriptionPlanPrice(priceAmount, plan.currency)}
                  </div>
                ) : null}
              </div>
            </div>

            {discountText ? (
              <div className='border-border bg-background/80 text-foreground inline-flex w-fit rounded-full border px-3 py-1 text-[12px] font-semibold'>
                {discountText}
              </div>
            ) : null}

            <div className='border-border bg-muted/40 divide-border divide-y rounded-2xl border'>
              <SpecRow label='有效期' value={formatDuration(plan, t)} />
              <SpecRow
                label={
                  isMonthlyPlan
                    ? '本月可用额度'
                    : periodAmount > 0
                      ? '周期额度'
                      : '套餐额度'
                }
                value={
                  !isMonthlyPlan && periodAmount > 0
                    ? formatSubscriptionQuotaAmount(periodAmount)
                    : totalAmount > 0
                      ? formatSubscriptionQuotaAmount(totalAmount)
                      : '不限'
                }
              />
              {!isMonthlyPlan ? (
                <SpecRow
                  label='总额度'
                  value={
                    totalAmount > 0
                      ? formatSubscriptionQuotaAmount(totalAmount)
                      : '不限'
                  }
                />
              ) : null}
              <SpecRow
                label='套餐类型'
                value={isDayPassPlan(plan) ? '独立日卡' : '月卡'}
              />
            </div>

            <div className='space-y-1.5'>
              <p className='text-muted-foreground text-sm leading-6'>
                {summaryText}
              </p>
              <p className='text-muted-foreground text-xs leading-5'>
                {detailText}
              </p>
            </div>

            <div className='mt-auto space-y-2 pt-1'>
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
                <p className='text-warning-foreground dark:text-warning text-xs'>
                  已达到该套餐购买上限（{count}/{limit}）。
                </p>
              ) : null}
              {record.action === 'disabled' ? (
                <p className='text-warning-foreground dark:text-warning text-xs'>
                  {blockedReason}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </CardStaggerItem>
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
              <RefreshCw
                className={cn('h-4 w-4', refreshing && 'animate-spin')}
              />
            </Button>
          }
          contentClassName='space-y-4'
        >
          <div className='border-border bg-muted/40 text-muted-foreground rounded-2xl border px-4 py-3 text-sm leading-6'>
            套餐额度用于 GPT 模型调用；Claude
            模型使用独立钱包额度，不直接从套餐中扣除。生效中的套餐额度可按当前规则比例转换为
            Claude 额度。
          </div>

          {allSubscriptions.length > 0 ? (
            <section className='app-subtle-panel space-y-4 p-4 shadow-none'>
              <div>
                <div className='text-foreground text-base font-semibold tracking-tight'>
                  我的订阅
                </div>
                <p className='text-muted-foreground mt-1 text-sm leading-6'>
                  先确认当前生效的订阅与额度，再决定是否加购。月卡只展示本月可用额度，不展示周期重置。
                </p>
              </div>

              <CardStaggerContainer className='grid gap-3 xl:grid-cols-2'>
                {allSubscriptions.map((record) => {
                  const subscription = record.subscription
                  const title =
                    planTitleMap.get(subscription.plan_id) ||
                    `订阅 #${subscription.id}`
                  const relatedPlan = planMap.get(subscription.plan_id)
                  const totalAmount = Number(subscription.amount_total || 0)
                  const usedAmount = Number(subscription.amount_used || 0)
                  const totalRemain =
                    totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
                  const periodAmount = Number(subscription.period_amount || 0)
                  const periodUsed = Number(subscription.period_used || 0)
                  const periodRemain =
                    periodAmount > 0
                      ? Math.max(0, periodAmount - periodUsed)
                      : 0
                  const isMonthlyPlan = isMonthlyCardPlan(relatedPlan)
                  const isDayPass = isDayPassPlan(relatedPlan)
                  const totalPercent = getUsagePercent(usedAmount, totalAmount)
                  const periodPercent = getUsagePercent(
                    periodUsed,
                    periodAmount
                  )
                  const remainDays = getRemainingDays(record)
                  const active =
                    subscription.status === 'active' &&
                    subscription.end_time > Date.now() / 1000
                  const totalExhausted = totalAmount > 0 && totalRemain <= 0
                  const periodExhausted =
                    !isMonthlyPlan &&
                    periodAmount > 0 &&
                    periodRemain <= 0 &&
                    totalRemain > 0
                  const statusLabel = active
                    ? totalExhausted
                      ? '额度已用完'
                      : periodExhausted
                        ? '等待下次重置'
                        : '生效中'
                    : subscription.status === 'cancelled'
                      ? '已取消'
                      : '已过期'
                  const scopedUsageLabel = isMonthlyPlan
                    ? '本月可用额度'
                    : '周期额度'
                  const totalUsageLabel = isMonthlyPlan
                    ? '本月可用额度'
                    : isDayPass
                      ? '日卡额度'
                      : '总额度'

                  return (
                    <CardStaggerItem key={subscription.id} className='h-full'>
                      <Card className='border-border bg-card h-full shadow-none'>
                        <CardContent className='space-y-3 p-4'>
                          <div className='flex flex-wrap items-start justify-between gap-2'>
                            <div>
                              <div className='flex flex-wrap items-center gap-2'>
                                <div className='text-foreground font-semibold'>
                                  {title}
                                </div>
                                <span className='border-border bg-card text-muted-foreground rounded-full border px-2 py-0.5 text-[11px]'>
                                  {statusLabel}
                                </span>
                              </div>
                              <p className='text-muted-foreground mt-1 text-xs'>
                                {active
                                  ? `剩余 ${remainDays} 天`
                                  : '该订阅已结束'}{' '}
                                · 到期时间{' '}
                                {new Date(
                                  subscription.end_time * 1000
                                ).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {!isMonthlyPlan && periodAmount > 0 ? (
                            <UsageBlock
                              label={scopedUsageLabel}
                              used={periodUsed}
                              total={periodAmount}
                              remain={periodRemain}
                              percent={periodPercent}
                              toneClass='[&_[data-slot=progress-indicator]]:bg-chart-4'
                            />
                          ) : null}

                          <UsageBlock
                            label={totalUsageLabel}
                            used={usedAmount}
                            total={totalAmount}
                            remain={totalRemain}
                            percent={totalPercent}
                            toneClass='[&_[data-slot=progress-indicator]]:bg-primary'
                          />

                          <div className='grid gap-2 sm:grid-cols-2'>
                            {!isMonthlyPlan ? (
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
                            ) : null}
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
                    </CardStaggerItem>
                  )
                })}
              </CardStaggerContainer>
            </section>
          ) : null}

          <PlanSection
            title='月卡套餐'
            description='适合长期使用 GPT 系列模型。月卡有效期 1 个月，购买的总额度就是本月可用额度，一个月内可自由使用。'
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
    <section className='app-subtle-panel p-4 shadow-none'>
      <div className='mb-4'>
        <h3 className='text-foreground text-base font-semibold tracking-tight'>
          {props.title}
        </h3>
        <p className='text-muted-foreground mt-1.5 text-sm leading-6'>
          {props.description}
        </p>
      </div>

      {props.loading ? (
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3'>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className='h-[280px] w-full rounded-[20px]' />
          ))}
        </div>
      ) : childArray.length > 0 ? (
        <CardStaggerContainer className='grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3'>
          {childArray}
        </CardStaggerContainer>
      ) : (
        <div className='border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-8 text-sm'>
          {props.emptyText}
        </div>
      )}
    </section>
  )
}

function SpecRow(props: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between gap-3 px-3.5 py-2.5'>
      <div className='text-muted-foreground text-xs font-medium tracking-wide'>
        {props.label}
      </div>
      <div className='text-foreground text-sm font-semibold tabular-nums'>
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
      <div className='app-subtle-panel text-muted-foreground p-3 text-sm'>
        {props.label}：不限
      </div>
    )
  }
  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap items-center justify-between gap-2 text-sm'>
        <span className='text-foreground font-medium'>{props.label}</span>
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
    <div className='border-border bg-muted/50 rounded-xl border px-3 py-2.5'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='text-foreground mt-1 text-xs font-medium'>
        {props.value}
      </div>
    </div>
  )
}
