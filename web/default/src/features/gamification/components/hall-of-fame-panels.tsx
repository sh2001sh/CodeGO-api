import { Crown, Medal, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { HallOfFameCategory } from '../types'

interface HallOfFamePanelsProps {
  categories: HallOfFameCategory[]
  limit?: number
}

function getRankTone(rank: number) {
  if (rank === 1) return 'text-amber-500'
  if (rank === 2) return 'text-sky-500'
  if (rank === 3) return 'text-orange-500'
  return 'text-muted-foreground'
}

function getRankIcon(rank: number) {
  if (rank === 1) return Crown
  if (rank <= 3) return Medal
  return Trophy
}

export function HallOfFamePanels(props: HallOfFamePanelsProps) {
  const maxRows = props.limit ?? 10

  return (
    <div className='grid gap-4 xl:grid-cols-3'>
      {props.categories.map((category) => (
        <div key={category.key} className='rounded-2xl border bg-card shadow-xs'>
          <div className='border-b px-4 py-3 sm:px-5'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-base font-semibold'>{category.title}</div>
                <div className='mt-1 text-sm text-muted-foreground'>
                  {category.window} · {category.metric}
                </div>
              </div>
              <Badge variant='outline'>{category.window}</Badge>
            </div>
          </div>

          <div className='space-y-2 p-4 sm:p-5'>
            {category.entries.slice(0, maxRows).map((entry) => {
              const RankIcon = getRankIcon(entry.rank)
              return (
                <div
                  key={`${category.key}-${entry.rank}-${entry.user_id}`}
                  className='flex items-center justify-between gap-3 rounded-2xl border bg-background/60 px-3 py-3'
                >
                  <div className='flex min-w-0 items-center gap-3'>
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted',
                        getRankTone(entry.rank)
                      )}
                    >
                      <RankIcon className='size-4' />
                    </div>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-semibold'>
                          #{entry.rank}
                        </span>
                        <span className='truncate text-sm font-medium'>
                          {entry.display_name}
                        </span>
                      </div>
                      <div className='truncate text-xs text-muted-foreground'>
                        {entry.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='text-base font-semibold'>
                      {formatNumber(entry.score)}
                    </div>
                  </div>
                </div>
              )
            })}
            {category.entries.length === 0 ? (
              <div className='rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground'>
                暂无数据，等第一批工匠开始冲榜。
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
