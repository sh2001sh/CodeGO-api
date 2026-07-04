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
import { Link } from '@tanstack/react-router'
import { Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { subscriptionQuotaUnitsToUSD } from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  SubscriptionPurchaseType,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import { PackagePlanCard } from './package-plan-card'

export function PlanZone(props: {
  title: string
  description: string
  plans: PlanRecord[]
  loading: boolean
  purchaseCountMap: Map<number, number>
  onPurchase: (
    record: PlanRecord,
    purchaseType?: SubscriptionPurchaseType
  ) => void
}) {
  return (
    <section className='space-y-3'>
      <div>
        <h3 className='text-foreground text-base font-semibold'>
          {props.title}
        </h3>
        <p className='text-muted-foreground mt-1 text-sm leading-6'>
          {props.description}
        </p>
      </div>
      {props.loading ? (
        <div className='grid gap-3 md:grid-cols-2 2xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className='h-56 rounded-2xl' />
          ))}
        </div>
      ) : props.plans.length > 0 ? (
        <div className='grid gap-3 md:grid-cols-2 2xl:grid-cols-4'>
          {props.plans.map((record) => (
            <PackagePlanCard
              key={record.plan.id}
              record={record}
              purchaseCount={props.purchaseCountMap.get(record.plan.id) || 0}
              onPurchase={(purchaseType) =>
                props.onPurchase(record, purchaseType)
              }
            />
          ))}
        </div>
      ) : (
        <div className='border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-sm'>
          当前分区暂无可购买套餐。
        </div>
      )}
    </section>
  )
}

export function CurrentPackagePanel(props: {
  subscriptions: UserSubscriptionRecord[]
  plans: PlanRecord[]
  loading: boolean
}) {
  const planMap = useMemo(() => {
    const map = new Map<number, PlanRecord['plan']>()
    for (const item of props.plans) map.set(item.plan.id, item.plan)
    return map
  }, [props.plans])
  const current = props.subscriptions[0]

  return (
    <TitledCard
      title='我的当前套餐'
      description='当前生效套餐、剩余额度与续费/升级入口。'
      icon={<Crown className='h-4 w-4' />}
    >
      {props.loading ? (
        <Skeleton className='h-28 rounded-2xl' />
      ) : current ? (
        <div className='space-y-3'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <div className='text-foreground text-lg font-semibold'>
                {planMap.get(current.subscription.plan_id)?.title ||
                  `套餐 #${current.subscription.plan_id}`}
              </div>
              <div className='text-muted-foreground mt-1 text-sm'>
                至{' '}
                {new Date(
                  current.subscription.end_time * 1000
                ).toLocaleDateString()}
              </div>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' render={<Link to='/packages' />}>
                续费
              </Button>
              <Button render={<Link to='/packages' />}>升级</Button>
            </div>
          </div>
          <Progress
            value={
              current.subscription.amount_total > 0
                ? Math.round(
                    (current.subscription.amount_used /
                      current.subscription.amount_total) *
                      100
                  )
                : 0
            }
          />
          <div className='text-muted-foreground text-sm'>
            剩余 $
            {Math.max(
              0,
              subscriptionQuotaUnitsToUSD(
                current.subscription.amount_total -
                  current.subscription.amount_used
              )
            ).toFixed(2)}
            /$
            {subscriptionQuotaUnitsToUSD(
              current.subscription.amount_total
            ).toFixed(2)}
          </div>
        </div>
      ) : (
        <div className='border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-8 text-sm'>
          你还没有生效套餐。可以先购买新人体验卡，或直接选择 Standard 月卡。
        </div>
      )}
    </TitledCard>
  )
}
