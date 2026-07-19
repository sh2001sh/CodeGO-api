import type { SubscriptionPlan } from '../types'

export interface RenewalBonusTier {
  purchaseNumber: number
  rate: number
  bonusQuota: number
}

export function getRenewalBonusTiers(
  plan: Pick<
    SubscriptionPlan,
    | 'plan_type'
    | 'total_amount'
    | 'renewal_bonus_2'
    | 'renewal_bonus_3'
    | 'renewal_bonus_4'
  >
): RenewalBonusTier[] {
  if (plan.plan_type !== 'monthly') return []

  const baseQuota = Number(plan.total_amount || 0)
  const tierRates = [
    Number(plan.renewal_bonus_2 || 0),
    Number(plan.renewal_bonus_3 || 0),
    Number(plan.renewal_bonus_4 || 0),
  ]

  return tierRates.flatMap((rate, index) => {
    if (rate <= 0 || baseQuota <= 0) return []
    return [
      {
        purchaseNumber: index + 2,
        rate,
        bonusQuota: Math.round(baseQuota * rate),
      },
    ]
  })
}

export function formatRenewalBonusRate(rate: number): string {
  return `${Math.round(rate * 10_000) / 100}%`
}
