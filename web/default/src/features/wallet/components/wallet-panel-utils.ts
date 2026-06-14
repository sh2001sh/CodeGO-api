import { isMonthlyCardPlan } from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'

export interface WalletPlanMeta {
  title: string
  subtitle: string
  plan: PlanRecord['plan']
}

export function formatWalletDateTime(timestamp?: number): string {
  if (!timestamp) return '--'
  return new Date(timestamp * 1000).toLocaleString()
}

export function getWalletRemainingDays(timestamp?: number): number {
  if (!timestamp) return 0
  const now = Date.now() / 1000
  return Math.max(0, Math.ceil((timestamp - now) / 86400))
}

export function getOrderedSubscriptions(
  subscriptions: UserSubscriptionRecord[],
  orderIds: number[]
): UserSubscriptionRecord[] {
  if (subscriptions.length === 0) return []
  const byId = new Map(
    subscriptions.map((record) => [record.subscription.id, record] as const)
  )
  const ordered: UserSubscriptionRecord[] = []

  for (const id of orderIds) {
    const record = byId.get(id)
    if (record) {
      ordered.push(record)
      byId.delete(id)
    }
  }

  for (const record of subscriptions) {
    if (byId.has(record.subscription.id)) {
      ordered.push(record)
      byId.delete(record.subscription.id)
    }
  }

  return ordered
}

export function getSubscriptionUsageStatus(
  record: UserSubscriptionRecord,
  plan?: PlanRecord['plan']
): {
  label: string
  note: string | null
} {
  const subscription = record.subscription
  const active =
    subscription.status === 'active' &&
    Number(subscription.end_time || 0) > Date.now() / 1000

  if (!active) {
    return {
      label: subscription.status === 'cancelled' ? '已取消' : '已过期',
      note: null,
    }
  }

  const totalAmount = Number(subscription.amount_total || 0)
  const usedAmount = Number(subscription.amount_used || 0)
  const totalRemain =
    totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
  const periodAmount = Number(subscription.period_amount || 0)
  const periodUsed = Number(subscription.period_used || 0)
  const periodRemain =
    periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0
  const isMonthlyPlan = isMonthlyCardPlan(plan)

  if (totalAmount > 0 && totalRemain <= 0) {
    return {
      label: '已耗尽',
      note: '总额度用完后，系统会自动跳过这份订阅。',
    }
  }

  if (!isMonthlyPlan && periodAmount > 0 && periodRemain <= 0) {
    return {
      label: '待重置',
      note: '本期额度已用完，重置后会继续参与扣费。',
    }
  }

  return { label: '可用', note: null }
}
