import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackagePlus } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  adminCreatePointMallCardSecret,
  adminGetPointMallCardSecrets,
  adminGetPointMallProducts,
  adminVoidPointMallCardSecret,
} from '@/features/point-mall/api'
import type {
  PointMallCardSecret,
  PointMallProduct,
} from '@/features/point-mall/types'

type CardSecretGroup = {
  key: string
  ids: number[]
  product_id: number
  status: string
  order_id: number
  user_id: number
  created_at: number
}

function jdCardSecretCount(product?: PointMallProduct) {
  return product?.face_value === 10 ? 2 : 1
}

function splitSecretLine(line: string) {
  return line
    .split(/[\s,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseBatchSecrets(text: string, groupSize: number) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (groupSize <= 1) {
    return lines.flatMap(splitSecretLine)
  }
  const secrets: string[] = []
  for (const line of lines) {
    const group = splitSecretLine(line)
    if (group.length !== groupSize) {
      throw new Error(`每行需要填写 ${groupSize} 个卡密`)
    }
    secrets.push(...group)
  }
  return secrets
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    unused: '未使用',
    locked: '锁定中',
    issued: '已发放',
    void: '已作废',
  }
  return labels[status] ?? status
}

function groupCardSecrets(
  cards: PointMallCardSecret[],
  products: Map<number, PointMallProduct>
) {
  const buckets = new Map<string, PointMallCardSecret[]>()
  for (const card of cards) {
    const key = [
      card.product_id,
      card.status,
      card.order_id || 0,
      card.user_id || 0,
    ].join(':')
    buckets.set(key, [...(buckets.get(key) ?? []), card])
  }

  const groups: CardSecretGroup[] = []
  for (const bucket of buckets.values()) {
    const sorted = [...bucket].sort((left, right) => left.id - right.id)
    const product = products.get(sorted[0]?.product_id ?? 0)
    const groupSize = jdCardSecretCount(product)
    for (let index = 0; index < sorted.length; index += groupSize) {
      const chunk = sorted.slice(index, index + groupSize)
      if (chunk.length === 0) continue
      groups.push({
        key: chunk.map((card) => card.id).join('-'),
        ids: chunk.map((card) => card.id),
        product_id: chunk[0].product_id,
        status: chunk[0].status,
        order_id: chunk[0].order_id,
        user_id: chunk[0].user_id,
        created_at: Math.max(...chunk.map((card) => card.created_at || 0)),
      })
    }
  }
  return groups.sort((left, right) => right.created_at - left.created_at)
}

export function CardSecretManager() {
  const queryClient = useQueryClient()
  const [productId, setProductId] = useState(0)
  const [cardSecret1, setCardSecret1] = useState('')
  const [cardSecret2, setCardSecret2] = useState('')
  const [batchText, setBatchText] = useState('')

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
  const selectedProduct = jdProducts.find((product) => product.id === productId)
  const groupSize = jdCardSecretCount(selectedProduct)
  const productById = useMemo(() => {
    return new Map(jdProducts.map((product) => [product.id, product]))
  }, [jdProducts])
  const cardGroups = useMemo(
    () => groupCardSecrets(cardsQuery.data?.data ?? [], productById),
    [cardsQuery.data?.data, productById]
  )

  const createMutation = useMutation({
    mutationFn: adminCreatePointMallCardSecret,
    onSuccess: async (res) => {
      if (res.success) {
        const cardCount = Math.floor((res.data?.length ?? 0) / groupSize)
        toast.success(`已添加 ${cardCount || 1} 张 E 卡`)
        setCardSecret1('')
        setCardSecret2('')
        setBatchText('')
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
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await adminVoidPointMallCardSecret(id)
      }
    },
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

  const singleSecrets =
    groupSize === 2
      ? [cardSecret1.trim(), cardSecret2.trim()].filter(Boolean)
      : [cardSecret1.trim()].filter(Boolean)
  const canAddSingle =
    productId > 0 && singleSecrets.length === groupSize && !createMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>京东 E 卡卡密池</CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        <div className='grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_auto]'>
          <Select
            value={productId ? String(productId) : ''}
            onValueChange={(value) => {
              setProductId(Number(value))
              setCardSecret1('')
              setCardSecret2('')
            }}
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
          <div className='grid gap-3 md:grid-cols-2'>
            <Input
              placeholder={groupSize === 2 ? '卡密1（5元）' : '卡密'}
              value={cardSecret1}
              onChange={(event) => setCardSecret1(event.target.value)}
            />
            {groupSize === 2 && (
              <Input
                placeholder='卡密2（5元）'
                value={cardSecret2}
                onChange={(event) => setCardSecret2(event.target.value)}
              />
            )}
          </div>
          <Button
            disabled={!canAddSingle}
            onClick={() =>
              createMutation.mutate({
                product_id: productId,
                card_secrets: singleSecrets,
              })
            }
          >
            添加
          </Button>
        </div>

        <div className='space-y-2'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <div className='text-sm font-medium'>批量添加</div>
              <div className='text-muted-foreground text-xs'>
                {groupSize === 2
                  ? '10 元 E 卡每行填写两个 5 元卡密，会合并显示为一张 10 元 E 卡。'
                  : '每行一条卡密，也可用空格、逗号或顿号分隔。'}
              </div>
            </div>
            <Button
              variant='outline'
              disabled={!productId || !batchText.trim() || createMutation.isPending}
              onClick={() => {
                try {
                  const cardSecrets = parseBatchSecrets(batchText, groupSize)
                  createMutation.mutate({
                    product_id: productId,
                    card_secrets: cardSecrets,
                  })
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : '批量卡密格式错误'
                  )
                }
              }}
            >
              <PackagePlus className='mr-2 size-4' aria-hidden='true' />
              批量添加
            </Button>
          </div>
          <Textarea
            className='min-h-28 font-mono text-sm'
            placeholder={
              groupSize === 2
                ? '示例：\n卡密1 卡密2\n卡密3 卡密4'
                : '示例：\n卡密1\n卡密2\n卡密3'
            }
            value={batchText}
            onChange={(event) => setBatchText(event.target.value)}
          />
        </div>

        <div className='overflow-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>卡密数</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>订单</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cardGroups.map((group) => (
                <TableRow key={group.key}>
                  <TableCell>{group.ids.join(' / ')}</TableCell>
                  <TableCell>
                    {productById.get(group.product_id)?.name ?? group.product_id}
                  </TableCell>
                  <TableCell>{group.ids.length}</TableCell>
                  <TableCell>{statusLabel(group.status)}</TableCell>
                  <TableCell>{group.order_id || '-'}</TableCell>
                  <TableCell>{group.user_id || '-'}</TableCell>
                  <TableCell>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={group.status !== 'unused' || voidMutation.isPending}
                      onClick={() => voidMutation.mutate(group.ids)}
                    >
                      作废
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!cardsQuery.isLoading && cardGroups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className='py-8 text-center'>
                    暂无卡密
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
