import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/copy-button'
import { ACTIVITY_MAP } from '../lib/registry'
import type { ActivitiesData } from '../lib/use-activities-data'
import {
  ActivityDetailShell,
  DetailCallout,
  DetailHero,
  DetailMetric,
  DetailStep,
} from './detail-parts'

export function InviteRewardsDetail(props: { data: ActivitiesData }) {
  const definition = ACTIVITY_MAP['invite-rewards']
  const overview = props.data.affiliateOverview
  const reset = props.data.resetOpportunity
  const hasReset = reset.available_count > 0
  const affiliateLink = props.data.affiliateLink

  return (
    <ActivityDetailShell definition={definition}>
      <DetailHero
        definition={definition}
        headlineLabel='可用刷新机会'
        headlineValue={`${reset.available_count} 次`}
        statusBadge={{
          tone: hasReset ? 'active' : 'idle',
          text: reset.used_this_month ? '本月已使用' : '本月可使用',
        }}
        primaryAction={
          <Button render={<Link to='/invite-rewards' />}>
            {definition.primaryActionLabel}
            <ArrowRight data-icon='inline-end' />
          </Button>
        }
      />

      <section className='app-page-shell p-4 sm:p-5'>
        <div className='app-section-kicker'>实时状态</div>
        <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <DetailMetric
            label='已邀请人数'
            value={formatNumber(overview?.invited_count ?? 0)}
          />
          <DetailMetric
            label='已触发奖励'
            value={formatNumber(overview?.successful_purchase_invites ?? 0)}
            hint='完成月卡购买的邀请数'
          />
          <DetailMetric
            label='可用刷新'
            value={`${reset.available_count} 次`}
          />
          <DetailMetric
            label='累计获得刷新'
            value={`${reset.earned_total} 次`}
            hint={`已使用 ${reset.used_total} 次`}
          />
        </div>

        <div className='border-border bg-background/72 mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2'>
          <div className='text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs'>
            {affiliateLink || '登录后自动生成邀请链接'}
          </div>
          <CopyButton
            value={affiliateLink}
            variant='outline'
            className='bg-background size-9'
            iconClassName='size-4'
            tooltip='复制邀请链接'
            successTooltip='已复制'
            aria-label='复制邀请链接'
          />
        </div>
      </section>

      <section className='app-page-shell p-4 sm:p-5'>
        <div className='app-section-kicker'>参与步骤</div>
        <div className='mt-3 grid gap-3 lg:grid-cols-3'>
          <DetailStep
            index={1}
            title='复制邀请链接'
            body='直接在本页复制专属邀请链接，分享给可能购买月卡的好友。'
          />
          <DetailStep
            index={2}
            title='好友购买月卡'
            body='当被邀请人完成月卡购买，系统会为你发放一次订阅刷新机会。'
          />
          <DetailStep
            index={3}
            title='在邀请页使用刷新'
            body='刷新会清空当前主力订阅的已用额度，每月可用次数有限。'
          />
        </div>
      </section>

      <DetailCallout title='刷新作用范围'>
        刷新机会仅作用于当前主力订阅，使用后会将其已用额度重置为零。每月可用次数有限，可根据订阅消耗情况选择即时使用或累积后统一使用。
      </DetailCallout>
    </ActivityDetailShell>
  )
}
