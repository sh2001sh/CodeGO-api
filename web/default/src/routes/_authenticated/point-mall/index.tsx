import { createFileRoute } from '@tanstack/react-router'
import { PointMallPage } from '@/features/point-mall'

export const Route = createFileRoute('/_authenticated/point-mall/')({
  component: PointMallPage,
})
