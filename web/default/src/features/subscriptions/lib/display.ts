import type { TFunction } from 'i18next'
import { getCurrencyDisplay } from '@/lib/currency'
import { formatDuration, formatResetPeriod } from './format'
import type { SubscriptionPlan } from '../types'

const DAY_PASS_KEYWORDS = ['day pass', '日卡']
const DEFAULT_QUOTA_PER_UNIT = 500000

const PLAN_DISCOUNT_TEXT_MAP: Array<{
  match: (title: string) => boolean
  text: string
}> = [
  { match: (title) => title.includes('lite'), text: '比官方 Plus 优惠约 89.7%' },
  {
    match: (title) => title.includes('standard'),
    text: '比官方 Plus 优惠约 90.8%',
  },
  { match: (title) => title.includes('pro'), text: '比官方 Plus 优惠约 93.0%' },
  { match: (title) => title.includes('ultra'), text: '比官方 Plus 优惠约 94.5%' },
  {
    match: (title) =>
      (title.includes('50') && title.includes('日卡')) ||
      title.includes('day pass 50'),
    text: '比官方 Plus 优惠约 87.7%',
  },
  {
    match: (title) =>
      (title.includes('100') && title.includes('日卡')) ||
      title.includes('day pass 100'),
    text: '比官方 Plus 优惠约 87.7%',
  },
]

function trimText(value?: string | null): string {
  // Strip NUL bytes that can leak in from upstream payloads before trimming.
  // eslint-disable-next-line no-control-regex
  return String(value || '').replace(/\u0000/g, '').trim()
}

function formatNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs === 0) return '0'
  if (abs >= 100) {
    return value.toFixed(Number.isInteger(value) ? 0 : 2).replace(/\.00$/, '')
  }
  if (abs >= 1) {
    return value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  }
  if (abs >= 0.01) {
    return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')
  }
  return value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

function getSubscriptionQuotaPerUnit(): number {
  const quotaPerUnit = Number(getCurrencyDisplay().config.quotaPerUnit || 0)
  return quotaPerUnit > 0 ? quotaPerUnit : DEFAULT_QUOTA_PER_UNIT
}

export function subscriptionQuotaUnitsToUSD(amount?: number | null): number {
  return Number(amount || 0) / getSubscriptionQuotaPerUnit()
}

export function parseSubscriptionQuotaUSDToUnits(
  amount?: number | string | null
): number {
  const numericAmount = Number(amount || 0)
  if (!Number.isFinite(numericAmount)) return 0
  return Math.round(numericAmount * getSubscriptionQuotaPerUnit())
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

export function isMonthlyCardPlan(
  plan?: Partial<SubscriptionPlan> | null
): boolean {
  if (!plan || isDayPassPlan(plan)) return false
  return plan.duration_unit === 'month'
}

export function getSubscriptionCurrencyLabel(currency?: string | null): string {
  const normalized = trimText(currency).toUpperCase()
  switch (normalized) {
    case 'CNY':
    case 'RMB':
      return '¥'
    case 'EUR':
      return 'EUR '
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
  const usdAmount = subscriptionQuotaUnitsToUSD(amount)
  return `$${formatNumber(usdAmount)}`
}

export function getSubscriptionPlanSubtitle(
  plan?: Partial<SubscriptionPlan> | null
): string {
  const subtitle = normalizeSubscriptionText(plan?.subtitle)
  if (subtitle) return subtitle
  return isDayPassPlan(plan) ? '日卡' : '月卡'
}

export function getSubscriptionPlanDiscountText(
  plan?: Partial<SubscriptionPlan> | null
): string {
  const title = normalizeSubscriptionText(plan?.title).toLowerCase()
  const matched = PLAN_DISCOUNT_TEXT_MAP.find((item) => item.match(title))
  return matched?.text || ''
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
  t: TFunction
): string {
  if (isDayPassPlan(plan)) {
    const totalText =
      totalAmount > 0 ? formatSubscriptionQuotaAmount(totalAmount) : '不限'
    return `有效期 ${formatDuration(plan, t)}，总额度 ${totalText}，日卡额度独立结算，扣费时默认优先于月卡。`
  }

  if (isMonthlyCardPlan(plan)) {
    const totalText =
      totalAmount > 0 ? formatSubscriptionQuotaAmount(totalAmount) : '不限'
    return `有效期 ${formatDuration(plan, t)}，本月可用额度 ${totalText}，一个月内可自由使用，用完或到期后结束。`
  }

  if (periodAmount > 0) {
    const totalText =
      totalAmount > 0 ? formatSubscriptionQuotaAmount(totalAmount) : '不限'
    return `额度按周期刷新，周期额度 ${formatSubscriptionQuotaAmount(periodAmount)}，总额度 ${totalText}。`
  }

  if (totalAmount > 0) {
    return `有效期 ${formatDuration(plan, t)}，总额度 ${formatSubscriptionQuotaAmount(totalAmount)}。`
  }

  return `有效期 ${formatDuration(plan, t)}，总额度不限。`
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
    detailParts.push(
      totalAmount > 0
        ? `总额度 ${formatSubscriptionQuotaAmount(totalAmount)}`
        : '总额度不限'
    )
    detailParts.push('日卡额度独立结算，扣费时默认优先于月卡')
    return detailParts.join('；')
  }

  if (isMonthlyCardPlan(plan)) {
    if (totalAmount > 0) {
      detailParts.push(`本月可用额度 ${formatSubscriptionQuotaAmount(totalAmount)}`)
    } else {
      detailParts.push('本月可用额度不限')
    }
    detailParts.push('月卡不设置周刷新或周期额度')
    detailParts.push('适合持续使用 Code Go 与相关模型')
    return detailParts.join('；')
  }

  if (resetLabel !== t('No Reset')) {
    detailParts.push(`额度重置 ${resetLabel}`)
  }
  if (periodAmount > 0) {
    detailParts.push(
      `${isMonthlyCardPlan(plan) ? '月度额度' : '周期额度'} ${formatSubscriptionQuotaAmount(periodAmount)}`
    )
  }
  if (totalAmount > 0) {
    detailParts.push(`总额度 ${formatSubscriptionQuotaAmount(totalAmount)}`)
  } else {
    detailParts.push('总额度不限')
  }
  detailParts.push('适合持续使用 Code Go 与相关模型')
  return detailParts.join('；')
}
