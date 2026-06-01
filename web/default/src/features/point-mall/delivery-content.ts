import type { PointMallOrder } from './types'

export type BlindBoxRecord = {
  reward_title?: string
  reward_usd?: number
  reward_type?: string
}

export type DeliveryContent = {
  card_no?: string
  card_secret?: string
  blind_box_quantity?: number
  blind_box_records?: BlindBoxRecord[]
  reward_summary?: string
  subscription_plan_title?: string
  start_time?: number
  end_time?: number
}

export function parseDeliveryContent(order?: PointMallOrder | null) {
  if (!order?.delivery_content) return null
  try {
    return JSON.parse(order.delivery_content) as DeliveryContent
  } catch {
    return null
  }
}

export function formatTime(value?: number) {
  if (!value) return '-'
  return new Date(value * 1000).toLocaleString()
}

export function formatDeliverySummary(order: PointMallOrder) {
  const content = parseDeliveryContent(order)
  if (order.product_type === 'jd_card') {
    return content?.card_secret
      ? `${content.card_no || '-'} / ${content.card_secret}`
      : '兑换成功，请在兑换记录中查看卡密'
  }
  if (order.product_type === 'blind_box_ticket') {
    return content?.reward_summary || '盲盒已开启'
  }
  if (order.product_type === 'subscription_plan') {
    return `${content?.subscription_plan_title || order.product_name}：${formatTime(
      content?.start_time
    )} - ${formatTime(content?.end_time)}`
  }
  return order.delivery_content || '-'
}

export function redeemSuccessMessage(order: PointMallOrder) {
  if (order.product_type === 'jd_card') {
    return '兑换成功，请在兑换记录中查看卡密'
  }
  if (order.product_type === 'blind_box_ticket') {
    return `盲盒已开启：${formatDeliverySummary(order)}`
  }
  if (order.product_type === 'subscription_plan') {
    return `月卡已兑换：${formatDeliverySummary(order)}`
  }
  return '兑换成功'
}
