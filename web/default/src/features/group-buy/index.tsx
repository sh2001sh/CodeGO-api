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
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { RefreshCw, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TitledCard } from '@/components/ui/titled-card'
import { SectionPageLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'
import { SubscriptionPurchaseDialog } from '@/features/subscriptions/components/dialogs/subscription-purchase-dialog'
import type {
  PlanRecord,
  SubscriptionPurchaseType,
} from '@/features/subscriptions/types'
import { getEpayMethods } from '@/features/wallet/components/subscription-plans-card'
import { useWalletWorkspace } from '@/features/wallet/hooks/use-wallet-workspace'
import { cn } from '@/lib/utils'
import { getGroupBuyList, getMyGroupBuys } from './api'
import { GroupBuyCard } from './components'
import type { GroupBuyItem } from './types'

export function GroupBuyPage() {
  const workspace = useWalletWorkspace()
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null)
  const [selectedPurchaseType, setSelectedPurchaseType] =
    useState<SubscriptionPurchaseType>('group_buy')
  const [selectedGroupBuyId, setSelectedGroupBuyId] = useState(0)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const listQuery = useQuery({
    queryKey: ['group-buy', 'list'],
    queryFn: getGroupBuyList,
  })
  const mineQuery = useQuery({
    queryKey: ['group-buy', 'mine'],
    queryFn: getMyGroupBuys,
  })
  const rooms = listQuery.data?.data?.data || []
  const myRooms = mineQuery.data?.data?.data || []
  const topupInfo = workspace.topupInfo
  const epayMethods = useMemo(
    () => getEpayMethods(topupInfo?.pay_methods),
    [topupInfo?.pay_methods]
  )
  const planById = useMemo(() => {
    const map = new Map<number, PlanRecord>()
    for (const record of workspace.publicPlans) map.set(record.plan.id, record)
    return map
  }, [workspace.publicPlans])
  const allSubscriptions = workspace.subscriptionData?.all_subscriptions || []
  const purchaseCountMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of allSubscriptions) {
      const planId = item.subscription?.plan_id
      if (planId) map.set(planId, (map.get(planId) || 0) + 1)
    }
    return map
  }, [allSubscriptions])
  const filteredRooms = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return rooms.filter((item) => {
      const title = item.plan_name.toLowerCase()
      const matchesKeyword = !normalized || title.includes(normalized)
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'monthly' && title.includes('月卡')) ||
        (typeFilter === 'weekly' && title.includes('周卡')) ||
        (typeFilter === 'daily' && title.includes('日卡'))
      return matchesKeyword && matchesType
    })
  }, [keyword, rooms, typeFilter])

  const refreshing = listQuery.isFetching || mineQuery.isFetching
  const openGroupPurchase = (item: GroupBuyItem) => {
    const plan = planById.get(item.plan_id)
    if (!plan) {
      toast.error('套餐配置仍在加载，请稍后重试')
      return
    }
    setSelectedPlan(plan)
    setSelectedPurchaseType(item.id > 0 ? 'join_group' : 'group_buy')
    setSelectedGroupBuyId(item.id > 0 ? item.id : 0)
    setPurchaseOpen(true)
  }

  return (
    <>
      <SectionPageLayout>
        <SiteSeo
          title='拼团大厅'
          description='查看正在进行中的套餐拼团，按月卡、周卡、日卡筛选并加入房间。'
          canonicalPath='/group-buy'
          robots='noindex,follow'
        />
        <SectionPageLayout.Title>拼团大厅</SectionPageLayout.Title>
        <SectionPageLayout.Description>
          每个套餐档位同时只有一个房间可加入，基础额度支付后立即生效；房间满
          5 人或到达 48 小时后，按实际人数统一补发赠额。
        </SectionPageLayout.Description>
        <SectionPageLayout.Content>
          <div className='mx-auto w-full max-w-6xl space-y-4'>
            <TitledCard
              title='正在拼团'
              description='筛选可参与房间，优先加入即将达到下一奖励档位的拼团。赠额会直接追加到对应套餐额度。'
              icon={<Users className='h-4 w-4' />}
              action={
                <Button
                  variant='outline'
                  size='sm'
                  disabled={refreshing}
                  onClick={() => {
                    void listQuery.refetch()
                    void mineQuery.refetch()
                  }}
                >
                  <RefreshCw
                    className={cn('mr-1 h-4 w-4', refreshing && 'animate-spin')}
                  />
                  刷新
                </Button>
              }
              contentClassName='space-y-4'
            >
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                  <TabsList className='h-auto flex-wrap justify-start'>
                    <TabsTrigger value='all'>全部</TabsTrigger>
                    <TabsTrigger value='monthly'>月卡</TabsTrigger>
                    <TabsTrigger value='weekly'>周卡</TabsTrigger>
                    <TabsTrigger value='daily'>日卡</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className='relative md:w-72'>
                  <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder='搜索套餐'
                    className='pl-9'
                  />
                </div>
              </div>

              {listQuery.isLoading ? (
                <div className='grid gap-3 lg:grid-cols-2'>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className='h-48 rounded-2xl' />
                  ))}
                </div>
              ) : filteredRooms.length > 0 ? (
                <div className='grid gap-3 lg:grid-cols-2'>
                  {filteredRooms.map((item) => (
                    <GroupBuyCard
                      key={`${item.plan_id}-${item.id}`}
                      item={item}
                      onPurchase={openGroupPurchase}
                    />
                  ))}
                </div>
              ) : (
                <EmptyGroupBuy />
              )}
            </TitledCard>

            <Tabs defaultValue='mine'>
              <TabsList>
                <TabsTrigger value='mine'>我的拼团</TabsTrigger>
                <TabsTrigger value='history'>历史记录</TabsTrigger>
              </TabsList>
              <TabsContent value='mine' className='mt-3'>
                <MyGroupList items={myRooms} loading={mineQuery.isLoading} />
              </TabsContent>
              <TabsContent value='history' className='mt-3'>
                <MyGroupList
                  items={myRooms.filter((item) => item.status !== 'pending')}
                  loading={mineQuery.isLoading}
                  onPurchase={openGroupPurchase}
                />
              </TabsContent>
            </Tabs>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <SubscriptionPurchaseDialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          setPurchaseOpen(open)
          if (!open) {
            void listQuery.refetch()
            void mineQuery.refetch()
            void workspace.fetchPublicPlans()
            void workspace.fetchSubscriptionData()
          }
        }}
        plan={selectedPlan}
        enableStripe={!!topupInfo?.enable_stripe_topup}
        enableCreem={!!topupInfo?.enable_creem_topup}
        enableOnlineTopUp={!!topupInfo?.enable_online_topup}
        epayMethods={epayMethods}
        purchaseLimit={selectedPlan?.plan?.max_purchase_per_user || undefined}
        purchaseCount={
          selectedPlan?.plan?.id
            ? purchaseCountMap.get(selectedPlan.plan.id)
            : undefined
        }
        purchaseType={selectedPurchaseType}
        groupBuyId={selectedGroupBuyId}
      />
    </>
  )
}

function EmptyGroupBuy() {
  return (
    <div className='border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-10 text-center text-sm'>
      当前没有正在进行的拼团。可先在套餐页选择支持拼团的套餐发起购买。
      <div className='mt-3'>
        <Button variant='outline' render={<Link to='/packages' />}>
          去套餐页
        </Button>
      </div>
    </div>
  )
}

function MyGroupList(props: {
  items: GroupBuyItem[]
  loading: boolean
  onPurchase?: (item: GroupBuyItem) => void
}) {
  if (props.loading) return <Skeleton className='h-32 rounded-2xl' />
  if (props.items.length === 0) {
    return (
      <div className='border-border text-muted-foreground rounded-2xl border border-dashed px-4 py-8 text-sm'>
        暂无拼团记录。进入或参与拼团后会显示在这里。
      </div>
    )
  }
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      {props.items.map((item) => (
        <GroupBuyCard
          key={`${item.plan_id}-${item.id}`}
          item={item}
          onPurchase={props.onPurchase}
        />
      ))}
    </div>
  )
}
