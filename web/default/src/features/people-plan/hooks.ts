import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  claimPeoplePlanReward,
  createPeoplePlanSubmission,
  createPeoplePlanTeam,
  getPeoplePlanOverview,
  getPeoplePlanRewards,
  getPeoplePlanSubmissions,
  joinPeoplePlanTeam,
  leavePeoplePlanTeam,
  removePeoplePlanMember,
} from './api'
import type { PeoplePlanOverview } from './types'
import { getRequestErrorMessage } from './utils'

export function usePeoplePlanQueries() {
  const overviewQuery = useQuery({
    queryKey: ['people-plan', 'overview'],
    queryFn: getPeoplePlanOverview,
  })
  const rewardsQuery = useQuery({
    queryKey: ['people-plan', 'rewards'],
    queryFn: getPeoplePlanRewards,
  })
  const submissionsQuery = useQuery({
    queryKey: ['people-plan', 'submissions'],
    queryFn: getPeoplePlanSubmissions,
  })

  const overview = overviewQuery.data?.data as PeoplePlanOverview | undefined
  const team = overview?.team ?? null
  const rewards = rewardsQuery.data?.data?.items ?? overview?.recent_rewards ?? []
  const rewardSummary =
    rewardsQuery.data?.data?.summary ?? overview?.reward_summary ?? null
  const submissions =
    submissionsQuery.data?.data ?? overview?.recent_submissions ?? []
  const isLoading =
    overviewQuery.isLoading || rewardsQuery.isLoading || submissionsQuery.isLoading

  return {
    overview,
    team,
    rewards,
    rewardSummary,
    submissions,
    isLoading,
    overviewQuery,
    rewardsQuery,
    submissionsQuery,
  }
}

export function usePeoplePlanMutations() {
  const queryClient = useQueryClient()

  const invalidatePeoplePlan = async () => {
    await queryClient.invalidateQueries({ queryKey: ['people-plan'] })
  }

  return {
    createTeamMutation: useMutation({
      mutationFn: createPeoplePlanTeam,
      onSuccess: async () => {
        toast.success('队伍已创建')
        await invalidatePeoplePlan()
      },
      onError: (error) => toast.error(getRequestErrorMessage(error)),
    }),
    joinTeamMutation: useMutation({
      mutationFn: joinPeoplePlanTeam,
      onSuccess: async () => {
        toast.success('已加入队伍')
        await invalidatePeoplePlan()
      },
      onError: (error) => toast.error(getRequestErrorMessage(error)),
    }),
    leaveTeamMutation: useMutation({
      mutationFn: leavePeoplePlanTeam,
      onSuccess: async () => {
        toast.success('已退出队伍')
        await invalidatePeoplePlan()
      },
      onError: (error) => toast.error(getRequestErrorMessage(error)),
    }),
    removeMemberMutation: useMutation({
      mutationFn: removePeoplePlanMember,
      onSuccess: async () => {
        toast.success('成员已移出小队')
        await invalidatePeoplePlan()
      },
      onError: (error) => toast.error(getRequestErrorMessage(error)),
    }),
    claimRewardMutation: useMutation({
      mutationFn: claimPeoplePlanReward,
      onSuccess: async () => {
        toast.success('奖励已领取')
        await invalidatePeoplePlan()
      },
      onError: (error) => toast.error(getRequestErrorMessage(error)),
    }),
    createSubmissionMutation: useMutation({
      mutationFn: createPeoplePlanSubmission,
      onSuccess: async () => {
        toast.success('投稿已提交，等待审核')
        await invalidatePeoplePlan()
      },
      onError: (error) => toast.error(getRequestErrorMessage(error)),
    }),
  }
}
