import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  adminGetPointMallOrders,
  adminPatchPointMallOrder,
} from '@/features/point-mall/api'
import {
  formatDeliverySummary,
  formatTime,
} from '@/features/point-mall/delivery-content'

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: '待发放',
    success: '成功',
    failed: '失败',
    refunded: '已退回',
  }
  return labels[status] ?? status
}

export function OrderManager() {
  const queryClient = useQueryClient()
  const ordersQuery = useQuery({
    queryKey: ['point-mall-admin', 'orders'],
    queryFn: () => adminGetPointMallOrders(false),
  })
  const patchMutation = useMutation({
    mutationFn: adminPatchPointMallOrder,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['point-mall-admin', 'orders'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['point-mall-admin', 'cards'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['point-mall-admin', 'points'],
      })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>兑换订单</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='overflow-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>积分</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发放摘要</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ordersQuery.data?.data ?? []).map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{formatTime(order.created_at)}</TableCell>
                  <TableCell>{order.user_id}</TableCell>
                  <TableCell>{order.product_name}</TableCell>
                  <TableCell>{order.points_cost}</TableCell>
                  <TableCell>{statusLabel(order.status)}</TableCell>
                  <TableCell className='max-w-[280px] truncate'>
                    {formatDeliverySummary(order)}
                  </TableCell>
                  <TableCell className='space-x-2 whitespace-nowrap'>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={order.status === 'refunded'}
                      onClick={() =>
                        patchMutation.mutate({ id: order.id, status: 'failed' })
                      }
                    >
                      标记失败
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={order.status === 'refunded'}
                      onClick={() =>
                        patchMutation.mutate({ id: order.id, status: 'refunded' })
                      }
                    >
                      退回积分
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!ordersQuery.isLoading && (ordersQuery.data?.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className='py-8 text-center'>
                    暂无兑换订单
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
