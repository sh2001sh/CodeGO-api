import { Badge } from '@/components/ui/badge'
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

  return (
    <section className='relative overflow-hidden rounded-[28px] border bg-slate-950 text-white'>
      <img
        src='/people-plan-poster.png'
        alt='人海计划海报'
        className='absolute inset-0 h-full w-full object-cover'
      />
      <div className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/42' />
      <div className='absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/20 to-transparent' />

      <div className='relative flex min-h-[500px] flex-col justify-between gap-8 px-6 py-7 sm:px-8 sm:py-9 lg:min-h-[620px] lg:px-10 lg:py-10'>
        <div className='max-w-3xl space-y-4 pt-2 lg:pt-6'>
          <Badge className='w-fit border-white/20 bg-white/12 text-white hover:bg-white/12'>
            {props.overview?.entry_title || 'Code Go 人海计划'}
          </Badge>
          <div className='space-y-3'>
            <h2 className='max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl'>
              Code Go 人海计划
            </h2>
            <p className='max-w-2xl text-sm leading-7 text-white/90 sm:text-base'>
              组队做任务，按贡献分奖金；投稿交成果，奖励个人独享。
            </p>
            <p className='max-w-2xl text-sm leading-7 text-white/72'>
              组队任务标注"小队总奖池"并按贡献权重分配给成员；投稿活动审核通过后，奖励直接发给投稿人本人。未组队也能先查看全部任务和奖励。
            </p>
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-3'>
          <SummaryCard
            dark
            label='组队人数'
            value={`${minMembers} - ${maxMembers} 人`}
            hint='达到有效成员要求后开始按档位结算'
          />
          <SummaryCard
            dark
            label='当前可领取'
            value={props.rewardSummary?.claimable ?? 0}
            hint={`待领取金额 ${formatMoney(props.rewardSummary?.quota_usd ?? 0)}`}
          />
          <SummaryCard
            dark
            label='我的小队进度'
            value={
              props.team
                ? `${props.team.summary.effective_members}/${props.team.summary.max_members}`
                : '未加入'
            }
            hint={
              props.team
                ? `小队状态：${getStatusLabel(props.team.team.status)}`
                : '可通过邀请链接注册自动入队'
            }
          />
        </div>
      </div>
    </section>
  )
}
