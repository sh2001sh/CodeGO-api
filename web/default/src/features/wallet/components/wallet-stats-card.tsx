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
import { Activity, BarChart3, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import type { SelfSubscriptionData } from '@/features/subscriptions/types'
import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
  subscriptionData?: SelfSubscriptionData | null
  subscriptionLoading?: boolean
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()

  const billingPreferenceLabelMap: Record<string, string> = {
    subscription_first: '订阅优先，余额兜底',
    wallet_first: '余额优先，订阅兜底',
    subscription_only: '仅从订阅扣费',
    wallet_only: '仅从余额扣费',
  }

  const activeSubscriptions = props.subscriptionData?.subscriptions || []
  const shouldShowSubscriptionSummary =
    props.subscriptionData !== undefined || props.subscriptionLoading !== undefined

  const renderSubscriptionSummary = () => {
    if (props.subscriptionLoading) {
      return (
        <div className='grid gap-3 sm:grid-cols-2'>
          <Skeleton className='h-20 rounded-2xl' />
          <Skeleton className='h-20 rounded-2xl' />
        </div>
      )
    }

    return (
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3'>
          <div className='text-muted-foreground text-[11px] font-medium tracking-wide'>
            当前扣费方式
          </div>
          <div className='mt-1 text-sm font-semibold text-slate-950'>
            {billingPreferenceLabelMap[
              props.subscriptionData?.billing_preference || 'subscription_first'
            ] || '订阅优先，余额兜底'}
          </div>
          <p className='text-muted-foreground mt-2 text-xs leading-5'>
            默认扣费顺序为日卡优先，其次月卡；详细顺序可在概览页继续调整。
          </p>
        </div>

        <div className='rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3'>
          <div className='text-muted-foreground text-[11px] font-medium tracking-wide'>
            当前订阅
          </div>
          {activeSubscriptions.length > 0 ? (
            <div className='mt-2 flex flex-wrap gap-2'>
              {activeSubscriptions.slice(0, 3).map((item) => {
                const endTime = item.subscription?.end_time || 0
                const remainDays = endTime
                  ? Math.max(
                      0,
                      Math.ceil((endTime - Date.now() / 1000) / 86400)
                    )
                  : 0

                return (
                  <div
                    key={item.subscription.id}
                    className='rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700'
                  >
                    订阅 #{item.subscription.id} · 剩余 {remainDays} 天
                  </div>
                )
              })}
            </div>
          ) : (
            <div className='mt-1 text-sm font-semibold text-slate-950'>
              当前无有效订阅
            </div>
          )}
          <p className='text-muted-foreground mt-2 text-xs leading-5'>
            套餐额度与余额分开结算；日卡额度不会并入月卡总额度。
          </p>
        </div>
      </div>
    )
  }

  if (props.loading) {
    return (
      <div className='grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]'>
        <div className='rounded-[24px] border bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='mt-3 h-10 w-40' />
          <Skeleton className='mt-2 h-4 w-52' />
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            <Skeleton className='h-20 rounded-2xl' />
            <Skeleton className='h-20 rounded-2xl' />
          </div>
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className='rounded-[24px] border bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]'
          >
            <Skeleton className='h-4 w-24' />
            <Skeleton className='mt-3 h-8 w-28' />
            <Skeleton className='mt-2 h-4 w-24' />
          </div>
        ))}
      </div>
    )
  }

  const stats = [
    {
      label: t('Total Usage'),
      value: formatQuota(props.user?.used_quota ?? 0),
      description: t('Total consumed quota'),
      icon: BarChart3,
    },
    {
      label: t('API Requests'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
      description: t('Total requests made'),
      icon: Activity,
    },
  ]

  return (
    <div className='grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)]'>
      <div className='rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]'>
        <div className='flex items-center gap-2'>
          <WalletCards className='text-muted-foreground/70 size-4 shrink-0' />
          <div className='text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase'>
            当前余额
          </div>
        </div>
        <div className='mt-3 font-mono text-3xl font-bold tracking-tight text-slate-950 tabular-nums'>
          {formatQuota(props.user?.quota ?? 0)}
        </div>
        <p className='text-muted-foreground mt-2 text-sm leading-6'>
          {shouldShowSubscriptionSummary
            ? '这里集中展示余额、当前订阅与扣费方式，进入页面就能直接判断是否需要补充套餐。'
            : '这里展示当前余额与基础使用概况，方便快速判断可用额度。'}
        </p>
        {shouldShowSubscriptionSummary ? (
          <div className='mt-4'>{renderSubscriptionSummary()}</div>
        ) : null}
      </div>

      {stats.map((item) => (
        <div
          key={item.label}
          className='rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]'
        >
          <div className='flex items-center gap-2'>
            <item.icon className='text-muted-foreground/70 size-4 shrink-0' />
            <div className='flex items-center gap-2'>
              <div className='text-muted-foreground truncate text-xs font-medium tracking-[0.18em] uppercase'>
                {item.label}
              </div>
            </div>
          </div>
          <div className='mt-3 font-mono text-2xl font-bold tracking-tight text-slate-950 tabular-nums'>
            {item.value}
          </div>
          <div className='text-muted-foreground mt-2 text-sm leading-6'>
            {item.description}
          </div>
        </div>
      ))}
    </div>
  )
}
