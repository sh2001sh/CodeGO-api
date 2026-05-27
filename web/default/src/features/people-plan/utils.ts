import { Flag, Rocket, Users } from 'lucide-react'
import type {
  PeoplePlanContributionWeight,
  PeoplePlanMemberProfile,
  PeoplePlanReward,
  PeoplePlanRewardTier,
  PeoplePlanSubmission,
  PeoplePlanSubmissionTask,
  PeoplePlanTask,
  PeoplePlanTeamDetail,
} from './types'

export type ActivityTab = 'rules' | 'rewards' | 'submissions'
export type SubmissionType = 'content' | 'project' | 'community'

export const activityTabs: Array<{
  value: ActivityTab
  label: string
  hint: string
}> = [
  {
    value: 'rules',
    label: '规则介绍',
    hint: '先看参与方式、奖励方式和任务口径',
  },
  {
    value: 'rewards',
    label: '组队活动',
    hint: '查看小队奖励、任务进度和成员贡献',
  },
  {
    value: 'submissions',
    label: '投稿活动',
    hint: '查看个人投稿任务、投稿奖励和投稿记录',
  },
]

export const submissionTypeOptions: Array<{
  value: SubmissionType
  label: string
  description: string
  icon: typeof Flag
}> = [
  {
    value: 'content',
    label: '内容投稿',
    description: '教程、案例、评测、使用经验',
    icon: Flag,
  },
  {
    value: 'project',
    label: '项目接入',
    description: '线上项目、演示站点、产品接入成果',
    icon: Rocket,
  },
  {
    value: 'community',
    label: '社区共建',
    description: '活动组织、答疑共创、社区联动成果',
    icon: Users,
  },
]

export function getRequestErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response
      ?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data
      .message
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '请求失败，请稍后重试。'
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatPercent(value: number) {
  return `${Math.round((value || 0) * 100)}%`
}

export function formatTime(value: number) {
  if (!value) return '--'
  const milliseconds = value > 1000000000000 ? value : value * 1000
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(milliseconds)
}

export function toStatusTone(status: string) {
  switch (status) {
    case 'claimable':
    case 'approved':
    case 'formed':
    case 'claimed':
      return 'default' as const
    case 'pending':
    case 'collecting':
    case 'active':
      return 'secondary' as const
    case 'frozen':
    case 'rejected':
    case 'locked':
      return 'destructive' as const
    default:
      return 'outline' as const
  }
}

export function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    achievement: '组队任务',
    active: '进行中',
    approved: '已通过',
    auto: '自动审核',
    captain: '队长',
    claimable: '可领取',
    claimed: '已领取',
    clear: '正常',
    collecting: '组队中',
    community: '社区共建',
    content: '内容投稿',
    formed: '已成团',
    frozen: '已冻结',
    locked: '已锁定',
    long_term: '长期任务',
    member: '成员',
    monthly: '月度任务',
    pending: '待审核',
    project: '项目接入',
    rejected: '未通过',
    review: '复核中',
    submission: '投稿任务',
    team: '小队任务',
    tracking: '进行中',
    weighted: '按贡献',
  }
  return map[status] || status
}

export function getRewardUsd(reward: PeoplePlanReward) {
  if (!reward.quota_delta) return 0
  return Math.round(reward.quota_delta / 500000)
}

export function parseSubmissionAttachments(attachments: string) {
  if (!attachments) return [] as string[]
  try {
    const parsed = JSON.parse(attachments)
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === 'string') as string[]
    }
  } catch {
    return []
  }
  return []
}

function getMetricValue(metric: string, member: PeoplePlanMemberProfile) {
  switch (metric) {
    case 'effective_members':
      return member.effective_at > 0 ? 1 : 0
    case 'current_month_calls':
      return member.current_month_calls
    case 'current_month_spend':
      return member.current_month_spend
    case 'lifetime_calls':
    case 'team_calls':
      return member.lifetime_calls
    case 'lifetime_spend':
    case 'team_spend_usd':
      return member.lifetime_spend
    case 'monthly_active_members':
      return member.current_month_calls > 0 ? 1 : 0
    case 'monthly_team_spend_usd':
      return member.current_month_spend
    default:
      return 0
  }
}

function getMetricLabel(metric: string) {
  switch (metric) {
    case 'effective_members':
      return '有效成员'
    case 'current_month_calls':
      return '本月调用'
    case 'current_month_spend':
      return '本月消费'
    case 'lifetime_calls':
    case 'team_calls':
      return '累计调用'
    case 'lifetime_spend':
    case 'team_spend_usd':
      return '累计消费'
    case 'monthly_active_members':
      return '本月活跃'
    case 'monthly_team_spend_usd':
      return '本月消费'
    default:
      return '贡献值'
  }
}

export function getTaskCurrentValue(
  task: Pick<PeoplePlanTask, 'metric'>,
  team: PeoplePlanTeamDetail | null
) {
  if (!team) return 0
  switch (task.metric) {
    case 'effective_members':
      return team.summary.effective_members
    case 'team_calls':
      return team.summary.team_calls
    case 'team_spend_usd':
      return team.summary.team_spend_usd
    case 'monthly_active_members':
      return team.summary.monthly_active_members
    case 'monthly_team_spend_usd':
      return team.summary.monthly_team_spend_usd
    default:
      return 0
  }
}

