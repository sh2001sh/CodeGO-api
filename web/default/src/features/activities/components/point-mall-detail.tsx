import { Link } from '@tanstack/react-router'
import { ArrowRight, Ticket } from 'lucide-react'
import { formatNumber, formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { ACTIVITY_MAP } from '../lib/registry'
import type { ActivitiesData } from '../lib/use-activities-data'
import {
  ActivityDetailShell,
  DetailCallout,
  DetailHero,
  DetailMetric,
  DetailStep,
} from './detail-parts'

export function PointMallDetail(props: { data: ActivitiesData }) {
  const definition = ACTIVITY_MAP['point-mall']
  const overview = props.data.pointMallOverview
  const balance = overview?.account.balance ?? 0
  const hasBalance = balance > 0
  const products = overview?.products?.length ?? 0

  return (
    <ActivityDetailShell definition={definition}>
      <DetailHero
        definition={definition}
        headlineLabel='当前积分余额'
        headlineValue={formatNumber(balance)}
        statusBadge={{
          tone: hasBalance ? 'active' : 'idle',
          text: hasBalance ? '可兑换' : '暂无积分',
        }}
        primaryAction={
          <>
            <Button render={<Link to='/point-mall' />}>
              {definition.primaryActionLabel}
              <ArrowRight data-icon='inline-end' />
            </Button>
            <Button variant='outline' render={<Link to='/blind-box' />}>
              <Ticket data-icon='inline-start' />
              兑换盲盒券
            </Button>
          </>
        }
      />

      <section className='app-page-shell p-4 sm:p-5'>
        <div className='app-section-kicker'>实时状态</div>
        <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <DetailMetric label='积分余额' value={formatNumber(balance)} />
          <DetailMetric
            label='可转赠送额度'
            value={formatUsdAmount(
              quotaUnitsToUsd(overview?.convertible_bonus_quota ?? 0)
            )}
            hint='赠送额度可换算成积分'
          />
          <DetailMetric label='可兑换商品' value={`${products} 项`} />
          <DetailMetric
            label='最近订单'
            value={`${overview?.recent_orders?.length ?? 0} 条`}
          />
        </div>
      </section>

      <section className='app-page-shell p-4 sm:p-5'>
        <div className='app-section-kicker'>参与步骤</div>
        <div className='mt-3 grid gap-3 lg:grid-cols-3'>
          <DetailStep
            index={1}
            title='将赠送额度转换为积分'
            body='在积分商城将可转换的赠送额度按比例兑换为积分，每月转换额度有上限。'
          />
          <DetailStep
            index={2}
            title='挑选要兑换的权益'
            body='积分可兑换盲盒券、卡密和套餐权益，库存与限购在商品卡上展示。'
          />
          <DetailStep
            index={3}
            title='完成兑换并查看订单'
            body='兑换后在积分商城订单列表查看卡密或权益发放状态。'
          />
        </div>
      </section>

      <DetailCallout title='积分的用途'>
        积分专用于权益兑换，不参与日常 API 消费扣费。当账户存在较多富余的赠送额度时，将其转换为积分兑换权益通常比闲置更具价值。
      </DetailCallout>
    </ActivityDetailShell>
  )
}
