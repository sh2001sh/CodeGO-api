import type { LucideIcon } from 'lucide-react'

export type DashboardActionPath =
  | '/keys'
  | '/wallet'
  | '/playground'
  | '/channels'
  | '/usage-logs'
  | '/pricing'

export interface StartStep {
  title: string
  description: string
  to: DashboardActionPath
  icon: LucideIcon
  completed: boolean
}

export interface QuickAction {
  title: string
  description: string
  to: DashboardActionPath
  icon: LucideIcon
  adminOnly?: boolean
}

export interface RequestExample {
  endpoint: string
  openaiEndpoint: string
  anthropicEndpoint: string
  model: string
  keyName: string
  displayKey: string
  curl: string
  ready: boolean
}

export interface HeroSignal {
  label: string
  value: string
  icon: LucideIcon
}
