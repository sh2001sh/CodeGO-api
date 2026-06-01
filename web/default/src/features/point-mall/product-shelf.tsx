import { useMemo } from 'react'
import { Gift, PackageOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductCard } from './product-card'
import type { PointMallProduct } from './types'

function ProductSkeleton() {
  return (
    <div className='bg-card rounded-lg border'>
      <Skeleton className='aspect-[4/3] rounded-b-none' />
      <div className='space-y-3 p-4'>
        <Skeleton className='h-5 w-3/4' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-16 w-full' />
        <Skeleton className='h-9 w-full' />
      </div>
    </div>
  )
}

function productCount(products: PointMallProduct[], type: string) {
  return products.filter((product) => product.type === type).length
}

export function ProductShelf(props: {
  products: PointMallProduct[]
  isLoading: boolean
  pointsBalance: number
  onRedeem: (product: PointMallProduct) => void
}) {
  const counts = useMemo(
    () => ({
      jdCard: productCount(props.products, 'jd_card'),
      blindBox: productCount(props.products, 'blind_box_ticket'),
      monthlyCard: productCount(props.products, 'subscription_plan'),
    }),
    [props.products]
  )

  return (
    <section className='space-y-4'>
      <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-end'>
        <div>
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <Gift className='size-4' aria-hidden='true' />
            积分货架
          </div>
          <h2 className='mt-1 text-xl font-semibold'>可兑换奖品</h2>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='secondary'>E 卡 {counts.jdCard}</Badge>
          <Badge variant='secondary'>盲盒券 {counts.blindBox}</Badge>
          <Badge variant='secondary'>月卡 {counts.monthlyCard}</Badge>
        </div>
      </div>

      {props.isLoading ? (
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductSkeleton key={index} />
          ))}
        </div>
      ) : props.products.length > 0 ? (
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          {props.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              pointsBalance={props.pointsBalance}
              onRedeem={props.onRedeem}
            />
          ))}
        </div>
      ) : (
        <div className='bg-muted/20 flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center'>
          <PackageOpen
            className='text-muted-foreground size-10'
            aria-hidden='true'
          />
          <div className='mt-3 font-medium'>暂无可兑换商品</div>
          <p className='text-muted-foreground mt-1 text-sm'>
            商品上架后会在这里展示。
          </p>
        </div>
      )}
    </section>
  )
}
