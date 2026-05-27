import { api } from '@/lib/api'

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

export type PeoplePlanAdminStats = {
  teams: number
  active_members: number
  pending_rewards: number
  claimable_rewards: number
  pending_submissions: number
  open_risk_reviews: number
}

export type PeoplePlanAdminTeamRow = {
  id: number
  name: string
  invite_code: string
  status: string
  captain_user_id: number
  captain_name: string
  captain_username: string
  min_members: number
  max_members: number
  active_members: number
  effective_members: number
  formation_rate: number
  team_calls: number
  team_spend_usd: number
  monthly_active_members: number
  monthly_team_spend_usd: number
  reward_count: number
  pending_reward_count: number
  claimable_reward_count: number
  claimed_reward_count: number
  reward_quota_usd: number
  submission_count: number
  pending_submission_count: number
  approved_submission_count: number
  formed_at: number
  locked_at: number
  last_synced_at: number
  created_at: number
  updated_at: number
}

export type PeoplePlanAdminRewardRow = {
  id: number
  user_id: number
  user_name: string
  username: string
  team_id: number
  team_name: string
  team_status: string
  source_type: string
  source_key: string
  title: string
  description: string
  reward_type: string
  quota_delta: number
  quota_usd: number
  status: string
  review_status: string
  risk_status: string
  claimable_at: number
  reviewed_by: number
  reviewed_at: number
  review_notes: string
  created_at: number
  updated_at: number
}

export type PeoplePlanAdminSubmissionRow = {
  id: number
  user_id: number
  user_name: string
  username: string
  team_id: number
  team_name: string
  team_status: string
  type: string
  title: string
  summary: string
  contact: string
  public_display: boolean
  status: string
  review_notes: string
  reviewed_by: number
  reviewed_at: number
  created_at: number
  updated_at: number
}

export async function getPeoplePlanAdminStats() {
  const response = await api.get<ApiEnvelope<PeoplePlanAdminStats>>(
    '/api/people-plan/admin/stats'
  )
  return response.data
}

export async function getPeoplePlanAdminTeams() {
  const response = await api.get<ApiEnvelope<PeoplePlanAdminTeamRow[]>>(
    '/api/people-plan/admin/teams'
  )
  return response.data
}

export async function getPeoplePlanAdminRewards() {
  const response = await api.get<ApiEnvelope<PeoplePlanAdminRewardRow[]>>(
    '/api/people-plan/admin/rewards'
  )
  return response.data
}

export async function reviewPeoplePlanReward(payload: {
  rewardId: number
  action: 'approve' | 'reject' | 'freeze'
  notes: string
}) {
  const response = await api.post<ApiEnvelope<PeoplePlanAdminRewardRow>>(
    `/api/people-plan/admin/rewards/${payload.rewardId}/review`,
    {
      action: payload.action,
      notes: payload.notes,
    }
  )
  return response.data
}

export async function getPeoplePlanAdminSubmissions() {
  const response = await api.get<ApiEnvelope<PeoplePlanAdminSubmissionRow[]>>(
    '/api/people-plan/admin/submissions'
  )
  return response.data
}

export async function reviewPeoplePlanSubmission(payload: {
  submissionId: number
  action: 'approve' | 'reject'
  notes: string
}) {
  const response = await api.post<ApiEnvelope<PeoplePlanAdminSubmissionRow>>(
    `/api/people-plan/admin/submissions/${payload.submissionId}/review`,
    {
      action: payload.action,
      notes: payload.notes,
    }
  )
  return response.data
}
