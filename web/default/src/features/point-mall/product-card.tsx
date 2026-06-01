import { useState } from 'react'
import { Gift, LockKeyhole } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PointMallProduct } from './types'

function productTypeLabel(product: PointMallProduct) {
  if (product.type === 'jd_card') return '京东 E 卡'
  if (product.type === 'blind_box_ticket') return '盲盒券'
  if (product.type === 'subscription_plan') return '月卡'
  return '奖品'
}

function redeemButtonLabel(product: PointMallProduct, pointsBalance: number) {
  if (pointsBalance < product.points_price) return '积分不足'
  if (product.stock_remaining <= 0) return '暂不可兑换'
  return '兑换'
}

function ProductVisual(props: {
  product: PointMallProduct
  imageFailed: boolean
  onImageError: () => void
}) {
  return (
    <div className='bg-muted/50 relative aspect-[4/3] overflow-hidden'>
      <div className='absolute top-3 left-3 z-10 flex gap-2'>
        <Badge
          className='bg-background/90 text-foreground shadow-sm'
          variant='secondary'
        >
          {productTypeLabel(props.product)}
        </Badge>
        {props.product.status !== 'on' ? (
          <Badge variant='outline'>已下架</Badge>
        ) : null}
      </div>
      {props.product.image_url && !props.imageFailed ? (
        <img
          src={props.product.image_url}
          alt={props.product.name}
          loading='lazy'
          decoding='async'
          className='h-full w-full object-contain p-5 transition-transform duration-200 group-hover:scale-[1.03]'
          onError={props.onImageError}
        />
      ) : (
        <div className='text-muted-foreground flex h-full items-center justify-center'>
          <Gift className='size-10' aria-hidden='true' />
        </div>
      )}
    </div>
  )
}

function ProductLimits(props: { product: PointMallProduct }) {
  return (
    <div className='bg-muted/50 rounded-md px-3 py-2 text-xs'>
      <div className='text-muted-foreground flex items-center gap-1'>
        <LockKeyhole className='size-3.5' aria-hidden='true' />
        每月限制
      </div>
      <div className='mt-1 font-medium'>
        {props.product.monthly_limit_per_user > 0
          ? `${props.product.monthly_limit_per_user} 次`
          : '不限'}
      </div>
    </div>
  )
}

export function ProductCard(props: {
  product: PointMallProduct
  pointsBalance: number
  onRedeem: (product: PointMallProduct) => void
}) {
  const { t } = useTranslation()
  const [imageFailed, setImageFailed] = useState(false)
  const product = props.product
  const disabled =
    props.pointsBalance < product.points_price ||
    product.status !== 'on' ||
    product.stock_remaining <= 0
  const pointsShortage = Math.max(0, product.points_price - props.pointsBalance)

  return (
    <Card className='group border-border/70 hover:border-primary/40 flex h-full overflow-hidden rounded-lg transition-colors'>
      <div className='flex h-full w-full flex-col'>
        <ProductVisual
          product={product}
          imageFailed={imageFailed}
          onImageError={() => setImageFailed(true)}
        />
        <CardHeader className='space-y-3 pb-3'>
          <div className='flex items-start justify-between gap-3'>
            <CardTitle className='text-base leading-6'>
              {product.name}
            </CardTitle>
            <div className='text-right'>
              <div className='text-primary text-xl leading-none font-semibold'>
                {product.points_price}
              </div>
              <div className='text-muted-foreground mt-1 text-xs'>积分</div>
            </div>
          </div>
          <p className='text-muted-foreground min-h-10 text-sm leading-5'>
            {product.description || t('Redeem with Code Go points.')}
          </p>
        </CardHeader>
        <CardContent className='mt-auto space-y-3'>
          <ProductLimits product={product} />
          {pointsShortage > 0 ? (
            <p className='text-muted-foreground text-xs'>
              还差 {pointsShortage} 积分可兑换
            </p>
          ) : null}
          <Button
            type='button'
            className='w-full'
            disabled={disabled}
            onClick={() => props.onRedeem(product)}
          >
            {redeemButtonLabel(product, props.pointsBalance)}
          </Button>
        </CardContent>
      </div>
    </Card>
  )
}
