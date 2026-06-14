import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { ActivitiesPage } from '@/features/activities'

const searchSchema = z.object({
  activity: z
    .enum(['blind-box', 'invite-rewards', 'point-mall', 'claude-convert'])
    .optional(),
})

export const Route = createFileRoute('/_authenticated/activities/')({
  component: ActivitiesPage,
  validateSearch: searchSchema,
})
