import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { getPointMallOverview } from '@/features/point-mall/api'
import { getSelfSubscriptionFull, getPublicPlans } from '@/features/subscriptions/api'
import {
  EMPTY_SUBSCRIPTIONS,
  getOrderedSubscriptions,
  getSubscriptionPlanSubtitle,
} from '@/features/subscriptions/lib'
import type { PlanRecord } from '@/features/subscriptions/types'
import {
  getAffiliateRewardsOverview,
  getBlindBoxSelf,
} from '@/features/wallet/api'
import { generateAffiliateLink } from '@/features/wallet/lib'

export function useActivitiesData() {
  const user = useAuthStore((state) => state.auth.user)

  const affiliateQuery = useQuery({
    queryKey: ['activities', 'affiliate-overview'],
    queryFn: getAffiliateRewardsOverview,
    enabled: Boolean(user?.id),
    staleTime: 60 * 1000,
  })

  const blindBoxQuery = useQuery({
    queryKey: ['activities', 'blind-box'],
    queryFn: getBlindBoxSelf,
    staleTime: 60 * 1000,
  })

  const pointMallQuery = useQuery({
    queryKey: ['activities', 'point-mall'],
    queryFn: getPointMallOverview,
    staleTime: 60 * 1000,
  })

  const subscriptionsQuery = useQuery({
    queryKey: ['activities', 'subscriptions'],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      return result.success
        ? (result.data ?? EMPTY_SUBSCRIPTIONS)
        : EMPTY_SUBSCRIPTIONS
    },
    staleTime: 60 * 1000,
  })

  const plansQuery = useQuery({
    queryKey: ['activities', 'plans'],
    queryFn: async () => {
      const result = await getPublicPlans()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const planMetaMap = useMemo(() => {
    const map = new Map<number, { title: string; subtitle: string }>()
    for (const item of plansQuery.data ?? []) {
      const plan = (item as PlanRecord).plan
      if (!plan?.id) continue
      map.set(plan.id, {
        title: plan.title || `套餐 #${plan.id}`,
        subtitle: getSubscriptionPlanSubtitle(plan) || '订阅',
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

  const affiliateOverview = affiliateQuery.data?.data
  const blindBoxData = blindBoxQuery.data?.data
  const blindBoxOverview = blindBoxData?.overview
  const pointMallOverview = pointMallQuery.data?.data
  const subscriptionData = subscriptionsQuery.data ?? EMPTY_SUBSCRIPTIONS
  const resetOpportunity = subscriptionData.reset_opportunity
  const conversionConfig = subscriptionData.conversion_config
  const affiliateLink = affiliateOverview?.affiliate_code
    ? generateAffiliateLink(affiliateOverview.affiliate_code)
    : ''

  const activePlan = orderedSubscriptions[0]?.subscription
  const activePlanMeta = activePlan
    ? planMetaMap.get(activePlan.plan_id)
    : undefined

  const eligibleConversionSubscriptions = orderedSubscriptions.filter(
    (item) => item.subscription.conversion_preview?.eligible
  )
  const totalConvertibleQuota = eligibleConversionSubscriptions.reduce(
    (sum, item) =>
      sum + Number(item.subscription.conversion_preview?.max_source_quota || 0),
    0
  )
  const totalConvertibleClaudeQuota = eligibleConversionSubscriptions.reduce(
    (sum, item) =>
      sum +
      Number(item.subscription.conversion_preview?.preview_claude_quota || 0),
    0
  )

  const isLoading =
    affiliateQuery.isPending ||
    blindBoxQuery.isPending ||
    pointMallQuery.isPending ||
    subscriptionsQuery.isPending

  return {
    user,
    isLoading,
    affiliateOverview,
    blindBoxData,
    blindBoxOverview,
    pointMallOverview,
    resetOpportunity,
    conversionConfig,
    affiliateLink,
    activePlan,
    activePlanMeta,
    orderedSubscriptions,
    eligibleConversionSubscriptions,
    totalConvertibleQuota,
    totalConvertibleClaudeQuota,
  }
}

export type ActivitiesData = ReturnType<typeof useActivitiesData>
