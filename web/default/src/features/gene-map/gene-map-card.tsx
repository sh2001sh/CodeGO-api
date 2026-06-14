import { Dna, Sparkles } from 'lucide-react'
import { formatQuota, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { GeneMapSnapshot } from './types'

const MODEL_SWATCHES = [
  'from-rose-500 to-orange-400',
  'from-sky-500 to-cyan-400',
  'from-emerald-500 to-lime-400',
  'from-violet-500 to-fuchsia-400',
  'from-amber-500 to-yellow-400',
  'from-slate-600 to-slate-400',
]

function getModelSwatch(index: number) {
  return MODEL_SWATCHES[index % MODEL_SWATCHES.length]
}

function clampWidth(percent: number) {
  return `${Math.max(10, Math.round(percent * 100))}%`
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-white/55 bg-white/75 px-3 py-2.5 backdrop-blur dark:border-border dark:bg-card/50'>
      <div className='text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-muted-foreground'>
        {props.label}
      </div>
      <div className='mt-1 text-sm font-semibold text-slate-900 dark:text-foreground'>
        {props.value}
      </div>
    </div>
  )
}

export function GeneMapCard(props: {
  snapshot: GeneMapSnapshot
  title?: string
  compact?: boolean
  className?: string
}) {
  const snapshot = props.snapshot
  const topModels = snapshot.models.slice(0, props.compact ? 4 : 6)
  const timeBands = snapshot.time_bands

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_30%),linear-gradient(145deg,rgba(247,254,231,0.96),rgba(255,255,255,0.98)_38%,rgba(240,249,255,0.98))] p-4 shadow-[0_28px_90px_rgba(15,23,42,0.10)] dark:border-border dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_26%),linear-gradient(145deg,rgba(23,19,30,0.98),rgba(34,27,43,0.96),rgba(34,27,43,0.96))]',
        props.className
      )}
    >
      <div className='pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),transparent)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]' />

      <div className='relative space-y-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <div className='flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-emerald-400 dark:text-slate-950'>
                <Dna className='size-5' />
              </div>
              <div>
                <div className='text-[11px] font-medium uppercase tracking-[0.26em] text-slate-500 dark:text-muted-foreground'>
                  API 调用基因图
                </div>
                <h3 className='text-lg font-semibold tracking-tight text-slate-950 dark:text-foreground'>
                  {props.title || snapshot.owner_label}
                </h3>
              </div>
            </div>
            <div>
              <div className='text-xl font-semibold tracking-tight text-slate-950 dark:text-foreground'>
                {snapshot.archetype}
              </div>
              <p className='mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-muted-foreground'>
                {snapshot.tagline}
              </p>
            </div>
          </div>

          <div className='rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'>
            最近 {snapshot.window_days} 天
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-4'>
          <Metric label='请求数' value={formatNumber(snapshot.total_requests)} />
          <Metric label='用量' value={formatQuota(snapshot.total_quota)} />
          <Metric label='Token' value={formatNumber(snapshot.total_tokens)} />
          <Metric
            label='主力模型'
            value={snapshot.dominant_model || '暂无模型记录'}
          />
        </div>

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]'>
          <div className='rounded-[24px] border border-white/60 bg-white/78 p-4 backdrop-blur dark:border-border dark:bg-card/55'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-sm font-semibold text-slate-950 dark:text-foreground'>
                  模型构成
                </div>
                <div className='text-xs text-slate-500 dark:text-muted-foreground'>
                  不同颜色表示模型占比，条带越长说明调用占比越高。
                </div>
              </div>
              <div className='text-xs text-slate-500 dark:text-muted-foreground'>
                {snapshot.models.length} 个模型
              </div>
            </div>

            <div className='mt-4 flex h-5 overflow-hidden rounded-full bg-slate-200 dark:bg-muted'>
              {topModels.length > 0 ? (
                topModels.map((model, index) => (
                  <div
                    key={model.model}
                    className={cn('h-full bg-gradient-to-r', getModelSwatch(index))}
                    style={{ width: clampWidth(model.share) }}
                    title={`${model.model} ${(model.share * 100).toFixed(1)}%`}
                  />
                ))
              ) : (
                <div className='h-full w-full bg-slate-300 dark:bg-muted/60' />
              )}
            </div>

            <div className='mt-4 grid gap-3'>
              {topModels.length > 0 ? (
                topModels.map((model, index) => (
                  <div
                    key={model.model}
                    className='grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3'
                  >
                    <div
                      className={cn(
                        'size-3 rounded-full bg-gradient-to-r',
                        getModelSwatch(index)
                      )}
                    />
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-medium text-slate-900 dark:text-foreground'>
                        {model.model}
                      </div>
                      <div className='text-xs text-slate-500 dark:text-muted-foreground'>
                        {formatNumber(model.requests)} 次请求
                      </div>
                    </div>
                    <div className='text-sm font-semibold text-slate-700 dark:text-foreground'>
                      {(model.share * 100).toFixed(1)}%
                    </div>
                  </div>
                ))
              ) : (
                <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-border dark:text-muted-foreground'>
                  这个时间窗口里还没有最近调用记录。
                </div>
              )}
            </div>
          </div>

          <div className='space-y-4'>
            <div className='rounded-[24px] border border-white/60 bg-white/78 p-4 backdrop-blur dark:border-border dark:bg-card/55'>
              <div className='text-sm font-semibold text-slate-950 dark:text-foreground'>
                时段活跃度
              </div>
              <div className='mt-1 text-xs text-slate-500 dark:text-muted-foreground'>
                条带越宽表示该时段请求越密集，高峰时段会自动高亮。
              </div>

              <div className='mt-4 space-y-3'>
                {timeBands.map((band) => (
                  <div
                    key={band.key}
                    className='grid grid-cols-[82px_minmax(0,1fr)_48px] items-center gap-3'
                  >
                    <div className='text-xs font-medium text-slate-600 dark:text-muted-foreground'>
                      {band.label}
                    </div>
                    <div className='relative h-8 overflow-hidden rounded-full bg-slate-200/90 dark:bg-muted'>
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#0f172a,#0ea5e9)] transition-all dark:bg-[linear-gradient(90deg,#34d399,#38bdf8)]',
                          band.is_peak &&
                            'shadow-[0_0_0_1px_rgba(14,165,233,0.28),0_6px_18px_rgba(14,165,233,0.24)]'
                        )}
                        style={{
                          width: `${Math.max(10, Math.round(band.weight * 100))}%`,
                        }}
                      />
                    </div>
                    <div className='text-right text-xs font-semibold text-slate-700 dark:text-foreground'>
                      {formatNumber(band.requests)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='rounded-[24px] border border-white/60 bg-white/78 p-4 backdrop-blur dark:border-border dark:bg-card/55'>
              <div className='flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-foreground'>
                <Sparkles className='size-4 text-amber-500' />
                稀有模型标记
              </div>

              <div className='mt-3 flex flex-wrap gap-2'>
                {snapshot.rare_models.length > 0 ? (
                  snapshot.rare_models.map((item) => (
                    <div
                      key={item.model}
                      className='rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100'
                    >
                      <div className='font-medium'>{item.model}</div>
                      <div className='text-xs opacity-80'>
                        {item.badge} · {formatNumber(item.requests)} 次
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400'>
                    这个窗口里还没有稀有模型标记，说明你的调用很集中也很稳定。
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
