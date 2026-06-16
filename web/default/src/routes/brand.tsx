import { createFileRoute } from '@tanstack/react-router'
import { BrandHome } from '@/features/brand'

export const Route = createFileRoute('/brand')({
  component: BrandHome,
})
