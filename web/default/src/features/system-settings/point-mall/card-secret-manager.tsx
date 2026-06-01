import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  adminCreatePointMallCardSecret,
  adminGetPointMallCardSecrets,
  adminGetPointMallProducts,
  adminVoidPointMallCardSecret,
} from '@/features/point-mall/api'

export function CardSecretManager() {
  const queryClient = useQueryClient()
  const [productId, setProductId] = useState(0)
  const [cardNo, setCardNo] = useState('')
  const [cardSecret, setCardSecret] = useState('')
  const cardsQuery = useQuery({
    queryKey: ['point-mall-admin', 'cards'],
    queryFn: () => adminGetPointMallCardSecrets(false),
  })
  const productsQuery = useQuery({
    queryKey: ['point-mall-admin', 'products'],
    queryFn: adminGetPointMallProducts,
  })
  const jdProducts = (productsQuery.data?.data ?? []).filter(
    (product) => product.type === 'jd_card'
  )
  const createMutation = useMutation({
    mutationFn: adminCreatePointMallCardSecret,
    onSuccess: async (res) => {
      if (res.success) {
        toast.success('卡密已添加')
        setCardNo('')
        setCardSecret('')
        await queryClient.invalidateQueries({
          queryKey: ['point-mall-admin', 'cards'],
        })
        await queryClient.invalidateQueries({
          queryKey: ['point-mall-admin', 'products'],
        })
        await queryClient.invalidateQueries({ queryKey: ['point-mall'] })
      }
    },
  })
  const voidMutation = useMutation({
    mutationFn: adminVoidPointMallCardSecret,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['point-mall-admin', 'cards'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['point-mall-admin', 'products'],
      })
      await queryClient.invalidateQueries({ queryKey: ['point-mall'] })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>京东 E 卡卡密池</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-2 md:grid-cols-[220px_180px_minmax(0,1fr)_auto]'>
          <Select
            value={productId ? String(productId) : ''}
            onValueChange={(value) => setProductId(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder='选择京东 E 卡商品' />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {jdProducts.map((product) => (
                <SelectItem key={product.id} value={String(product.id)}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder='卡号'
            value={cardNo}
            onChange={(event) => setCardNo(event.target.value)}
          />
          <Input
            placeholder='卡密'
            value={cardSecret}
            onChange={(event) => setCardSecret(event.target.value)}
          />
          <Button
            disabled={!productId || !cardSecret || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                product_id: productId,
                card_no: cardNo,
                card_secret: cardSecret,
              })
            }
          >
            添加
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>商品</TableHead>
              <TableHead>卡号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>订单</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(cardsQuery.data?.data ?? []).map((card) => (
              <TableRow key={card.id}>
                <TableCell>{card.id}</TableCell>
                <TableCell>{card.product_id}</TableCell>
                <TableCell>{card.card_no || '-'}</TableCell>
                <TableCell>{card.status}</TableCell>
                <TableCell>{card.order_id || '-'}</TableCell>
                <TableCell>
                  <Button
                    size='sm'
                    variant='outline'
                    disabled={card.status !== 'unused'}
                    onClick={() => voidMutation.mutate(card.id)}
                  >
                    作废
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