export function getTaskCompletedCount(
  task: Pick<PeoplePlanTask, 'target' | 'max_completions' | 'repeatable'>,
  currentValue: number,
  completionCount?: number
) {
  if (typeof completionCount === 'number' && completionCount >= 0) {
    return completionCount
  }
  if (task.target <= 0) return 0
  if (!task.repeatable) {
    return currentValue >= task.target ? 1 : 0
  }
  return Math.min(
    Math.floor(currentValue / task.target),
    Math.max(task.max_completions, 1)
  )
}

export function getMatchedRewardTier(
  rewardTiers: PeoplePlanRewardTier[] | undefined,
  effectiveMembers: number
) {
  if (!rewardTiers || rewardTiers.length === 0) {
    return null
  }
  let matched: PeoplePlanRewardTier | null = null
  for (const tier of rewardTiers) {
    if (effectiveMembers >= tier.required_members) {
      matched = tier
    }
  }
  return matched
}

export function getTaskRewardPool(
  task: Pick<PeoplePlanTask, 'reward_pool_usd' | 'reward_tiers'>,
  effectiveMembers: number
) {
  const matched = getMatchedRewardTier(task.reward_tiers ?? [], effectiveMembers)
  return matched?.reward_pool_usd ?? task.reward_pool_usd
}

export type TaskContributionItem = {
  user_id: number
  name: string
  ratio: number
  score: number
  details: Array<{
    key: string
    label: string
    value: number
    weight: number
  }>
}

function buildContributionDetails(
  member: PeoplePlanMemberProfile,
  weights: PeoplePlanContributionWeight[] | undefined,
  fallbackMetric: string
) {
  const normalizedWeights = weights ?? []
  const sourceWeights =
    normalizedWeights.length > 0
      ? normalizedWeights
      : [{ key: fallbackMetric, label: getMetricLabel(fallbackMetric), weight: 100 }]

  return sourceWeights.map((weight) => ({
    key: weight.key,
    label: weight.label || getMetricLabel(weight.key),
    value: getMetricValue(weight.key, member),
    weight: weight.weight,
  }))
}

export function getTaskContributionItems(
  task: Pick<PeoplePlanTask, 'metric' | 'contribution_weights'>,
  members: PeoplePlanMemberProfile[]
) {
  const contributionWeights = task.contribution_weights ?? []
  const detailList = members.map((member) => ({
    user_id: member.user_id,
    name: member.display_name || member.username,
    details: buildContributionDetails(
      member,
      contributionWeights,
      task.metric
    ),
  }))

  const detailTotals = new Map<string, number>()
  for (const item of detailList) {
    for (const detail of item.details) {
      detailTotals.set(
        detail.key,
        (detailTotals.get(detail.key) || 0) + detail.value
      )
    }
  }

  const scores = detailList.map((item) => {
    const score = item.details.reduce((sum, detail) => {
      const total = detailTotals.get(detail.key) || 0
      if (total <= 0) {
        return sum
      }
      return sum + (detail.value / total) * detail.weight
    }, 0)

    return {
      ...item,
      score,
    }
  })

  const totalScore = scores.reduce((sum, item) => sum + item.score, 0)

  return scores
    .map(
      (item): TaskContributionItem => ({
        user_id: item.user_id,
        name: item.name,
        ratio: totalScore > 0 ? item.score / totalScore : 0,
        score: item.score,
        details: item.details,
      })
    )
    .sort((a, b) => b.score - a.score)
}

export function getTaskTarget(
  task: Pick<PeoplePlanTask, 'target' | 'reward_tiers'>,
  effectiveMembers: number
): number {
  const tiers = task.reward_tiers ?? []
  if (tiers.length === 0) return task.target
  for (const tier of tiers) {
    if (effectiveMembers >= tier.required_members && tier.target > 0) {
      return tier.target
    }
  }
  return task.target
}

export function getPerCapitaTarget(
  task: Pick<PeoplePlanTask, 'target' | 'reward_tiers'>,
  effectiveMembers: number
): number | null {
  if (effectiveMembers <= 0) return null
  const effectiveTarget = getTaskTarget(task, effectiveMembers)
  const metric = (task as PeoplePlanTask).metric
  if (metric === 'effective_members' || metric === 'monthly_active_members') {
    return null
  }
  return Math.round(effectiveTarget / effectiveMembers)
}

export function getEstimatedPersonalShare(
  task: Pick<
    PeoplePlanTask,
    'reward_pool_usd' | 'reward_tiers' | 'contribution_weights' | 'metric'
  >,
  team: PeoplePlanTeamDetail,
  effectiveMembers: number
): { share: number; ratio: number } | null {
  const contributions = getTaskContributionItems(task, team.members ?? [])
  const mine = contributions.find(
    (c) => c.user_id === team.membership.user_id
  )
  if (!mine || mine.ratio <= 0) return null
  const rewardPool = getTaskRewardPool(task, effectiveMembers)
  return {
    share: Math.round(rewardPool * mine.ratio),
    ratio: mine.ratio,
  }
}

export function getSubmissionTaskCompletedCount(
  task: Pick<PeoplePlanSubmissionTask, 'type' | 'max_completions' | 'repeatable'>,
  submissions: PeoplePlanSubmission[]
) {
  const approvedCount = submissions.filter(
    (submission) =>
      submission.type === task.type && submission.status === 'approved'
  ).length

  if (!task.repeatable) {
    return approvedCount > 0 ? 1 : 0
  }
  return Math.min(approvedCount, Math.max(task.max_completions, 1))
}
