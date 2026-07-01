import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
} from '@/features/subscriptions/api'
import { EMPTY_SUBSCRIPTIONS } from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  SelfSubscriptionData,
} from '@/features/subscriptions/types'

export function useOverviewSubscriptionData() {
  const subscriptionsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscriptions'],
    queryFn: async (): Promise<SelfSubscriptionData> => {
      const result = await getSelfSubscriptionFull()
      return result.success
        ? (result.data ?? EMPTY_SUBSCRIPTIONS)
        : EMPTY_SUBSCRIPTIONS
    },
    staleTime: 60 * 1000,
  })

  const plansQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscription-plans'],
    queryFn: async (): Promise<PlanRecord[]> => {
      const result = await getPublicPlans()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const isLoading = subscriptionsQuery.isLoading || plansQuery.isLoading
  const isFetching = subscriptionsQuery.isFetching || plansQuery.isFetching

  return useMemo(
    () => ({
      subscriptionData: subscriptionsQuery.data ?? EMPTY_SUBSCRIPTIONS,
      plans: plansQuery.data ?? [],
      isLoading,
      isFetching,
      refetchSubscriptions: subscriptionsQuery.refetch,
      refetchPlans: plansQuery.refetch,
    }),
    [
      isFetching,
      isLoading,
      plansQuery.data,
      plansQuery.refetch,
      subscriptionsQuery.data,
      subscriptionsQuery.refetch,
    ]
  )
}
