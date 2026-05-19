import { createFileRoute } from '@tanstack/react-router'
import { BlindBoxPage } from '@/features/wallet/blind-box-page'

export const Route = createFileRoute('/_authenticated/blind-box/')({
  component: BlindBoxPage,
})
