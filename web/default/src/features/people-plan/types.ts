export type PeoplePlanPopup = {
  enabled: boolean
  version: string
  title: string
  body: string
}

export type PeoplePlanContributionWeight = {
  key: string
  label: string
  weight: number
}

export type PeoplePlanRewardTier = {
  required_members: number
  target: number
  reward_pool_usd: number
}

export type PeoplePlanTeamRules = {
  min_members: number
  max_members: number
  effective_invite_reward_usd: number
  effective_invitee_gift_usd: number
  team_reward_per_member_usd: number
  captain_reward_usd: number
  reward_min_contribution_bps: number
  effective_min_calls: number
  effective_min_spend_usd: number
  monthly_active_min_calls: number
  reward_tiers: PeoplePlanRewardTier[]
}

export type PeoplePlanTask = {
  key: string
  category: string
  audience: string
  title: string
  description: string
  metric: string
  target: number
  reward_type: string
  reward_quota_usd: number
  reward_pool_usd: number
  reward_title: string
  reward_description: string
  captain_only: boolean
  repeatable: boolean
  max_completions: number
  contribution_mode: string
  contribution_summary: string
  contribution_weights: PeoplePlanContributionWeight[]
  reward_tiers: PeoplePlanRewardTier[]
}

export type PeoplePlanSubmissionTask = {
  key: string
  type: string
  title: string
  description: string
  reward_pool_usd: number
  repeatable: boolean
  max_completions: number
  contribution_summary: string
}

export type PeoplePlanReward = {
  id: number
  user_id: number
  team_id: number
  source_type: string
  source_key: string
  title: string
  description: string
  reward_type: string
  quota_delta: number
  reward_payload: string
  status: string
  review_status: string
  risk_status: string
  claimable_at: number
  expires_at: number
  claimed_at: number
  reviewed_by: number
  reviewed_at: number
  review_notes: string
  created_at: number
  updated_at: number
}

export type PeoplePlanSubmission = {
  id: number
  user_id: number
  team_id: number
  type: string
  title: string
  summary: string
  content: string
  attachments: string
  contact: string
  public_display: boolean
  status: string
  review_notes: string
  reviewed_by: number
  reviewed_at: number
  created_at: number
  updated_at: number
}

export type PeoplePlanRewardSummary = {
  total: number
  claimable: number
  pending: number
  frozen: number
  claimed: number
  quota_usd: number
}

export type PeoplePlanMemberProfile = {
  user_id: number
  username: string
  display_name: string
  role: string
  status: string
  join_source: string
  verified_at: number
  first_api_key_at: number
  first_call_at: number
  first_topup_at: number
  effective_at: number
  current_month_spend: number
  current_month_calls: number
  lifetime_spend: number
  lifetime_calls: number
  lifetime_invites: number
  lifetime_blind_box_opens: number
  counts_as_effective_member: boolean
}

export type PeoplePlanProgress = {
  key: string
  category: string
  title: string
  description: string
  metric: string
  period_key: string
  current_value: number
  target_value: number
  status: string
  last_reached_at: number
  completion_count: number
  reward_ledger_id: number
}

export type PeoplePlanTeamSummary = {
  active_members: number
  effective_members: number
  min_members: number
  max_members: number
  team_calls: number
  team_spend_usd: number
  team_invites: number
  team_blind_box_opens: number
  monthly_active_members: number
  monthly_team_spend_usd: number
}

export type PeoplePlanTeam = {
  id: number
  name: string
  invite_code: string
  status: string
  captain_user_id: number
  min_members: number
  max_members: number
  formed_at: number
  locked_at: number
  last_synced_at: number
  snapshot: string
  created_at: number
  updated_at: number
}

export type PeoplePlanMembership = {
  id: number
  team_id: number
  user_id: number
  role: string
  status: string
  join_source: string
  invited_by_user_id: number
  verified_at: number
  first_api_key_at: number
  first_call_at: number
  first_topup_at: number
  effective_at: number
  last_active_at: number
  current_month_spend: number
  current_month_calls: number
  lifetime_spend: number
  lifetime_calls: number
  snapshot: string
  created_at: number
  updated_at: number
}

export type PeoplePlanTeamDetail = {
  team: PeoplePlanTeam
  membership: PeoplePlanMembership
  summary: PeoplePlanTeamSummary
  members: PeoplePlanMemberProfile[]
  achievements: PeoplePlanProgress[]
}

export type PeoplePlanOverview = {
  enabled: boolean
  entry_title: string
  entry_subtitle: string
  hero_title: string
  hero_subtitle: string
  hero_description: string
  max_team_reward_usd: number
  max_submission_reward_usd: number
  max_total_reward_usd: number
  popup: PeoplePlanPopup
  team_rules: PeoplePlanTeamRules
  achievements: PeoplePlanTask[]
  monthly: PeoplePlanTask[]
  team_tasks: PeoplePlanTask[]
  submission_tasks: PeoplePlanSubmissionTask[]
  team: PeoplePlanTeamDetail | null
  reward_summary: PeoplePlanRewardSummary
  recent_rewards: PeoplePlanReward[]
  recent_submissions: PeoplePlanSubmission[]
  generated_at: number
}

export type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}
