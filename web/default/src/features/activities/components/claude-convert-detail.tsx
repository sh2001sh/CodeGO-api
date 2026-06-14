import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { formatQuota, formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
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

export function ClaudeConvertDetail(props: { data: ActivitiesData }) {
  const definition = ACTIVITY_MAP['claude-convert']
  const eligibleCount = props.data.eligibleConversionSubscriptions.length
  const hasEligible = eligibleCount > 0
  const config = props.data.conversionConfig
  const ratioText = `${config.ratio_numerator}:${config.ratio_denominator}`
  const claudeBalance = Number(props.data.user?.claude_quota ?? 0)

  return (
    <ActivityDetailShell definition={definition}>
      <DetailHero
        definition={definition}
        headlineLabel='可转换套餐'
        headlineValue={`${eligibleCount} 份`}
        statusBadge={{
          tone: hasEligible ? 'active' : 'idle',
          text: hasEligible ? `按 ${ratioText} 换算` : '暂无可转换套餐',
        }}
        primaryAction={
          <>
            <Button
              render={<Link to='/wallet' search={{ wallet_type: 'claude' }} />}
            >
              {definition.primaryActionLabel}
              <ArrowRight data-icon='inline-end' />
            </Button>
            <Button variant='outline' render={<Link to='/packages' />}>
              查看主力套餐
            </Button>
          </>
        }
      />

      <section className='app-page-shell p-4 sm:p-5'>
        <div className='app-section-kicker'>实时状态</div>
        <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <DetailMetric label='可转换套餐' value={`${eligibleCount} 份`} />
          <DetailMetric
            label='可转美元'
            value={formatUsdAmount(
              quotaUnitsToUsd(props.data.totalConvertibleQuota)
            )}
            hint={`换算比例 ${ratioText}`}
          />
          <DetailMetric
            label='Claude 到账'
            value={formatQuota(props.data.totalConvertibleClaudeQuota)}
          />
          <DetailMetric
            label='当前 Claude 余额'
            value={formatUsdAmount(quotaUnitsToUsd(claudeBalance))}
          />
        </div>
      </section>

      <section className='app-page-shell p-4 sm:p-5'>
        <div className='app-section-kicker'>参与步骤</div>
        <div className='mt-3 grid gap-3 lg:grid-cols-3'>
          <DetailStep
            index={1}
            title='确认主力套餐充足'
            body='转换会消耗订阅额度，请先确认当前主力套餐的额度足以覆盖日常使用。'
          />
          <DetailStep
            index={2}
            title='在钱包发起转换'
            body={`进入钱包 Claude 额度池，按 ${ratioText} 的比例将闲置订阅额度转入。`}
          />
          <DetailStep
            index={3}
            title='Claude 专属额度到账'
            body='转换完成后额度进入 Claude 专属池，仅用于 Claude 模型扣费。'
          />
        </div>
      </section>

      <DetailCallout title='适合转换的场景'>
        当主力套餐额度长期富余、且主要使用 Claude 模型时，将部分闲置额度转换为 Claude 专属额度更高效。转换在钱包页执行。
        {config.exclude_day_pass ? '（日卡类套餐不参与转换。）' : null}
      </DetailCallout>
    </ActivityDetailShell>
  )
}
