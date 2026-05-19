import { createFileRoute } from '@tanstack/react-router'
import { SubscriptionShopPage } from '@/features/wallet/subscription-shop-page'

export const Route = createFileRoute('/_authenticated/packages/')({
  component: SubscriptionShopPage,
})
