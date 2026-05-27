import { api } from '@/lib/api'
import type {
  ApiEnvelope,
  PeoplePlanOverview,
  PeoplePlanReward,
  PeoplePlanRewardSummary,
  PeoplePlanSubmission,
  PeoplePlanTeamDetail,
} from './types'

export async function getPeoplePlanOverview() {
  const response = await api.get<ApiEnvelope<PeoplePlanOverview>>(
    '/api/user/people-plan/overview'
  )
  return response.data
}

export async function getPeoplePlanTeam() {
  const response = await api.get<ApiEnvelope<PeoplePlanTeamDetail | null>>(
    '/api/user/people-plan/team'
  )
  return response.data
}

export async function createPeoplePlanTeam(name: string) {
  const response = await api.post<ApiEnvelope<PeoplePlanTeamDetail>>(
    '/api/user/people-plan/team',
    { name }
  )
  return response.data
}

export async function joinPeoplePlanTeam(inviteCode: string) {
  const response = await api.post<ApiEnvelope<PeoplePlanTeamDetail>>(
    '/api/user/people-plan/team/join',
    { invite_code: inviteCode }
  )
  return response.data
}

export async function leavePeoplePlanTeam() {
  const response = await api.post<ApiEnvelope<{ left: boolean }>>(
    '/api/user/people-plan/team/leave'
  )
  return response.data
}

export async function getPeoplePlanRewards() {
  const response = await api.get<
    ApiEnvelope<{ summary: PeoplePlanRewardSummary; items: PeoplePlanReward[] }>
  >('/api/user/people-plan/rewards')
  return response.data
}

export async function claimPeoplePlanReward(rewardId: number) {
  const response = await api.post<ApiEnvelope<PeoplePlanReward>>(
    `/api/user/people-plan/rewards/${rewardId}/claim`
  )
  return response.data
}

export async function getPeoplePlanSubmissions() {
  const response = await api.get<ApiEnvelope<PeoplePlanSubmission[]>>(
    '/api/user/people-plan/submissions'
  )
  return response.data
}

export async function createPeoplePlanSubmission(payload: {
  type: string
  title: string
  summary: string
  content: string
  attachments: string[]
  contact: string
  public_display: boolean
}) {
  const response = await api.post<ApiEnvelope<PeoplePlanSubmission>>(
    '/api/user/people-plan/submissions',
    payload
  )
  return response.data
}
