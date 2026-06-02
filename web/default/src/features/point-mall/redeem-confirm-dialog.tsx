import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PointMallProduct } from './types'

export function RedeemConfirmDialog(props: {
  product: PointMallProduct | null
  isPending: boolean
  onClose: () => void
  onConfirm: (product: PointMallProduct) => void
}) {
  const type = props.product?.type

  return (
    <Dialog open={!!props.product} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认兑换该商品？</DialogTitle>
        </DialogHeader>
        <p className='text-muted-foreground text-sm'>
          将消耗 {props.product?.points_price ?? 0} 积分兑换{' '}
          {props.product?.name}。
        </p>
        {props.product?.type === 'subscription_plan' ? (
          <p className='text-muted-foreground text-sm'>
            如果你当前已有有效月卡，本次兑换的月卡会在当前月卡到期后自动生效。
          </p>
        ) : null}
        {type === 'blind_box_ticket' ? (
          <p className='text-muted-foreground text-sm'>
            盲盒券兑换后会立即开启，开出的额度会直接写入兑换记录。
          </p>
        ) : null}
        {type === 'jd_card' ? (
          <p className='text-muted-foreground text-sm'>
            京东 E 卡兑换成功后，请在兑换记录中查看卡密；10 元卡会发放两张 5 元卡密。
          </p>
        ) : null}
        <DialogFooter>
          <Button variant='outline' onClick={props.onClose}>
            取消
          </Button>
          <Button
            disabled={props.isPending || !props.product}
            onClick={() => props.product && props.onConfirm(props.product)}
          >
            确认兑换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
