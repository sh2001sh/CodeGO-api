import type {
  PeoplePlanOverview,
  PeoplePlanRewardSummary,
  PeoplePlanTeamDetail,
} from '../types'
import { formatMoney, getStatusLabel } from '../utils'
import { SummaryCard } from './shared'

export function HeroSection(props: {
  overview?: PeoplePlanOverview
  team: PeoplePlanTeamDetail | null
  rewardSummary: PeoplePlanRewardSummary | null
}) {
  const minMembers = props.overview?.team_rules.min_members ?? 3
  const maxMembers = props.overview?.team_rules.max_members ?? 8
  const maxTotal = props.overview?.max_total_reward_usd ?? 0
  const maxTeam = props.overview?.max_team_reward_usd ?? 0
  const maxSubmission = props.overview?.max_submission_reward_usd ?? 0

  return (
    <section className='relative overflow-hidden rounded-[28px] border bg-slate-950 text-white'>
      <img
        src='/people-plan-poster.png'
        alt=''
        className='absolute inset-0 h-full w-full object-cover'
      />
      <div className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/50' />
      <div className='absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/25 to-transparent' />

      <div className='relative flex min-h-[480px] flex-col justify-between gap-8 px-6 py-7 sm:px-8 sm:py-9 lg:min-h-[560px] lg:px-10 lg:py-10'>
        <div className='max-w-3xl space-y-5 pt-2 lg:pt-4'>
          <p className='text-sm font-medium uppercase tracking-wide text-amber-300/90'>
            {props.overview?.entry_title || '人海计划'}
          </p>

          <div className='space-y-2'>
            <div className='text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl'>
              单人最高可得 <span className='text-amber-400'>{formatMoney(maxTotal)}</span>
            </div>
            <p className='max-w-xl text-sm leading-6 text-white/70 sm:text-base'>
              组队任务和投稿活动可以同时参与。组队任务从成团后开始累计，奖励发放后会直接进入你的额度。
            </p>
          </div>

          <div className='flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/60'>
            <span>
              组队最高 <span className='font-medium text-white/90'>{formatMoney(maxTeam)}</span>
            </span>
            <span>
              投稿最高 <span className='font-medium text-white/90'>{formatMoney(maxSubmission)}</span>
            </span>
          </div>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <SummaryCard
            dark
            label='组队人数'
            value={`${minMembers} - ${maxMembers} 人`}
            hint='有效成员越多，任务档位越高'
          />
          <SummaryCard
            dark
            label='单人最高可得'
            value={formatMoney(maxTotal)}
            hint='组队活动和投稿活动合计'
          />
          <SummaryCard
            dark
            label='已发放额度'
            value={formatMoney(props.rewardSummary?.issued_quota_usd ?? 0)}
            hint={`已发放 ${props.rewardSummary?.claimed ?? 0} 条奖励`}
          />
          <SummaryCard
            dark
            label='我的小队'
            value={
              props.team
                ? `${props.team.summary.effective_members}/${props.team.summary.max_members}`
                : '未加入'
            }
            hint={
              props.team
                ? `状态：${getStatusLabel(props.team.team.status)}`
                : '通过邀请链接注册可自动加入小队'
            }
          />
        </div>
      </div>
    </section>
  )
}
