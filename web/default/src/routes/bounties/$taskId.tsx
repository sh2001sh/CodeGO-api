import { createFileRoute } from '@tanstack/react-router'
import { PublicLayout } from '@/components/layout'
import { BountyDetail } from '@/features/bounties/components/bounty-detail'

export const Route = createFileRoute('/bounties/$taskId')({
  component: BountyDetailRoute,
})

function BountyDetailRoute() {
  const { taskId } = Route.useParams()
  return (
    <PublicLayout showMainContainer={false}>
      <main className='min-h-svh px-4 pt-24 pb-8 sm:px-6'>
        <BountyDetail taskId={taskId} />
      </main>
    </PublicLayout>
  )
}
