import type { TFunction } from 'i18next'
import { createSectionRegistry } from '@/features/system-settings/utils/section-registry'

const DASHBOARD_SECTIONS = [
  {
    id: 'overview',
    titleKey: 'Overview',
    descriptionKey: 'View dashboard overview and statistics',
    build: () => null,
  },
  {
    id: 'models',
    titleKey: 'Model Call Analytics',
    descriptionKey: 'View model call count analytics and charts',
    build: () => null,
  },
  {
    id: 'users',
    titleKey: 'User Analytics',
    descriptionKey: 'View user consumption statistics and charts',
    adminOnly: true,
    build: () => null,
  },
  {
    id: 'achievements',
    titleKey: '精灵图鉴',
    descriptionKey: '查看已解锁与未解锁宠物、奖励和解锁方式',
    build: () => null,
  },
  {
    id: 'hall-of-fame',
    titleKey: '荣誉榜',
    descriptionKey: '查看本周消耗、邀请与图鉴收集排行',
    build: () => null,
  },
] as const

export type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]['id']

const ADMIN_ONLY_SECTIONS = new Set<string>(['users'])

const dashboardRegistry = createSectionRegistry<
  DashboardSectionId,
  Record<string, never>,
  []
>({
  sections: DASHBOARD_SECTIONS,
  defaultSection: 'overview',
  basePath: '/dashboard',
  urlStyle: 'path',
})

export const DASHBOARD_SECTION_IDS = dashboardRegistry.sectionIds
export const DASHBOARD_DEFAULT_SECTION = dashboardRegistry.defaultSection

export function getDashboardSectionNavItems(
  t: TFunction,
  options?: { isAdmin?: boolean }
) {
  const all = dashboardRegistry.getSectionNavItems(t)
  if (options?.isAdmin) return all
  return all.filter(
    (_, idx) => !ADMIN_ONLY_SECTIONS.has(DASHBOARD_SECTIONS[idx].id)
  )
}
