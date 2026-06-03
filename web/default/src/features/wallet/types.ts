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
// ============================================================================
// Wallet Type Definitions
// ============================================================================

/**
 * Generic API response
 */
export interface ApiResponse<T = unknown> {
  success?: boolean
  message?: string
  data?: T
}

export interface RedemptionResult {
  redeem_type: 'quota' | 'subscription' | 'blind_box' | string
  quota?: number
  plan_id?: number
  plan_title?: string
  blind_box_quantity?: number
  blind_box_order_id?: number
  user_subscription_id?: number
}

/**
 * Standard API response types
 */
export type TopupInfoResponse = ApiResponse<TopupInfo>
export type RedemptionResponse = ApiResponse<RedemptionResult>
export type AmountResponse = ApiResponse<string>
export type PaymentResponse = ApiResponse<Record<string, unknown>> & {
  url?: string
}
export type StripePaymentResponse = ApiResponse<{ pay_link: string }>
export type AffiliateCodeResponse = ApiResponse<string>
export type AffiliateTransferResponse = ApiResponse
export type AffiliateRewardsOverviewResponse = ApiResponse<AffiliateRewardsOverview>
export type CreemPaymentResponse = ApiResponse<{ checkout_url: string }>
export type WaffoPaymentResponse = ApiResponse<
  { payment_url?: string } | string
>
export type WaffoPancakePaymentResponse = ApiResponse<
  | {
      checkout_url?: string
      session_id?: string
      expires_at?: number | string
      order_id?: string
    }
  | string
>

/**
 * Creem product configuration
 */
export interface CreemProduct {
  /** Product display name */
  name: string
  /** Creem product ID */
  productId: string
  /** Product price */
  price: number
  /** Quota amount to credit */
  quota: number
  /** Currency (USD or EUR) */
  currency: 'USD' | 'EUR'
}

/**
 * Creem payment request
 */
export interface CreemPaymentRequest {
  /** Creem product ID */
  product_id: string
  /** Payment method identifier */
  payment_method: 'creem'
}

/**
 * Payment method configuration
 */
export interface PaymentMethod {
  /** Display name of payment method */
  name: string
  /** Payment method type identifier */
  type: string
  /** Optional color for UI display */
  color?: string
  /** Minimum topup amount for this payment method */
  min_topup?: number
  /** Optional icon URL provided by backend (preferred over built-in icons) */
  icon?: string
}

/**
 * Waffo payment method configuration
 */
export interface WaffoPayMethod {
  /** Display name of payment method */
  name: string
  /** Optional icon path */
  icon?: string
  /** Waffo pay method type */
  payMethodType?: string
  /** Waffo pay method name */
  payMethodName?: string
}

/**
 * Topup configuration information
 */
export interface TopupInfo {
  /** Whether online topup is enabled */
  enable_online_topup: boolean
  /** Whether Stripe topup is enabled */
  enable_stripe_topup: boolean
  /** Available payment methods */
  pay_methods: PaymentMethod[]
  /** Minimum topup amount for online topup */
  min_topup: number
  /** Minimum topup amount for Stripe */
  stripe_min_topup: number
  /** Preset amount options */
  amount_options: number[]
  /** Discount rates by amount */
  discount: Record<number, number>
  /** Optional topup link for purchasing codes */
  topup_link?: string
  /** Whether Creem topup is enabled */
  enable_creem_topup?: boolean
  /** Available Creem products */
  creem_products?: CreemProduct[]
  /** Whether Waffo topup is enabled */
  enable_waffo_topup?: boolean
  /** Available Waffo payment methods */
  waffo_pay_methods?: WaffoPayMethod[]
  /** Minimum topup amount for Waffo */
  waffo_min_topup?: number
  /** Whether Waffo Pancake topup is enabled */
  enable_waffo_pancake_topup?: boolean
  /** Minimum topup amount for Waffo Pancake */
  waffo_pancake_min_topup?: number
  /** Whether redemption code usage is enabled */
  enable_redemption?: boolean
  /** Whether compliance confirmation has been completed */
  payment_compliance_confirmed?: boolean
  /** Current compliance terms version */
  payment_compliance_terms_version?: string
}

/**
 * Preset amount option with optional discount
 */
export interface PresetAmount {
  /** Preset amount value */
  value: number
  /** Optional discount rate (0-1) */
  discount?: number
}

/**
 * Redemption code request
 */
export interface RedemptionRequest {
  /** Redemption code key */
  key: string
}

/**
 * Payment request parameters
 */
export interface PaymentRequest {
  /** Topup amount */
  amount: number
  /** Payment method identifier */
  payment_method: string
}

/**
 * Waffo payment request parameters
 */
export interface WaffoPaymentRequest {
  /** Topup amount */
  amount: number
  /** Optional server-side Waffo payment method index */
  pay_method_index?: number
}

/**
 * Waffo Pancake payment request parameters
 */
export interface WaffoPancakePaymentRequest {
  /** Topup amount */
  amount: number
}

