import { createFileRoute } from '@tanstack/react-router'
import { MiniAppLanding } from '@/features/miniapp/landing'

export const Route = createFileRoute('/miniapp/landing')({
  component: MiniAppLanding,
})
