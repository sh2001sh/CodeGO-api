import { createFileRoute } from '@tanstack/react-router'
import { PublicGeneMapPage } from '@/features/gene-map/public-gene-map-page'

export const Route = createFileRoute('/gene-map/$token')({
  component: RouteComponent,
})

function RouteComponent() {
  const { token } = Route.useParams()
  return <PublicGeneMapPage token={token} />
}
