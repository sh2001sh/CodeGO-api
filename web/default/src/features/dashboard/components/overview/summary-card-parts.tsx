import { formatQuota } from '@/lib/format'
import { Progress } from '@/components/ui/progress'

function clampPercent(used: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)))
}

type UsagePoint = {
  label: string
  value: number
}

export function UsageChart(props: { points: UsagePoint[] }) {
  const maxValue = Math.max(...props.points.map((point) => point.value), 1)
  const currentValue = props.points.at(-1)?.value ?? 0
  const peakPoint =
    props.points.reduce<UsagePoint | null>((peak, point) => {
      if (!peak || point.value > peak.value) return point
      return peak
    }, null) ?? null
  const averageValue =
    props.points.length > 0
      ? props.points.reduce((sum, point) => sum + point.value, 0) /
        props.points.length
      : 0

  return (
    <div className='overview-glass-card overview-panel-backdrop p-4 sm:p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <div className='text-muted-foreground text-[11px] font-medium tracking-[0.14em] uppercase'>
            用量概览
          </div>
          <div className='text-foreground mt-1 text-xl font-semibold tracking-tight'>
            最近 12 小时用量走势
          </div>
        </div>
        <div className='border-border/70 bg-background/80 text-muted-foreground rounded-full border px-2.5 py-1 text-xs'>
          按小时统计
        </div>
      </div>

      <div className='mt-4 grid gap-3 sm:grid-cols-3'>
        <DataMetric label='当前时段' value={formatQuota(currentValue)} />
        <DataMetric
          label='峰值时段'
          value={peakPoint ? `${formatQuota(peakPoint.value)} · ${peakPoint.label}` : '--'}
        />
        <DataMetric label='平均时段' value={formatQuota(averageValue)} />
      </div>

      {props.points.length > 0 ? (
        <div className='overview-soft-card mt-4 p-4'>
          <div className='grid h-[180px] grid-cols-12 items-end gap-2 sm:gap-2.5'>
            {props.points.map((point, index) => {
              const isPeak = peakPoint?.label === point.label && peakPoint.value === point.value
              const isCurrent = index === props.points.length - 1
              const height = Math.max(12, Math.round((point.value / maxValue) * 100))

              return (
                <div key={`${point.label}-${index}`} className='flex h-full flex-col justify-end gap-2'>
                  <div
                    className={
                      isPeak
                        ? 'rounded-[18px_18px_10px_10px] bg-[linear-gradient(180deg,#f1ad75,#d96a39)] shadow-[0_12px_28px_rgba(217,106,57,0.18)]'
                        : isCurrent
                          ? 'rounded-[18px_18px_10px_10px] bg-[linear-gradient(180deg,#cfdcf4,#77aef9)]'
                          : 'rounded-[18px_18px_10px_10px] bg-[linear-gradient(180deg,#e2e7ef,#c8d0dd)]'
                    }
                    style={{ height: `${height}%` }}
                  />
                  <div className='text-muted-foreground text-center text-[11px] font-medium'>
                    {point.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className='border-border text-muted-foreground mt-4 flex min-h-[168px] items-center justify-center rounded-[20px] border border-dashed bg-background/70 px-4 py-8 text-center text-sm'>
          最近 12 小时还没有可展示的用量数据。
        </div>
      )}
    </div>
  )
}

export function DataMetric(props: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className='overview-soft-card px-3 py-3'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='text-foreground mt-1 text-lg font-semibold'>
        {props.value}
      </div>
      {props.hint ? (
        <div className='text-muted-foreground mt-1 text-xs'>
          {props.hint}
        </div>
      ) : null}
    </div>
  )
}

export function ProgressBlock(props: {
  label: string
  used: number
  total: number
  remainingLabel: string
  hint: string
  className?: string
}) {
  const percent = clampPercent(props.used, props.total)

  return (
    <div className='app-subtle-panel p-3'>
      <div className='flex items-center justify-between gap-3 text-sm'>
        <div className='text-foreground font-medium'>
          {props.label}
        </div>
        <div className='text-muted-foreground text-xs'>
          {props.remainingLabel}
        </div>
      </div>
      <div className='mt-3'>
        <Progress className={props.className} value={percent} />
      </div>
      <div className='text-muted-foreground mt-2 text-xs'>
        {props.hint}
      </div>
    </div>
  )
}
