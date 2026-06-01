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
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>兑换订单</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>商品</TableHead>
              <TableHead>积分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(ordersQuery.data?.data ?? []).map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.user_id}</TableCell>
                <TableCell>{order.product_name}</TableCell>
                <TableCell>{order.points_cost}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell className='space-x-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      patchMutation.mutate({ id: order.id, status: 'failed' })
                    }
                  >
                    标记失败
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      patchMutation.mutate({ id: order.id, status: 'refunded' })
                    }
                  >
                    退回积分
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
