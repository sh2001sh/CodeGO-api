import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { FundingPolicy, RoutePoolDetail, RoutePoolMetrics } from '../types'

type DailyEconomics = {
  recognized_revenue: number
  recognized_profit: number
  sources: Array<{ source: string; quota: number; profit: number }>
}

type RoutePoolInsightsProps = {
  pools: RoutePoolDetail[]
  model: string
  selectedPoolID: number | null
  metrics?: RoutePoolMetrics
  metricsLoading: boolean
  daily?: DailyEconomics
  policies: FundingPolicy[]
  savingPolicies: boolean
  onModelChange: (model: string) => void
  onPoolChange: (poolID: number) => void
  onPoliciesChange: (policies: FundingPolicy[]) => void
  onSavePolicies: () => void
}

export function RoutePoolInsights({
  pools,
  model,
  selectedPoolID,
  metrics,
  metricsLoading,
  daily,
  policies,
  savingPolicies,
  onModelChange,
  onPoolChange,
  onPoliciesChange,
  onSavePolicies,
}: RoutePoolInsightsProps) {
  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>模型运行指标</CardTitle>
          <CardDescription>
            查看池成员最近的成功率、首字时间和当前选择分数。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Input
            value={model}
            placeholder='模型名称，例如 gpt-5.6-luna'
            onChange={(event) => onModelChange(event.target.value)}
          />
          {pools.map((detail) => (
            <Button
              key={detail.pool.id}
              className='mr-2'
              size='sm'
              variant={
                selectedPoolID === detail.pool.id ? 'default' : 'outline'
              }
              onClick={() => onPoolChange(detail.pool.id)}
            >
              {detail.pool.group}
            </Button>
          ))}
          {metricsLoading && <Skeleton className='h-20' />}
          {metrics?.members.map((member) => (
            <div
              key={member.channel_id}
              className='border-b py-2 last:border-0'
            >
              <div className='flex justify-between gap-2'>
                <span className='truncate font-medium'>
                  {member.channel_name || `渠道 #${member.channel_id}`}
                </span>
                <span className='font-mono text-xs'>
                  {member.score.toFixed(3)}
                </span>
              </div>
              <div className='text-muted-foreground mt-1 flex gap-2 text-xs'>
                <span>{member.health.state || 'unknown'}</span>
                <span>
                  {member.health.success_rate_5m?.toFixed(1) ?? '0.0'}%
                </span>
                <span>P95 {Math.round(member.health.ttft_p95_ms || 0)}ms</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>今日归因报表</CardTitle>
          <CardDescription>
            未归因历史额度仅计成本，不计入已确认毛利。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='grid grid-cols-2 gap-3 text-sm'>
            <div>
              <p className='text-muted-foreground'>已确认收入</p>
              <p className='font-mono font-semibold'>
                {daily?.recognized_revenue.toFixed(4) ?? '-'}
              </p>
            </div>
            <div>
              <p className='text-muted-foreground'>已确认毛利</p>
              <p className='font-mono font-semibold'>
                {daily?.recognized_profit.toFixed(4) ?? '-'}
              </p>
            </div>
          </div>
          {daily?.sources.map((source) => (
            <div
              key={source.source}
              className='flex justify-between border-t pt-2 text-xs'
            >
              <span>{source.source}</span>
              <span className='font-mono'>
                {source.quota} / {source.profit.toFixed(4)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户来源倍率</CardTitle>
          <CardDescription>
            倍率会在新入账额度生成时冻结，修改不会重写历史批次。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {policies.map((policy, index) => (
            <div
              key={policy.source}
              className='grid grid-cols-[1fr_112px] items-center gap-2'
            >
              <Label>{policy.source}</Label>
              <Input
                type='number'
                min='0'
                step='0.0001'
                value={policy.revenue_multiplier}
                onChange={(event) => {
                  const next = [...policies]
                  next[index] = {
                    ...policy,
                    revenue_multiplier: Number(event.target.value),
                  }
                  onPoliciesChange(next)
                }}
              />
            </div>
          ))}
          <Button
            className='w-full'
            variant='outline'
            onClick={onSavePolicies}
            disabled={savingPolicies}
          >
            <Save />
            保存来源倍率
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
