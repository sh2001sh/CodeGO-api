import type { ComponentType, ReactNode } from 'react'
import { Check, Coins, Target, UserCheck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type {
  PeoplePlanOverview,
  PeoplePlanRewardSummary,
  PeoplePlanTeamDetail,
} from '../types'
import { formatTime, getStatusLabel } from '../utils'
import { SummaryCard } from './shared'

function StepCard(props: {
  step: number
  icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
  last?: boolean
}) {
  const Icon = props.icon
  return (
    <div className='flex gap-4'>
      <div className='flex flex-col items-center'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground'>
          {props.step}
        </div>
        {!props.last ? <div className='mt-1.5 w-0.5 flex-1 rounded-full bg-border' /> : null}
      </div>
      <div className={props.last ? 'pb-0' : 'pb-7'}>
        <div className='flex items-center gap-2'>
          <Icon className='h-4 w-4 text-primary' />
          <div className='text-base font-semibold'>{props.title}</div>
        </div>
        <div className='mt-2.5 space-y-1.5 text-sm leading-6 text-muted-foreground'>
          {props.children}
        </div>
      </div>
    </div>
  )
}

function ComparisonRow(props: {
  label: string
  teamText: string
  submissionText: string
}) {
  return (
    <div className='grid grid-cols-[120px_1fr_1fr] gap-3 border-b py-3 text-sm last:border-b-0'>
      <div className='font-medium text-muted-foreground'>{props.label}</div>
      <div className='flex items-start gap-1.5'>
        <Check className='mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500' />
        <span>{props.teamText}</span>
      </div>
      <div className='flex items-start gap-1.5'>
        <Check className='mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500' />
        <span>{props.submissionText}</span>
      </div>
    </div>
  )
}

function TierCard(props: {
  members: number
  label: string
  description: string
}) {
  return (
    <div className='rounded-2xl border p-4'>
      <div className='flex items-center gap-2'>
        <Badge variant='default' className='shrink-0'>
          {props.members} 人档
        </Badge>
        <div className='text-sm font-medium'>{props.label}</div>
      </div>
      <div className='mt-2 text-sm leading-6 text-muted-foreground'>
        {props.description}
      </div>
    </div>
  )
}

export function RulesTab(props: {
  overview?: PeoplePlanOverview
  team: PeoplePlanTeamDetail | null
  rewardSummary: PeoplePlanRewardSummary | null
}) {
  const tiers = props.overview?.team_rules.reward_tiers ?? []
  const minMembers = props.overview?.team_rules.min_members ?? 3
  const maxMembers = props.overview?.team_rules.max_members ?? 8
  const effectiveMinCalls = props.overview?.team_rules.effective_min_calls ?? 30
  const effectiveMinSpend = props.overview?.team_rules.effective_min_spend_usd ?? 3

  return (
    <div className='space-y-5'>
      <Card>
        <CardHeader>
          <CardTitle>参与流程</CardTitle>
          <CardDescription>
            先看规则，再决定组队还是投稿。两条线可以同时参与。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StepCard step={1} icon={Users} title='创建或加入小队'>
            队长创建小队后会获得邀请码和邀请链接，成员可直接输入邀请码加入，也可以通过邀请链接注册后自动入队。
            <br />
            小队人数范围：{minMembers} - {maxMembers} 人。
          </StepCard>

          <StepCard step={2} icon={UserCheck} title='达到有效成员标准'>
            只有有效成员才会计入成团人数和人数档位。
            <ul className='mt-1 list-inside list-disc space-y-0.5'>
              <li>完成注册</li>
              <li>生成 API Key</li>
              <li>
                个人累计调用 ≥ {effectiveMinCalls} 次，或累计消费 ≥ ${effectiveMinSpend}
              </li>
            </ul>
            队长可以移出成员；成团后只能移出未达有效标准的成员。
          </StepCard>

          <StepCard step={3} icon={Target} title='完成组队任务或个人投稿'>
            组队活动按小队累计进度结算，投稿活动按个人提交记录结算。
            <ul className='mt-1 list-inside list-disc space-y-0.5'>
              <li>组队长期任务：成团奖励、消费冲刺、邀请冲刺、盲盒冲刺</li>
              <li>组队月度任务：月度消费</li>
              <li>投稿活动：内容投稿、项目接入、社区共建</li>
            </ul>
          </StepCard>

          <StepCard step={4} icon={Coins} title='领取奖励' last>
            奖励方式很简单：
            <ul className='mt-1 list-inside list-disc space-y-0.5'>
              <li>成团奖励按当次有效成员平分</li>
              <li>其他组队任务按贡献奖励给个人</li>
              <li>投稿活动奖励只发给投稿人本人</li>
              <li>同一档成团奖励每人全活动期只发一次，换队不重复发</li>
            </ul>
          </StepCard>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>奖励方式</CardTitle>
          <CardDescription>
            组队活动和投稿活动分开结算，奖励记录也分开展示。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-hidden rounded-2xl border'>
            <div className='grid grid-cols-[120px_1fr_1fr] gap-3 border-b bg-muted/40 px-4 py-3 text-sm font-semibold'>
              <div />
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                >
                  组队活动
                </Badge>
                小队总奖池
              </div>
              <div className='flex items-center gap-1.5'>
                <Badge
                  variant='outline'
                  className='border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                >
                  投稿活动
                </Badge>
                个人奖励
              </div>
            </div>

            <div className='px-4'>
              <ComparisonRow
                label='奖励归属'
                teamText='成团奖励平分；其余任务按贡献分配给成员'
                submissionText='奖励全额归投稿人本人，不与他人分成'
              />
              <ComparisonRow
                label='参与方式'
                teamText='必须先加入小队，未组队时只能先查看任务和规则'
                submissionText='个人直接投稿，不需要加入任何小队'
              />
              <ComparisonRow
                label='进度统计'
                teamText='全队共享进度，人数档位越高，目标和奖池都会提高'
                submissionText='每个人独立统计，按通过审核的投稿记录结算'
              />
              <ComparisonRow
                label='奖励展示'
                teamText='组队奖励页只显示组队奖励'
                submissionText='投稿奖励显示在投稿活动页和个人投稿记录里'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>组队人数档位</CardTitle>
          <CardDescription>
            有效成员越多，任务目标更高，但完成后的总奖池和人均奖金也更高。
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-3'>
          {tiers.map((tier, index) => {
            const descriptions = [
              `达到 ${tier.required_members} 名有效成员后，解锁入门档，适合小队启动阶段。`,
              `达到 ${tier.required_members} 名有效成员后，解锁进阶档，人均门槛和奖池都会上升。`,
              `达到 ${tier.required_members} 名有效成员后，解锁满编档，单次任务的人均奖励最高。`,
            ]
            return (
              <TierCard
                key={tier.required_members}
                members={tier.required_members}
                label={index === 0 ? '入门档' : index === 1 ? '进阶档' : '满编档'}
                description={
                  descriptions[index] ||
                  `达到 ${tier.required_members} 名有效成员后，会自动切换到更高档位。`
                }
              />
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>我的当前状态</CardTitle>
          <CardDescription>这里显示你现在最关心的几项信息。</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard
            label='我的小队'
            value={props.team ? getStatusLabel(props.team.team.status) : '未加入'}
          />
          <SummaryCard
            label='有效成员'
            value={props.team?.summary.effective_members ?? 0}
          />
          <SummaryCard
            label='可领取奖励'
            value={props.rewardSummary?.claimable ?? 0}
          />
          <SummaryCard
            label='数据时间'
            value={formatTime(props.overview?.generated_at ?? 0)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
