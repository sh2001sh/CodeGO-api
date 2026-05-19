import {
  Anvil,
  CalendarCheck2,
  CalendarRange,
  Gift,
  Orbit,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  anvil: Anvil,
  'calendar-check': CalendarCheck2,
  'calendar-range': CalendarRange,
  gift: Gift,
  orbit: Orbit,
  sparkles: Sparkles,
  star: Star,
  'shield-check': ShieldCheck,
  users: Users,
  zap: Zap,
}

export function resolveWorkshopIcon(key: string): LucideIcon {
  return ICON_MAP[key] ?? Sparkles
}
