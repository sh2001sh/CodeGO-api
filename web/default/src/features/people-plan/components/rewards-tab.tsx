import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Link2 } from 'lucide-react'
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>加入小队</CardTitle>
        <CardDescription>未组队时也可以先看任务和奖励，组队后会显示实时进度。</CardDescription>
      </CardHeader>
      <CardContent className='grid gap-5 lg:grid-cols-2'>
        <div className='space-y-3 rounded-2xl border p-4'>
          <div className='text-sm font-medium'>创建小队</div>
          <Input
            value={props.teamName}
            onChange={(event) => props.setTeamName(event.target.value)}
            placeholder='请输入小队名称'
          />
          <Button
            className='w-full'
            disabled={props.creating}
            onClick={props.onCreateTeam}
          >
            创建小队
          </Button>
        </div>

        <div className='space-y-3 rounded-2xl border p-4'>
          <div className='text-sm font-medium'>输入邀请码</div>
          <Input
            value={props.inviteCode}
            onChange={(event) => props.setInviteCode(event.target.value)}
            placeholder='请输入邀请码'
          />
          <Button
            variant='outline'
            className='w-full'
            disabled={props.joining}
            onClick={props.onJoinTeam}
          >
            加入小队
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamDetailCard(props: {
  team: PeoplePlanTeamDetail
  inviteLink: string
  onCopyInviteCode: () => Promise<void>
  onCopyInviteLink: () => Promise<void>
  onLeaveTeam: () => void
  leaving: boolean
}) {
  const captainLocked =
    props.team.membership.role === 'captain' &&
    props.team.summary.active_members > 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>我的小队</CardTitle>
        <CardDescription>这里可以查看小队信息、邀请方式和当前进度。</CardDescription>
      </CardHeader>
      <CardContent className='space-y-5'>
        <div className='rounded-2xl border bg-muted/20 p-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
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
              <Button variant='outline' onClick={props.onCopyInviteCode}>
                <Copy className='mr-2 h-4 w-4' />
                复制邀请码
              </Button>
              <Button variant='outline' onClick={props.onCopyInviteLink}>
                <Link2 className='mr-2 h-4 w-4' />
                复制邀请链接
              </Button>
              <Button
                variant='outline'
                disabled={props.leaving || captainLocked}
                onClick={props.onLeaveTeam}
              >
                退出小队
              </Button>
            </div>
          </div>
          {captainLocked ? (
            <div className='mt-3 text-xs text-muted-foreground'>
              队长还有成员时不能直接退出。
            </div>
          ) : null}
        </div>

        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard label='当前成员' value={props.team.summary.active_members} />
          <SummaryCard label='有效成员' value={props.team.summary.effective_members} />
          <SummaryCard
            label='累计调用'
            value={props.team.summary.team_calls.toLocaleString('zh-CN')}
          />
          <SummaryCard
            label='累计消费'
            value={formatMoney(props.team.summary.team_spend_usd)}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function TeamRewardsCard(props: {
  rewardSummary: PeoplePlanRewardSummary | null
  rewards: PeoplePlanReward[]
  claimPending: boolean
  onClaim: (rewardId: number) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>组队活动奖励</CardTitle>
        <CardDescription>这里显示你已经拿到或可以领取的组队奖励。</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard label='可领取' value={props.rewardSummary?.claimable ?? 0} />
          <SummaryCard label='待审核' value={props.rewardSummary?.pending ?? 0} />
          <SummaryCard label='已领取' value={props.rewardSummary?.claimed ?? 0} />
          <SummaryCard
            label='待领取金额'
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
                      {reward.description || '任务完成后自动生成奖励记录。'}
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
                      disabled={
                        reward.status !== 'claimable' || props.claimPending
                      }
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
              暂无已产生的组队奖励。
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
  const matchedTier = getMatchedRewardTier(
    task.reward_tiers ?? [],
    effectiveMembers
  )
  const estimatedShare = team
    ? getEstimatedPersonalShare(task, team, effectiveMembers)
    : null
  const contributions = team
    ? getTaskContributionItems(task, team.members ?? [])
    : []
  const contributionWeights = task.contribution_weights ?? []
  const tiers = task.reward_tiers ?? []

  const hasContributionDetails =
    team && (contributionWeights.length > 0 || contributions.length > 0)

  const perCapitaLabel =
    task.metric === 'team_calls'
      ? '次调用'
      : task.metric === 'team_spend_usd' || task.metric === 'monthly_team_spend_usd'
        ? ''
        : ''
  const metricUnit =
    task.metric === 'team_calls'
      ? '次'
      : task.metric === 'team_spend_usd' || task.metric === 'monthly_team_spend_usd'
        ? '美元'
        : task.metric === 'monthly_active_members' || task.metric === 'effective_members'
          ? '人'
          : ''

  return (
    <Card className='flex flex-col'>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 flex-1 space-y-1.5'>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle className='text-base'>{task.title}</CardTitle>
              <Badge variant='outline'>
                {completedCount}/{maxCompletions}
              </Badge>
            </div>
            <CardDescription className='line-clamp-2 text-xs'>
              {task.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className='flex-1 space-y-3 pt-0'>
        {/* Target info */}
        {perCapitaTarget !== null ? (
          <div className='text-xs text-muted-foreground'>
            人均目标{' '}
            <span className='font-medium text-foreground'>
              {task.metric.includes('spend')
                ? formatMoney(perCapitaTarget)
                : `${perCapitaTarget.toLocaleString('zh-CN')} ${perCapitaLabel}`}
            </span>
            ，当前 {matchedTier?.required_members ?? effectiveMembers} 人档全队目标{' '}
            <span className='font-medium text-foreground'>
              {task.metric.includes('spend')
                ? formatMoney(effectiveTarget)
                : `${effectiveTarget.toLocaleString('zh-CN')} ${metricUnit}`}
            </span>
          </div>
        ) : (
          <div className='text-xs text-muted-foreground'>
            全队目标{' '}
            <span className='font-medium text-foreground'>
              {effectiveTarget.toLocaleString('zh-CN')} {metricUnit}
            </span>
          </div>
        )}

        {/* Progress bar */}
        {team ? (
          <div className='space-y-1.5'>
            <Progress value={progress} className='h-2' />
            <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground'>
              <span>
                {currentValue.toLocaleString('zh-CN')} / {effectiveTarget.toLocaleString('zh-CN')} {metricUnit}
              </span>
              <span>
                {taskProgress?.last_reached_at
                  ? `最近完成：${formatTime(taskProgress.last_reached_at)}`
                  : '尚未完成'}
              </span>
            </div>
          </div>
        ) : (
          <Progress value={0} className='h-2' />
        )}

        {/* Reward info */}
        <div className='space-y-1.5'>
          <div className='flex flex-wrap items-center gap-2'>
            <PoolTypeBadge />
            <span className='text-sm font-semibold'>{formatMoney(rewardPool)}</span>
            {matchedTier ? (
              <Badge variant='outline' className='text-xs'>
                {matchedTier.required_members} 人档
              </Badge>
            ) : null}
          </div>

          {estimatedShare ? (
            <div className='rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs dark:border-amber-800 dark:bg-amber-950/40'>
              <span className='text-amber-700 dark:text-amber-400'>
                你的预估分成 ~{formatMoney(estimatedShare.share)}
              </span>
              <span className='ml-1 text-amber-600/60 dark:text-amber-400/60'>
                （贡献占比 {formatPercent(estimatedShare.ratio)}）
              </span>
            </div>
          ) : team ? (
            <div className='text-xs text-muted-foreground'>
              暂无你的贡献数据
            </div>
          ) : null}
        </div>

        {/* Tier target breakdown */}
        {tiers.length > 1 ? (
          <div className='flex flex-wrap gap-1.5'>
            {tiers.map((tier) => {
              const tierTarget = tier.target > 0 ? tier.target : task.target
              const perCapita =
                effectiveMembers > 0 &&
                task.metric !== 'effective_members' &&
                task.metric !== 'monthly_active_members'
                  ? Math.round(tierTarget / tier.required_members)
                  : null
              return (
                <Badge
                  key={tier.required_members}
                  variant='outline'
                  className='text-xs'
                >
                  {tier.required_members} 人档{' '}
                  {perCapita !== null
                    ? task.metric.includes('spend')
                      ? `人均 ${formatMoney(perCapita)} `
                      : `人均 ${perCapita.toLocaleString('zh-CN')} `
                    : ''}
                  {formatMoney(tier.reward_pool_usd)}
                </Badge>
              )
            })}
          </div>
        ) : null}

        {/* Expand button */}
        {hasContributionDetails ? (
          <Button
            variant='ghost'
            size='sm'
            className='-ml-2 h-auto w-full justify-start px-2 py-1 text-xs text-muted-foreground hover:text-foreground'
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className='mr-1 h-3.5 w-3.5' />
            ) : (
              <ChevronDown className='mr-1 h-3.5 w-3.5' />
            )}
            {expanded ? '收起贡献明细' : '展开贡献明细'}
          </Button>
        ) : team ? null : (
          <div className='text-xs text-muted-foreground'>
            组队后显示预估分成和成员贡献占比。
          </div>
        )}

        {/* Expanded details */}
        {expanded && hasContributionDetails ? (
          <div className='space-y-3 border-t pt-3'>
            <div className='text-sm text-muted-foreground'>
              {task.contribution_summary || '按贡献奖励给个人。'}
            </div>

            {contributionWeights.length > 0 ? (
              <div className='rounded-xl border bg-muted/30 px-3 py-2.5'>
                <div className='mb-1.5 text-xs font-medium text-muted-foreground'>
                  贡献权重
                </div>
                <div className='flex flex-wrap gap-2'>
                  {contributionWeights.map((weight) => (
                    <Badge key={weight.key} variant='secondary'>
                      {weight.label} {weight.weight}%
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <div className='space-y-2'>
              {contributions.length > 0 ? (
                contributions.map((item) => {
                  const isMe = item.user_id === team?.membership.user_id
                  return (
                    <div
                      key={item.user_id}
                      className={`rounded-xl border p-3 ${isMe ? 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/30' : ''}`}
                    >
                      <div className='flex items-center justify-between gap-3'>
                        <div className='flex items-center gap-2 font-medium text-sm'>
                          {item.name}
                          {isMe ? (
                            <Badge
                              variant='outline'
                              className='border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-xs'
                            >
                              你
                            </Badge>
                          ) : null}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          贡献占比 {formatPercent(item.ratio)}
                        </div>
                      </div>
                      <div className='mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground'>
                        {item.details.map((detail) => (
                          <span
                            key={`${item.user_id}-${detail.key}`}
                            className='rounded-full border px-2 py-1'
                          >
                            {detail.label} {detail.value.toLocaleString('zh-CN')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className='text-sm text-muted-foreground'>
                  当前还没有可计算的成员贡献度。
                </div>
              )}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function TeamTaskBoard(props: {
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
            ? `每条任务标注了人均目标、全队目标和你的预估分成。点击展开查看贡献明细。`
            : `未组队时也可以先看全部任务和奖励。组队后会显示实时进度和预估分成。`}
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
  onLeaveTeam: () => void
  creating: boolean
  joining: boolean
  leaving: boolean
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
      leaving={props.leaving}
    />
  )
}

export function TeamRewardsWorkspace(props: {
  rewardSummary: PeoplePlanRewardSummary | null
  rewards: PeoplePlanReward[]
  claimPending: boolean
  onClaim: (rewardId: number) => void
  tasks: PeoplePlanTask[]
  team: PeoplePlanTeamDetail | null
  progressMap: Map<string, PeoplePlanProgress>
}) {
  return (
    <div className='space-y-5'>
      <TeamRewardsCard
        rewardSummary={props.rewardSummary}
        rewards={props.rewards}
        claimPending={props.claimPending}
        onClaim={props.onClaim}
      />
      <TeamTaskBoard
        tasks={props.tasks}
        team={props.team}
        progressMap={props.progressMap}
      />
    </div>
  )
}
