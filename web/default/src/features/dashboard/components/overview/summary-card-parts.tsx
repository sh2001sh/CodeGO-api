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
    <div className='self-start rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.96))] p-4 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.78))]'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-base font-semibold text-slate-950 dark:text-slate-50'>
          最近 12 小时用量
        </div>
        <div className='rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'>
          最近 24 小时
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
        <div className='mt-4 rounded-[22px] border border-[#f3dcc2] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(255,244,229,0.98))] p-4 dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.88),rgba(15,23,42,0.82))]'>
          <div className='grid h-[240px] grid-cols-12 items-end gap-2'>
            {props.points.map((point, index) => {
              const isPeak = peakPoint?.label === point.label && peakPoint.value === point.value
              const isCurrent = index === props.points.length - 1
              const height = Math.max(12, Math.round((point.value / maxValue) * 100))

              return (
                <div key={`${point.label}-${index}`} className='flex h-full flex-col justify-end gap-2'>
                  <div
                    className={
                      isPeak
                        ? 'rounded-t-[14px] bg-[linear-gradient(180deg,#fb923c,#f97316)] shadow-[0_12px_28px_rgba(249,115,22,0.24)]'
                        : isCurrent
                          ? 'rounded-t-[14px] bg-[linear-gradient(180deg,#fdba74,#fb923c)]'
                          : 'rounded-t-[14px] bg-[linear-gradient(180deg,#fed7aa,#fdba74)]'
                    }
                    style={{ height: `${height}%` }}
                  />
                  <div className='text-center text-[11px] font-medium text-slate-500 dark:text-slate-400'>
                    {point.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className='mt-4 rounded-[22px] border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400'>
          最近 24 小时还没有可展示的用量数据。
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
    <div className='rounded-2xl border border-slate-200 bg-white/78 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/55'>
      <div className='text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>
        {props.label}
      </div>
      <div className='mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50'>
        {props.value}
      </div>
      {props.hint ? (
        <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
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
    <div className='rounded-2xl border border-slate-200 bg-white/82 p-3 dark:border-slate-800 dark:bg-slate-950/55'>
      <div className='flex items-center justify-between gap-3 text-sm'>
        <div className='font-medium text-slate-900 dark:text-slate-100'>
          {props.label}
        </div>
        <div className='text-xs text-slate-500 dark:text-slate-400'>
          {props.remainingLabel}
        </div>
      </div>
      <div className='mt-3'>
        <Progress className={props.className} value={percent} />
      </div>
      <div className='mt-2 text-xs text-slate-500 dark:text-slate-400'>
        {props.hint}
      </div>
    </div>
  )
}
