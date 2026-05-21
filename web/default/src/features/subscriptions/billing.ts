import type { FundingSource } from './types'

type Translate = (key: string, options?: Record<string, unknown>) => string

export type BillingPreference =
  | 'subscription_first'
  | 'wallet_first'
  | 'subscription_only'
  | 'wallet_only'

export function normalizeBillingPreference(value?: string): BillingPreference {
  switch (value) {
    case 'wallet_first':
    case 'subscription_only':
    case 'wallet_only':
    case 'subscription_first':
      return value
    default:
      return 'subscription_first'
  }
}

export function getDefaultFundingSourceOrder(
  preference?: string
): FundingSource[] {
  switch (normalizeBillingPreference(preference)) {
    case 'wallet_first':
      return ['blind_box', 'wallet', 'subscription']
    case 'subscription_only':
      return ['blind_box', 'subscription']
    case 'wallet_only':
      return ['blind_box', 'wallet']
    case 'subscription_first':
    default:
      return ['blind_box', 'subscription', 'wallet']
  }
}

export function normalizeFundingSourceOrder(
  order?: string[] | null,
  preference?: string
): FundingSource[] {
  const fallback = getDefaultFundingSourceOrder(preference)
  if (!order?.length) {
    return [...fallback]
  }

  const validSources = new Set<FundingSource>([
    'blind_box',
    'subscription',
    'wallet',
  ])
  const result: FundingSource[] = []
  for (const item of order) {
    if (!validSources.has(item as FundingSource)) {
      continue
    }
    const source = item as FundingSource
    if (!result.includes(source)) {
      result.push(source)
    }
  }
  if (!result.length) {
    return [...fallback]
  }
  if (!result.includes('blind_box')) {
    result.unshift('blind_box')
  }
  if (!result.some((item) => item === 'subscription' || item === 'wallet')) {
    return [...fallback]
  }
  return result
}

export function getBillingPreferenceFromFundingSourceOrder(
  order: FundingSource[]
): BillingPreference {
  const subscriptionIndex = order.indexOf('subscription')
  const walletIndex = order.indexOf('wallet')

  if (subscriptionIndex >= 0 && walletIndex >= 0) {
    return subscriptionIndex < walletIndex
      ? 'subscription_first'
      : 'wallet_first'
  }
  if (subscriptionIndex >= 0) {
    return 'subscription_only'
  }
  if (walletIndex >= 0) {
    return 'wallet_only'
  }
  return 'subscription_first'
}

export function getFundingSourceLabel(
  source: FundingSource,
  _t: Translate
): string {
  switch (source) {
    case 'blind_box':
      return '盲盒额度'
    case 'subscription':
      return '订阅额度'
    case 'wallet':
      return '钱包余额'
    default:
      return source
  }
}

export function getFundingSourceDescription(
  source: FundingSource,
  _t: Translate
): string {
  switch (source) {
    case 'blind_box':
      return '开盲盒获得的临时额度'
    case 'subscription':
      return '按订阅顺序逐个消耗的套餐额度'
    case 'wallet':
      return '账户当前可用的钱包余额'
    default:
      return ''
  }
}
