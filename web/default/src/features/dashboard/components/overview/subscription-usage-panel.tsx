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
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarClock, Crown, RotateCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
} from '@/features/subscriptions/api'
import type { UserSubscriptionRecord } from '@/features/subscriptions/types'

function clampPercent(used: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)))
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

export function SubscriptionUsagePanel() {
  const { t } = useTranslation()

  const subscriptionsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscriptions'],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      return result.success ? (result.data?.subscriptions ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const plansQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscription-plans'],
    queryFn: async () => {
      const result = await getPublicPlans()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const planTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of plansQuery.data ?? []) {
      if (item?.plan?.id) {
        map.set(item.plan.id, item.plan.title || '')
      }
    }
    return map
  }, [plansQuery.data])

  const subscriptions = subscriptionsQuery.data ?? []
  const isLoading = subscriptionsQuery.isLoading || plansQuery.isLoading

  return (
    <div className='bg-card overflow-hidden rounded-2xl border shadow-xs'>
      <div className='flex flex-wrap items-start justify-between gap-3 border-b p-4 sm:p-5'>
        <div className='flex min-w-0 items-start gap-3'>
          <span className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl'>
            <Crown className='size-4' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <h3 className='text-base font-semibold'>{t('My Subscriptions')}</h3>
            <p className='text-muted-foreground text-sm'>
              {t('Subscribe to a plan for model access')}
            </p>
          </div>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => subscriptionsQuery.refetch()}
          disabled={subscriptionsQuery.isFetching}
        >
          <RotateCw
            data-icon='inline-start'
            className={cn(subscriptionsQuery.isFetching && 'animate-spin')}
          />
          {t('Refresh')}
        </Button>
      </div>

      <div className='p-4 sm:p-5'>
        {isLoading ? (
          <div className='grid gap-3 lg:grid-cols-2'>
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className='bg-background/60 min-h-44 animate-pulse rounded-xl border'
              />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-10 text-center'>
            <div className='bg-muted flex size-12 items-center justify-center rounded-full'>
              <CalendarClock className='text-muted-foreground size-5' />
            </div>
            <div>
              <div className='font-medium'>{t('No Active')}</div>
              <p className='text-muted-foreground mt-1 text-sm'>
                {t('Subscribe to a plan for model access')}
              </p>
            </div>
            <Button size='sm' render={<Link to='/wallet' />}>
              {t('Wallet')}
            </Button>
          </div>
        ) : (
          <div className='grid gap-3 xl:grid-cols-2'>
            {subscriptions.map((record) => {
              const subscription = record.subscription
              const totalAmount = Number(subscription?.amount_total || 0)
              const usedAmount = Number(subscription?.amount_used || 0)
              const periodAmount = Number(subscription?.period_amount || 0)
              const periodUsed = Number(subscription?.period_used || 0)
              const totalRemain =
                totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
              const periodRemain =
                periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0
              const totalPercent = clampPercent(usedAmount, totalAmount)
              const periodPercent = clampPercent(periodUsed, periodAmount)
              const remainDays = getRemainingDays(subscription?.end_time)
              const planTitle =
                planTitleMap.get(subscription?.plan_id) ||
                `${t('Subscription')} #${subscription?.id}`

              return (
                <SubscriptionCard
                  key={subscription?.id}
                  record={record}
                  planTitle={planTitle}
                  remainDays={remainDays}
                  totalAmount={totalAmount}
                  usedAmount={usedAmount}
                  totalRemain={totalRemain}
                  totalPercent={totalPercent}
                  periodAmount={periodAmount}
                  periodUsed={periodUsed}
                  periodRemain={periodRemain}
                  periodPercent={periodPercent}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SubscriptionCard(props: {
  record: UserSubscriptionRecord
  planTitle: string
  remainDays: number
  totalAmount: number
  usedAmount: number
  totalRemain: number
  totalPercent: number
  periodAmount: number
  periodUsed: number
  periodRemain: number
  periodPercent: number
}) {
  const { t } = useTranslation()
  const subscription = props.record.subscription

  return (
    <div className='bg-background/60 rounded-xl border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <div className='font-medium'>{props.planTitle}</div>
          <div className='text-muted-foreground mt-1 text-xs'>
            {t('{{count}} days remaining', { count: props.remainDays })}
          </div>
        </div>
        <span className='bg-success/10 text-success rounded-full px-2.5 py-1 text-xs font-medium'>
          {t('Active')}
        </span>
      </div>

      <div className='mt-4 space-y-3'>
        {props.periodAmount > 0 && (
          <QuotaProgressBlock
            title={t('Period Quota')}
            current={props.periodUsed}
            total={props.periodAmount}
            remain={props.periodRemain}
            percent={props.periodPercent}
            toneClass='[&_[data-slot=progress-indicator]]:bg-success'
          />
        )}

        <QuotaProgressBlock
          title={t('Total Quota')}
          current={props.usedAmount}
          total={props.totalAmount}
          remain={props.totalRemain}
          percent={props.totalPercent}
          unlimitedLabel={t('Unlimited')}
          toneClass='[&_[data-slot=progress-indicator]]:bg-primary'
        />
      </div>

      <div className='mt-4 grid gap-2 text-xs sm:grid-cols-2'>
        <InfoItem
          label={t('Next reset')}
          value={
            (subscription?.next_reset_time ?? 0) > 0
              ? formatDateTime(subscription?.next_reset_time)
              : '--'
          }
        />
        <InfoItem
          label={t('Until')}
          value={formatDateTime(subscription?.end_time)}
        />
      </div>
    </div>
  )
}

function QuotaProgressBlock(props: {
  title: string
  current: number
  total: number
  remain: number
  percent: number
  toneClass?: string
  unlimitedLabel?: string
}) {
  const { t } = useTranslation()
  const hasLimit = props.total > 0

  return (
    <div className='space-y-1.5'>
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs'>
        <span className='text-foreground font-medium'>{props.title}</span>
        <span className='text-muted-foreground'>
          {hasLimit
            ? `${formatQuota(props.current)}/${formatQuota(props.total)} · ${t('Used')} ${props.percent}% · ${t('Remaining')} ${formatQuota(props.remain)}`
            : props.unlimitedLabel}
        </span>
      </div>
      {hasLimit ? (
        <Progress className={props.toneClass} value={props.percent} />
      ) : (
        <div className='bg-muted h-1 rounded-full' />
      )}
    </div>
  )
}

function InfoItem(props: { label: string; value: string }) {
  return (
    <div className='rounded-lg border px-3 py-2'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='mt-1 text-xs font-medium'>{props.value}</div>
    </div>
  )
}
