import { Repeat2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  formatSubscriptionQuotaAmount,
  getRenewalBonusTiers,
  formatRenewalBonusRate,
} from '@/features/subscriptions/lib'
import type {
  RenewalBonusPreview,
  SubscriptionPlan,
} from '@/features/subscriptions/types'

type RenewalBonusSummaryProps = {
  plan: SubscriptionPlan
  preview?: RenewalBonusPreview
  variant?: 'compact' | 'detail'
  className?: string
}

export function RenewalBonusSummary({
  plan,
  preview,
  variant = 'detail',
  className,
}: RenewalBonusSummaryProps) {
  const tiers = getRenewalBonusTiers(plan)
  if (tiers.length === 0) return null

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'border-border bg-muted/35 flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs',
          className
        )}
      >
        <Repeat2 className='text-primary mt-0.5 h-3.5 w-3.5 shrink-0' />
        <div className='min-w-0 leading-5'>
          <span className='text-foreground font-semibold'>续费奖励</span>
          <span className='text-muted-foreground ml-1'>
            {tiers
              .map((tier, index) =>
                index === tiers.length - 1
                  ? `第${tier.purchaseNumber}次起 +${formatRenewalBonusRate(tier.rate)}`
                  : `第${tier.purchaseNumber}次 +${formatRenewalBonusRate(tier.rate)}`
              )
              .join(' · ')}
          </span>
        </div>
      </div>
    )
  }

  const nextTier = preview?.bonus_rate
    ? {
        purchaseNumber: preview.next_purchase_number,
        rate: preview.bonus_rate,
        bonusQuota: preview.bonus_quota,
      }
    : null

  return (
    <section
      className={cn(
        'border-border bg-muted/35 rounded-md border p-3',
        className
      )}
      aria-label='续费奖励规则'
    >
      <div className='flex items-center gap-2'>
        <Repeat2 className='text-primary h-4 w-4' />
        <h4 className='text-foreground text-sm font-semibold'>续费奖励</h4>
      </div>
      <div className='mt-2 grid gap-1.5 sm:grid-cols-3'>
        {tiers.map((tier, index) => (
          <div
            key={tier.purchaseNumber}
            className='bg-card rounded-md px-2.5 py-2'
          >
            <div className='text-muted-foreground text-xs'>
              {index === tiers.length - 1
                ? `第${tier.purchaseNumber}次起`
                : `第${tier.purchaseNumber}次`}
            </div>
            <div className='text-foreground mt-0.5 text-sm font-semibold tabular-nums'>
              +{formatRenewalBonusRate(tier.rate)}
              <span className='text-muted-foreground ml-1 text-xs font-medium'>
                {formatSubscriptionQuotaAmount(tier.bonusQuota)}
              </span>
            </div>
          </div>
        ))}
      </div>
      {preview ? (
        <p className='text-muted-foreground mt-2 text-xs leading-5'>
          已完成 {preview.completed_purchase_count} 次成功购买。
          {preview.eligible && nextTier
            ? `本次续费将额外获得 ${formatSubscriptionQuotaAmount(nextTier.bonusQuota)}。`
            : nextTier
              ? `下次续费（第${nextTier.purchaseNumber}次）可额外获得 ${formatSubscriptionQuotaAmount(nextTier.bonusQuota)}。`
              : '完成下一次续费后将按对应档位发放奖励。'}
          奖励直接加入套餐额度，不计入钱包。
        </p>
      ) : (
        <p className='text-muted-foreground mt-2 text-xs leading-5'>
          成功续费后自动发放，奖励直接加入套餐额度，不计入钱包。
        </p>
      )}
    </section>
  )
}
