export interface CompanionSummary {
  name: string
  title: string
  flavor: string
  level: number
  unlocked_count: number
  total_count: number
  progress_current: number
  progress_target: number
}

export interface AchievementItem {
  key: string
  name: string
  description: string
  hint: string
  icon: string
  tier: string
  unlocked: boolean
  unlocked_at?: number
}

export interface AchievementStats {
  unlocked_count: number
  total_count: number
  latest?: AchievementItem
}

export interface DailyMissionItem {
  key: string
  name: string
  description: string
  icon: string
  reward_usd: number
  reward_quota: number
  current: number
  target: number
  completed: boolean
  claimed: boolean
  completed_at?: number
}

export interface HallOfFameEntry {
  rank: number
  user_id: number
  display_name: string
  score: number
  subtitle: string
}

export interface HallOfFameCategory {
  key: string
  title: string
  metric: string
  window: string
  entries: HallOfFameEntry[]
}

export interface HallOfFameResponse {
  categories: HallOfFameCategory[]
  generated_at: number
}

export interface GamificationDashboard {
  companion: CompanionSummary
  achievement_stats: AchievementStats
  achievements: AchievementItem[]
  daily_missions: DailyMissionItem[]
  hall_of_fame: HallOfFameCategory[]
  generated_at: number
}
