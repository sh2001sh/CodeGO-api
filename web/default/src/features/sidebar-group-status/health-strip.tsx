import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { SidebarGroupModelStatusItem, SidebarGroupStatusBucket } from './types'
import { buildHealthSegments } from './presentation'

const SEGMENT_CLASS = {
  healthy: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  critical: 'bg-rose-500 dark:bg-rose-400',
  unknown: 'bg-slate-300 dark:bg-slate-700',
} as const

export function HealthStrip(props: { item: SidebarGroupModelStatusItem }) {
  const segments = buildHealthSegments(props.item)
  const showCurrentMarker = segments.length > 0
  const bucketSeconds =
    props.item.bucket_seconds ??
    inferBucketSeconds(props.item.series_window ?? props.item.sample_window, segments.length || 20)

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-muted-foreground text-[11px]'>开始</div>
        <div className='text-muted-foreground text-[11px]'>现在</div>
      </div>

      <div className='relative'>
        <div className='grid auto-cols-fr grid-flow-col gap-1'>
          {segments.map(({ bucket, tone }, index) => (
            <Tooltip key={`${props.item.model}-${bucket.ts}-${index}`}>
              <TooltipTrigger
                render={
                  <button
                    type='button'
                    aria-label={buildBucketLabel(bucket, bucketSeconds)}
                    className={cn(
                      'h-5 rounded-md transition-transform hover:-translate-y-0.5 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      SEGMENT_CLASS[tone]
                    )}
                  />
                }
              />
              <TooltipContent side='top' className='max-w-none'>
                <div className='space-y-1'>
                  <div className='font-medium'>
                    {formatBucketRange(bucket.ts, bucketSeconds)}
                  </div>
                  <div className='text-background/80'>
                    {bucket.request_count > 0 && bucket.success_rate != null
                      ? `成功率 ${bucket.success_rate.toFixed(1)}%`
                      : '该时间段暂无请求样本'}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {showCurrentMarker ? (
          <div className='pointer-events-none absolute inset-y-[-6px] right-0 flex items-start'>
            <div className='bg-foreground/80 h-[calc(100%+12px)] w-px' />
          </div>
        ) : null}
      </div>

      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground'>
        <LegendSwatch className={SEGMENT_CLASS.healthy} label='稳定成功' />
        <LegendSwatch className={SEGMENT_CLASS.warning} label='有少量失败' />
        <LegendSwatch className={SEGMENT_CLASS.critical} label='失败明显' />
        <LegendSwatch className={SEGMENT_CLASS.unknown} label='暂无样本' />
      </div>
    </div>
  )
}

function LegendSwatch(props: { className: string; label: string }) {
  return (
    <div className='flex items-center gap-1.5'>
      <span className={cn('h-2.5 w-2.5 rounded-full', props.className)} />
      <span>{props.label}</span>
    </div>
  )
}

function formatBucketRange(ts: number, bucketSeconds: number) {
  const start = new Date(ts * 1000)
  const end = new Date((ts + bucketSeconds) * 1000)
  return `${formatTime(start)} - ${formatTime(end)}`
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function buildBucketLabel(bucket: SidebarGroupStatusBucket, bucketSeconds: number) {
  const range = formatBucketRange(bucket.ts, bucketSeconds)
  if (bucket.request_count <= 0 || bucket.success_rate == null) {
    return `${range}，暂无请求样本`
  }
  return `${range}，成功率 ${bucket.success_rate.toFixed(1)}%`
}

function inferBucketSeconds(sampleWindowHours: number, segmentCount: number) {
  const totalSeconds = Math.max(1, Math.round(sampleWindowHours * 3600))
  return Math.max(60, Math.round(totalSeconds / Math.max(segmentCount, 1)))
}
