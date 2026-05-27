import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Link2, UserMinus } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import type {
  PeoplePlanMemberProfile,
  PeoplePlanProgress,
  PeoplePlanReward,
  PeoplePlanRewardSummary,
  PeoplePlanTask,
  PeoplePlanTeamDetail,
} from '../types'
import {
  formatMoney,
  formatPercent,
  formatTime,
  getEstimatedPersonalShare,
  getMatchedRewardTier,
  getPerCapitaTarget,
  getRewardUsd,
  getStatusLabel,
  getTaskCompletedCount,
  getTaskContributionItems,
  getTaskCurrentValue,
  getTaskRewardPool,
  getTaskTarget,
  toStatusTone,
} from '../utils'
import { SummaryCard } from './shared'

function getMemberName(member: PeoplePlanMemberProfile) {
  return member.display_name || member.username || `用户 ${member.user_id}`
}

function getTaskUnit(metric: string) {
  switch (metric) {
    case 'team_calls':
      return '次'
    case 'team_invites':
      return '人'
    case 'team_blind_box_opens':
      return '次'
    case 'effective_members':
    case 'monthly_active_members':
      return '人'
    case 'team_spend_usd':
    case 'monthly_team_spend_usd':
      return ''
    default:
      return ''
  }
}

function formatTaskValue(value: number, metric: string) {
  if (metric.includes('spend')) {
    return formatMoney(value)
  }
  const unit = getTaskUnit(metric)
  return `${value.toLocaleString('zh-CN')}${unit ? ` ${unit}` : ''}`
}

