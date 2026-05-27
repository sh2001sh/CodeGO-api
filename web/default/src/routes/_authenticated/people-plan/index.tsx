import { createFileRoute } from '@tanstack/react-router'
import { PeoplePlanPage } from '@/features/people-plan'

export const Route = createFileRoute('/_authenticated/people-plan/')({
  component: PeoplePlanPage,
})
