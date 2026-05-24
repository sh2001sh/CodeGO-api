export interface GeneMapModelSlice {
  model: string
  requests: number
  quota: number
  token_used: number
  share: number
}

export interface GeneMapTimeBand {
  key: string
  label: string
  start_hour: number
  end_hour: number
  requests: number
  active_share: number
  weight: number
  is_peak: boolean
}

export interface GeneMapRareModel {
  model: string
  requests: number
  badge: string
}

export interface GeneMapSnapshot {
  generated_at: number
  window_days: number
  owner_label: string
  archetype: string
  tagline: string
  share_caption: string
  dominant_model: string
  total_requests: number
  total_quota: number
  total_tokens: number
  models: GeneMapModelSlice[]
  time_bands: GeneMapTimeBand[]
  rare_models: GeneMapRareModel[]
}

export interface GeneMapSharePayload {
  token: string
  share_url: string
  share_text: string
  snapshot: GeneMapSnapshot
  rewarded: boolean
  reward_usd: number
  owner_label: string
}

export interface GeneMapPublicShare {
  token: string
  headline: string
  share_text: string
  snapshot: GeneMapSnapshot
}

export interface GeneMapComparison {
  token: string
  headline: string
  owner: GeneMapSnapshot
  viewer: GeneMapSnapshot
  shared_models: string[]
  viewer_is_owner: boolean
  call_to_action: string
}

export interface GeneMapApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}
