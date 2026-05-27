import { createFileRoute, redirect } from '@tanstack/react-router'
import { PEOPLE_PLAN_DEFAULT_SECTION } from '@/features/system-settings/people-plan/section-registry.tsx'

export const Route = createFileRoute(
  '/_authenticated/system-settings/people-plan/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/system-settings/people-plan/$section',
      params: { section: PEOPLE_PLAN_DEFAULT_SECTION },
    })
  },
})
