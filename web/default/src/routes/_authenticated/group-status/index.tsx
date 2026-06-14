import { createFileRoute } from '@tanstack/react-router'
import { SidebarGroupStatusPage } from '@/features/sidebar-group-status'

export const Route = createFileRoute('/_authenticated/group-status/')({
  component: SidebarGroupStatusPage,
})
