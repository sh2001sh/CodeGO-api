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
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Layers3, RefreshCcw, Rows3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { GroupStatusMonitorCard } from './group-status-monitor-card'
import { sortItems, summarizeGroups } from './presentation'
import { useSidebarGroupStatus } from './use-sidebar-group-status'

export function SidebarGroupStatusPage() {
  const { t } = useTranslation()
  const query = useSidebarGroupStatus()
  const items = sortItems(query.data?.data ?? [])
  const summary = summarizeGroups(items)

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Group status')}</SectionPageLayout.Title>
      <SectionPageLayout.Description>
        每个业务分组下直接展示模型状态卡，按模型观察当前可用性和最近请求成功率。
      </SectionPageLayout.Description>
      <SectionPageLayout.Actions>
        <Button
          variant='outline'
          size='sm'
          render={<Link to='/dashboard/$section' params={{ section: 'overview' }} />}
        >
          概览
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCcw
            className={cn('size-3.5', query.isFetching && 'animate-spin')}
          />
          刷新
        </Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='mx-auto flex w-full max-w-[1700px] flex-col gap-5'>
          <OverviewPanel summary={summary} loading={query.isLoading} />

          {query.isLoading ? (
            <BoardSkeleton />
          ) : query.isError ? (
            <ErrorPanel onRetry={() => void query.refetch()} />
          ) : items.length === 0 ? (
            <EmptyPanel />
          ) : (
            <div className='grid gap-5 xl:grid-cols-3 2xl:grid-cols-4'>
              {items.map((group) => (
                <section
                  key={group.group}
                  className='rounded-[30px] border border-border/70 bg-card/55 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:bg-card/40 dark:shadow-[0_14px_28px_rgba(0,0,0,0.18)]'
                >
                  <div className='mb-4 flex items-end justify-between gap-3'>
                    <div className='space-y-1'>
                      <h3 className='text-xl font-semibold tracking-tight text-foreground'>
                        {group.group}
                      </h3>
                      <p className='text-muted-foreground text-sm'>
                        {group.models.length} 个模型
                      </p>
                    </div>
                  </div>

                  <div className='grid gap-3'>
                    {group.models.length === 0 ? (
                      <div className='text-muted-foreground rounded-2xl border border-dashed px-4 py-6 text-sm'>
                        当前分组下暂无可展示模型。
                      </div>
                    ) : (
                      group.models.map((model) => (
                        <GroupStatusMonitorCard
                          key={`${group.group}-${model.model}`}
                          item={model}
                        />
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

function OverviewPanel(props: {
  summary: ReturnType<typeof summarizeGroups>
  loading: boolean
}) {
  const metrics = [
    {
      label: '业务分组',
      value: String(props.summary.groups),
      hint: '当前可监测分组总数',
      icon: Layers3,
      tone: 'text-sky-600 dark:text-sky-400',
    },
    {
      label: '正常模型',
      value: String(props.summary.healthyModels),
      hint: `共 ${props.summary.models} 个模型`,
      icon: CheckCircle2,
      tone: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: '异常模型',
      value: String(props.summary.degradedModels),
      hint:
        props.summary.sampleWindow == null
          ? '暂无采样窗口'
          : `${props.summary.sampleWindow}h 成功率窗口`,
      icon: AlertTriangle,
      tone: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: '观测中模型',
      value: String(props.summary.unknownModels),
      hint: '状态数据不足或暂无请求样本',
      icon: Rows3,
      tone: 'text-slate-600 dark:text-slate-300',
    },
  ]

  return (
    <Card className='border-border/70 bg-gradient-to-br from-background via-background to-primary/5'>
      <CardHeader className='border-b border-border/70'>
        <CardTitle className='flex items-center gap-2'>
          <Layers3 className='text-primary size-4' />
          分组模型状态看板
        </CardTitle>
        <CardDescription className='max-w-[72ch] leading-6'>
          页面以业务分组为列容器，每个模型单独成卡，风格对齐你给的监控图：分组标题在上，模型状态卡在下，底部用分段条表达最近请求成功率。
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-4'>
        {metrics.map((metric) => {
          const Icon = metric.icon

          return (
            <div
              key={metric.label}
              className='rounded-2xl border border-border/70 bg-background/88 px-4 py-3 dark:bg-background/70'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-muted-foreground text-xs font-medium'>
                    {metric.label}
                  </div>
                  {props.loading ? (
                    <Skeleton className='h-7 w-18 rounded-md' />
                  ) : (
                    <div className='text-2xl font-semibold tracking-tight tabular-nums'>
                      {metric.value}
                    </div>
                  )}
                  <div className='text-muted-foreground text-xs'>
                    {metric.hint}
                  </div>
                </div>
                <div
                  className={cn(
                    'bg-muted flex size-10 items-center justify-center rounded-2xl',
                    metric.tone
                  )}
                >
                  <Icon className='size-5' />
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function BoardSkeleton() {
  return (
    <div className='grid gap-5 xl:grid-cols-3 2xl:grid-cols-4'>
      {Array.from({ length: 4 }).map((_, groupIndex) => (
        <Card key={groupIndex} className='bg-card/50 py-0'>
          <CardContent className='space-y-4 px-4 py-4'>
            <div className='space-y-2'>
              <Skeleton className='h-6 w-36 rounded-md' />
              <Skeleton className='h-4 w-24 rounded-md' />
            </div>
            <div className='space-y-3'>
              {Array.from({ length: 3 }).map((__, cardIndex) => (
                <Skeleton
                  key={cardIndex}
                  className='h-36 w-full rounded-[22px]'
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ErrorPanel(props: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className='flex flex-col items-start gap-4 py-8'>
        <div className='space-y-1'>
          <div className='text-base font-semibold'>模型状态暂时不可用</div>
          <div className='text-muted-foreground text-sm leading-6'>
            当前无法获取分组下模型状态数据，请稍后刷新重试。
          </div>
        </div>
        <Button variant='outline' size='sm' onClick={props.onRetry}>
          <RefreshCcw className='size-3.5' />
          重新获取
        </Button>
      </CardContent>
    </Card>
  )
}

function EmptyPanel() {
  return (
    <Card>
      <CardContent className='py-8'>
        <div className='space-y-1'>
          <div className='text-base font-semibold'>暂无可展示的模型状态</div>
          <div className='text-muted-foreground text-sm leading-6'>
            当前用户还没有可用的业务分组模型，或暂未产生用于监测的请求样本。
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
