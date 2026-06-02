import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Link2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SettingsSection } from '../components/settings-section'
import {
  getPeoplePlanAdminRewards,
  getPeoplePlanAdminStats,
  getPeoplePlanAdminSubmissions,
  getPeoplePlanAdminTeams,
  reviewPeoplePlanReward,
  reviewPeoplePlanSubmission,
  type PeoplePlanAdminRewardRow,
  type PeoplePlanAdminSubmissionRow,
  type PeoplePlanAdminTeamRow,
} from './admin-api'
import { formatMoney, formatTime, getStatusLabel, toStatusTone } from '@/features/people-plan/utils'

function MetricCard(props: {
  label: string
  value: string | number
  hint: string
}) {
  return (
    <div className='rounded-xl border bg-card px-4 py-3'>
      <div className='text-xs text-muted-foreground'>{props.label}</div>
      <div className='mt-2 text-2xl font-semibold'>{props.value}</div>
      <div className='mt-1 text-xs text-muted-foreground'>{props.hint}</div>
    </div>
  )
}

function buildInviteLink(inviteCode: string) {
  if (!inviteCode) return ''
  if (typeof window === 'undefined') {
    return `/sign-up?people_plan_invite=${encodeURIComponent(inviteCode)}`
  }
  return `${window.location.origin}/sign-up?people_plan_invite=${encodeURIComponent(inviteCode)}`
}

function getDisplayName(name: string, username: string, userId?: number) {
  if (name) return name
  if (username) return username
  return userId ? `用户 #${userId}` : '--'
}

function EmptyState(props: { text: string }) {
  return (
    <div className='rounded-xl border border-dashed px-4 py-8 text-sm text-muted-foreground'>
      {props.text}
    </div>
  )
}