function TeamSetupCard(props: {
  teamName: string
  inviteCode: string
  setTeamName: (value: string) => void
  setInviteCode: (value: string) => void
  onCreateTeam: () => Promise<void>
  onJoinTeam: () => Promise<void>
  creating: boolean
  joining: boolean
}) {
  const [joinConfirmOpen, setJoinConfirmOpen] = useState(false)

  const handleJoinConfirm = async () => {
    try {
      await props.onJoinTeam()
      setJoinConfirmOpen(false)
    } catch {
      // Toast is handled by the mutation layer.
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>加入或创建小队</CardTitle>
          <CardDescription>
            未组队时也能先查看任务和奖励；加入小队后会开始按当前规则累计进度。
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-5 lg:grid-cols-2'>
          <div className='space-y-3 rounded-2xl border p-4'>
            <div className='text-sm font-medium'>创建小队</div>
            <Input
              value={props.teamName}
              onChange={(event) => props.setTeamName(event.target.value)}
              placeholder='请输入小队名称'
            />
            <div className='text-xs leading-5 text-muted-foreground'>
              你创建后自动成为队长，可直接复制邀请码和邀请链接拉人。
            </div>
            <Button
              className='w-full'
              disabled={props.creating || !props.teamName.trim()}
              onClick={() => {
                void props.onCreateTeam()
              }}
            >
              创建小队
            </Button>
          </div>

          <div className='space-y-3 rounded-2xl border p-4'>
            <div className='text-sm font-medium'>输入邀请码加入</div>
            <Input
              value={props.inviteCode}
              onChange={(event) => props.setInviteCode(event.target.value)}
              placeholder='请输入邀请码'
            />
            <div className='text-xs leading-5 text-muted-foreground'>
              也可以直接通过邀请链接注册，注册后会自动加入对应小队。
            </div>
            <Button
              variant='outline'
              className='w-full'
              disabled={props.joining || !props.inviteCode.trim()}
              onClick={() => setJoinConfirmOpen(true)}
            >
              加入小队
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={joinConfirmOpen}
        onOpenChange={setJoinConfirmOpen}
        title='确认加入小队'
        desc={
          <div className='space-y-2 text-sm leading-6 text-muted-foreground'>
            <p>
              你将使用邀请码 <span className='font-medium text-foreground'>{props.inviteCode.trim() || '--'}</span>{' '}
              加入对应小队。
            </p>
            <p>加入后会开始累计组队活动进度，后续退出或更换小队会影响你的奖励归属。</p>
          </div>
        }
        confirmText='确认加入'
        cancelBtnText='取消'
        handleConfirm={() => {
          void handleJoinConfirm()
        }}
        isLoading={props.joining}
      />
    </>
  )
}

function TeamMemberCard(props: {
  member: PeoplePlanMemberProfile
  currentUserId: number
  isCaptain: boolean
  teamStatus: string
  removingMember: boolean
  onRemove: (member: PeoplePlanMemberProfile) => void
}) {
  const isMe = props.member.user_id === props.currentUserId
  const canRemove =
    props.isCaptain &&
    !isMe &&
    props.member.role !== 'captain' &&
    !(props.teamStatus === 'formed' && props.member.counts_as_effective_member)

  const removeDisabledReason = (() => {
    if (!props.isCaptain || isMe || props.member.role === 'captain') return ''
    if (props.teamStatus === 'formed' && props.member.counts_as_effective_member) {
      return '成团后仅能移出未达有效标准的成员'
    }
    return ''
  })()

  return (
    <div className='rounded-2xl border p-4'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='text-sm font-semibold'>{getMemberName(props.member)}</div>
            {isMe ? <Badge variant='secondary'>我</Badge> : null}
            <Badge variant='outline'>{getStatusLabel(props.member.role)}</Badge>
            <Badge
              variant={props.member.counts_as_effective_member ? 'default' : 'secondary'}
            >
              {props.member.counts_as_effective_member ? '已计入有效成员' : '未计入有效成员'}
            </Badge>
          </div>

          <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
            <span className='rounded-full border px-2 py-0.5'>
              累计消费 {formatMoney(props.member.lifetime_spend)}
            </span>
            <span className='rounded-full border px-2 py-0.5'>
              累计邀请 {props.member.lifetime_invites.toLocaleString('zh-CN')} 人
            </span>
            <span className='rounded-full border px-2 py-0.5'>
              盲盒参与 {props.member.lifetime_blind_box_opens.toLocaleString('zh-CN')} 次
            </span>
            <span className='rounded-full border px-2 py-0.5'>
              本月消费 {formatMoney(props.member.current_month_spend)}
            </span>
          </div>

          <div className='text-xs leading-5 text-muted-foreground'>
            {props.member.counts_as_effective_member
              ? '已达到有效成员标准，可参与成团奖励和后续任务分奖。'
              : '完成注册并生成 API Key 后，个人累计调用达到 30 次或累计消费达到 $3，才会计入有效成员。'}
          </div>
        </div>

        <div className='flex shrink-0 flex-col items-start gap-2 lg:items-end'>
          {canRemove ? (
            <Button
              size='sm'
              variant='outline'
              disabled={props.removingMember}
              onClick={() => props.onRemove(props.member)}
            >
              <UserMinus className='mr-2 h-4 w-4' />
              移出成员
            </Button>
          ) : props.isCaptain && !isMe ? (
            <div className='text-xs leading-5 text-muted-foreground'>
              {removeDisabledReason || '当前成员不可移出'}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function TeamDetailCard(props: {
  team: PeoplePlanTeamDetail
  inviteLink: string
  onCopyInviteCode: () => Promise<void>
  onCopyInviteLink: () => Promise<void>
  onLeaveTeam: () => Promise<void>
  onRemoveMember: (memberUserId: number) => Promise<void>
  leaving: boolean
  removingMember: boolean
}) {
  const captainLocked =
    props.team.membership.role === 'captain' &&
    props.team.summary.active_members > 1
  const isCaptain = props.team.membership.role === 'captain'
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<PeoplePlanMemberProfile | null>(
    null
  )

  const teamTips = useMemo(() => {
    const tips = [
      '有效成员标准：完成注册、生成 API Key，且累计调用达到 30 次或累计消费达到 $3。',
      '成团奖励按当次有效成员平分；其余任务按贡献分配。',
    ]
    if (isCaptain) {
      tips.push('队长可以移出成员；成团后只能移出未达有效标准的成员。')
    }
    return tips
  }, [isCaptain])

  const handleLeaveConfirm = async () => {
    try {
      await props.onLeaveTeam()
      setLeaveConfirmOpen(false)
    } catch {
      // Toast is handled by the mutation layer.
    }
  }

  const handleRemoveMember = async () => {
    if (!removeTarget) return
    try {
      await props.onRemoveMember(removeTarget.user_id)
      setRemoveTarget(null)
    } catch {
      // Toast is handled by the mutation layer.
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>我的小队</CardTitle>
          <CardDescription>
            这里可以管理成员、复制邀请方式，并实时查看当前小队状态。
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='rounded-2xl border bg-muted/20 p-4'>
            <div className='flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'>
              <div className='space-y-2'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='text-lg font-semibold'>{props.team.team.name}</div>
                  <Badge variant={toStatusTone(props.team.team.status)}>
                    {getStatusLabel(props.team.team.status)}
                  </Badge>
                </div>
                <div className='text-sm text-muted-foreground'>
                  邀请码：{props.team.team.invite_code}
                </div>
                <div className='break-all text-xs text-muted-foreground'>
                  邀请链接：{props.inviteLink}
                </div>
              </div>

              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  onClick={() => {
                    void props.onCopyInviteCode()
                  }}
                >
                  <Copy className='mr-2 h-4 w-4' />
                  复制邀请码
                </Button>
                <Button
                  variant='outline'
                  onClick={() => {
                    void props.onCopyInviteLink()
                  }}
                >
                  <Link2 className='mr-2 h-4 w-4' />
                  复制邀请链接
                </Button>
                <Button
                  variant='outline'
                  disabled={props.leaving || captainLocked}
                  onClick={() => setLeaveConfirmOpen(true)}
                >
                  退出小队
                </Button>
              </div>
            </div>

            {captainLocked ? (
              <div className='mt-3 text-xs text-muted-foreground'>
                队长在仍有其他成员时不能直接退出；如需离队，请先移出成员或等待成员退出。
              </div>
            ) : null}
          </div>

          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <SummaryCard label='当前成员' value={props.team.summary.active_members} />
            <SummaryCard label='有效成员' value={props.team.summary.effective_members} />
            <SummaryCard
              label='累计邀请'
              value={props.team.summary.team_invites.toLocaleString('zh-CN')}
            />
            <SummaryCard
              label='累计消费'
              value={formatMoney(props.team.summary.team_spend_usd)}
            />
          </div>

          <div className='rounded-2xl border bg-muted/20 p-4'>
            <div className='text-sm font-medium'>小队提示</div>
            <ul className='mt-3 space-y-2 text-sm leading-6 text-muted-foreground'>
              {teamTips.map((tip) => (
                <li key={tip} className='flex gap-2'>
                  <span className='mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500' />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-sm font-medium'>成员列表</div>
                <div className='text-xs text-muted-foreground'>
                  队长可以在这里查看每位成员当前是否已计入有效成员。
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              {props.team.members.map((member) => (
                <TeamMemberCard
                  key={member.user_id}
                  member={member}
                  currentUserId={props.team.membership.user_id}
                  isCaptain={isCaptain}
                  teamStatus={props.team.team.status}
                  removingMember={props.removingMember}
                  onRemove={setRemoveTarget}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title='确认退出小队'
        desc={
          <div className='space-y-2 text-sm leading-6 text-muted-foreground'>
            <p>退出后，你将停止为当前小队累计后续进度。</p>
            <p>已经产生的奖励记录不会消失，但后续成团和任务奖励会按退出后的状态重新计算。</p>
          </div>
        }
        confirmText='确认退出'
        cancelBtnText='取消'
        handleConfirm={() => {
          void handleLeaveConfirm()
        }}
        isLoading={props.leaving}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveTarget(null)
          }
        }}
        title='确认移出成员'
        desc={
          <div className='space-y-2 text-sm leading-6 text-muted-foreground'>
            <p>
              你将把{' '}
              <span className='font-medium text-foreground'>
                {removeTarget ? getMemberName(removeTarget) : '--'}
              </span>{' '}
              移出当前小队。
            </p>
            <p>移出后，对方将不再继续为当前小队累计后续任务进度。</p>
          </div>
        }
        confirmText='确认移出'
        cancelBtnText='取消'
        handleConfirm={() => {
          void handleRemoveMember()
        }}
        isLoading={props.removingMember}
      />
    </>
  )
}

export function TeamRewardsCard(props: {
  rewardSummary: PeoplePlanRewardSummary | null
  rewards: PeoplePlanReward[]
  claimPending: boolean
  onClaim: (rewardId: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>组队活动奖励</CardTitle>
        <CardDescription>
          这里显示你已经拿到或可以领取的组队奖励，不包含个人投稿奖励。
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard label='可领取' value={props.rewardSummary?.claimable ?? 0} />
          <SummaryCard label='待审核' value={props.rewardSummary?.pending ?? 0} />
          <SummaryCard label='已领取' value={props.rewardSummary?.claimed ?? 0} />
          <SummaryCard
            label='待领取额度'
            value={formatMoney(props.rewardSummary?.quota_usd ?? 0)}
          />
        </div>

        <div className='space-y-3'>
          {props.rewards.length > 0 ? (
            props.rewards.map((reward) => (
              <div key={reward.id} className='rounded-2xl border p-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='font-medium'>{reward.title}</span>
                      <Badge variant={toStatusTone(reward.status)}>
                        {getStatusLabel(reward.status)}
                      </Badge>
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {reward.description || '任务完成后会自动生成奖励记录。'}
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      创建时间：{formatTime(reward.created_at)}
                    </div>
                  </div>
                  <div className='flex shrink-0 items-center gap-3'>
                    <div className='text-sm font-medium'>
                      {formatMoney(getRewardUsd(reward))}
                    </div>
                    <Button
                      size='sm'
                      disabled={reward.status !== 'claimable' || props.claimPending}
                      onClick={() => props.onClaim(reward.id)}
                    >
                      {reward.status === 'claimable'
                        ? '领取奖励'
                        : getStatusLabel(reward.status)}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed p-6 text-sm text-muted-foreground'>
              暂无已生成的组队奖励。
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function findProgress(
  task: PeoplePlanTask,
  progressMap: Map<string, PeoplePlanProgress>
) {
  return (
    progressMap.get(`${task.category}:${task.key}`) ??
    progressMap.get(`long_term:${task.key}`) ??
    progressMap.get(`monthly:${task.key}`)
  )
}

function PoolTypeBadge() {
  return (
    <Badge
      variant='outline'
      className='border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
    >
      小队总奖池
    </Badge>
  )
}

function TaskCard(props: {
  task: PeoplePlanTask
  effectiveMembers: number
  team: PeoplePlanTeamDetail | null
  progressMap: Map<string, PeoplePlanProgress>
}) {
  const { task, effectiveMembers, team, progressMap } = props
  const [expanded, setExpanded] = useState(false)

  const currentValue = team ? getTaskCurrentValue(task, team) : 0
  const taskProgress = findProgress(task, progressMap)
  const completedCount = getTaskCompletedCount(
    task,
    currentValue,
    taskProgress?.completion_count
  )
  const maxCompletions = Math.max(task.max_completions, 1)
  const effectiveTarget = getTaskTarget(task, effectiveMembers)
  const perCapitaTarget = getPerCapitaTarget(task, effectiveMembers)
  const progress = Math.min(
    100,
    effectiveTarget > 0 ? (currentValue / effectiveTarget) * 100 : 0
  )
  const rewardPool = getTaskRewardPool(task, effectiveMembers)
  const matchedTier = getMatchedRewardTier(task.reward_tiers ?? [], effectiveMembers)
  const estimatedShare = team
    ? getEstimatedPersonalShare(task, team, effectiveMembers)
    : null
  const contributions = team ? getTaskContributionItems(task, team.members ?? []) : []
  const isEqualDistribution = task.contribution_mode === 'equal'
  const contributionWeights = isEqualDistribution ? [] : task.contribution_weights ?? []
  const tiers = task.reward_tiers ?? []
  const hasContributionDetails =
    Boolean(team) && (contributionWeights.length > 0 || contributions.length > 0)

  return (
    <Card className='flex flex-col'>
      <div className='flex flex-wrap items-center gap-2 px-4 pt-4'>
        <span className='text-sm font-semibold'>{task.title}</span>
        <Badge variant='outline' className='text-xs'>
          {completedCount}/{maxCompletions} 次
        </Badge>
        <PoolTypeBadge />
        {matchedTier ? (
          <Badge variant='outline' className='text-xs'>
            当前 {matchedTier.required_members} 人档
          </Badge>
        ) : null}
      </div>

      <CardContent className='flex-1 space-y-3 px-4 pb-4 pt-3'>
        <p className='text-xs leading-5 text-muted-foreground'>{task.description}</p>

        <div className='flex flex-wrap items-baseline gap-x-2 gap-y-0.5'>
          <span className='text-sm font-medium'>
            全队目标 {formatTaskValue(effectiveTarget, task.metric)}
          </span>
          {perCapitaTarget !== null && effectiveMembers > 0 ? (
            <span className='text-xs text-muted-foreground'>
              人均约 {formatTaskValue(perCapitaTarget, task.metric)}
            </span>
          ) : null}
        </div>

        {team ? (
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <Progress value={progress} className='h-2.5 flex-1' />
              <span className='text-xs font-medium tabular-nums text-muted-foreground'>
                {Math.round(progress)}%
              </span>
            </div>
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>
                {formatTaskValue(currentValue, task.metric)} /{' '}
                {formatTaskValue(effectiveTarget, task.metric)}
              </span>
              <span>
                {taskProgress?.last_reached_at
                  ? `最近完成 ${formatTime(taskProgress.last_reached_at)}`
                  : '暂未完成'}
              </span>
            </div>
          </div>
        ) : (
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <Progress value={0} className='h-2.5 flex-1' />
              <span className='text-xs text-muted-foreground'>0%</span>
            </div>
            <div className='text-xs text-muted-foreground'>
              组队后显示实时进度。
            </div>
          </div>
        )}

        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-muted/30 px-3 py-2'>
          <div className='flex items-center gap-1.5'>
            <span className='text-xs text-muted-foreground'>本次奖池</span>
            <span className='text-sm font-semibold'>{formatMoney(rewardPool)}</span>
          </div>
          {estimatedShare ? (
            <>
              <span className='text-xs text-muted-foreground'>·</span>
              <span className='text-xs text-muted-foreground'>你的预估</span>
              <span className='text-sm font-semibold text-amber-700 dark:text-amber-400'>
                ~{formatMoney(estimatedShare.share)}
              </span>
              <span className='text-xs text-muted-foreground'>
                {isEqualDistribution
                  ? '按有效成员平分'
                  : `贡献占比 ${formatPercent(estimatedShare.ratio)}`}
              </span>
            </>
          ) : team ? (
            <>
              <span className='text-xs text-muted-foreground'>·</span>
              <span className='text-xs text-muted-foreground'>暂未形成你的分奖数据</span>
            </>
          ) : null}
        </div>

        {tiers.length > 1 ? (
          <div className='flex flex-wrap gap-1'>
            {tiers.map((tier) => (
              <Badge
                key={tier.required_members}
                variant='outline'
                className='text-xs'
              >
                {tier.required_members} 人档 {formatTaskValue(tier.target, task.metric)} /{' '}
                {formatMoney(tier.reward_pool_usd)}
              </Badge>
            ))}
          </div>
        ) : null}

        {hasContributionDetails ? (
          <>
            <Button
              variant='ghost'
              size='sm'
              className='-ml-2 h-auto w-full justify-start px-2 py-1 text-xs text-muted-foreground hover:text-foreground'
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? (
                <ChevronUp className='mr-1 h-3.5 w-3.5' />
              ) : (
                <ChevronDown className='mr-1 h-3.5 w-3.5' />
              )}
              {expanded ? '收起成员贡献' : '查看成员贡献'}
            </Button>

            {expanded ? (
              <div className='space-y-3 border-t pt-3'>
                {contributionWeights.length > 0 ? (
                  <div className='rounded-lg border bg-muted/30 px-3 py-2'>
                    <div className='mb-1.5 text-xs font-medium text-muted-foreground'>
                      贡献权重
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {contributionWeights.map((weight) => (
                        <Badge key={weight.key} variant='secondary' className='text-xs'>
                          {weight.label} {weight.weight}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : isEqualDistribution ? (
                  <div className='rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
                    这项任务按有效成员平分，不区分贡献权重。
                  </div>
                ) : null}

                <div className='space-y-1.5'>
                  {contributions.length > 0 ? (
                    contributions.map((item) => {
                      const isMe = item.user_id === team?.membership.user_id
                      return (
                        <div
                          key={item.user_id}
                          className={`rounded-lg border px-3 py-2 ${
                            isMe
                              ? 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/30'
                              : ''
                          }`}
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <div className='flex items-center gap-1.5 text-sm font-medium'>
                              {item.name}
                              {isMe ? (
                                <Badge
                                  variant='outline'
                                  className='border-amber-300 bg-amber-100 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                >
                                  我
                                </Badge>
                              ) : null}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {isEqualDistribution
                                ? '平分成员'
                                : `贡献占比 ${formatPercent(item.ratio)}`}
                            </div>
                          </div>
                          <div className='mt-1.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground'>
                            {item.details.map((detail) => (
                              <span
                                key={`${item.user_id}-${detail.key}`}
                                className='rounded-full border px-2 py-0.5'
                              >
                                {detail.label}{' '}
                                {detail.key.includes('spend')
                                  ? formatMoney(detail.value)
                                  : detail.value.toLocaleString('zh-CN')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className='text-xs text-muted-foreground'>
                      暂无成员贡献数据。
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </>
        ) : team ? null : (
          <div className='text-xs text-muted-foreground'>
            组队后会显示你的预估分成和成员贡献明细。
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TeamTaskBoard(props: {
  tasks: PeoplePlanTask[]
  team: PeoplePlanTeamDetail | null
  progressMap: Map<string, PeoplePlanProgress>
}) {
  const effectiveMembers = props.team?.summary.effective_members ?? 0

  if (props.tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>组队任务与奖励</CardTitle>
          <CardDescription>当前暂无组队任务。</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>组队任务与奖励</CardTitle>
        <CardDescription>
          {props.team
            ? '每项任务都会根据当前有效成员人数自动切换目标和奖池，展开卡片可查看成员贡献明细。'
            : '未组队也能先看全部任务、档位目标和奖池金额；组队后会显示实时进度和你的预估分成。'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-4 md:grid-cols-2'>
          {props.tasks.map((task) => (
            <TaskCard
              key={`${task.category}:${task.key}`}
              task={task}
              effectiveMembers={effectiveMembers}
              team={props.team}
              progressMap={props.progressMap}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function TeamWorkspace(props: {
  team: PeoplePlanTeamDetail | null
  teamName: string
  inviteCode: string
  inviteLink: string
  setTeamName: (value: string) => void
  setInviteCode: (value: string) => void
  onCreateTeam: () => Promise<void>
  onJoinTeam: () => Promise<void>
  onCopyInviteCode: () => Promise<void>
  onCopyInviteLink: () => Promise<void>
  onLeaveTeam: () => Promise<void>
  onRemoveMember: (memberUserId: number) => Promise<void>
  creating: boolean
  joining: boolean
  leaving: boolean
  removingMember: boolean
}) {
  if (!props.team) {
    return (
      <TeamSetupCard
        teamName={props.teamName}
        inviteCode={props.inviteCode}
        setTeamName={props.setTeamName}
        setInviteCode={props.setInviteCode}
        onCreateTeam={props.onCreateTeam}
        onJoinTeam={props.onJoinTeam}
        creating={props.creating}
        joining={props.joining}
      />
    )
  }

  return (
    <TeamDetailCard
      team={props.team}
      inviteLink={props.inviteLink}
      onCopyInviteCode={props.onCopyInviteCode}
      onCopyInviteLink={props.onCopyInviteLink}
      onLeaveTeam={props.onLeaveTeam}
      onRemoveMember={props.onRemoveMember}
      leaving={props.leaving}
      removingMember={props.removingMember}
    />
  )
}

export function TeamRewardsWorkspace(props: {
  rewardSummary: PeoplePlanRewardSummary | null
  rewards: PeoplePlanReward[]
  claimPending: boolean
  onClaim: (rewardId: number) => void
}) {
  return (
    <TeamRewardsCard
      rewardSummary={props.rewardSummary}
      rewards={props.rewards}
      claimPending={props.claimPending}
      onClaim={props.onClaim}
    />
  )
}
