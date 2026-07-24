import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { SectionPageLayout } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'

type Member = { channel_id: number; cost_multiplier: number; model_cost_overrides: string; enabled: boolean }
type Pool = { id: number; name: string; group: string; enabled: boolean }
type PoolDetail = { pool: Pool; members: Member[] }
type Policy = { source: 'topup' | 'blind_box' | 'subscription'; revenue_multiplier: number }
type Metrics = { members: Array<{ channel_id: number; channel_name: string; eligible: boolean; score: number; health: { state: string; success_rate_5m: number; ttft_p50_ms: number; ttft_p95_ms: number; cooling_until?: string } }> }
type Draft = Pool & { members: Member[] }

const blankDraft = (): Draft => ({ id: 0, name: '', group: '', enabled: true, members: [] })

export function RoutePools() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [model, setModel] = useState('')
  const [metricsPoolID, setMetricsPoolID] = useState<number | null>(null)
  const [policyDraft, setPolicyDraft] = useState<Policy[]>([])
  const pools = useQuery({ queryKey: ['route-pools'], queryFn: async () => (await api.get<{ data: { items: PoolDetail[] } }>('/api/route-pools')).data.data.items })
  const policies = useQuery({ queryKey: ['route-finance-policies'], queryFn: async () => (await api.get<{ data: { items: Policy[] } }>('/api/route-finance/policies')).data.data.items })
  const metrics = useQuery({ queryKey: ['route-pool-metrics', metricsPoolID, model], enabled: Boolean(metricsPoolID && model), queryFn: async () => (await api.get<{ data: Metrics }>(`/api/route-pools/${metricsPoolID}/metrics`, { params: { model } })).data.data })
  const daily = useQuery({ queryKey: ['route-finance-daily'], queryFn: async () => (await api.get<{ data: { recognized_revenue: number; recognized_cost: number; recognized_profit: number; unattributed_cost: number; sources: Array<{ source: string; quota: number; revenue: number; cost: number; profit: number }> } }>('/api/route-finance/daily')).data.data })
  const savePool = useMutation({ mutationFn: () => api[draft.id ? 'put' : 'post']('/api/route-pools', draft), onSuccess: () => { toast.success('自动池已保存'); queryClient.invalidateQueries({ queryKey: ['route-pools'] }) }, onError: () => toast.error('自动池保存失败') })
  const deletePool = useMutation({ mutationFn: (id: number) => api.delete(`/api/route-pools/${id}`), onSuccess: () => { toast.success('自动池已删除'); setDraft(blankDraft()); queryClient.invalidateQueries({ queryKey: ['route-pools'] }) }, onError: () => toast.error('自动池删除失败') })
  const savePolicies = useMutation({ mutationFn: (items: Policy[]) => api.put('/api/route-finance/policies', { policies: items }), onSuccess: () => { toast.success('来源倍率已保存'); queryClient.invalidateQueries({ queryKey: ['route-finance-policies'] }) }, onError: () => toast.error('来源倍率保存失败') })
  useEffect(() => {
    if (!policies.data) return
    setPolicyDraft(['topup', 'blind_box', 'subscription'].map((source) => policies.data.find((policy) => policy.source === source) ?? { source, revenue_multiplier: 0 }) as Policy[])
  }, [policies.data])

  const updateMember = (index: number, patch: Partial<Member>) => setDraft((current) => ({ ...current, members: current.members.map((member, memberIndex) => memberIndex === index ? { ...member, ...patch } : member) }))

  return <SectionPageLayout>
    <SectionPageLayout.Title>智能路由池</SectionPageLayout.Title>
    <SectionPageLayout.Description>按渠道采购倍率和模型健康度自动选择，已启用分组不再使用优先级或权重。</SectionPageLayout.Description>
    <SectionPageLayout.Actions><Button variant='outline' onClick={() => { pools.refetch(); policies.refetch(); daily.refetch() }}><RefreshCw />刷新</Button><Button onClick={() => setDraft(blankDraft())}><Plus />新建自动池</Button></SectionPageLayout.Actions>
    <SectionPageLayout.Content><div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
      <div className='space-y-4'>
        <Card><CardHeader><CardTitle>{draft.id ? '编辑自动池' : '新建自动池'}</CardTitle><CardDescription>每个分组只能有一个自动池。采购倍率只供 Root 的路由和报表使用。</CardDescription></CardHeader><CardContent className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2'><div className='space-y-1.5'><Label htmlFor='pool-name'>名称</Label><Input id='pool-name' value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div><div className='space-y-1.5'><Label htmlFor='pool-group'>分组</Label><Input id='pool-group' value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value })} /></div></div>
          <div className='flex items-center justify-between border-y py-3'><div><p className='font-medium'>启用自动选择</p><p className='text-muted-foreground text-xs'>关闭后该分组恢复原有优先级和权重路由。</p></div><Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} /></div>
          <div className='space-y-2'><div className='flex items-center justify-between'><Label>成员渠道</Label><Button size='sm' variant='outline' onClick={() => setDraft({ ...draft, members: [...draft.members, { channel_id: 0, cost_multiplier: 1, model_cost_overrides: '{}', enabled: true }] })}><Plus />添加渠道</Button></div>
            {draft.members.map((member, index) => <div key={`${member.channel_id}-${index}`} className='grid gap-2 rounded-lg border p-3 md:grid-cols-[112px_132px_minmax(0,1fr)_auto_auto]'><Input aria-label='渠道 ID' type='number' value={member.channel_id || ''} placeholder='渠道 ID' onChange={(event) => updateMember(index, { channel_id: Number(event.target.value) })} /><Input aria-label='采购倍率' type='number' min='0.0001' step='0.0001' value={member.cost_multiplier} onChange={(event) => updateMember(index, { cost_multiplier: Number(event.target.value) })} /><Textarea aria-label='模型覆盖倍率 JSON' className='min-h-8 resize-y py-1.5 text-xs' value={member.model_cost_overrides} onChange={(event) => updateMember(index, { model_cost_overrides: event.target.value })} /><Switch aria-label='启用渠道成员' checked={member.enabled} onCheckedChange={(enabled) => updateMember(index, { enabled })} /><Button size='icon-sm' variant='ghost' aria-label='移除渠道成员' onClick={() => setDraft({ ...draft, members: draft.members.filter((_, memberIndex) => memberIndex !== index) })}><Trash2 /></Button></div>)}
            {draft.members.length === 0 && <p className='text-muted-foreground rounded-lg border border-dashed px-3 py-5 text-sm'>添加可用渠道后，系统才会接管该分组的请求选择。</p>}
          </div>
          <div className='flex justify-end gap-2'>{draft.id > 0 && <Button variant='destructive' onClick={() => deletePool.mutate(draft.id)} disabled={deletePool.isPending}><Trash2 />删除</Button>}<Button onClick={() => savePool.mutate()} disabled={savePool.isPending}><Save />保存自动池</Button></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>已配置分组</CardTitle></CardHeader><CardContent className='p-0'>{pools.isLoading ? <Skeleton className='m-4 h-28' /> : <Table><TableHeader><TableRow><TableHead>分组</TableHead><TableHead>名称</TableHead><TableHead>成员</TableHead><TableHead>状态</TableHead><TableHead /></TableRow></TableHeader><TableBody>{(pools.data ?? []).map((item) => <TableRow key={item.pool.id}><TableCell className='font-mono'>{item.pool.group}</TableCell><TableCell>{item.pool.name}</TableCell><TableCell>{item.members.length}</TableCell><TableCell><Badge variant={item.pool.enabled ? 'secondary' : 'outline'}>{item.pool.enabled ? '启用' : '停用'}</Badge></TableCell><TableCell className='text-right'><Button size='sm' variant='outline' onClick={() => setDraft({ ...item.pool, members: item.members })}>编辑</Button></TableCell></TableRow>)}{!pools.isLoading && (pools.data?.length ?? 0) === 0 && <TableRow><TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>尚未配置自动池。</TableCell></TableRow>}</TableBody></Table>}</CardContent></Card>
      </div>
      <div className='space-y-4'>
        <Card><CardHeader><CardTitle>模型运行指标</CardTitle><CardDescription>查看池成员最近的成功率、首字时间和当前选择分数。</CardDescription></CardHeader><CardContent className='space-y-3'><Input value={model} placeholder='模型名称，例如 gpt-5.6-luna' onChange={(event) => setModel(event.target.value)} />{(pools.data ?? []).map((item) => <Button key={item.pool.id} className='mr-2' size='sm' variant={metricsPoolID === item.pool.id ? 'default' : 'outline'} onClick={() => setMetricsPoolID(item.pool.id)}>{item.pool.group}</Button>)}{metrics.isFetching && <Skeleton className='h-20' />}{metrics.data?.members.map((member) => <div key={member.channel_id} className='border-b py-2 last:border-0'><div className='flex justify-between gap-2'><span className='truncate font-medium'>{member.channel_name || `渠道 #${member.channel_id}`}</span><span className='font-mono text-xs'>{member.score.toFixed(3)}</span></div><div className='text-muted-foreground mt-1 flex gap-2 text-xs'><span>{member.health.state || 'unknown'}</span><span>{member.health.success_rate_5m?.toFixed(1) ?? '0.0'}%</span><span>P95 {Math.round(member.health.ttft_p95_ms || 0)}ms</span></div></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>今日归因报表</CardTitle><CardDescription>未归因历史额度仅计成本，不计入已确认毛利。</CardDescription></CardHeader><CardContent className='space-y-3'><div className='grid grid-cols-2 gap-3 text-sm'><div><p className='text-muted-foreground'>已确认收入</p><p className='font-mono font-semibold'>{daily.data?.recognized_revenue.toFixed(4) ?? '-'}</p></div><div><p className='text-muted-foreground'>已确认毛利</p><p className='font-mono font-semibold'>{daily.data?.recognized_profit.toFixed(4) ?? '-'}</p></div></div>{daily.data?.sources.map((source) => <div key={source.source} className='flex justify-between border-t pt-2 text-xs'><span>{source.source}</span><span className='font-mono'>{source.quota} / {source.profit.toFixed(4)}</span></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>用户来源倍率</CardTitle><CardDescription>倍率会在新入账额度生成时冻结，修改不会重写历史批次。</CardDescription></CardHeader><CardContent className='space-y-3'>{policyDraft.map((policy, index) => <div key={policy.source} className='grid grid-cols-[1fr_112px] items-center gap-2'><Label>{policy.source}</Label><Input type='number' min='0' step='0.0001' value={policy.revenue_multiplier} onChange={(event) => { const next = [...policyDraft]; next[index] = { ...policy, revenue_multiplier: Number(event.target.value) }; setPolicyDraft(next) }} /></div>)}<Button className='w-full' variant='outline' onClick={() => savePolicies.mutate(policyDraft)} disabled={savePolicies.isPending}><Save />保存来源倍率</Button></CardContent></Card>
      </div>
    </div></SectionPageLayout.Content>
  </SectionPageLayout>
}
