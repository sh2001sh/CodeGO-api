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
    <div className='flex h-full min-h-0 flex-col gap-4'>
      <div className='flex shrink-0 items-center justify-between gap-3'>
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

      <Tabs defaultValue='products' className='min-h-0 flex-1 overflow-hidden'>
        <TabsList className='shrink-0'>
          <TabsTrigger value='products'>商品</TabsTrigger>
          <TabsTrigger value='cards'>卡密池</TabsTrigger>
          <TabsTrigger value='points'>积分情况</TabsTrigger>
          <TabsTrigger value='orders'>订单</TabsTrigger>
          <TabsTrigger value='rules'>规则</TabsTrigger>
        </TabsList>
        <TabsContent value='products' className='min-h-0 overflow-y-auto pr-1'>
          <ProductEditor />
        </TabsContent>
        <TabsContent value='cards' className='min-h-0 overflow-y-auto pr-1'>
          <CardSecretManager />
        </TabsContent>
        <TabsContent value='points' className='min-h-0 overflow-y-auto pr-1'>
          <PointsOverview />
        </TabsContent>
        <TabsContent value='orders' className='min-h-0 overflow-y-auto pr-1'>
          <OrderManager />
        </TabsContent>
        <TabsContent value='rules' className='min-h-0 overflow-y-auto pr-1'>
          <RulesPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
