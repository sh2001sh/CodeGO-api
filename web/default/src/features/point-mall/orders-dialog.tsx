import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getPointMallOrders } from './api'
import {
  formatDeliverySummary,
  formatTime,
  parseDeliveryContent,
} from './delivery-content'
import type { DeliveryContent } from './delivery-content'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: '待发放',
    success: '成功',
    failed: '失败',
    refunded: '已退回',
  }
  return labels[status] ?? status
}

function DeliveryCell(props: {
  content: DeliveryContent | null
  summary: string
}) {
  const cardSecret = props.content?.card_secret || ''
  if (!cardSecret) {
    return <span className='text-muted-foreground'>{props.summary}</span>
  }
  return (
    <div className='flex items-center gap-2'>
      <span className='font-mono text-xs'>
        {props.content?.card_no || '-'} / {cardSecret}
      </span>
      <Button
        type='button'
        size='icon'
        variant='ghost'
        aria-label='复制卡密'
        onClick={async () => {
          await navigator.clipboard.writeText(cardSecret)
          toast.success('已复制')
        }}
      >
        <Copy className='size-4' aria-hidden='true' />
      </Button>
    </div>
  )
}

export function OrdersDialog() {
  const [open, setOpen] = useState(false)
  const ordersQuery = useQuery({
    queryKey: ['point-mall', 'orders'],
    queryFn: getPointMallOrders,
    enabled: open,
  })
  const orders = ordersQuery.data?.data ?? []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type='button' variant='outline' />}>
        <History className='mr-2 size-4' aria-hidden='true' />
        兑换记录
      </DialogTrigger>
      <DialogContent className='max-w-5xl'>
        <DialogHeader>
          <DialogTitle>兑换记录</DialogTitle>
        </DialogHeader>
        <div className='max-h-[65vh] overflow-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>积分</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发放内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className='py-8 text-center'>
                    正在加载兑换记录...
                  </TableCell>
                </TableRow>
              )}
              {orders.map((order) => {
                const content = parseDeliveryContent(order)
                return (
                  <TableRow key={order.id}>
                    <TableCell>{formatTime(order.created_at)}</TableCell>
                    <TableCell>{order.product_name}</TableCell>
                    <TableCell>{order.points_cost}</TableCell>
                    <TableCell>{statusLabel(order.status)}</TableCell>
                    <TableCell>
                      <DeliveryCell
                        content={content}
                        summary={formatDeliverySummary(order)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
              {!ordersQuery.isLoading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className='py-8 text-center'>
                    无兑换记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
