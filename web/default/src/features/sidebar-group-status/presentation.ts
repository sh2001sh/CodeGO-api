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
import type {
  SidebarGroupAvailabilityStatus,
  SidebarGroupStatusBucket,
  SidebarGroupModelStatusItem,
  SidebarGroupStatusItem,
} from './types'

type StatusMeta = {
  label: string
  accent: string
  accentText: string
  dot: string
  border: string
}

const STATUS_META: Record<SidebarGroupAvailabilityStatus, StatusMeta> = {
  degraded: {
    label: '异常',
    accent: 'bg-rose-500',
    accentText: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.12)]',
    border: 'border-rose-500/30',
  },
  unknown: {
    label: '观测中',
    accent: 'bg-slate-500',
    accentText: 'text-slate-700 dark:text-slate-300',
    dot: 'bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,0.16)]',
    border: 'border-slate-500/25',
  },
  healthy: {
    label: '正常',
    accent: 'bg-emerald-500',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]',
    border: 'border-emerald-500/30',
  },
}

export function getStatusMeta(status: SidebarGroupAvailabilityStatus) {
  return STATUS_META[status]
}

export function sortItems(items: SidebarGroupStatusItem[]) {
  return [...items]
    .map((item) => ({
      ...item,
      models: sortModels(item.models),
    }))
    .sort((a, b) => a.group.localeCompare(b.group, 'zh-CN'))
    .sort((a, b) => {
      const left = a.request_count ?? sumModelRequests(a.models)
      const right = b.request_count ?? sumModelRequests(b.models)
      if (left === right) return a.group.localeCompare(b.group, 'zh-CN')
      return right - left
    })
}

function sortModels(models: SidebarGroupModelStatusItem[]) {
  const weight: Record<SidebarGroupAvailabilityStatus, number> = {
    degraded: 0,
    unknown: 1,
    healthy: 2,
  }

  return [...models].sort((a, b) => {
    const requestDiff = (b.request_count ?? 0) - (a.request_count ?? 0)
    if (requestDiff !== 0) return requestDiff
    const statusDiff = weight[a.status] - weight[b.status]
    if (statusDiff !== 0) return statusDiff
    return a.model.localeCompare(b.model, 'en')
  })
}

export function buildHealthSegments(item: SidebarGroupModelStatusItem) {
  const series = item.series ?? []
  if (series.length === 0) {
    return buildFallbackSegments(item)
  }

  return series.map((bucket) => ({
    bucket,
    tone: bucketTone(bucket),
  }))
}

export function summarizeGroups(items: SidebarGroupStatusItem[]) {
  const models = items.flatMap((item) => item.models)
  return {
    groups: items.length,
    models: models.length,
    healthyModels: models.filter((item) => item.status === 'healthy').length,
    degradedModels: models.filter((item) => item.status === 'degraded').length,
    unknownModels: models.filter((item) => item.status === 'unknown').length,
    sampleWindow: models[0]?.sample_window ?? null,
  }
}

function bucketTone(bucket: SidebarGroupStatusBucket) {
  if (bucket.request_count <= 0 || bucket.success_rate == null) {
    return 'unknown' as const
  }
  if (bucket.success_rate >= 99.5) {
    return 'healthy' as const
  }
  if (bucket.success_rate >= 95) {
    return 'warning' as const
  }
  return 'critical' as const
}

export function formatSampleWindowLabel(hours: number | null) {
  if (hours == null || hours <= 0) return '暂无采样窗口'
  const minutes = Math.round(hours * 60)
  if (minutes < 60) return `最近 ${minutes} 分钟`
  if (minutes % 60 === 0) return `最近 ${minutes / 60} 小时`
  return `最近 ${minutes} 分钟`
}

function buildFallbackSegments(item: SidebarGroupModelStatusItem) {
  const total = 20
  const successRate = item.success_rate
  const bucketSeconds =
    item.bucket_seconds ?? inferBucketSeconds(item.series_window ?? item.sample_window, total)
  const endTs = Math.floor(Date.now() / 1000)
  const startTs = endTs - bucketSeconds * total

  return Array.from({ length: total }, (_, index) => {
    const bucket = {
      ts: startTs + index * bucketSeconds,
      request_count: successRate == null ? 0 : 1,
      success_rate: successRate,
    }

    if (successRate == null) {
      return { bucket, tone: 'unknown' as const }
    }
    if (successRate >= 99.5) {
      return { bucket, tone: 'healthy' as const }
    }
    if (successRate >= 95) {
      return { bucket, tone: 'warning' as const }
    }
    return { bucket, tone: 'critical' as const }
  })
}

function inferBucketSeconds(sampleWindowHours: number, total: number) {
  const totalSeconds = Math.max(1, Math.round(sampleWindowHours * 3600))
  return Math.max(60, Math.round(totalSeconds / total))
}

function sumModelRequests(models: SidebarGroupModelStatusItem[]) {
  return models.reduce((sum, model) => sum + (model.request_count ?? 0), 0)
}
