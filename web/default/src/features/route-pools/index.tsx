import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionPageLayout } from '@/components/layout'
import { getChannels } from '@/features/channels/api'
import { RoutePoolEditor } from './components/route-pool-editor'
import { RoutePoolInsights } from './components/route-pool-insights'
import { RoutePoolList } from './components/route-pool-list'
import {
  createBlankRoutePoolDraft,
  type FundingPolicy,
  type RoutePoolDetail,
  type RoutePoolMetrics,
} from './types'

type DailyEconomics = {
  recognized_revenue: number
  recognized_cost: number
  recognized_profit: number
  unattributed_cost: number
  sources: Array<{
    source: string
    quota: number
    revenue: number
    cost: number
    profit: number
  }>
}

const fundingSources: FundingPolicy['source'][] = [
  'topup',
  'blind_box',
  'subscription',
]

export function RoutePools() {
  return (
    <SectionPageLayout>
      <SectionPageLayout.Content>
        <RoutePoolsContent />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

export function RoutePoolsContent() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(createBlankRoutePoolDraft)
  const [model, setModel] = useState('')
  const [metricsPoolID, setMetricsPoolID] = useState<number | null>(null)
  const [policyOverrides, setPolicyOverrides] = useState<
    Partial<Record<FundingPolicy['source'], number>>
  >({})
  const pools = useQuery({
    queryKey: ['route-pools'],
    queryFn: async () =>
      (
        await api.get<{ data: { items: RoutePoolDetail[] } }>(
          '/api/route-pools/'
        )
      ).data.data.items,
  })
  const channels = useQuery({
    queryKey: ['route-pool-channels'],
    queryFn: async () =>
      (await getChannels({ p: 1, page_size: 1000 })).data?.items ?? [],
  })
  const policies = useQuery({
    queryKey: ['route-finance-policies'],
    queryFn: async () =>
      (
        await api.get<{ data: { items: FundingPolicy[] } }>(
          '/api/route-finance/policies'
        )
      ).data.data.items,
  })
  const metrics = useQuery({
    queryKey: ['route-pool-metrics', metricsPoolID, model],
    enabled: Boolean(metricsPoolID && model),
    queryFn: async () =>
      (
        await api.get<{ data: RoutePoolMetrics }>(
          `/api/route-pools/${metricsPoolID}/metrics`,
          { params: { model } }
        )
      ).data.data,
  })
  const daily = useQuery({
    queryKey: ['route-finance-daily'],
    queryFn: async () =>
      (await api.get<{ data: DailyEconomics }>('/api/route-finance/daily')).data
        .data,
  })
  const savePool = useMutation({
    mutationFn: () =>
      api[draft.id ? 'put' : 'post']('/api/route-pools/', draft),
    onSuccess: () => {
      toast.success('自动池已保存')
      queryClient.invalidateQueries({ queryKey: ['route-pools'] })
    },
    onError: () => toast.error('自动池保存失败'),
  })
  const deletePool = useMutation({
    mutationFn: (id: number) => api.delete(`/api/route-pools/${id}`),
    onSuccess: () => {
      toast.success('自动池已删除')
      setDraft(createBlankRoutePoolDraft())
      queryClient.invalidateQueries({ queryKey: ['route-pools'] })
    },
    onError: () => toast.error('自动池删除失败'),
  })
  const savePolicies = useMutation({
    mutationFn: (items: FundingPolicy[]) =>
      api.put('/api/route-finance/policies', { policies: items }),
    onSuccess: () => {
      toast.success('来源倍率已保存')
      queryClient.invalidateQueries({ queryKey: ['route-finance-policies'] })
    },
    onError: () => toast.error('来源倍率保存失败'),
  })

  const policyDraft = useMemo(
    () =>
      fundingSources.map((source) => ({
        source,
        revenue_multiplier:
          policyOverrides[source] ??
          policies.data?.find((policy) => policy.source === source)
            ?.revenue_multiplier ??
          0,
      })),
    [policies.data, policyOverrides]
  )

  const refresh = () => {
    pools.refetch()
    channels.refetch()
    policies.refetch()
    daily.refetch()
  }
  const queryFailed =
    pools.isError || channels.isError || policies.isError || daily.isError

  return (
    <div className='space-y-4'>
      <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-start'>
        <div>
          <h2 className='text-lg font-semibold'>智能路由池</h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            按渠道采购倍率和模型健康度自动选择。启用后，该分组不再使用渠道优先级或权重。
          </p>
        </div>
        <div className='flex shrink-0 gap-2'>
          <Button variant='outline' onClick={refresh}>
            <RefreshCw />
            刷新
          </Button>
          <Button onClick={() => setDraft(createBlankRoutePoolDraft())}>
            <Plus />
            新建自动池
          </Button>
        </div>
      </div>

      {queryFailed && (
        <Card className='border-destructive/40'>
          <CardContent className='flex items-center justify-between gap-3 py-4'>
            <div className='flex min-w-0 items-start gap-2 text-sm'>
              <AlertCircle className='text-destructive mt-0.5 size-4 shrink-0' />
              <div>
                <p className='font-medium'>路由池数据暂时无法加载</p>
                <p className='text-muted-foreground mt-1'>
                  请刷新重试；渠道配置和现有路由不会因此被修改。
                </p>
              </div>
            </div>
            <Button size='sm' variant='outline' onClick={refresh}>
              重试
            </Button>
          </CardContent>
        </Card>
      )}

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='space-y-4'>
          <RoutePoolEditor
            draft={draft}
            setDraft={setDraft}
            channels={channels.data ?? []}
            channelsLoading={channels.isLoading}
            saving={savePool.isPending}
            deleting={deletePool.isPending}
            onSave={() => savePool.mutate()}
            onDelete={() => deletePool.mutate(draft.id)}
          />
          <RoutePoolList
            pools={pools.data ?? []}
            loading={pools.isLoading}
            onEdit={(detail) =>
              setDraft({ ...detail.pool, members: detail.members })
            }
          />
        </div>
        <RoutePoolInsights
          pools={pools.data ?? []}
          model={model}
          selectedPoolID={metricsPoolID}
          metrics={metrics.data}
          metricsLoading={metrics.isFetching}
          daily={daily.data}
          policies={policyDraft}
          savingPolicies={savePolicies.isPending}
          onModelChange={setModel}
          onPoolChange={setMetricsPoolID}
          onPoliciesChange={(nextPolicies) =>
            setPolicyOverrides(
              Object.fromEntries(
                nextPolicies.map((policy) => [
                  policy.source,
                  policy.revenue_multiplier,
                ])
              )
            )
          }
          onSavePolicies={() => savePolicies.mutate(policyDraft)}
        />
      </div>
    </div>
  )
}
