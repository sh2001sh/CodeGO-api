export interface CompanionSummary {
  name: string
  title: string
  flavor: string
  level: number
  unlocked_count: number
  total_count: number
  progress_current: number
  progress_target: number
  max_level: number
  only_one_equip_rule: string
  upgrade_rule: string
  daily_mission_rule: string
  buff_rule: string
  equipped_pet?: CompanionPetView
  active_buff?: CompanionBuffView
}

export interface CompanionBuffView {
  type: string
  name: string
  description: string
  value_text: string
}

export interface CompanionPetView {
  achievement_key: string
  level: number
  max_level: number
  experience: number
  current_level_exp: number
  next_level_exp: number
  can_upgrade: boolean
  is_max_level: boolean
  equipped: boolean
  upgrade_cost_quota: number
  upgrade_cost_usd: number
  buff: CompanionBuffView
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
  reward_usd?: number
  reward_quota?: number
  reward_title?: string
  reward_description?: string
  reward_claimed?: boolean
  reward_claimed_at?: number
  pet?: CompanionPetView
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
  pet_exp_reward: number
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
