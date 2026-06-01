import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { SectionPageLayout } from '@/components/layout'
import {
  convertBonusQuota,
  getPointMallOverview,
  redeemPointMallProduct,
} from './api'
import { AssetConsole } from './asset-console'
import { redeemSuccessMessage } from './delivery-content'
import { OrdersDialog } from './orders-dialog'
import { ProductShelf } from './product-shelf'
import { RedeemConfirmDialog } from './redeem-confirm-dialog'
import { SourceAndRules } from './source-and-rules'
import type { PointMallProduct } from './types'

export function PointMallPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [convertPoints, setConvertPoints] = useState(1)
  const [redeemProduct, setRedeemProduct] = useState<PointMallProduct | null>(
    null
  )
  const overviewQuery = useQuery({
    queryKey: ['point-mall', 'overview'],
    queryFn: getPointMallOverview,
  })
  const overview = overviewQuery.data?.data
  const products = overview?.products ?? []
  const pointsBalance = overview?.account.balance ?? 0
  const maxConvertiblePoints = overview?.convertible_points ?? 0

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['point-mall'] })
  }

  const convertMutation = useMutation({
    mutationFn: convertBonusQuota,
    onSuccess: async (res) => {
      if (res.success) {
        toast.success('赠送额度已兑换为积分')
        await refresh()
      }
    },
  })

  const redeemMutation = useMutation({
    mutationFn: redeemPointMallProduct,
    onSuccess: async (res) => {
      if (res.success && res.data) {
        toast.success(redeemSuccessMessage(res.data))
        setRedeemProduct(null)
        await refresh()
      }
    },
  })

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Code Go Points Mall')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Description>
        积分只用于兑换商城奖品、盲盒券和月卡权益。
      </SectionPageLayout.Description>
      <SectionPageLayout.Content>
        <div className='mx-auto w-full max-w-[1440px] space-y-6'>
          <AssetConsole
            isLoading={overviewQuery.isLoading}
            pointsBalance={pointsBalance}
            convertibleBonusQuota={overview?.convertible_bonus_quota ?? 0}
            maxConvertiblePoints={maxConvertiblePoints}
            convertPoints={convertPoints}
            isConverting={convertMutation.isPending}
            onConvertPointsChange={setConvertPoints}
            onConvert={() => convertMutation.mutate(convertPoints)}
            ordersAction={<OrdersDialog />}
          />

          <SourceAndRules />

          <ProductShelf
            products={products}
            isLoading={overviewQuery.isLoading}
            pointsBalance={pointsBalance}
            onRedeem={setRedeemProduct}
          />
        </div>
      </SectionPageLayout.Content>

      <RedeemConfirmDialog
        product={redeemProduct}
        isPending={redeemMutation.isPending}
        onClose={() => setRedeemProduct(null)}
        onConfirm={(product) => redeemMutation.mutate(product.id)}
      />
    </SectionPageLayout>
  )
}
