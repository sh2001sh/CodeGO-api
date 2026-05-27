import { Check, Users, UserCheck, Target, Coins } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type {
  PeoplePlanOverview,
  PeoplePlanRewardSummary,
  PeoplePlanTeamDetail,
} from '../types'
import { formatMoney, formatTime, getStatusLabel } from '../utils'
import { SummaryCard } from './shared'

function StepCard(props: {
  step: number
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
  last?: boolean
}) {
  const Icon = props.icon
  return (
    <div className='flex gap-4'>
      <div className='flex flex-col items-center'>
        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground'>
          {props.step}
        </div>
        {!props.last ? (
          <div className='mt-1.5 w-0.5 flex-1 rounded-full bg-border' />
        ) : null}
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

  return (
    <div className='space-y-5'>
      {/* Section A: 参与流程 */}
      <Card>
        <CardHeader>
          <CardTitle>参与流程</CardTitle>
          <CardDescription>
            从组队到拿奖金，一共四步。未组队也能先看任务和奖励。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StepCard step={1} icon={Users} title='创建或加入小队'>
            队长创建小队后获得邀请码，成员通过邀请码或邀请链接加入。
            <br />
            小队人数范围：{minMembers} - {maxMembers} 人。你也可以通过邀请链接注册后自动入队。
          </StepCard>

          <StepCard step={2} icon={UserCheck} title='成为有效成员'>
            有效成员需同时满足：
            <ul className='mt-1 list-inside list-disc space-y-0.5'>
              <li>完成注册</li>
              <li>生成 API Key</li>
              <li>产生至少 1 次 API 调用</li>
            </ul>
            满足以上条件即为有效成员，可以参与奖励分配。但计入成团人数需要达到最低用量：
            <div className='mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'>
              个人累计调用 ≥ 50 次 或 累计消费 ≥ $5，才计入成团人数。只看你自己的用量，不跟队友比。拉来只调用过几次的僵尸号不能帮全队提档。
            </div>
          </StepCard>

          <StepCard step={3} icon={Target} title='完成组队任务'>
            任务分为两类：
            <ul className='mt-1 list-inside list-disc space-y-0.5'>
              <li>
                <span className='font-medium text-foreground'>长期任务</span>
                ：调用冲刺、消费冲刺、成团奖励。可多次完成，长期有效。
              </li>
              <li>
                <span className='font-medium text-foreground'>月度任务</span>
                ：月度活跃、月度消费。每月结算一次。
              </li>
            </ul>
            每项任务有明确的目标值和完成次数上限。小队成员一起做，进度全队共享。
          </StepCard>

          <StepCard step={4} icon={Coins} title='按贡献分奖金' last>
            每次任务完成后，系统自动分配奖励：
            <ul className='mt-1 list-inside list-disc space-y-0.5'>
              <li>根据贡献权重计算每位有效成员的贡献占比</li>
              <li>贡献占比低于 5% 的成员不参与分奖，其份额分配给其他合格成员</li>
              <li>贡献越大的成员，分到的奖金越多</li>
            </ul>
            <div className='mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'>
              简单说：多劳多得。拉来的成员如果自己不活跃、不消费，既不能帮你提档位，也分不到奖金。
            </div>
          </StepCard>
        </CardContent>
      </Card>

      {/* Section B: 奖励机制对比 */}
      <Card>
        <CardHeader>
          <CardTitle>奖励机制说明</CardTitle>
          <CardDescription>
            组队任务和投稿任务的奖励方式不同，这里一次说清楚。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-hidden rounded-2xl border'>
            {/* Header row */}
            <div className='grid grid-cols-[120px_1fr_1fr] gap-3 border-b bg-muted/40 px-4 py-3 text-sm font-semibold'>
              <div />
              <div className='flex items-center gap-1.5'>
                <Badge variant='outline' className='border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'>
                  组队任务
                </Badge>
                小队总奖池
              </div>
              <div className='flex items-center gap-1.5'>
                <Badge variant='outline' className='border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-300'>
                  投稿任务
                </Badge>
                个人奖励
              </div>
            </div>

            <div className='px-4'>
              <ComparisonRow
                label='奖励来源'
                teamText='小队总奖池：后台配置的固定金额，按人数档位浮动'
                submissionText='单人固定奖励：后台为每种投稿类型配置的奖励金额'
              />
              <ComparisonRow
                label='分配方式'
                teamText='按贡献权重分配给每位有效成员，贡献越大分得越多'
                submissionText='审核通过后，奖励全额发给投稿人本人，不与他人分成'
              />
              <ComparisonRow
                label='参与方式'
                teamText='必须先加入小队。未组队时可查看任务，但不能累计进度'
                submissionText='个人直接投稿，不需要加入任何小队'
              />
              <ComparisonRow
                label='任务进度'
                teamText='全队共享进度。任一成员的行为都计入小队总进度'
                submissionText='个人独立统计。每人单独计算完成次数'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section C: 组队人数档位 */}
      <Card>
        <CardHeader>
          <CardTitle>组队人数档位</CardTitle>
          <CardDescription>
            小队有效成员越多，同一项任务的总奖池越高。每项任务在每个档位有独立的总奖池金额。
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-3'>
          {tiers.map((tier, index) => {
            const descriptions = [
              `达到 ${tier.required_members} 名有效成员后，各项任务按入门档总奖池结算。适合刚刚组队的小团队。`,
              `达到 ${tier.required_members} 名有效成员后，总奖池大幅提升。人数越多，单次任务完成的收益越高。`,
              `达到 ${tier.required_members} 名有效成员后，解锁最高档位。满编小队每次任务完成的收益最大化。`,
            ]
            return (
              <TierCard
                key={tier.required_members}
                members={tier.required_members}
                label={`总奖池 ${formatMoney(tier.reward_pool_usd)} 起`}
                description={descriptions[index] || `达到 ${tier.required_members} 名有效成员后，人数档位总奖池为 ${formatMoney(tier.reward_pool_usd)}。`}
              />
            )
          })}
        </CardContent>
      </Card>

      {/* Section D: 当前状态 */}
      <Card>
        <CardHeader>
          <CardTitle>我的当前状态</CardTitle>
          <CardDescription>这里显示你现在最关心的进度。</CardDescription>
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