/**
 * Amount calculation request
 */
export interface AmountRequest {
  /** Topup amount to calculate */
  amount: number
}

/**
 * Affiliate quota transfer request
 */
export interface AffiliateTransferRequest {
  /** Quota amount to transfer */
  quota: number
}

export interface AffiliateRewardRule {
  purchase_type: string
  purchase_label: string
  bonus_quota_amount: number
  bonus_quota_usd: number
}

export interface AffiliateInviteeRewardStatus {
  invitee_id: number
  invitee_username: string
  invitee_display_name?: string
  created_at: number
  first_call_completed: boolean
  first_call_rewarded_points: number
  first_topup_completed: boolean
  first_topup_rewarded_points: number
  first_purchase_completed: boolean
  first_purchase_type?: string
  first_purchase_label?: string
  first_purchase_reward_quota: number
  first_purchase_rewarded_at: number
}

export interface AffiliateRewardsOverview {
  affiliate_code: string
  invited_count: number
  referral_points_earned: number
  referral_points_pending: number
  referral_bonus_quota_earned: number
  legacy_affiliate_quota: number
  legacy_affiliate_quota_earned: number
  successful_purchase_invites: number
  rules: AffiliateRewardRule[]
  invitees: AffiliateInviteeRewardStatus[]
}

/**
 * User wallet data
 */
export interface UserWalletData {
  /** User ID */
  id: number
  /** Username */
  username: string
  /** Current quota balance */
  quota: number
  /** Total used quota */
  used_quota: number
  /** Total request count */
  request_count: number
  /** Affiliate quota (pending rewards) */
  aff_quota: number
  /** Total affiliate quota earned (historical) */
  aff_history_quota: number
  /** Number of successful affiliate invites */
  aff_count: number
  /** User group */
  group: string
}

/**
 * Topup record status
 */
export type TopupStatus = 'success' | 'pending' | 'expired'

/**
 * Topup billing record
 */
export interface TopupRecord {
  /** Record ID */
  id: number
  /** User ID */
  user_id: number
  /** Topup amount (quota) */
  amount: number
  /** Payment amount (actual money paid) */
  money: number
  /** Trade/order number */
  trade_no: string
  /** Payment method type */
  payment_method: string
  /** Creation timestamp */
  create_time: number
  /** Completion timestamp */
  complete_time?: number
  /** Payment status */
  status: TopupStatus
}

/**
 * Billing history response
 */
export interface BillingHistoryResponse {
  items: TopupRecord[]
  total: number
}

/**
 * Complete order request (admin only)
 */
export interface CompleteOrderRequest {
  trade_no: string
}

export interface BlindBoxTier {
  name: string
  min_usd: number
  max_usd: number
  probability: number
}

export interface BlindBoxCredit {
  id: number
  remaining_amount: number
  original_amount: number
  reward_usd: number
  expires_at: number
  status: string
}

export interface BlindBoxRecord {
  id: number
  reward_type: 'quota' | 'subscription' | string
  reward_usd: number
  credit_amount: number
  reward_title: string
  reward_tier: string
  user_subscription_id?: number
  is_pity?: boolean
  create_time: number
}

export interface BlindBoxOverview {
  available_boxes: number
  pending_boxes: number
  active_credit_count: number
  remaining_quota: number
  next_expire_at: number
  pity_progress: number
  pity_threshold: number
  effective_pity_threshold: number
  purchased_today: number
  purchased_this_month: number
  recent_records: BlindBoxRecord[]
  active_credits: BlindBoxCredit[]
}

export interface BlindBoxSelfData {
  enabled: boolean
  unit_price: number
  expire_days: number
  daily_limit: number
  monthly_limit: number
  daily_open_limit: number
  first_purchase_guarantee_usd: number
  first_purchase_guarantee_eligible: boolean
  count_options: number[]
  tiers: BlindBoxTier[]
  subscription_prize_probability: number
  subscription_plan_title: string
  pity_threshold: number
  pity_guarantee_usd: number
  low_reward_threshold_usd: number
  pay_methods: PaymentMethod[]
  overview: BlindBoxOverview
}

export interface BlindBoxOrderStatus {
  trade_no: string
  status: 'pending' | 'success' | 'expired' | string
  quantity: number
  opened_count: number
  money: number
  payment_method?: string
  payment_provider?: string
  create_time?: number
  complete_time?: number
}

export type BlindBoxSelfResponse = ApiResponse<BlindBoxSelfData>
export type BlindBoxOpenResponse = ApiResponse<{
  records: BlindBoxRecord[]
  overview: BlindBoxOverview
  open_count: number
}>
export type BlindBoxOrderStatusResponse = ApiResponse<BlindBoxOrderStatus>

export interface BlindBoxAmountRequest {
  quantity: number
}

export interface BlindBoxPayRequest {
  quantity: number
  payment_method: string
}

export interface BlindBoxOpenRequest {
  count: number
}
