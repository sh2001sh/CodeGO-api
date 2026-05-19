import { Sparkles, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { AchievementStats, CompanionSummary } from '../types'
import { resolveWorkshopIcon } from './icon-resolver'

interface CompanionCardProps {
  companion: CompanionSummary
  stats: AchievementStats
}

export function CompanionCard(props: CompanionCardProps) {
  const progressValue =
    props.companion.progress_target > 0
      ? Math.min(
          100,
          (props.companion.progress_current / props.companion.progress_target) *
            100
        )
      : 100
  const LatestIcon = props.stats.latest
    ? resolveWorkshopIcon(props.stats.latest.icon)
    : Sparkles

  return (
    <div className='overflow-hidden rounded-2xl border bg-[linear-gradient(135deg,rgba(255,245,229,0.96),rgba(255,255,255,0.98))] shadow-xs dark:bg-[linear-gradient(135deg,rgba(45,24,20,0.92),rgba(19,23,41,0.96))]'>
      <div className='flex h-full flex-col gap-4 p-4 sm:p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff8a57,#f7c75c)] text-white shadow-sm'>
              <Sparkles className='size-6' />
            </div>
            <div className='space-y-1'>
              <div className='text-sm font-medium text-muted-foreground'>
                当前伙伴
              </div>
              <div className='text-xl font-semibold tracking-tight'>
                {props.companion.name}
              </div>
              <div className='text-sm text-muted-foreground'>
                {props.companion.title}
              </div>
            </div>
          </div>
          <Badge variant='outline'>Lv.{props.companion.level}</Badge>
        </div>

        <p className='text-sm leading-6 text-muted-foreground'>
          {props.companion.flavor}
        </p>

        <div className='rounded-2xl border bg-background/70 p-3'>
          <div className='mb-2 flex items-center justify-between gap-3'>
            <div className='text-sm font-medium'>图鉴进度</div>
            <div className='text-xs text-muted-foreground'>
              {props.companion.unlocked_count}/{props.companion.total_count}
            </div>
          </div>
          <Progress value={progressValue} />
          <div className='mt-3 text-xs text-muted-foreground'>
            下一阶段目标：累计点亮 {props.companion.progress_target} 枚成就
          </div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='rounded-2xl border bg-background/70 p-3'>
            <div className='text-xs text-muted-foreground'>已解锁成就</div>
            <div className='mt-1 text-2xl font-semibold'>
              {props.stats.unlocked_count}
            </div>
          </div>
          <div className='rounded-2xl border bg-background/70 p-3'>
            <div className='text-xs text-muted-foreground'>最近点亮</div>
            {props.stats.latest ? (
              <div className='mt-2 flex items-center gap-2'>
                <div className='flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                  <LatestIcon className='size-4' />
                </div>
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium'>
                    {props.stats.latest.name}
                  </div>
                  <div className='truncate text-xs text-muted-foreground'>
                    {props.stats.latest.description}
                  </div>
                </div>
              </div>
            ) : (
              <div className='mt-2 flex items-center gap-2 text-sm text-muted-foreground'>
                <Trophy className='size-4' />
                等待第一枚成就点亮
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
