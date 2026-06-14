import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Activity, Settings2, WalletCards } from 'lucide-react'
import { formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getPublicPlans } from '@/features/subscriptions/api'
import { getSubscriptionPlanSubtitle } from '@/features/subscriptions/lib'
import type { PlanRecord, SelfSubscriptionData } from '@/features/subscriptions/types'
import type { UserWalletData } from '../types'
import { ResetOpportunityEntryCard } from './reset-opportunity-entry-card'
import { SubscriptionClaudeConversionCard } from './subscription-claude-conversion-card'
import { WalletStatItem } from './wallet-panel-primitives'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
  subscriptionData?: SelfSubscriptionData | null
  subscriptionLoading?: boolean
  onSubscriptionRefresh?: () => Promise<void>
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const [planRecords, setPlanRecords] = useState<PlanRecord[]>([])

  const activeSubscriptions = props.subscriptionData?.subscriptions || []
  const resetOpportunity = props.subscriptionData?.reset_opportunity ?? {
    available_count: 0,
    earned_total: 0,
    used_total: 0,
    used_this_month: false,
    current_month: '',
    last_used_month: '',
  }

  useEffect(() => {
    let mounted = true
    const run = async () => {
      try {
        const result = await getPublicPlans()
        if (!mounted) return
        setPlanRecords(result.success ? result.data || [] : [])
      } catch {
        if (!mounted) return
        setPlanRecords([])
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [])

  const planTitles = useMemo(() => {
    const map: Record<number, { title: string; subtitle: string }> = {}
    for (const item of planRecords) {
      if (!item?.plan?.id) continue
      map[item.plan.id] = {
        title: item.plan.title || `套餐 #${item.plan.id}`,
        subtitle: getSubscriptionPlanSubtitle(item.plan) || '订阅',
      }
    }
    return map
  }, [planRecords])

  if (props.loading) {
    return (
      <aside className='space-y-4 lg:sticky lg:top-4'>
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className='app-page-shell p-4'
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
      <div className='app-page-shell p-4'>
        <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
          <WalletCards className='text-primary h-4 w-4' />
          钱包余额
        </div>
        <div className='text-foreground mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums'>
          {formatUsdAmount(quotaUnitsToUsd(props.user?.quota ?? 0))}
        </div>
        <div className='mt-4 grid gap-2'>
          <WalletStatItem
            label='Claude 余额'
            value={formatUsdAmount(quotaUnitsToUsd(props.user?.claude_quota ?? 0))}
          />
          <WalletStatItem
            label='累计消耗'
            value={formatUsdAmount(quotaUnitsToUsd(props.user?.used_quota ?? 0))}
          />
          <WalletStatItem
            label='API 请求'
            value={(props.user?.request_count ?? 0).toLocaleString()}
            icon={<Activity className='text-muted-foreground h-4 w-4' />}
          />
          <WalletStatItem label='生效订阅' value={`${activeSubscriptions.length}`} />
        </div>
      </div>

      <SubscriptionClaudeConversionCard
        subscriptionData={props.subscriptionData}
        loading={props.subscriptionLoading}
        planTitles={planTitles}
        onRefresh={props.onSubscriptionRefresh}
      />

      <ResetOpportunityEntryCard
        resetOpportunity={resetOpportunity}
        compact
        title='套餐额度刷新'
        description='活动规则和入口统一收口到活动中心，这里只保留状态摘要。'
      />

      <div className='app-subtle-panel p-4'>
        <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
          <Settings2 className='text-primary h-4 w-4' />
          活动与权益入口
        </div>
        <div className='text-muted-foreground mt-2 text-xs leading-5'>
          盲盒、邀请刷新、积分商城和 Claude 转换说明已经统一放到活动中心，不再在套餐页重复展开。
        </div>
        <Button
          variant='outline'
          className='mt-3 w-full'
          render={<Link to='/activities' />}
        >
          前往活动中心
        </Button>
      </div>
    </aside>
  )
}
