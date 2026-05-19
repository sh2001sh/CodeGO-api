import { Lock, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { AchievementItem } from '../types'
import { resolveWorkshopIcon } from './icon-resolver'

interface AchievementGridProps {
  achievements: AchievementItem[]
}

function getTierStyle(tier: string) {
  switch (tier) {
    case 'legendary':
      return 'border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
    case 'epic':
      return 'border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200'
    case 'rare':
      return 'border-primary/30 bg-primary/10 text-primary'
    default:
      return 'border-border bg-background text-foreground'
  }
}

export function AchievementGrid(props: AchievementGridProps) {
  return (
    <TooltipProvider delay={100}>
      <div className='rounded-2xl border bg-card shadow-xs'>
        <div className='border-b px-4 py-3 sm:px-5'>
          <div className='flex items-center gap-2'>
            <Sparkles className='size-4 text-primary' />
            <div className='text-base font-semibold'>精灵图鉴 · 你唤醒的伙伴们</div>
          </div>
          <div className='mt-1 text-sm text-muted-foreground'>
            解锁记录会跟随真实使用行为自动更新，不需要手动领取。
          </div>
        </div>

        <div className='grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3'>
          {props.achievements.map((achievement) => {
            const Icon = resolveWorkshopIcon(achievement.icon)

            return (
              <Tooltip key={achievement.key}>
                <TooltipTrigger
                  render={
                    <div
                      className={cn(
                        'rounded-2xl border p-4 transition-colors',
                        achievement.unlocked
                          ? getTierStyle(achievement.tier)
                          : 'border-dashed bg-muted/30 text-muted-foreground'
                      )}
                    />
                  }
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div
                      className={cn(
                        'flex size-11 items-center justify-center rounded-2xl',
                        achievement.unlocked
                          ? 'bg-white/70 text-current dark:bg-black/15'
                          : 'bg-background text-muted-foreground'
                      )}
                    >
                      {achievement.unlocked ? (
                        <Icon className='size-5' />
                      ) : (
                        <Lock className='size-4' />
                      )}
                    </div>
                    <Badge variant={achievement.unlocked ? 'secondary' : 'outline'}>
                      {achievement.unlocked ? '已点亮' : '未解锁'}
                    </Badge>
                  </div>

                  <div className='mt-4 space-y-1'>
                    <div className='text-sm font-semibold'>
                      {achievement.name}
                    </div>
                    <div className='text-sm leading-6'>
                      {achievement.description}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className='max-w-56 text-xs leading-5'>
                  {achievement.hint}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
