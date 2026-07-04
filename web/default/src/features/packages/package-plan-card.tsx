import { ArrowRight, Sparkles, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  formatDuration,
  formatSubscriptionPlanPrice,
  formatSubscriptionQuotaAmount,
  getSubscriptionDisabledReasonText,
  getSubscriptionPlanActionLabel,
  getSubscriptionPlanSubtitle,
  parseSubscriptionQuotaUSDToUnits,
} from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  SubscriptionPurchaseType,
} from '@/features/subscriptions/types'

export function PackagePlanCard(props: {
  record: PlanRecord
  purchaseCount: number
  onPurchase: (purchaseType?: SubscriptionPurchaseType) => void
}) {
  const { t } = useTranslation()
  const plan = props.record.plan
  const title = plan.title || '套餐'
  const isRecommended = title.includes('Standard')
  const groupBuyEnabled = plan.group_buy_enabled === true
  const limit = Number(plan.max_purchase_per_user || 0)
  const limitReached = limit > 0 && props.purchaseCount >= limit
  const actionLabel = getSubscriptionPlanActionLabel(props.record.action, t)
  const effectiveAmount = props.record.amount_due ?? plan.price_amount
  const baseQuota = Number(plan.total_amount || 0)
  const blockedReason =
    getSubscriptionDisabledReasonText(props.record.disabled_reason) ||
    '当前还有更高档且未用完的生效套餐，暂不支持直接降级。'
  const tierRows = buildPackageQuotaTiers(plan)

  return (
    <Card
      className={cn(
        'border-border bg-card h-full overflow-hidden shadow-none',
        isRecommended && 'border-primary/60 ring-primary/15 ring-2'
      )}
    >
      <CardContent className='flex h-full flex-col gap-4 p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='text-primary text-xs font-medium'>
              {getSubscriptionPlanSubtitle(plan)}
            </div>
            <h4 className='text-foreground mt-1 truncate text-lg font-semibold'>
              {title}
            </h4>
          </div>
          {isRecommended ? (
            <span className='bg-primary/10 text-primary inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium'>
              <Sparkles className='mr-1 h-3.5 w-3.5' />
              推荐
            </span>
          ) : null}
        </div>

        <div className='space-y-1'>
          <div className='text-primary text-2xl font-semibold'>
            {formatSubscriptionPlanPrice(effectiveAmount, plan.currency)}
          </div>
          {effectiveAmount !== plan.price_amount ? (
            <div className='text-muted-foreground text-xs line-through'>
              {formatSubscriptionPlanPrice(plan.price_amount, plan.currency)}
            </div>
          ) : null}
          <div className='text-muted-foreground text-sm'>
            支付后基础额度立即生效
          </div>
        </div>

        <div className='grid grid-cols-2 gap-2 text-sm'>
          <InfoTile
            label='基础额度'
            value={formatSubscriptionQuotaAmount(baseQuota)}
          />
          <InfoTile label='有效期' value={formatDuration(plan, t)} />
          <InfoTile
            label='单独购买'
            value={formatSubscriptionQuotaAmount(baseQuota)}
          />
          <InfoTile
            label='结算规则'
            value={groupBuyEnabled ? '满 5 人或 48 小时' : '支付后立即完成'}
          />
        </div>

        <div className='border-border rounded-2xl border'>
          <div className='border-border/70 bg-muted/30 flex items-center justify-between rounded-t-2xl border-b px-3 py-2.5'>
            <div className='text-foreground flex items-center text-sm font-medium'>
              <Users className='mr-1.5 h-4 w-4' />
              额度阶梯
            </div>
            <div className='text-muted-foreground text-xs'>
              {groupBuyEnabled
                ? '拼团成功后赠额直接追加到套餐额度'
                : '该套餐不参与拼团'}
            </div>
          </div>
          <div className='divide-border/70 divide-y'>
            {tierRows.map((tier) => (
              <TierRow
                key={tier.label}
                label={tier.label}
                detail={tier.detail}
                value={tier.value}
              />
            ))}
          </div>
        </div>

        {groupBuyEnabled ? (
          <div className='text-muted-foreground rounded-2xl bg-muted/25 px-3 py-2.5 text-xs leading-5'>
            当前套餐进入拼团后，先按基础价完成支付；房间满 5 人或到达 48
            小时后，按实际成团人数统一补发赠额。
          </div>
        ) : (
          <div className='text-muted-foreground rounded-2xl bg-muted/25 px-3 py-2.5 text-xs leading-5'>
            该套餐不参与拼团，适合立即补量或先体验使用节奏。
          </div>
        )}

        <div className='mt-auto grid gap-2'>
          <Button
            className='w-full'
            disabled={limitReached || props.record.action === 'disabled'}
            onClick={() => props.onPurchase('normal')}
          >
            {limitReached ? '已达购买上限' : actionLabel}
            {!limitReached ? <ArrowRight className='ml-1 h-4 w-4' /> : null}
          </Button>
          {groupBuyEnabled ? (
            <Button
              variant='outline'
              className='w-full'
              disabled={limitReached || props.record.action === 'disabled'}
              onClick={() => props.onPurchase('group_buy')}
            >
              进入拼团
            </Button>
          ) : null}
          {limitReached ? (
            <div className='text-muted-foreground text-xs'>
              已达到该套餐购买上限（{props.purchaseCount}/{limit}）。
            </div>
          ) : null}
          {props.record.action === 'disabled' ? (
            <div className='text-muted-foreground text-xs leading-5'>
              {blockedReason}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function buildPackageQuotaTiers(
  plan: PlanRecord['plan']
): Array<{ label: string; detail: string; value: string }> {
  const baseQuota = Number(plan.total_amount || 0)
  const tiers = [
    {
      label: '单独购买',
      detail: '无需等待，支付后立即生效',
      value: formatSubscriptionQuotaAmount(baseQuota),
    },
  ]

  if (plan.group_buy_enabled) {
    tiers.push(
      {
        label: '2 人成团',
        detail: `额外 +$${Number(plan.group_buy_bonus_2 || 0)}`,
        value: formatSubscriptionQuotaAmount(
          baseQuota +
            parseSubscriptionQuotaUSDToUnits(plan.group_buy_bonus_2 || 0)
        ),
      },
      {
        label: '3 人成团',
        detail: `额外 +$${Number(plan.group_buy_bonus_3 || 0)}`,
        value: formatSubscriptionQuotaAmount(
          baseQuota +
            parseSubscriptionQuotaUSDToUnits(plan.group_buy_bonus_3 || 0)
        ),
      },
      {
        label: '5 人成团',
        detail: `额外 +$${Number(plan.group_buy_bonus_5 || 0)}`,
        value: formatSubscriptionQuotaAmount(
          baseQuota +
            parseSubscriptionQuotaUSDToUnits(plan.group_buy_bonus_5 || 0)
        ),
      }
    )
  }

  return tiers
}

function InfoTile(props: { label: string; value: string }) {
  return (
    <div className='border-border/70 bg-muted/25 rounded-2xl border px-3 py-2.5'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='text-foreground mt-1 text-sm font-semibold'>
        {props.value}
      </div>
    </div>
  )
}

function TierRow(props: { label: string; detail: string; value: string }) {
  return (
    <div className='flex items-center justify-between gap-3 px-3 py-2.5'>
      <div className='min-w-0'>
        <div className='text-foreground text-sm font-medium'>{props.label}</div>
        <div className='text-muted-foreground mt-0.5 text-xs'>
          {props.detail}
        </div>
      </div>
      <div className='text-foreground shrink-0 text-sm font-semibold tabular-nums'>
        {props.value}
      </div>
    </div>
  )
}
