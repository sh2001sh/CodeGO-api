import { CheckCircle2, Gift, LockKeyhole } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatQuota } from '@/lib/format'
import type { DailyMissionItem } from '../types'
import { resolveWorkshopIcon } from './icon-resolver'

interface DailyMissionsCardProps {
  missions: DailyMissionItem[]
}

function getMissionBadge(mission: DailyMissionItem) {
  if (mission.claimed) {
    return <Badge>已发放</Badge>
  }
  if (mission.completed) {
    return <Badge variant='secondary'>待结算</Badge>
  }
  return <Badge variant='outline'>进行中</Badge>
}

export function DailyMissionsCard(props: DailyMissionsCardProps) {
  return (
    <div className='rounded-2xl border bg-card shadow-xs'>
      <div className='border-b px-4 py-3 sm:px-5'>
        <div className='flex items-center gap-2'>
          <Gift className='size-4 text-primary' />
          <div className='text-base font-semibold'>每日任务</div>
        </div>
        <div className='mt-1 text-sm text-muted-foreground'>
          每条任务都会发额度奖励，完成后还会给当前出战宠物追加经验。
        </div>
      </div>

      <div className='space-y-3 p-4 sm:p-5'>
        {props.missions.map((mission) => {
          const Icon = resolveWorkshopIcon(mission.icon)
          const progressValue =
            mission.target > 0
              ? Math.min(100, (mission.current / mission.target) * 100)
              : 100

          return (
            <div
              key={mission.key}
              className='rounded-2xl border bg-background/60 p-3'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 items-start gap-3'>
                  <div className='mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                    <Icon className='size-4' />
                  </div>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-sm font-medium'>{mission.name}</div>
                      {getMissionBadge(mission)}
                    </div>
                    <div className='mt-1 text-sm text-muted-foreground'>
                      {mission.description}
                    </div>
                  </div>
                </div>

                <div className='text-right text-xs text-muted-foreground'>
                  <div>{mission.reward_usd.toFixed(1)} 美元额度</div>
                  <div className='mt-1 font-medium text-foreground'>
                    {formatQuota(mission.reward_quota)}
                  </div>
                  <div className='mt-1 text-primary'>+{mission.pet_exp_reward} EXP</div>
                </div>
              </div>

              <div className='mt-3'>
                <div className='mb-2 flex items-center justify-between gap-2 text-xs'>
                  <div className='text-muted-foreground'>进度</div>
                  <div>
                    {mission.current}/{mission.target}
                  </div>
                </div>
                <Progress value={progressValue} />
              </div>

              <div className='mt-3 flex items-center gap-2 text-xs text-muted-foreground'>
                {mission.claimed ? (
                  <>
                    <CheckCircle2 className='size-3.5 text-success' />
                    额度和宠物经验都已到账
                  </>
                ) : mission.completed ? (
                  <>
                    <CheckCircle2 className='size-3.5 text-primary' />
                    已满足条件，刷新后会自动结算
                  </>
                ) : (
                  <>
                    <LockKeyhole className='size-3.5' />
                    完成后自动结算并把经验发给当前出战宠物
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

