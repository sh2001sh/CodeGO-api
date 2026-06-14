import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Dna, Link2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { compareGeneMapShare, getPublicGeneMapShare } from './api'
import { GeneMapCard } from './gene-map-card'

export function PublicGeneMapPage(props: { token: string }) {
  const user = useAuthStore((state) => state.auth.user)

  const publicQuery = useQuery({
    queryKey: ['gene-map', 'public-share', props.token],
    queryFn: async () => {
      const res = await getPublicGeneMapShare(props.token)
      return res.success && res.data ? res.data : null
    },
  })

  const comparisonQuery = useQuery({
    queryKey: ['gene-map', 'compare', props.token],
    queryFn: async () => {
      const res = await compareGeneMapShare(props.token)
      return res.success && res.data ? res.data : null
    },
    enabled: Boolean(user),
  })

  const sharedModels = useMemo(
    () => comparisonQuery.data?.shared_models || [],
    [comparisonQuery.data?.shared_models]
  )

  if (publicQuery.isLoading) {
    return (
      <div className='mx-auto max-w-6xl px-4 py-16'>
        <div className='rounded-[32px] border border-dashed border-slate-300 px-6 py-24 text-center text-sm text-slate-500 dark:border-border dark:text-muted-foreground'>
          正在加载基因图谱...
        </div>
      </div>
    )
  }

  if (!publicQuery.data?.snapshot) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-16'>
        <div className='rounded-[32px] border border-dashed border-slate-300 px-6 py-24 text-center text-sm text-slate-500 dark:border-border dark:text-muted-foreground'>
          这个基因图分享链接无效或已失效。
        </div>
      </div>
    )
  }

  const comparison = comparisonQuery.data

  return (
    <div className='mx-auto max-w-7xl px-4 py-10'>
      <div className='rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98),rgba(240,253,250,0.98))] p-5 shadow-[0_30px_100px_rgba(15,23,42,0.10)] dark:border-border dark:bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_30%),linear-gradient(145deg,rgba(34,27,43,0.96),rgba(23,19,30,0.96),rgba(34,27,43,0.94))]'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='max-w-3xl'>
            <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-muted-foreground'>
              <Dna className='size-4' />
              Shared API Gene Map
            </div>
            <h1 className='mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-foreground'>
              {comparison?.headline || publicQuery.data.headline || 'API 基因图谱对比'}
            </h1>
            <p className='mt-2 text-sm leading-6 text-slate-600 dark:text-muted-foreground'>
              好友把自己的调用轨迹压成了一张基因图。你登录后就能把自己的图谱并排摆上来，直接看模型偏好、活跃时段和稀有调用差异。
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            {user ? (
              <Button
                variant='outline'
                onClick={() => void comparisonQuery.refetch()}
                disabled={comparisonQuery.isFetching}
              >
                <Link2 data-icon='inline-start' />
                刷新对比
              </Button>
            ) : null}
            <Button
              render={
                <Link
                  to='/sign-up'
                  search={{ redirect: `/gene-map/${props.token}` }}
                />
              }
            >
              创建你自己的基因图
            </Button>
          </div>
        </div>

        {comparison ? (
          <div className='mt-6 space-y-4'>
            <div className='grid gap-4 xl:grid-cols-2'>
              <GeneMapCard snapshot={comparison.owner} title='好友图谱' />
              <GeneMapCard snapshot={comparison.viewer} title='你的图谱' />
            </div>

            <div className='rounded-[28px] border border-slate-200 bg-white/80 p-4 dark:border-border dark:bg-card/60'>
              <div className='text-sm font-semibold text-slate-950 dark:text-foreground'>
                重叠模型
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {sharedModels.length > 0 ? (
                  sharedModels.map((model) => (
                    <div
                      key={model}
                      className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                    >
                      {model}
                    </div>
                  ))
                ) : (
                  <div className='text-sm text-slate-500 dark:text-muted-foreground'>
                    你们的主力模型几乎没有重合，风格差异很明显。
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className='mt-6 space-y-4'>
            <GeneMapCard snapshot={publicQuery.data.snapshot} title='好友图谱' />

            <div className='rounded-[28px] border border-slate-200 bg-white/82 p-5 dark:border-border dark:bg-card/60'>
              <div className='text-xl font-semibold tracking-tight text-slate-950 dark:text-foreground'>
                创建你自己的基因图谱，看看和高手差在哪
              </div>
              <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-muted-foreground'>
                登录后会自动生成你的 API 基因图谱，并把两张图并排展示。你可以直接看到模型偏好、调用高峰时段和稀有模型习惯是否一致。
              </p>
              <div className='mt-4 flex flex-wrap gap-2'>
                <Button
                  render={
                    <Link
                      to='/sign-up'
                      search={{ redirect: `/gene-map/${props.token}` }}
                    />
                  }
                >
                  立即生成
                  <ArrowRight data-icon='inline-end' />
                </Button>
                <Button
                  variant='outline'
                  render={
                    <Link
                      to='/sign-in'
                      search={{ redirect: `/gene-map/${props.token}` }}
                    />
                  }
                >
                  已有账号，直接对比
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
