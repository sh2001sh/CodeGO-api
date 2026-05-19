import { Lock, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatQuota, formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AchievementItem } from '../types'
import { PixelPetSprite, getPetProfile } from '../pet-catalog'

interface AchievementGridProps {
  achievements: AchievementItem[]
  onEquip: (achievementKey: string) => void
  onUpgrade: (achievementKey: string) => void
  equippingKey?: string | null
  upgradingKey?: string | null
}

function getTierStyle(tier: string) {
  switch (tier) {
    case 'legendary':
      return 'border-amber-300/70 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
    case 'epic':
      return 'border-sky-300/70 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200'
    case 'rare':
      return 'border-emerald-300/70 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
    default:
      return 'border-border bg-background text-foreground'
  }
}

function getPetProgress(item: AchievementItem) {
  const pet = item.pet
  if (!pet) return 0
  if (pet.is_max_level) return 100
  return Math.min(
    100,
    ((pet.experience - pet.current_level_exp) /
      Math.max(1, pet.next_level_exp - pet.current_level_exp)) *
      100
  )
}

function formatReward(item: AchievementItem) {
  if (item.reward_title) return item.reward_title
  if ((item.reward_usd || 0) > 0) return `${item.reward_usd?.toFixed(2)} 美元额度`
  if ((item.reward_quota || 0) > 0) return formatQuota(item.reward_quota || 0)
  return '点亮后自动发放'
}

export function AchievementGrid(props: AchievementGridProps) {
  return (
    <TooltipProvider delay={100}>
      <div className='rounded-2xl border bg-card shadow-xs'>
        <div className='border-b px-4 py-3 sm:px-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2'>
              <Sparkles className='size-4 text-primary' />
              <div className='text-base font-semibold'>宠物图鉴</div>
            </div>
            <Badge variant='outline'>{props.achievements.length} 只宠物</Badge>
          </div>
          <div className='mt-1 text-sm text-muted-foreground'>
            已解锁的宠物可以装备、升级并提供增益；未解锁的宠物会明确显示解锁方式。
          </div>
        </div>

        <div className='grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4'>
          {props.achievements.map((achievement) => {
            const profile = getPetProfile(achievement.key)
            const pet = achievement.pet
            const progressValue = getPetProgress(achievement)

            return (
              <Tooltip key={achievement.key}>
                <TooltipTrigger
                  render={
                    <div
                      className={cn(
                        'rounded-2xl border p-4 transition-colors',
                        achievement.unlocked
                          ? getTierStyle(achievement.tier)
                          : 'border-dashed bg-muted/20 text-muted-foreground'
                      )}
                    />
                  }
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div
                      className={cn(
                        'flex size-20 items-center justify-center rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] p-2 shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:bg-slate-950/40',
                        !achievement.unlocked && 'opacity-45 saturate-0'
                      )}
                    >
                      <PixelPetSprite id={profile.id} label={profile.species} />
                    </div>

                    <div className='flex flex-col items-end gap-2'>
                      <Badge
                        variant={achievement.unlocked ? 'secondary' : 'outline'}
                      >
                        {achievement.unlocked ? '已解锁' : '未解锁'}
                      </Badge>
                      {pet?.equipped ? <Badge>出战中</Badge> : null}
                    </div>
                  </div>

                  <div className='mt-4 space-y-2'>
                    <div>
                      <div className='text-sm font-semibold'>{achievement.name}</div>
                      <div className='mt-1'>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                            profile.splash
                          )}
                        >
                          {profile.species}
                        </span>
                      </div>
                    </div>

                    <div className='text-sm leading-6'>{achievement.description}</div>
                  </div>

                  <div className='mt-4 space-y-2 rounded-2xl border border-black/5 bg-white/60 p-3 text-xs leading-5 dark:border-white/10 dark:bg-slate-950/30'>
                    <div>
                      <span className='font-medium text-foreground'>解锁方式：</span>
                      <span>{achievement.hint}</span>
                    </div>
                    <div>
                      <span className='font-medium text-foreground'>点亮奖励：</span>
                      <span>{formatReward(achievement)}</span>
                    </div>

                    {pet ? (
                      <>
                        <div className='rounded-xl border bg-background/80 p-2.5'>
                          <div className='mb-2 flex items-center justify-between gap-2'>
                            <span className='font-medium text-foreground'>
                              Lv.{pet.level}/{pet.max_level}
                            </span>
                            <span className='text-muted-foreground'>
                              {pet.is_max_level
                                ? '已满级'
                                : `${pet.experience}/${pet.next_level_exp} EXP`}
                            </span>
                          </div>
                          <Progress value={progressValue} />
                          <div className='mt-2 text-muted-foreground'>
                            增益：{pet.buff.name} {pet.buff.value_text}
                          </div>
                        </div>

                        <div className='flex flex-col gap-2 pt-1'>
                          <Button
                            size='sm'
                            variant={pet.equipped ? 'secondary' : 'outline'}
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              props.onEquip(achievement.key)
                            }}
                            disabled={props.equippingKey === achievement.key}
                          >
                            {props.equippingKey === achievement.key
                              ? '装备中...'
                              : pet.equipped
                                ? '当前出战'
                                : '装备这只宠物'}
                          </Button>

                          <Button
                            size='sm'
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              props.onUpgrade(achievement.key)
                            }}
                            disabled={
                              props.upgradingKey === achievement.key ||
                              pet.is_max_level ||
                              !pet.can_upgrade
                            }
                          >
                            {props.upgradingKey === achievement.key
                              ? '升级中...'
                              : pet.is_max_level
                                ? '已满级'
                                : pet.can_upgrade
                                  ? `升级消耗 ${pet.upgrade_cost_usd.toFixed(2)} 美元`
                                  : '经验不足'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className='flex items-center gap-1 text-muted-foreground'>
                        <Lock className='size-3.5' />
                        解锁后才可装备与升级
                      </div>
                    )}

                    {achievement.unlocked && achievement.reward_claimed_at ? (
                      <div className='text-emerald-700 dark:text-emerald-300'>
                        奖励发放时间：{formatTimestampToDate(achievement.reward_claimed_at)}
                      </div>
                    ) : null}
                  </div>
                </TooltipTrigger>
                <TooltipContent className='max-w-64 text-xs leading-5'>
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

