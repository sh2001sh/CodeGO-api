import { createFileRoute, redirect } from '@tanstack/react-router'
import { PeoplePlanSettings } from '@/features/system-settings/people-plan'
import {
  PEOPLE_PLAN_DEFAULT_SECTION,
  PEOPLE_PLAN_SECTION_IDS,
} from '@/features/system-settings/people-plan/section-registry.tsx'

export const Route = createFileRoute(
  '/_authenticated/system-settings/people-plan/$section'
)({
  beforeLoad: ({ params }) => {
    const validSections = PEOPLE_PLAN_SECTION_IDS as unknown as string[]
    if (!validSections.includes(params.section)) {
      throw redirect({
        to: '/system-settings/people-plan/$section',
        params: { section: PEOPLE_PLAN_DEFAULT_SECTION },
      })
    }
  },
  component: PeoplePlanSettings,
})
