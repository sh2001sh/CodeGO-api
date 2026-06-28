import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { useStatus } from '@/hooks/use-status'
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'

export type TopNavLink = {
  title: string
  href: string
  disabled?: boolean
  requiresAuth?: boolean
  external?: boolean
}

export function useTopNavLinks(): TopNavLink[] {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { auth } = useAuthStore()

  const modules = useMemo(() => {
    return parseHeaderNavModulesFromStatus(
      status as Record<string, unknown> | null
    )
  }, [status])

  const isAuthed = !!auth?.user
  const links: TopNavLink[] = []

  if (modules?.home !== false) {
    links.push({ title: t('Home'), href: '/' })
  }

  if (modules?.console !== false) {
    links.push({ title: t('Console'), href: '/dashboard' })
  }

  const pricing = modules?.pricing
  if (pricing && typeof pricing === 'object' && pricing.enabled) {
    const requiresAuth = pricing.requireAuth && !isAuthed
    links.push({ title: t('Model Square'), href: '/pricing', requiresAuth })
  }

  const rankings = modules?.rankings
  if (rankings && typeof rankings === 'object' && rankings.enabled) {
    const requiresAuth = rankings.requireAuth && !isAuthed
    links.push({ title: t('Rankings'), href: '/rankings', requiresAuth })
  }

  if (modules?.docs !== false) {
    links.push({ title: t('Usage guide'), href: '/guide' })
  }

  links.push({ title: t('Download'), href: '/download' })

  if (modules?.about !== false) {
    links.push({ title: t('About'), href: '/about' })
  }

  if (isAuthed) {
    links.push({ title: '精灵图鉴', href: '/dashboard/achievements' })
    links.push({ title: '荣誉榜', href: '/dashboard/hall-of-fame' })
  }

  return links
}
