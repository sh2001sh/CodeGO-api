import { createFileRoute, redirect } from '@tanstack/react-router'
import { RoutePools } from '@/features/route-pools'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/_authenticated/route-pools/')({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()
    if (!auth.user || auth.user.role !== ROLE.SUPER_ADMIN) throw redirect({ to: '/403' })
  },
  component: RoutePools,
})
