import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  consumeSubscriptionResetOpportunity,
  getPublicPlans,
  updateBillingPreference,
} from '@/features/subscriptions/api'
import {
  getBillingPreferenceFromFundingSourceOrder,
  normalizeFundingSourceOrder,
} from '@/features/subscriptions/billing'
import { getSubscriptionPlanSubtitle } from '@/features/subscriptions/lib'
import type {
  FundingSource,
  PlanRecord,
  SelfSubscriptionData,
} from '@/features/subscriptions/types'
import type { UserWalletData } from '../types'
import { SubscriptionClaudeConversionCard } from './subscription-claude-conversion-card'
import { WalletBalancePanels } from './wallet-balance-panels'
import { WalletBillingOrderPanel } from './wallet-billing-order-panel'
import { WalletResetOpportunityPanel } from './wallet-reset-opportunity-panel'
import {
  getOrderedSubscriptions,
  type WalletPlanMeta,
} from './wallet-panel-utils'

const ALL_FUNDING_SOURCES: FundingSource[] = ['blind_box', 'subscription', 'wallet']

interface WalletPagePanelsProps {
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
  showBalancePanels?: boolean
}

export function WalletPagePanels(props: WalletPagePanelsProps) {
  const [draftFundingSourceOrder, setDraftFundingSourceOrder] = useState<
    FundingSource[]
  >(['blind_box', 'subscription', 'wallet'])
  const [draftOrderIds, setDraftOrderIds] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [usingResetOpportunity, setUsingResetOpportunity] = useState(false)
  const [planRecords, setPlanRecords] = useState<PlanRecord[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const showBalancePanels = props.showBalancePanels !== false

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
    const map = new Map<number, WalletPlanMeta>()
    for (const item of planRecords) {
      if (!item?.plan?.id) continue
      map.set(item.plan.id, {
        title: item.plan.title || '',
        subtitle: getSubscriptionPlanSubtitle(item.plan),
        plan: item.plan,
      })
    }
    return map
  }, [planRecords])

  const orderedSubscriptions = useMemo(
    () => getOrderedSubscriptions(activeSubscriptions, draftOrderIds),
    [activeSubscriptions, draftOrderIds]
  )

  const currentSubscription = orderedSubscriptions[0]?.subscription
  const currentSubscriptionPlanMeta = currentSubscription
    ? planMetaMap.get(currentSubscription.plan_id)
    : undefined
  const resetOpportunity = props.subscriptionData?.reset_opportunity ?? {
    available_count: 0,
    earned_total: 0,
    used_total: 0,
    used_this_month: false,
    current_month: '',
    last_used_month: '',
  }

  const disabledFundingSources = ALL_FUNDING_SOURCES.filter(
    (source) => !draftFundingSourceOrder.includes(source)
  )
  const subscriptionModeEnabled =
    draftFundingSourceOrder.includes('subscription')
  const isLoadingPanels =
    props.loading || props.subscriptionLoading || loadingPlans
  const canUseResetOpportunity =
    resetOpportunity.available_count > 0 &&
    !resetOpportunity.used_this_month &&
    !!currentSubscription

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
        toast.error(response.message || '保存扣费顺序失败')
        return
      }
      toast.success('扣费顺序已更新')
      await props.onSubscriptionRefresh?.()
    } catch {
      toast.error('保存扣费顺序失败')
    } finally {
      setSaving(false)
    }
  }

  const handleUseResetOpportunity = async () => {
    if (!canUseResetOpportunity || usingResetOpportunity) return
    setUsingResetOpportunity(true)
    try {
      const response = await consumeSubscriptionResetOpportunity()
      if (!response.success || !response.data) {
        toast.error(response.message || '使用额度重置机会失败')
        return
      }
      toast.success(
        `已清空${currentSubscriptionPlanMeta?.title || '当前订阅'}已用额度`
      )
      await props.onSubscriptionRefresh?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('subscription:changed'))
      }
    } catch {
      toast.error('使用额度重置机会失败')
    } finally {
      setUsingResetOpportunity(false)
    }
  }

  if (props.loading) {
    return (
      <div className='grid gap-4 lg:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className='app-page-shell p-4'
          >
            <Skeleton className='h-5 w-28' />
            <Skeleton className='mt-3 h-10 w-full' />
            <Skeleton className='mt-3 h-10 w-full' />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {showBalancePanels ? (
        <WalletBalancePanels
          user={props.user}
          topupLink={props.topupLink}
          redemptionCode={props.redemptionCode}
          onRedemptionCodeChange={props.onRedemptionCodeChange}
          onRedeem={props.onRedeem}
          redeeming={props.redeeming}
        />
      ) : null}

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.92fr)]'>
        <SubscriptionClaudeConversionCard
          subscriptionData={props.subscriptionData}
          loading={props.subscriptionLoading}
          planTitles={Object.fromEntries(
            Array.from(planMetaMap.entries()).map(([id, value]) => [
              id,
              {
                title: value.title || `套餐 #${id}`,
                subtitle: value.subtitle || '订阅',
              },
            ])
          )}
          onRefresh={props.onSubscriptionRefresh}
        />

        <WalletResetOpportunityPanel
          resetOpportunity={resetOpportunity}
          currentSubscriptionTitle={currentSubscriptionPlanMeta?.title}
          canUseResetOpportunity={canUseResetOpportunity}
          usingResetOpportunity={usingResetOpportunity}
          onUseResetOpportunity={() => void handleUseResetOpportunity()}
        />
      </div>

      <WalletBillingOrderPanel
        draftFundingSourceOrder={draftFundingSourceOrder}
        disabledFundingSources={disabledFundingSources}
        subscriptionModeEnabled={subscriptionModeEnabled}
        hasActiveSubscriptions={hasActiveSubscriptions}
        orderedSubscriptions={orderedSubscriptions}
        planMetaMap={planMetaMap}
        saving={saving}
        isLoading={isLoadingPanels}
        subscriptionLoading={props.subscriptionLoading}
        onRefresh={() => void props.onSubscriptionRefresh?.()}
        onSave={() => void handleSave()}
        onResetFundingSourceOrder={resetFundingSourceOrder}
        onResetSubscriptionOrder={resetSubscriptionOrder}
        onToggleFundingSource={toggleFundingSource}
        onMoveFundingSource={moveFundingSource}
        onMoveSubscription={moveSubscription}
      />
    </div>
  )
}
