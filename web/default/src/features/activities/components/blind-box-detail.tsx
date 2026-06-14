import { Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles, WalletCards } from 'lucide-react'
import { formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
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

export function BlindBoxDetail(props: { data: ActivitiesData }) {
  const definition = ACTIVITY_MAP['blind-box']
  const overview = props.data.blindBoxOverview
  const blindBoxData = props.data.blindBoxData
  const availableBoxes = overview?.available_boxes ?? 0
  const hasPending = availableBoxes > 0
  const pityThreshold = overview?.effective_pity_threshold ?? 0
  const pityProgress = overview?.pity_progress ?? 0
  const firstPurchaseEligible =
    blindBoxData?.first_purchase_guarantee_eligible ?? false
  const firstPurchaseUsd = blindBoxData?.first_purchase_guarantee_usd ?? 0

  return (
    <ActivityDetailShell definition={definition}>
      <DetailHero
        definition={definition}
        headlineLabel={firstPurchaseEligible ? '首购福利' : '待开启盲盒'}
        headlineValue={
          firstPurchaseEligible
            ? `${firstPurchaseUsd.toFixed(2)} 美元保底`
            : `${availableBoxes} 个`
        }
        statusBadge={{
          tone: hasPending ? 'active' : 'idle',
          text: hasPending ? '有待开启' : '暂无待开启',
        }}
        primaryAction={
          <>
            <Button render={<Link to='/blind-box' />}>
              <Sparkles data-icon='inline-start' />
              {definition.primaryActionLabel}
              <ArrowRight data-icon='inline-end' />
            </Button>
            <Button variant='outline' render={<Link to='/wallet' />}>
              <WalletCards data-icon='inline-start' />
              查看扣费顺序
            </Button>
          </>
        }
      />

      {firstPurchaseEligible ? (
        <section className='app-page-shell p-4 sm:p-5'>
          <div className='app-section-kicker'>首购福利</div>
          <div className='mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]'>
            <div className='app-subtle-panel p-4'>
              <div className='text-foreground text-lg font-semibold tracking-tight'>
                首次开盒至少获得 {firstPurchaseUsd.toFixed(2)} 美元额度
              </div>
              <div className='text-muted-foreground mt-2 text-sm leading-6'>
                这次首购不会空转。完成支付并开盒后，奖励额度会直接进入盲盒额度池，并优先参与 API 消耗抵扣。
              </div>
            </div>
            <div className='app-subtle-panel p-4'>
              <div className='text-muted-foreground text-[11px] font-medium'>
                当前建议
              </div>
              <div className='text-foreground mt-2 text-base font-semibold'>
                先完成首购，再跟进保底进度
              </div>
              <div className='text-muted-foreground mt-2 text-sm leading-6'>
                首购福利和后续保底进度可以叠加判断，适合现在直接处理。
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className='app-page-shell p-4 sm:p-5'>
        <div className='app-section-kicker'>实时状态</div>
        <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <DetailMetric label='待开启数量' value={`${availableBoxes} 个`} />
          <DetailMetric
            label='盲盒余额'
            value={formatUsdAmount(
              quotaUnitsToUsd(overview?.remaining_quota ?? 0)
            )}
            hint='盲盒额度优先参与扣费'
          />
          <DetailMetric
            label='保底进度'
            value={`${pityProgress} / ${pityThreshold}`}
            hint={
              pityThreshold > 0
                ? `还差 ${Math.max(0, pityThreshold - pityProgress)} 抽触发保底`
                : undefined
            }
          />
          <DetailMetric
            label='活跃额度池'
            value={`${overview?.active_credit_count ?? 0} 个`}
          />
        </div>
      </section>

      <section className='app-page-shell p-4 sm:p-5'>
        <div className='app-section-kicker'>参与步骤</div>
        <div className='mt-3 grid gap-3 lg:grid-cols-3'>
          <DetailStep
            index={1}
            title='前往盲盒页购买'
            body='在盲盒页选择数量并完成支付，购买后盲盒进入待开启状态。'
          />
          <DetailStep
            index={2}
            title='开启获得额度奖励'
            body='开启盲盒获得随机额度，连续未中高额时会逐步累积保底进度。'
          />
          <DetailStep
            index={3}
            title='额度自动参与扣费'
            body='盲盒额度优先于钱包余额参与日常扣费，可在钱包页核对顺序。'
          />
        </div>
      </section>

      <DetailCallout title='额度使用说明'>
        盲盒额度会优先于钱包余额参与 API 消费扣费，因此待开启的盲盒建议及时处理，以便准确掌握真实可用余额。购买与开启在盲盒页完成，扣费顺序可在钱包页核对。
      </DetailCallout>
    </ActivityDetailShell>
  )
}
