import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  equipGamificationPet,
  feedGamificationPet,
  getGamificationDashboard,
  getGamificationHallOfFame,
} from './api'
import { AchievementGrid } from './components/achievement-grid'
import { CompanionCard } from './components/companion-card'
import { CompanionPlaybook } from './components/companion-playbook'
import { DailyMissionsCard } from './components/daily-missions-card'
import { HallOfFamePanels } from './components/hall-of-fame-panels'
import { PixelPetSprite, getPetProfile } from './pet-catalog'
import type { CompanionSummary } from './types'

function WorkshopLoadingCard() {
  return <Skeleton className='h-[280px] w-full rounded-2xl' />
}

function useCompanionActions() {
  const queryClient = useQueryClient()
  const formatFundingSource = (source?: string) =>
    source === 'subscription' ? '套餐额度' : '钱包余额'

  const equipMutation = useMutation({
    mutationFn: equipGamificationPet,
    onSuccess: async () => {
      toast.success('宠物已切换，新的增益已经生效')
      await queryClient.invalidateQueries({
        queryKey: ['gamification'],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || '装备宠物失败')
    },
  })

  const feedMutation = useMutation({
    mutationFn: feedGamificationPet,
    onSuccess: async (result) => {
      const data = result.data
      const consumedUSD = data?.consumed_usd ?? 0
      const gainedExp = data?.gained_exp ?? 0
      const upgradedText =
        data?.leveled_up && data?.current_level
          ? `，并自动升到 Lv.${data.current_level}`
          : ''
      toast.success(
        `投喂成功，已消耗 ${formatFundingSource(data?.funding_source)} ${consumedUSD.toFixed(2)} 美元额度，获得 ${gainedExp} EXP${upgradedText}`
      )
      await queryClient.invalidateQueries({
        queryKey: ['gamification'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['blind-box', 'self'],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || '宠物投喂失败')
    },
  })

  return {
    equipMutation,
    feedMutation,
  }
}

function getCompanionProgressValue(companion: CompanionSummary): number {
  const equippedPet = companion.equipped_pet
  if (equippedPet) {
    if (equippedPet.is_max_level) return 100
    return Math.min(
      100,
      ((equippedPet.experience - equippedPet.current_level_exp) /
        Math.max(
          1,
          equippedPet.next_level_exp - equippedPet.current_level_exp
        )) *
        100
    )
  }

  if (companion.progress_target <= 0) return 0
  return Math.min(
    100,
    (companion.progress_current / companion.progress_target) * 100
  )
}

function CompactCompanionOverview(props: { companion: CompanionSummary }) {
  const { t } = useTranslation()
  const equippedPet = props.companion.equipped_pet
  const equippedProfile = equippedPet
    ? getPetProfile(equippedPet.achievement_key)
    : null
  const progressValue = getCompanionProgressValue(props.companion)
  const progressText = equippedPet
    ? equippedPet.is_max_level
      ? t('Max level')
      : `${equippedPet.experience}/${equippedPet.next_level_exp} EXP`
    : `${props.companion.progress_current}/${props.companion.progress_target}`

  return (
    <div className='rounded-[22px] border border-border/80 bg-card/92 shadow-[0_14px_36px_rgba(31,35,43,0.05)] dark:bg-card/92 dark:shadow-[0_16px_36px_rgba(0,0,0,0.24)]'>
      <div className='flex h-full flex-col gap-4 p-4 sm:p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='text-muted-foreground text-xs font-medium tracking-[0.22em] uppercase'>
              {t('Companion dex')}
            </div>
            <div className='mt-1 text-lg font-semibold'>
              {equippedProfile?.species || t('No pet equipped')}
            </div>
            <div className='text-muted-foreground mt-1 text-sm'>
              {equippedPet
                ? `${props.companion.title} · Lv.${equippedPet.level}/${equippedPet.max_level}`
                : t('Unlock and equip a pet from the dex first')}
            </div>
          </div>
          <Badge variant='outline'>
            {`${props.companion.unlocked_count}/${props.companion.total_count}`}
          </Badge>
        </div>

        <div className='grid grid-cols-[88px_minmax(0,1fr)] gap-4'>
          <div className='app-subtle-panel flex h-[88px] w-[88px] items-center justify-center p-2'>
            {equippedProfile ? (
              <PixelPetSprite
                id={equippedProfile.id}
                label={equippedProfile.species}
              />
            ) : (
              <div className='text-muted-foreground text-center text-[11px] leading-5'>
                {t('No pet equipped')}
              </div>
            )}
          </div>

          <div className='flex min-w-0 flex-col gap-3'>
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between gap-2 text-xs'>
                <span className='text-muted-foreground'>
                  {equippedPet ? t('EXP progress') : t('Dex progress')}
                </span>
                <span className='font-medium'>{progressText}</span>
              </div>
              <Progress value={progressValue} />
            </div>

            <div className='grid gap-2 sm:grid-cols-2'>
              <div className='app-subtle-panel px-3 py-2.5'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  {t('Current buff')}
                </div>
                <div className='mt-1 text-sm font-semibold'>
                  {props.companion.active_buff
                    ? `${props.companion.active_buff.name} ${props.companion.active_buff.value_text}`
                    : t('No Active')}
                </div>
              </div>
              <div className='app-subtle-panel px-3 py-2.5'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  {t('Dex progress')}
                </div>
                <div className='mt-1 text-sm font-semibold'>
                  {`${props.companion.progress_current}/${props.companion.progress_target}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button
          variant='outline'
          className='justify-between'
          render={
            <Link
              to='/dashboard/$section'
              params={{ section: 'achievements' }}
            />
          }
        >
          <span>{t('Open Dex')}</span>
        </Button>
      </div>
    </div>
  )
}

export function WorkshopOverviewPanel(props: { compact?: boolean }) {
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })
  const { feedMutation } = useCompanionActions()

  if (dashboardQuery.isLoading) {
    if (props.compact) {
      return <Skeleton className='h-[260px] w-full rounded-2xl' />
    }
    return (
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <WorkshopLoadingCard />
        <WorkshopLoadingCard />
      </div>
    )
  }

  const data = dashboardQuery.data?.data
  if (!data) return null

  if (props.compact) {
    return <CompactCompanionOverview companion={data.companion} />
  }

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <CompanionCard
          companion={data.companion}
          stats={data.achievement_stats}
          onFeed={(achievementKey, feedUSD) =>
            feedMutation.mutate({ achievementKey, feedUSD })
          }
          feeding={feedMutation.isPending}
        />
        <DailyMissionsCard missions={data.daily_missions} />
      </div>
      <HallOfFamePanels categories={data.hall_of_fame} limit={3} />
    </div>
  )
}

export function WorkshopOverviewSidebar() {
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })

  if (dashboardQuery.isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-[260px] w-full rounded-2xl' />
        <Skeleton className='h-[320px] w-full rounded-2xl' />
      </div>
    )
  }

  const data = dashboardQuery.data?.data
  if (!data) return null

  return (
    <div className='space-y-4'>
      <CompactCompanionOverview companion={data.companion} />
      <DailyMissionsCard missions={data.daily_missions} />
    </div>
  )
}

export function WorkshopDexSection() {
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })
  const { equipMutation, feedMutation } = useCompanionActions()

  if (dashboardQuery.isLoading) {
    return (
      <div className='space-y-4'>
        <WorkshopLoadingCard />
        <WorkshopLoadingCard />
      </div>
    )
  }

  const data = dashboardQuery.data?.data
  if (!data) return null

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <CompanionCard
          companion={data.companion}
          stats={data.achievement_stats}
          onFeed={(achievementKey, feedUSD) =>
            feedMutation.mutate({ achievementKey, feedUSD })
          }
          feeding={feedMutation.isPending}
        />
        <DailyMissionsCard missions={data.daily_missions} />
      </div>
      <CompanionPlaybook />
      <AchievementGrid
        achievements={data.achievements}
        onEquip={(achievementKey) => equipMutation.mutate(achievementKey)}
        onFeed={(achievementKey, feedUSD) =>
          feedMutation.mutate({ achievementKey, feedUSD })
        }
        equippingKey={equipMutation.variables}
        feedingKey={feedMutation.variables?.achievementKey}
      />
    </div>
  )
}

export function WorkshopHallOfFameSection() {
  const hallOfFameQuery = useQuery({
    queryKey: ['gamification', 'hall-of-fame'],
    queryFn: getGamificationHallOfFame,
    staleTime: 60 * 1000,
  })

  if (hallOfFameQuery.isLoading) {
    return (
      <div className='grid gap-4 xl:grid-cols-3'>
        <WorkshopLoadingCard />
        <WorkshopLoadingCard />
        <WorkshopLoadingCard />
      </div>
    )
  }

  const categories = hallOfFameQuery.data?.data?.categories ?? []
  if (categories.length === 0) return null

  return <HallOfFamePanels categories={categories} />
}
