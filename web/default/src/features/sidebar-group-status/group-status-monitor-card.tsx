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
import { Card, CardContent } from '@/components/ui/card'
import { formatUptimePct } from '@/features/performance-metrics/lib/format'
import { cn } from '@/lib/utils'
import { HealthStrip } from './health-strip'
import { formatSampleWindowLabel, getStatusMeta } from './presentation'
import type { SidebarGroupModelStatusItem } from './types'

export function GroupStatusMonitorCard(props: {
  item: SidebarGroupModelStatusItem
}) {
  const meta = getStatusMeta(props.item.status)
  const sampleWindowLabel = formatSampleWindowLabel(props.item.sample_window)
  const seriesWindowLabel = formatSampleWindowLabel(props.item.series_window ?? props.item.sample_window)

  return (
    <Card
      size='sm'
      className={cn(
        'relative gap-0 overflow-hidden border bg-card/96 py-0 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:bg-card/92 dark:shadow-[0_14px_30px_rgba(0,0,0,0.22)]',
        meta.border
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', meta.accent)} />
      <CardContent className='px-4 py-3'>
        <div className='space-y-3'>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex min-w-0 items-start gap-2.5'>
              <span className={cn('mt-1 size-2.5 shrink-0 rounded-full', meta.dot)} />
              <div className='min-w-0 space-y-1'>
                <div className='break-all text-[0.95rem] font-semibold tracking-tight text-foreground'>
                  {props.item.model}
                </div>
                <div className='text-muted-foreground text-xs tabular-nums'>
                  {sampleWindowLabel}
                </div>
              </div>
            </div>

            <div className={cn('shrink-0 text-sm font-semibold', meta.accentText)}>
              {meta.label}
            </div>
          </div>

          <div className='flex items-end justify-between gap-4'>
            <div className='text-muted-foreground text-xs'>
              {sampleWindowLabel}请求成功率
            </div>
            <div className='font-mono text-sm font-semibold tabular-nums text-foreground'>
              {props.item.success_rate == null
                ? '--'
                : formatUptimePct(props.item.success_rate)}
            </div>
          </div>

          <div className='text-muted-foreground text-[11px]'>
            请求时间分布：{seriesWindowLabel}
          </div>

          <HealthStrip item={props.item} />
        </div>
      </CardContent>
    </Card>
  )
}
