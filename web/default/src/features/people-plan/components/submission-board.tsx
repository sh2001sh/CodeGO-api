import { Gift } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import type {
  PeoplePlanReward,
  PeoplePlanSubmission,
  PeoplePlanSubmissionTask,
} from '../types'
import {
  formatMoney,
  formatTime,
  getRewardUsd,
  getStatusLabel,
  getSubmissionTaskCompletedCount,
  parseSubmissionAttachments,
  type SubmissionType,
  submissionTypeOptions,
  toStatusTone,
} from '../utils'
import { SummaryCard } from './shared'

function SubmissionTypePicker(props: {
  submissionType: SubmissionType
  setSubmissionType: (value: SubmissionType) => void
}) {
  return (
    <div className='grid gap-3 md:grid-cols-3'>
      {submissionTypeOptions.map((option) => {
        const Icon = option.icon
        const active = props.submissionType === option.value
        return (
          <button
            key={option.value}
            type='button'
            onClick={() => props.setSubmissionType(option.value)}
            className={
              active
                ? 'rounded-2xl border border-primary bg-primary/8 p-4 text-left'
                : 'rounded-2xl border p-4 text-left transition-colors hover:bg-muted/30'
            }
          >
            <div className='flex items-center gap-2 text-sm font-medium'>
              <Icon className='h-4 w-4' />
              {option.label}
            </div>
            <div className='mt-2 text-xs leading-5 text-muted-foreground'>
              {option.description}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function SubmissionTasksCard(props: {
  tasks: PeoplePlanSubmissionTask[]
  submissions: PeoplePlanSubmission[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>投稿任务</CardTitle>
        <CardDescription>投稿活动按个人统计，奖励发给投稿人本人。</CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        {props.tasks.map((task) => {
          const completedCount = getSubmissionTaskCompletedCount(
            task,
            props.submissions
          )
          const maxCount = Math.max(task.max_completions, 1)

          return (
            <div key={task.key} className='rounded-2xl border p-4'>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='font-medium'>{task.title}</div>
                <Badge variant='outline'>
                  {completedCount}/{maxCount}
                </Badge>
                <Badge
                  variant='outline'
                  className='border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                >
                  个人奖励
                </Badge>
                <Badge variant='outline'>{formatMoney(task.reward_pool_usd)}</Badge>
              </div>
              <div className='mt-2 text-sm text-muted-foreground'>
                {task.description}
              </div>
              <div className='mt-2 text-xs text-muted-foreground'>
                每审核通过 1 次，奖励全额发给投稿人本人，不与他人分成。
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function SubmissionRewardsCard(props: { rewards: PeoplePlanReward[] }) {
  const claimableCount = props.rewards.filter(
    (reward) => reward.status === 'claimable'
  ).length
  const totalRewardUSD = props.rewards.reduce(
    (sum, reward) => sum + getRewardUsd(reward),
    0
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>投稿活动奖励</CardTitle>
        <CardDescription>这里只显示投稿活动奖励。</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 sm:grid-cols-3'>
          <SummaryCard label='奖励条目' value={props.rewards.length} />
          <SummaryCard label='可领取' value={claimableCount} />
          <SummaryCard label='累计到账' value={formatMoney(totalRewardUSD)} />
        </div>
        <div className='space-y-3'>
          {props.rewards.length > 0 ? (
            props.rewards.map((reward) => (
              <div key={reward.id} className='rounded-2xl border p-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='font-medium'>{reward.title}</div>
                  <Badge variant={toStatusTone(reward.status)}>
                    {getStatusLabel(reward.status)}
                  </Badge>
                </div>
                <div className='mt-2 text-sm text-muted-foreground'>
                  {reward.description || '投稿审核通过后自动生成奖励。'}
                </div>
                <div className='mt-2 text-xs text-muted-foreground'>
                  奖励金额：{formatMoney(getRewardUsd(reward))}，创建时间：
                  {formatTime(reward.created_at)}
                </div>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed p-6 text-sm text-muted-foreground'>
              暂无投稿活动奖励。
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SubmissionRecords(props: { submissions: PeoplePlanSubmission[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>投稿记录</CardTitle>
        <CardDescription>这里显示你提交过的投稿和审核结果。</CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        {props.submissions.length > 0 ? (
          props.submissions.map((submission) => (
            <div key={submission.id} className='rounded-2xl border p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='font-medium'>{submission.title}</div>
                  <div className='text-xs text-muted-foreground'>
                    类型：{getStatusLabel(submission.type)}
                  </div>
                </div>
                <Badge variant={toStatusTone(submission.status)}>
                  {getStatusLabel(submission.status)}
                </Badge>
              </div>
              <div className='mt-3 text-sm leading-6 text-muted-foreground'>
                {submission.summary || submission.content}
              </div>
              <div className='mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground'>
                <span>提交时间：{formatTime(submission.created_at)}</span>
                <span>
                  附件数量：{parseSubmissionAttachments(submission.attachments).length}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className='rounded-2xl border border-dashed p-6 text-sm text-muted-foreground'>
            还没有投稿记录。
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SubmissionBoard(props: {
  submissionType: SubmissionType
  setSubmissionType: (value: SubmissionType) => void
  submissionTitle: string
  setSubmissionTitle: (value: string) => void
  submissionSummary: string
  setSubmissionSummary: (value: string) => void
  submissionContent: string
  setSubmissionContent: (value: string) => void
  submissionAttachments: string
  setSubmissionAttachments: (value: string) => void
  submissionContact: string
  setSubmissionContact: (value: string) => void
  onSubmit: () => Promise<void>
  submitting: boolean
  submissions: PeoplePlanSubmission[]
  rewards: PeoplePlanReward[]
  tasks: PeoplePlanSubmissionTask[]
}) {
  return (
    <div className='space-y-5'>
      <div className='grid gap-5 xl:grid-cols-[1.02fr_0.98fr]'>
        <SubmissionTasksCard tasks={props.tasks} submissions={props.submissions} />
        <SubmissionRewardsCard rewards={props.rewards} />
      </div>

      <div className='grid gap-5 xl:grid-cols-[1.02fr_0.98fr]'>
        <Card>
          <CardHeader>
            <CardTitle>提交投稿</CardTitle>
            <CardDescription>选择类型后，填写标题、说明、附件和联系方式。</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <SubmissionTypePicker
              submissionType={props.submissionType}
              setSubmissionType={props.setSubmissionType}
            />
            <Input
              value={props.submissionTitle}
              onChange={(event) => props.setSubmissionTitle(event.target.value)}
              placeholder='请输入投稿标题'
            />
            <Input
              value={props.submissionSummary}
              onChange={(event) => props.setSubmissionSummary(event.target.value)}
              placeholder='请输入一句话摘要'
            />
            <Textarea
              rows={6}
              value={props.submissionContent}
              onChange={(event) => props.setSubmissionContent(event.target.value)}
              placeholder='请说明成果内容、使用场景、完成情况和你希望审核看到的重点。'
            />
            <Textarea
              rows={3}
              value={props.submissionAttachments}
              onChange={(event) =>
                props.setSubmissionAttachments(event.target.value)
              }
              placeholder='每行一个附件链接，可填写项目地址、文章链接或截图链接。'
            />
            <Input
              value={props.submissionContact}
              onChange={(event) => props.setSubmissionContact(event.target.value)}
              placeholder='联系方式，例如邮箱、微信或社媒账号'
            />
            <Button disabled={props.submitting} onClick={props.onSubmit}>
              <Gift className='mr-2 h-4 w-4' />
              提交审核
            </Button>
          </CardContent>
        </Card>

        <SubmissionRecords submissions={props.submissions} />
      </div>
    </div>
  )
}
