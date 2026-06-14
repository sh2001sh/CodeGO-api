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
import { cn } from '@/lib/utils'
import type { SidebarGroupModelStatusItem } from './types'
import { buildHealthSegments } from './presentation'

const SEGMENT_CLASS = {
  healthy: 'bg-emerald-400 dark:bg-emerald-500',
  warning: 'bg-amber-400 dark:bg-amber-500',
  critical: 'bg-rose-400 dark:bg-rose-500',
  muted: 'bg-emerald-100 dark:bg-emerald-950/70',
  unknown: 'bg-slate-200 dark:bg-slate-800',
} as const

export function HealthStrip(props: { item: SidebarGroupModelStatusItem }) {
  const segments = buildHealthSegments(props.item)

  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-20 gap-1'>
        {segments.map((segment, index) => (
          <span
            key={`${props.item.model}-${index}`}
            className={cn(
              'h-5 rounded-full transition-colors',
              SEGMENT_CLASS[segment]
            )}
          />
        ))}
      </div>
    </div>
  )
}
