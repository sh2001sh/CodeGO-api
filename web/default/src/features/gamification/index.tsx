import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  equipGamificationPet,
  getGamificationDashboard,
  getGamificationHallOfFame,
  upgradeGamificationPet,
} from './api'
import { AchievementGrid } from './components/achievement-grid'
import { CompanionCard } from './components/companion-card'
import { CompanionPlaybook } from './components/companion-playbook'
import { DailyMissionsCard } from './components/daily-missions-card'
import { HallOfFamePanels } from './components/hall-of-fame-panels'

function WorkshopLoadingCard() {
  return <Skeleton className='h-[280px] w-full rounded-2xl' />
}

function useCompanionActions() {
  const queryClient = useQueryClient()

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

  const upgradeMutation = useMutation({
    mutationFn: upgradeGamificationPet,
    onSuccess: async () => {
      toast.success('宠物升级成功')
      await queryClient.invalidateQueries({
        queryKey: ['gamification'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['blind-box', 'self'],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || '宠物升级失败')
    },
  })

  return {
    equipMutation,
    upgradeMutation,
  }
}

export function WorkshopOverviewPanel() {
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })
  const { upgradeMutation } = useCompanionActions()

  if (dashboardQuery.isLoading) {
    return (
      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]'>
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
          onUpgrade={(achievementKey) => upgradeMutation.mutate(achievementKey)}
          upgrading={upgradeMutation.isPending}
        />
        <DailyMissionsCard missions={data.daily_missions} />
      </div>
      <HallOfFamePanels categories={data.hall_of_fame} limit={3} />
    </div>
  )
}

export function WorkshopDexSection() {
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })
  const { equipMutation, upgradeMutation } = useCompanionActions()

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
          onUpgrade={(achievementKey) => upgradeMutation.mutate(achievementKey)}
          upgrading={upgradeMutation.isPending}
        />
        <DailyMissionsCard missions={data.daily_missions} />
      </div>
      <CompanionPlaybook />
      <AchievementGrid
        achievements={data.achievements}
        onEquip={(achievementKey) => equipMutation.mutate(achievementKey)}
        onUpgrade={(achievementKey) => upgradeMutation.mutate(achievementKey)}
        equippingKey={equipMutation.variables}
        upgradingKey={upgradeMutation.variables}
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

