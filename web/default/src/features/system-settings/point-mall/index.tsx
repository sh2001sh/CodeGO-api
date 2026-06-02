import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSecretManager } from './card-secret-manager'
import { OrderManager } from './order-manager'
import { PointsOverview } from './points-overview'
import { ProductEditor } from './product-editor'
import { RulesPanel } from './rules-panel'

export function PointMallSettings() {
  const queryClient = useQueryClient()

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-semibold'>积分商城</h1>
          <p className='text-muted-foreground text-sm'>
            管理商品、京东 E 卡卡密、兑换订单、用户积分和活动规则。
          </p>
        </div>
        <Button
          variant='outline'
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ['point-mall-admin'] })
          }
        >
          <RefreshCw className='mr-2 size-4' aria-hidden='true' />
          刷新
        </Button>
      </div>

      <Tabs defaultValue='products'>
        <TabsList>
          <TabsTrigger value='products'>商品</TabsTrigger>
          <TabsTrigger value='cards'>卡密池</TabsTrigger>
          <TabsTrigger value='points'>积分情况</TabsTrigger>
          <TabsTrigger value='orders'>订单</TabsTrigger>
          <TabsTrigger value='rules'>规则</TabsTrigger>
        </TabsList>
        <TabsContent value='products'>
          <ProductEditor />
        </TabsContent>
        <TabsContent value='cards'>
          <CardSecretManager />
        </TabsContent>
        <TabsContent value='points'>
          <PointsOverview />
        </TabsContent>
        <TabsContent value='orders'>
          <OrderManager />
        </TabsContent>
        <TabsContent value='rules'>
          <RulesPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
