import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getGamificationDashboard,
  getGamificationHallOfFame,
} from './api'
import { AchievementGrid } from './components/achievement-grid'
import { CompanionCard } from './components/companion-card'
import { DailyMissionsCard } from './components/daily-missions-card'
import { HallOfFamePanels } from './components/hall-of-fame-panels'

function WorkshopLoadingCard() {
  return <Skeleton className='h-[280px] w-full rounded-2xl' />
}

export function WorkshopOverviewPanel() {
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })

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
        />
        <DailyMissionsCard missions={data.daily_missions} />
      </div>
      <AchievementGrid achievements={data.achievements} />
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
