import { useState, type ComponentType } from 'react'
import { Coins, Sparkles, Swords, Trophy, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { formatQuota, formatTimestampToDate } from '@/lib/format'
import type { AchievementStats, CompanionSummary } from '../types'
import { PixelPetSprite, getPetProfile } from '../pet-catalog'

interface CompanionCardProps {
  companion: CompanionSummary
  stats: AchievementStats
  onFeed?: (achievementKey: string, feedUSD: number) => void
  feeding?: boolean
  onUpgrade?: (achievementKey: string) => void
  upgrading?: boolean
}

function RuleChip(props: {
  icon: ComponentType<{ className?: string }>
  text: string
}) {
  const Icon = props.icon
  return (
    <div className='rounded-2xl border bg-background/80 p-3'>
      <div className='flex items-start gap-3'>
        <div className='mt-0.5 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <Icon className='size-4' />
        </div>
        <div className='text-xs leading-6 text-muted-foreground'>{props.text}</div>
      </div>
    </div>
  )
}

export function CompanionCard(props: CompanionCardProps) {
  const [feedUSD, setFeedUSD] = useState('1')
  const equippedPet = props.companion.equipped_pet
  const equippedProfile = equippedPet
    ? getPetProfile(equippedPet.achievement_key)
    : null

  const progressValue = equippedPet
    ? equippedPet.is_max_level
      ? 100
      : Math.min(
          100,
          ((equippedPet.experience - equippedPet.current_level_exp) /
            Math.max(1, equippedPet.next_level_exp - equippedPet.current_level_exp)) *
            100
        )
    : props.companion.progress_target > 0
      ? Math.min(
          100,
          (props.companion.progress_current / props.companion.progress_target) * 100
        )
      : 0

  const handleFeed = () => {
    if (!equippedPet) return
    const amount = Number(feedUSD)
    if (!Number.isFinite(amount) || amount <= 0) return
    props.onFeed?.(equippedPet.achievement_key, amount)
  }

  return (
    <div className='overflow-hidden rounded-2xl border bg-[linear-gradient(135deg,rgba(255,248,237,0.98),rgba(255,255,255,0.99))] shadow-xs dark:bg-[linear-gradient(135deg,rgba(42,26,18,0.94),rgba(17,24,39,0.96))]'>
      <div className='flex h-full flex-col gap-4 p-4 sm:p-5'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex size-24 items-center justify-center rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,243,226,0.92))] p-2 shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:bg-slate-950/45'>
              {equippedProfile ? (
                <PixelPetSprite
                  id={equippedProfile.id}
                  label={equippedProfile.species}
                />
              ) : (
                <div className='text-center text-xs leading-5 text-muted-foreground'>
                  先解锁图鉴
                  <br />
                  再选择一只出战
                </div>
              )}
            </div>

            <div className='space-y-1'>
              <div className='text-sm font-medium text-muted-foreground'>
                当前出战宠物
              </div>
              <div className='text-xl font-semibold tracking-tight'>
                {equippedProfile?.species || '暂未装备'}
              </div>
              <div className='text-sm text-muted-foreground'>
                {equippedPet
                  ? `${props.companion.title} · 满级 ${props.companion.max_level} 级`
                  : '先在图鉴中解锁并装备一只宠物'}
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline'>
              已解锁 {props.companion.unlocked_count}/{props.companion.total_count}
            </Badge>
            {equippedPet ? <Badge>Lv.{equippedPet.level}</Badge> : null}
          </div>
        </div>

        <div className='rounded-2xl border bg-background/70 p-4'>
          <div className='mb-2 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'>
            <div>
              <div className='text-sm font-medium'>成长进度</div>
              <div className='text-xs text-muted-foreground'>
                {equippedPet
                  ? equippedPet.is_max_level
                    ? '当前宠物已满级，增益已经达到上限。'
                    : `经验 ${equippedPet.experience}/${equippedPet.next_level_exp}，先投喂或做任务拿经验，够线后再点击升级。`
                  : `图鉴已点亮 ${props.companion.progress_current}/${props.companion.progress_target}，先解锁宠物再开始养成。`}
              </div>
            </div>

            {equippedPet && !equippedPet.is_max_level ? (
              <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
                <div className='flex min-w-[240px] items-center gap-2 rounded-xl border bg-background/80 px-3 py-2'>
                  <Coins className='size-4 shrink-0 text-primary' />
                  <Input
                    type='number'
                    min='0.1'
                    step='0.1'
                    value={feedUSD}
                    onChange={(event) => setFeedUSD(event.target.value)}
                    className='h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0'
                    placeholder='输入投喂额度'
                  />
                  <span className='shrink-0 text-xs text-muted-foreground'>
                    美元额度
                  </span>
                </div>

                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleFeed}
                  disabled={props.feeding}
                >
                  {props.feeding ? '投喂中...' : '投喂宠物'}
                </Button>

                <Button
                  size='sm'
                  onClick={() => props.onUpgrade?.(equippedPet.achievement_key)}
                  disabled={props.upgrading || !equippedPet.can_upgrade}
                >
                  {props.upgrading
                    ? '升级中...'
                    : equippedPet.can_upgrade
                      ? `点击升级 - ${equippedPet.upgrade_cost_usd.toFixed(2)} 美元`
                      : '经验不足'}
                </Button>
              </div>
            ) : null}
          </div>

          <Progress value={progressValue} />

          <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <div className='rounded-2xl border bg-background/70 p-3'>
              <div className='text-xs text-muted-foreground'>当前增益</div>
              <div className='mt-1 text-sm font-semibold'>
                {props.companion.active_buff
                  ? `${props.companion.active_buff.name} ${props.companion.active_buff.value_text}`
                  : '未生效'}
              </div>
              <div className='mt-1 text-xs leading-5 text-muted-foreground'>
                {props.companion.active_buff?.description || '装备宠物后即可获得增益。'}
              </div>
            </div>

            <div className='rounded-2xl border bg-background/70 p-3'>
              <div className='text-xs text-muted-foreground'>投喂效率</div>
              <div className='mt-1 text-sm font-semibold'>
                {equippedPet ? `1 美元额度 ≈ ${equippedPet.feed_exp_per_usd} EXP` : '-'}
              </div>
              <div className='mt-1 text-xs leading-5 text-muted-foreground'>
                投喂会按你的套餐/余额顺序扣除额度，额度不够就会直接失败。
              </div>
            </div>

            <div className='rounded-2xl border bg-background/70 p-3'>
              <div className='text-xs text-muted-foreground'>下次升级消耗</div>
              <div className='mt-1 text-sm font-semibold'>
                {equippedPet
                  ? equippedPet.is_max_level
                    ? '已满级'
                    : formatQuota(equippedPet.upgrade_cost_quota)
                  : '-'}
              </div>
              <div className='mt-1 text-xs leading-5 text-muted-foreground'>
                经验够了以后，再点升级按钮才会扣这部分额度。
              </div>
            </div>

            <div className='rounded-2xl border bg-background/70 p-3'>
              <div className='text-xs text-muted-foreground'>最近点亮</div>
              {props.stats.latest ? (
                <>
                  <div className='mt-1 text-sm font-semibold'>
                    {props.stats.latest.name}
                  </div>
                  <div className='mt-1 text-xs leading-5 text-muted-foreground'>
                    {props.stats.latest.unlocked_at
                      ? formatTimestampToDate(props.stats.latest.unlocked_at)
                      : '刚刚加入图鉴'}
                  </div>
                </>
              ) : (
                <div className='mt-1 text-sm text-muted-foreground'>
                  等待第一只宠物
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
          <RuleChip icon={Swords} text={props.companion.only_one_equip_rule} />
          <RuleChip icon={Coins} text={props.companion.feeding_rule} />
          <RuleChip icon={Zap} text={props.companion.daily_mission_rule} />
          <RuleChip icon={Sparkles} text={props.companion.upgrade_rule} />
          <RuleChip icon={Trophy} text={props.companion.buff_rule} />
        </div>
      </div>
    </div>
  )
}
