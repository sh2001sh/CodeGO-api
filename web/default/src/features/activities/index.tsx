import { Link, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { SectionPageLayout } from '@/components/layout'
import { DASHBOARD_DEFAULT_SECTION } from '@/features/dashboard/section-registry'
import { ACTIVITY_LIST, type ActivitySlug } from './lib/registry'
import {
  useActivitiesData,
  type ActivitiesData,
} from './lib/use-activities-data'
import {
  ActivitySwitcher,
  type SwitcherItem,
} from './components/activity-switcher'
import { ClaudeConvertDetail } from './components/claude-convert-detail'
import { InviteRewardsDetail } from './components/invite-rewards-detail'
import { PointMallDetail } from './components/point-mall-detail'

function ActivityBody(props: { slug: ActivitySlug; data: ActivitiesData }) {
  switch (props.slug) {
    case 'invite-rewards':
      return <InviteRewardsDetail data={props.data} />
    case 'point-mall':
      return <PointMallDetail data={props.data} />
    case 'claude-convert':
      return <ClaudeConvertDetail data={props.data} />
  }
}

export function ActivitiesPage() {
  const data = useActivitiesData()
  const { activity } = useSearch({ from: '/_authenticated/activities/' })
  const active: ActivitySlug = activity ?? 'invite-rewards'

  const pointBalance = data.pointMallOverview?.account.balance ?? 0
  const eligibleCount = data.eligibleConversionSubscriptions.length
  const resetCount = data.resetOpportunity.available_count

  const statusMap: Record<ActivitySlug, SwitcherItem['status']> = {
    'invite-rewards': {
      tone: resetCount > 0 ? 'active' : 'idle',
      text: resetCount > 0 ? '有可用刷新' : '暂无刷新',
    },
    'point-mall': {
      tone: pointBalance > 0 ? 'active' : 'idle',
      text: pointBalance > 0 ? '可兑换' : '暂无积分',
    },
    'claude-convert': {
      tone: eligibleCount > 0 ? 'active' : 'idle',
      text: eligibleCount > 0 ? '可转换' : '暂无可转换',
    },
  }

  const items: SwitcherItem[] = ACTIVITY_LIST.map((definition) => ({
    definition,
    status: statusMap[definition.slug],
  }))

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>活动中心</SectionPageLayout.Title>
      <SectionPageLayout.Description>
        参与平台福利活动，管理您的积分兑换、额度转换与订阅刷新状态。
      </SectionPageLayout.Description>
      <SectionPageLayout.Actions>
        <Button
          variant='outline'
          render={
            <Link
              to='/dashboard/$section'
              params={{ section: DASHBOARD_DEFAULT_SECTION }}
            />
          }
        >
          概览
        </Button>
        <Button variant='outline' render={<Link to='/wallet' />}>
          钱包
        </Button>
        <Button render={<Link to='/packages' />}>套餐</Button>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='mx-auto flex w-full max-w-[1200px] flex-col gap-4'>
          <ActivitySwitcher items={items} active={active} />
          <ActivityBody slug={active} data={data} />
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
