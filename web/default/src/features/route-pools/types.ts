export type RoutePoolMember = {
  channel_id: number
  cost_multiplier: number
  model_cost_overrides: string
  enabled: boolean
}

export type RoutePool = {
  id: number
  name: string
  group: string
  enabled: boolean
}

export type RoutePoolDetail = {
  pool: RoutePool
  members: RoutePoolMember[]
}

export type FundingPolicy = {
  source: 'topup' | 'blind_box' | 'subscription'
  revenue_multiplier: number
}

export type RoutePoolMetrics = {
  members: Array<{
    channel_id: number
    channel_name: string
    eligible: boolean
    score: number
    health: {
      state: string
      success_rate_5m: number
      ttft_p50_ms: number
      ttft_p95_ms: number
      cooling_until?: string
    }
  }>
}

export type RoutePoolDraft = RoutePool & { members: RoutePoolMember[] }

export const createBlankRoutePoolDraft = (): RoutePoolDraft => ({
  id: 0,
  name: '',
  group: '',
  enabled: true,
  members: [],
})
