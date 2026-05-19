import { api } from '@/lib/api'
import type {
  AchievementItem,
  CompanionFeedResult,
  CompanionPetView,
  CompanionSummary,
  GamificationDashboard,
  HallOfFameResponse,
} from './types'

export async function getGamificationDashboard() {
  const res = await api.get<{ success: boolean; data: GamificationDashboard }>(
    '/api/user/gamification/dashboard'
  )
  return res.data
}

export async function getGamificationAchievements() {
  const res = await api.get<{ success: boolean; data: AchievementItem[] }>(
    '/api/user/gamification/achievements'
  )
  return res.data
}

export async function getGamificationHallOfFame() {
  const res = await api.get<{ success: boolean; data: HallOfFameResponse }>(
    '/api/user/gamification/hall-of-fame'
  )
  return res.data
}

export async function reportGamificationShareLink() {
  const res = await api.post<{
    success: boolean
    data: { claimed: boolean; reward_usd: number }
  }>('/api/user/gamification/share-link')
  return res.data
}

export async function equipGamificationPet(achievementKey: string) {
  const res = await api.post<{ success: boolean; data: CompanionSummary }>(
    '/api/user/gamification/equip',
    {
      achievement_key: achievementKey,
    }
  )
  return res.data
}

export async function upgradeGamificationPet(achievementKey: string) {
  const res = await api.post<{ success: boolean; data: CompanionPetView }>(
    '/api/user/gamification/upgrade',
    {
      achievement_key: achievementKey,
    }
  )
  return res.data
}

export async function feedGamificationPet(params: {
  achievementKey: string
  feedUSD: number
}) {
  const res = await api.post<{ success: boolean; data: CompanionFeedResult }>(
    '/api/user/gamification/feed',
    {
      achievement_key: params.achievementKey,
      feed_usd: params.feedUSD,
    }
  )
  return res.data
}
