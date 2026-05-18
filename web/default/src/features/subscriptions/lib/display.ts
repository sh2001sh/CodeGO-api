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
import type { TFunction } from 'i18next'
import { formatDuration, formatResetPeriod } from './format'
import type { SubscriptionPlan } from '../types'

const DAY_PASS_KEYWORDS = ['day pass', '日卡']

function trimText(value?: string | null): string {
  return String(value || '').replace(/\u0000/g, '').trim()
}

function formatNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs === 0) return '0'
  if (abs >= 100) return value.toFixed(Number.isInteger(value) ? 0 : 2).replace(/\.00$/, '')
  if (abs >= 1) return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  if (abs >= 0.01) return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

export function normalizeSubscriptionText(value?: string | null): string {
  return trimText(value)
}

export function isDayPassPlan(plan?: Partial<SubscriptionPlan> | null): boolean {
  if (!plan) return false
  if (plan.duration_unit === 'day' && Number(plan.duration_value || 0) <= 2) {
    return true
  }
  const title = normalizeSubscriptionText(plan.title).toLowerCase()
  return DAY_PASS_KEYWORDS.some((keyword) => title.includes(keyword))
}

export function getSubscriptionCurrencyLabel(
  currency?: string | null
): string {
  const normalized = trimText(currency).toUpperCase()
  switch (normalized) {
    case 'CNY':
    case 'RMB':
      return '¥'
    case 'USD':
    default:
      return '$'
  }
}

export function formatSubscriptionPlanPrice(
  amount?: number | null,
  currency?: string | null
): string {
  const value = Number(amount || 0)
  return `${getSubscriptionCurrencyLabel(currency)}${formatNumber(value)}`
}

export function formatSubscriptionQuotaAmount(amount?: number | null): string {
  return `$${formatNumber(Number(amount || 0))}`
}

export function getSubscriptionPlanSubtitle(
  plan?: Partial<SubscriptionPlan> | null
): string {
  const subtitle = normalizeSubscriptionText(plan?.subtitle)
  if (subtitle) return subtitle
  return isDayPassPlan(plan) ? '日卡' : '月卡'
}

export function getSubscriptionPlanActionLabel(
  action: string | undefined,
  t: TFunction
): string {
  switch (action) {
    case 'renew':
      return '立即续费'
    case 'upgrade':
      return '立即升级'
    case 'disabled':
      return '当前不可订阅'
    case 'subscribe':
      return '立即订阅'
    default:
      return t('Subscribe')
  }
}

export function getSubscriptionPlanDescription(
  plan: Partial<SubscriptionPlan>,
  totalAmount: number,
  periodAmount: number,
  _t: TFunction
): string {
  if (isDayPassPlan(plan)) {
    return `有效期 ${formatDuration(plan, _t)}；总额度 ${formatSubscriptionQuotaAmount(totalAmount)}；日卡额度独立结算，优先于月卡消耗。`
  }
  if (periodAmount > 0) {
    return `额度每周更新一次，周额度 ${formatSubscriptionQuotaAmount(periodAmount)}，总额度 ${formatSubscriptionQuotaAmount(totalAmount)}。`
  }
  if (totalAmount > 0) {
    return `有效期 ${formatDuration(plan, _t)}；总额度 ${formatSubscriptionQuotaAmount(totalAmount)}。`
  }
  return `有效期 ${formatDuration(plan, _t)}；总额度不限。`
}

export function getSubscriptionPlanDetailText(
  plan: Partial<SubscriptionPlan>,
  totalAmount: number,
  periodAmount: number,
  t: TFunction
): string {
  const detailParts = [`有效期 ${formatDuration(plan, t)}`]
  const resetLabel = formatResetPeriod(plan, t)

  if (isDayPassPlan(plan)) {
    if (totalAmount > 0) {
      detailParts.push(`总额度 ${formatSubscriptionQuotaAmount(totalAmount)}`)
    } else {
      detailParts.push('总额度不限')
    }
    detailParts.push('日卡额度独立结算，扣费时默认优先于月卡')
    return detailParts.join('；')
  }

  if (resetLabel !== t('No Reset')) {
    detailParts.push(`额度重置 ${resetLabel}`)
  }
  if (periodAmount > 0) {
    detailParts.push(`每周额度 ${formatSubscriptionQuotaAmount(periodAmount)}`)
  }
  if (totalAmount > 0) {
    detailParts.push(`总额度 ${formatSubscriptionQuotaAmount(totalAmount)}`)
  } else {
    detailParts.push('总额度不限')
  }
  detailParts.push('适合持续使用 Codex 与相关模型')
  return detailParts.join('；')
}
