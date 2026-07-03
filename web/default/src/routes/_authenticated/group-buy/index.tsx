import { createFileRoute } from '@tanstack/react-router'
import { GroupBuyPage } from '@/features/group-buy'

export const Route = createFileRoute('/_authenticated/group-buy/')({
  component: GroupBuyPage,
})
