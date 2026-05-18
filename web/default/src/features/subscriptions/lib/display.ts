/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { formatQuota } from '@/lib/format'
import type { PlanRecord, SubscriptionPlan } from '../types'
import { formatDuration } from './format'

export function getSubscriptionCurrencyLabel(currency?: string): string {
  const normalized = (currency || '').toUpperCase()
  if (normalized === 'CNY') return '\u5143'
  if (normalized === 'EUR') return 'EUR '
  return '$'
}

export function formatSubscriptionPlanPrice(
  priceAmount: number,
  currency?: string
): string {
  const normalized = (currency || '').toUpperCase()
  const formatted = Number(priceAmount || 0)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')

  if (normalized === 'CNY') return `${formatted} \u5143`
  return `${getSubscriptionCurrencyLabel(currency)}${formatted}`
}

export function isDayPassPlan(
  plan: Partial<SubscriptionPlan> | null | undefined
): boolean {
  const durationCount = Number(plan?.duration_value || 0)
  const durationUnit = String(plan?.duration_unit || '').toLowerCase()
  return durationUnit === 'day' && durationCount > 0 && durationCount <= 2
}

export function getSubscriptionPlanSubtitle(
  plan: Partial<SubscriptionPlan> | null | undefined
): string {
  const subtitle = String(plan?.subtitle || '').trim()
  if (subtitle) return subtitle
  return isDayPassPlan(plan) ? '\u65e5\u5361' : '\u6708\u5361'
}

export function getSubscriptionPlanActionLabel(
  action: PlanRecord['action'] | undefined,
  t: (key: string) => string
): string {
  switch (action) {
    case 'renew':
      return '\u7eed\u8d39'
    case 'upgrade':
      return '\u5347\u7ea7'
    case 'disabled':
      return '\u4e0d\u53ef\u8ba2\u9605'
    default:
      return t('Subscribe Now')
  }
}

export function getSubscriptionPlanDetailText(
  plan: Partial<SubscriptionPlan> | null | undefined,
  totalAmount: number,
  periodAmount: number,
  t: (key: string) => string
): string {
  if (!plan) return ''
  const periodLabel =
    plan.quota_reset_period === 'weekly'
      ? '\u6bcf\u5468\u989d\u5ea6'
      : '\u5468\u671f\u989d\u5ea6'
  const totalLabel = totalAmount > 0 ? formatQuota(totalAmount) : '\u4e0d\u9650'
  const parts = [
    `\u6709\u6548\u671f ${formatDuration(plan, t)}`,
    periodAmount > 0 ? `${periodLabel} ${formatQuota(periodAmount)}` : null,
    `\u603b\u989d\u5ea6 ${totalLabel}`,
  ]
  return parts.filter(Boolean).join('\uFF1B')
}

export function getSubscriptionPlanDescription(
  plan: Partial<SubscriptionPlan> | null | undefined,
  totalAmount: number,
  periodAmount: number,
  t: (key: string) => string
): string {
  if (!plan) return ''
  const parts = [getSubscriptionPlanSubtitle(plan)]
  if (periodAmount > 0) {
    parts.push(`${t('Weekly Quota')}: ${formatQuota(periodAmount)}`)
  }
  parts.push(
    totalAmount > 0
      ? `${t('Total Quota')}: ${formatQuota(totalAmount)}`
      : `${t('Total Quota')}: ${t('Unlimited')}`
  )
  return parts.join(' · ')
}
