import { Progress } from '@/components/ui/progress'

const CHART_WIDTH = 660
const CHART_HEIGHT = 220

function buildLineChart(values: number[]) {
  if (values.length === 0) {
    return { path: '', area: '' }
  }

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(1, max - min)
  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? CHART_WIDTH / 2
        : (index / (values.length - 1)) * CHART_WIDTH
    const normalized = (value - min) / range
    const y = CHART_HEIGHT - normalized * (CHART_HEIGHT - 20) - 10
    return { x, y }
  })

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const first = points[0]
  const last = points[points.length - 1]

  return {
    path,
    area: `${path} L ${last.x} ${CHART_HEIGHT} L ${first.x} ${CHART_HEIGHT} Z`,
  }
}

function clampPercent(used: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)))
}

export function UsageChart(props: { values: number[] }) {
  const { path, area } = buildLineChart(props.values)

  return (
    <div className='rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.96))] p-4 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.78))]'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <div className='text-base font-semibold text-slate-950 dark:text-slate-50'>
            用量总览
          </div>
          <div className='text-sm text-slate-500 dark:text-slate-400'>
            只保留一张主图，右侧用数字列承载核心指标。
          </div>
        </div>
        <div className='rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200'>
          最近 24 小时
        </div>
      </div>

      <div className='mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-950/95 p-3 dark:border-slate-700'>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className='h-[220px] w-full'
          preserveAspectRatio='none'
        >
          <defs>
            <linearGradient id='usage-area' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='#38bdf8' stopOpacity='0.55' />
              <stop offset='100%' stopColor='#38bdf8' stopOpacity='0.02' />
            </linearGradient>
            <linearGradient id='usage-line' x1='0' x2='1' y1='0' y2='0'>
              <stop offset='0%' stopColor='#34d399' />
              <stop offset='100%' stopColor='#38bdf8' />
            </linearGradient>
          </defs>

          {Array.from({ length: 5 }).map((_, index) => {
            const y = (CHART_HEIGHT / 4) * index
            return (
              <line
                key={y}
                x1='0'
                x2={CHART_WIDTH}
                y1={y}
                y2={y}
                stroke='rgba(148,163,184,0.14)'
                strokeDasharray='6 8'
              />
            )
          })}

          {area ? <path d={area} fill='url(#usage-area)' /> : null}
          {path ? (
            <path
              d={path}
              fill='none'
              stroke='url(#usage-line)'
              strokeWidth='5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          ) : null}
        </svg>
      </div>
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