function TeamBoard(props: {
  teams: PeoplePlanAdminTeamRow[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onCopyCode: (code: string) => Promise<void>
  onCopyLink: (code: string) => Promise<void>
}) {
  if (props.isLoading) {
    return <EmptyState text='Team data is loading. Please wait.' />
  }

  if (props.isError) {
    return (
      <div className='rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-5 text-sm'>
        <div className='font-medium text-destructive'>Team data failed to load.</div>
        <div className='mt-1 text-muted-foreground'>Stats use a separate lightweight endpoint, so team failures are shown explicitly.</div>
        <Button
          className='mt-3'
          size='sm'
          variant='outline'
          onClick={props.onRetry}
        >
          Retry team data
        </Button>
      </div>
    )
  }

  if (props.teams.length === 0) {
    return <EmptyState text='当前还没有创建中的人海计划队伍。' />
  }

  return (
    <div className='rounded-xl border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>队伍</TableHead>
            <TableHead>队长</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>成团进度</TableHead>
            <TableHead>调用 / 消费</TableHead>
            <TableHead>投稿 / 奖励</TableHead>
            <TableHead>邀请</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.teams.map((team) => (
            <TableRow key={team.id}>
              <TableCell className='whitespace-normal'>
                <div className='font-medium'>{team.name}</div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  创建于 {formatTime(team.created_at)}
                </div>
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div>{getDisplayName(team.captain_name, team.captain_username, team.captain_user_id)}</div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  UID {team.captain_user_id}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={toStatusTone(team.status)}>
                  {getStatusLabel(team.status)}
                </Badge>
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div className='font-medium'>
                  {team.effective_members} / {team.min_members}
                </div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  当前成员 {team.active_members}，上限 {team.max_members}，成团率{' '}
                  {Math.round(team.formation_rate * 100)}%
                </div>
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div>{team.team_calls.toLocaleString('zh-CN')} 次</div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  累计 {formatMoney(team.team_spend_usd)}，本月 {formatMoney(team.monthly_team_spend_usd)}
                </div>
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div>
                  投稿 {team.submission_count} / 奖励 {team.reward_count}
                </div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  待审投稿 {team.pending_submission_count}，待审奖励 {team.pending_reward_count}，
                  已发放 {formatMoney(team.reward_quota_usd)}
                </div>
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div className='text-xs text-muted-foreground'>{team.invite_code}</div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      void props.onCopyCode(team.invite_code)
                    }}
                  >
                    <Copy className='mr-1 h-3.5 w-3.5' />
                    复制邀请码
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      void props.onCopyLink(team.invite_code)
                    }}
                  >
                    <Link2 className='mr-1 h-3.5 w-3.5' />
                    复制邀请链接
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RewardReviewTable(props: {
  rewards: PeoplePlanAdminRewardRow[]
  rewardNotes: Record<number, string>
  rewardActionId: number | null
  onNoteChange: (rewardId: number, value: string) => void
  onReview: (rewardId: number, action: 'approve' | 'reject' | 'freeze') => void
}) {
  if (props.rewards.length === 0) {
    return <EmptyState text='当前没有待处理的奖励审核。' />
  }

  return (
    <div className='rounded-xl border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>奖励</TableHead>
            <TableHead>用户 / 队伍</TableHead>
            <TableHead>来源</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>金额</TableHead>
            <TableHead>审核备注</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rewards.map((reward) => (
            <TableRow key={reward.id}>
              <TableCell className='whitespace-normal'>
                <div className='font-medium'>{reward.title}</div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  {reward.description || '无补充说明'}
                </div>
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div>{getDisplayName(reward.user_name, reward.username, reward.user_id)}</div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  {reward.team_name || '未关联队伍'} {reward.team_name ? `· ${getStatusLabel(reward.team_status)}` : ''}
                </div>
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div>{getStatusLabel(reward.source_type)}</div>
                <div className='mt-1 text-xs text-muted-foreground'>{reward.source_key}</div>
              </TableCell>
              <TableCell>
                <div className='flex flex-wrap gap-2'>
                  <Badge variant={toStatusTone(reward.status)}>
                    {getStatusLabel(reward.status)}
                  </Badge>
                  <Badge variant={toStatusTone(reward.risk_status)}>
                    风控 {getStatusLabel(reward.risk_status)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>{formatMoney(reward.quota_usd)}</TableCell>
              <TableCell className='whitespace-normal'>
                <Input
                  value={props.rewardNotes[reward.id] ?? reward.review_notes ?? ''}
                  onChange={(event) =>
                    props.onNoteChange(reward.id, event.target.value)
                  }
                  placeholder='写入审核说明'
                />
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    disabled={props.rewardActionId === reward.id}
                    onClick={() => props.onReview(reward.id, 'approve')}
                  >
                    通过
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={props.rewardActionId === reward.id}
                    onClick={() => props.onReview(reward.id, 'freeze')}
                  >
                    冻结
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    disabled={props.rewardActionId === reward.id}
                    onClick={() => props.onReview(reward.id, 'reject')}
                  >
                    拒绝
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SubmissionReviewTable(props: {
  submissions: PeoplePlanAdminSubmissionRow[]
  submissionNotes: Record<number, string>
  submissionActionId: number | null
  onNoteChange: (submissionId: number, value: string) => void
  onReview: (submissionId: number, action: 'approve' | 'reject') => void
}) {
  if (props.submissions.length === 0) {
    return <EmptyState text='当前没有待处理的投稿审核。' />
  }

  return (
    <div className='rounded-xl border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>投稿</TableHead>
            <TableHead>作者 / 队伍</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>联系</TableHead>
            <TableHead>审核备注</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell className='whitespace-normal'>
                <div className='font-medium'>{submission.title}</div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  {submission.summary || '无摘要'}
                </div>
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div>
                  {getDisplayName(
                    submission.user_name,
                    submission.username,
                    submission.user_id
                  )}
                </div>
                <div className='mt-1 text-xs text-muted-foreground'>
                  {submission.team_name || '未关联队伍'}{' '}
                  {submission.team_name
                    ? `· ${getStatusLabel(submission.team_status)}`
                    : ''}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={toStatusTone(submission.status)}>
                  {getStatusLabel(submission.type)}
                </Badge>
              </TableCell>
              <TableCell className='whitespace-normal'>
                {submission.contact || '--'}
              </TableCell>
              <TableCell className='whitespace-normal'>
                <Input
                  value={
                    props.submissionNotes[submission.id] ??
                    submission.review_notes ??
                    ''
                  }
                  onChange={(event) =>
                    props.onNoteChange(submission.id, event.target.value)
                  }
                  placeholder='写入审核说明'
                />
              </TableCell>
              <TableCell className='whitespace-normal'>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    size='sm'
                    disabled={props.submissionActionId === submission.id}
                    onClick={() => props.onReview(submission.id, 'approve')}
                  >
                    通过
                  </Button>
                  <Button
                    size='sm'
                    variant='destructive'
                    disabled={props.submissionActionId === submission.id}
                    onClick={() => props.onReview(submission.id, 'reject')}
                  >
                    拒绝
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function AdminOperationsSection() {
  const queryClient = useQueryClient()
  const [rewardNotes, setRewardNotes] = useState<Record<number, string>>({})
  const [submissionNotes, setSubmissionNotes] = useState<Record<number, string>>({})
  const [rewardActionId, setRewardActionId] = useState<number | null>(null)
  const [submissionActionId, setSubmissionActionId] = useState<number | null>(null)

  const statsQuery = useQuery({
    queryKey: ['people-plan-admin', 'stats'],
    queryFn: getPeoplePlanAdminStats,
  })
  const teamsQuery = useQuery({
    queryKey: ['people-plan-admin', 'teams'],
    queryFn: getPeoplePlanAdminTeams,
  })
  const rewardsQuery = useQuery({
    queryKey: ['people-plan-admin', 'rewards'],
    queryFn: getPeoplePlanAdminRewards,
  })
  const submissionsQuery = useQuery({
    queryKey: ['people-plan-admin', 'submissions'],
    queryFn: getPeoplePlanAdminSubmissions,
  })

  const refreshAll = async () => {
    await Promise.all([
      statsQuery.refetch(),
      teamsQuery.refetch(),
      rewardsQuery.refetch(),
      submissionsQuery.refetch(),
    ])
  }

  const reviewRewardMutation = useMutation({
    mutationFn: reviewPeoplePlanReward,
    onSuccess: async () => {
      toast.success('奖励审核已更新')
      await queryClient.invalidateQueries({ queryKey: ['people-plan-admin'] })
    },
  })

  const reviewSubmissionMutation = useMutation({
    mutationFn: reviewPeoplePlanSubmission,
    onSuccess: async () => {
      toast.success('投稿审核已更新')
      await queryClient.invalidateQueries({ queryKey: ['people-plan-admin'] })
    },
  })

  const handleCopyInviteCode = async (inviteCode: string) => {
    await navigator.clipboard.writeText(inviteCode)
    toast.success('邀请码已复制')
  }

  const handleCopyInviteLink = async (inviteCode: string) => {
    const inviteLink = buildInviteLink(inviteCode)
    await navigator.clipboard.writeText(inviteLink)
    toast.success('邀请链接已复制')
  }

  const handleRewardReview = async (
    rewardId: number,
    action: 'approve' | 'reject' | 'freeze'
  ) => {
    setRewardActionId(rewardId)
    try {
      await reviewRewardMutation.mutateAsync({
        rewardId,
        action,
        notes: rewardNotes[rewardId] ?? '',
      })
    } finally {
      setRewardActionId(null)
    }
  }

  const handleSubmissionReview = async (
    submissionId: number,
    action: 'approve' | 'reject'
  ) => {
    setSubmissionActionId(submissionId)
    try {
      await reviewSubmissionMutation.mutateAsync({
        submissionId,
        action,
        notes: submissionNotes[submissionId] ?? '',
      })
    } finally {
      setSubmissionActionId(null)
    }
  }

  const isLoading =
    statsQuery.isLoading ||
    teamsQuery.isLoading ||
    rewardsQuery.isLoading ||
    submissionsQuery.isLoading

  return (
    <SettingsSection
      title='运营看板'
      description='在后台查看成团情况、邀请码传播效果、待审核奖励和待审核投稿。'
    >
      <div className='space-y-6'>
        <div className='flex items-center justify-between gap-3'>
          <div className='text-sm text-muted-foreground'>
            {isLoading ? '正在同步人海计划运营数据...' : '数据已就绪，可直接审核和复制邀请链接。'}
          </div>
          <Button
            variant='outline'
            onClick={() => {
              void refreshAll()
            }}
          >
            <RefreshCw className='mr-2 h-4 w-4' />
            刷新数据
          </Button>
        </div>

        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          <MetricCard
            label='队伍总数'
            value={statsQuery.data?.data.teams ?? 0}
            hint='已创建的人海计划队伍'
          />
          <MetricCard
            label='活跃成员'
            value={statsQuery.data?.data.active_members ?? 0}
            hint='仍在队伍中的成员总数'
          />
          <MetricCard
            label='待审核奖励'
            value={statsQuery.data?.data.pending_rewards ?? 0}
            hint='含冻结待复核奖励'
          />
          <MetricCard
            label='可领取奖励'
            value={statsQuery.data?.data.claimable_rewards ?? 0}
            hint='已审核通过，等待用户领取'
          />
          <MetricCard
            label='待审核投稿'
            value={statsQuery.data?.data.pending_submissions ?? 0}
            hint='等待人工审核的投稿'
          />
          <MetricCard
            label='风控复核'
            value={statsQuery.data?.data.open_risk_reviews ?? 0}
            hint='命中风控、待人工处理'
          />
        </div>

        <div className='space-y-3'>
          <div>
            <h4 className='text-sm font-semibold'>成团情况</h4>
            <p className='text-sm text-muted-foreground'>
              这里直接看每支小队的有效成员、成团率、调用消费、投稿与奖励沉淀。
            </p>
          </div>
          <TeamBoard
            teams={teamsQuery.data?.data ?? []}
            isLoading={teamsQuery.isLoading || teamsQuery.isFetching}
            isError={teamsQuery.isError}
            onRetry={() => {
              void teamsQuery.refetch()
            }}
            onCopyCode={handleCopyInviteCode}
            onCopyLink={handleCopyInviteLink}
          />
        </div>

        <div className='space-y-3'>
          <div>
            <h4 className='text-sm font-semibold'>奖励审核</h4>
            <p className='text-sm text-muted-foreground'>
              奖励支持通过、冻结、拒绝。冻结适合进入复核队列，不建议直接放行高风险奖励。
            </p>
          </div>
          <RewardReviewTable
            rewards={rewardsQuery.data?.data ?? []}
            rewardNotes={rewardNotes}
            rewardActionId={rewardActionId}
            onNoteChange={(rewardId, value) => {
              setRewardNotes((current) => ({ ...current, [rewardId]: value }))
            }}
            onReview={(rewardId, action) => {
              void handleRewardReview(rewardId, action)
            }}
          />
        </div>

        <div className='space-y-3'>
          <div>
            <h4 className='text-sm font-semibold'>投稿审核</h4>
            <p className='text-sm text-muted-foreground'>
              投稿活动与组队活动分开审核。通过后会按后台规则进入对应的投稿奖励池。
            </p>
          </div>
          <SubmissionReviewTable
            submissions={submissionsQuery.data?.data ?? []}
            submissionNotes={submissionNotes}
            submissionActionId={submissionActionId}
            onNoteChange={(submissionId, value) => {
              setSubmissionNotes((current) => ({
                ...current,
                [submissionId]: value,
              }))
            }}
            onReview={(submissionId, action) => {
              void handleSubmissionReview(submissionId, action)
            }}
          />
        </div>
      </div>
    </SettingsSection>
  )
}
