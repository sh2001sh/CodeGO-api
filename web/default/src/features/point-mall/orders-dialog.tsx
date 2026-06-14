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
  getCardSecrets,
  parseDeliveryContent,
  type DeliveryContent,
} from './delivery-content'

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
  const secrets = getCardSecrets(props.content)
  if (secrets.length === 0) {
    return <span className='text-muted-foreground'>{props.summary}</span>
  }
  return (
    <div className='space-y-2'>
      <div className='space-y-1'>
        {secrets.map((secret, index) => (
          <div key={`${secret}-${index}`} className='font-mono text-xs'>
            卡密{index + 1}: {secret}
          </div>
        ))}
      </div>
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={async () => {
          await navigator.clipboard.writeText(secrets.join('\n'))
          toast.success('卡密已复制')
        }}
      >
        <Copy className='mr-2 size-4' aria-hidden='true' />
        复制卡密
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
