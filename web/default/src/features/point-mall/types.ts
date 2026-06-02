export type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type PointAccount = {
  id: number
  user_id: number
  balance: number
  frozen_balance: number
}

export type PointMallProduct = {
  id: number
  name: string
  type: 'jd_card' | 'blind_box_ticket' | 'subscription_plan' | string
  image_url: string
  description: string
  points_price: number
  face_value: number
  blind_box_quantity: number
  subscription_plan_id: number
  virtual_stock: number
  daily_limit_per_user: number
  monthly_limit_per_user: number
  total_limit: number
  status: 'on' | 'off' | string
  sort_order: number
  stock_remaining: number
  redeemed_today?: number
  redeemed_month?: number
}

export type PointMallOrder = {
  id: number
  user_id: number
  product_id: number
  product_name: string
  product_type: string
  points_cost: number
  status: string
  delivery_content: string
  card_secret_id: number
  user_subscription_id: number
  failure_reason: string
  created_at: number
  completed_at: number
}

export type PointLedger = {
  id: number
  type: string
  delta: number
  balance_after: number
  frozen_after: number
  source_type: string
  note: string
  created_at: number
}

export type PointMallOverview = {
  account: PointAccount
  available_bonus_quota: number
  convertible_bonus_quota: number
  convertible_points: number
  products: PointMallProduct[]
  recent_orders: PointMallOrder[]
  recent_ledgers: PointLedger[]
}

export type BonusQuotaConversionResult = {
  points_added: number
  bonus_quota_spent: number
  account: PointAccount
  available_bonus_quota: number
  monthly_converted_quota: number
}

export type PointMallCardSecret = {
  id: number
  product_id: number
  status: string
  order_id: number
  user_id: number
  issued_at: number
  created_at: number
  card_secret?: string
}

export type PointMallAdminAccount = {
  user_id: number
  username: string
  display_name: string
  balance: number
  frozen_balance: number
  total_earned: number
  total_spent: number
  updated_at: number
}

export type PointMallAdminLedger = {
  id: number
  user_id: number
  username: string
  display_name: string
  type: string
  delta: number
  balance_after: number
  frozen_after: number
  source_type: string
  note: string
  created_at: number
}

export type PointMallAdminPointsOverview = {
  accounts: PointMallAdminAccount[]
  recent_ledgers: PointMallAdminLedger[]
}

export type PointMallRules = {
  bonus_quota_per_point_usd: number
  monthly_bonus_convert_limit_usd: number
  package_purchase_points: Record<string, number>
  jd_card_daily_limit: number
  jd_card_monthly_face_limit: number
  new_user_jd_card_lock_days?: number
}
