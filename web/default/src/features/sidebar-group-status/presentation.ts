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
}

function sortModels(models: SidebarGroupModelStatusItem[]) {
  const weight: Record<SidebarGroupAvailabilityStatus, number> = {
    degraded: 0,
    unknown: 1,
    healthy: 2,
  }

  return [...models].sort((a, b) => {
    const statusDiff = weight[a.status] - weight[b.status]
    if (statusDiff !== 0) return statusDiff
    return a.model.localeCompare(b.model, 'en')
  })
}

export function buildHealthSegments(item: SidebarGroupModelStatusItem) {
  const total = 20
  const successRate = item.success_rate

  if (successRate == null) {
    return Array.from({ length: total }, () => 'unknown' as const)
  }

  const filled = Math.max(
    0,
    Math.min(total, Math.round((successRate / 100) * total))
  )

  return Array.from({ length: total }, (_, index) => {
    if (index < filled) {
      if (successRate < 90 && index >= Math.max(0, filled - 2)) {
        return 'warning' as const
      }
      return 'healthy' as const
    }

    if (item.status === 'healthy') return 'muted' as const
    if (item.status === 'unknown') return 'unknown' as const
    if (successRate >= 85 && index < filled + 2) return 'warning' as const
    return 'critical' as const
  })
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
