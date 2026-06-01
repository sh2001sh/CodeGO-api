import { createFileRoute } from '@tanstack/react-router'
import { PointMallSettings } from '@/features/system-settings/point-mall'

export const Route = createFileRoute(
  '/_authenticated/system-settings/point-mall/'
)({
  component: PointMallSettings,
})
