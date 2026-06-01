import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  adminGetPointMallProducts,
  adminSavePointMallProduct,
} from '@/features/point-mall/api'
import type { PointMallProduct } from '@/features/point-mall/types'

const emptyProduct: Partial<PointMallProduct> = {
  name: '',
  type: 'jd_card',
  image_url: '',
  description: '',
  points_price: 20,
  face_value: 10,
  blind_box_quantity: 0,
  subscription_plan_id: 0,
  virtual_stock: 0,
  daily_limit_per_user: 1,
  monthly_limit_per_user: 0,
  total_limit: 0,
  status: 'on',
  sort_order: 0,
}

export function ProductEditor() {
  const queryClient = useQueryClient()
  const productsQuery = useQuery({
    queryKey: ['point-mall-admin', 'products'],
    queryFn: adminGetPointMallProducts,
  })
  const [draft, setDraft] = useState<Partial<PointMallProduct>>(emptyProduct)
  const products = productsQuery.data?.data ?? []
  const saveMutation = useMutation({
    mutationFn: adminSavePointMallProduct,
    onSuccess: async (res) => {
      if (res.success) {
        toast.success('商品已保存')
        setDraft({ ...emptyProduct })
        await queryClient.invalidateQueries({
          queryKey: ['point-mall-admin', 'products'],
        })
      }
    },
  })

  const patchDraft = (key: keyof PointMallProduct, value: string | number) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className='grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]'>
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? '编辑商品' : '新增商品'}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          <TextField
            label='商品名称'
            value={draft.name ?? ''}
            onChange={(value) => patchDraft('name', value)}
          />
          <TextField
            label='商品类型'
            value={draft.type ?? ''}
            onChange={(value) => patchDraft('type', value)}
          />
          <div className='grid grid-cols-2 gap-2'>
            <NumberField
              label='积分价'
              value={draft.points_price ?? 0}
              onChange={(value) => patchDraft('points_price', value)}
            />
            <NumberField
              label='排序'
              value={draft.sort_order ?? 0}
              onChange={(value) => patchDraft('sort_order', value)}
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <NumberField
              label='面值'
              value={draft.face_value ?? 0}
              onChange={(value) => patchDraft('face_value', value)}
            />
            <NumberField
              label='盲盒数量'
              value={draft.blind_box_quantity ?? 0}
              onChange={(value) => patchDraft('blind_box_quantity', value)}
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <NumberField
              label='虚拟库存'
              value={draft.virtual_stock ?? 0}
              onChange={(value) => patchDraft('virtual_stock', value)}
            />
            <NumberField
              label='月卡 Plan ID'
              value={draft.subscription_plan_id ?? 0}
              onChange={(value) => patchDraft('subscription_plan_id', value)}
            />
          </div>
          <div className='grid grid-cols-3 gap-2'>
            <NumberField
              label='日限'
              value={draft.daily_limit_per_user ?? 0}
              onChange={(value) => patchDraft('daily_limit_per_user', value)}
            />
            <NumberField
              label='月限'
              value={draft.monthly_limit_per_user ?? 0}
              onChange={(value) => patchDraft('monthly_limit_per_user', value)}
            />
            <NumberField
              label='总限'
              value={draft.total_limit ?? 0}
              onChange={(value) => patchDraft('total_limit', value)}
            />
          </div>
          <TextField
            label='状态'
            value={draft.status ?? 'on'}
            onChange={(value) => patchDraft('status', value)}
          />
          <TextField
            label='图片 URL'
            value={draft.image_url ?? ''}
            onChange={(value) => patchDraft('image_url', value)}
          />
          <TextField
            label='说明'
            value={draft.description ?? ''}
            onChange={(value) => patchDraft('description', value)}
          />
          <Button
            className='w-full'
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(draft)}
          >
            <Plus className='mr-2 size-4' aria-hidden='true' />
            保存商品
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>商品列表</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>积分</TableHead>
                <TableHead>库存</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.type}</TableCell>
                  <TableCell>{product.points_price}</TableCell>
                  <TableCell>{product.stock_remaining}</TableCell>
                  <TableCell>{product.status}</TableCell>
                  <TableCell>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setDraft(product)}
                    >
                      编辑
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function TextField(props: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className='space-y-1.5'>
      <Label>{props.label}</Label>
      <Input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  )
}

function NumberField(props: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className='space-y-1.5'>
      <Label>{props.label}</Label>
      <Input
        type='number'
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </div>
  )
}
