import { useEffect } from 'react'
import { WalletCards } from 'lucide-react'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { RechargeFormCard } from './components/recharge-form-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import { WalletWorkspaceShell } from './components/wallet-workspace-shell'
import { useWalletWorkspace } from './hooks/use-wallet-workspace'
import type { WalletType } from './types'

interface WalletProps {
  initialShowHistory?: boolean
  initialWalletType?: WalletType
}

export function Wallet(props: WalletProps) {
  const workspace = useWalletWorkspace({
    initialWalletType: props.initialWalletType,
  })
  const setBillingDialogOpen = workspace.setBillingDialogOpen

  useEffect(() => {
    if (!props.initialShowHistory) return
    setBillingDialogOpen(true)
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [props.initialShowHistory, setBillingDialogOpen])

  return (
    <>
      <WalletWorkspaceShell
        title='钱包'
        description='在这里充值余额、查看账单，并调整盲盒额度、订阅额度和钱包余额的扣费顺序。'
        main={
          <div className='space-y-4'>
            <div className='flex items-center gap-3 rounded-[22px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(235,255,244,0.96),rgba(255,255,255,0.98))] px-4 py-4 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(11,31,24,0.92),rgba(2,6,23,0.88))]'>
              <div className='flex size-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm'>
                <WalletCards className='size-5' />
              </div>
              <div className='space-y-1'>
                <div className='text-foreground text-sm font-semibold'>
                  余额充值和账单查询都在这里处理
                </div>
                <div className='text-muted-foreground text-sm'>
                  页面内可以直接调整盲盒额度、订阅额度和钱包余额的扣费顺序。
                </div>
              </div>
            </div>

            <RechargeFormCard
              topupInfo={workspace.topupInfo}
              presetAmounts={workspace.presetAmounts}
              selectedPreset={workspace.selectedPreset}
              onSelectPreset={workspace.handleSelectPreset}
              selectedWalletType={workspace.selectedWalletType}
              onWalletTypeChange={workspace.handleWalletTypeChange}
              topupAmount={workspace.topupAmount}
              onTopupAmountChange={workspace.handleTopupAmountChange}
              paymentAmount={workspace.paymentAmount}
              calculating={workspace.calculating}
              onPaymentMethodSelect={workspace.handlePaymentMethodSelect}
              paymentLoading={workspace.paymentLoading}
              redemptionCode={workspace.redemptionCode}
              onRedemptionCodeChange={workspace.setRedemptionCode}
              onRedeem={workspace.handleRedeem}
              redeeming={workspace.redeeming}
              topupLink={workspace.topupInfo?.topup_link}
              loading={workspace.topupLoading}
              showRedemptionSection={false}
              priceRatio={(workspace.status?.price as number) || 1}
              usdExchangeRate={workspace.effectiveUsdExchangeRate}
              onOpenBilling={() => workspace.setBillingDialogOpen(true)}
              creemProducts={workspace.topupInfo?.creem_products}
              enableCreemTopup={workspace.topupInfo?.enable_creem_topup}
              onCreemProductSelect={workspace.handleCreemProductSelect}
              enableWaffoTopup={workspace.topupInfo?.enable_waffo_topup}
              waffoPayMethods={workspace.topupInfo?.waffo_pay_methods}
              waffoMinTopup={workspace.topupInfo?.waffo_min_topup}
              onWaffoMethodSelect={workspace.handleWaffoMethodSelect}
              enableWaffoPancakeTopup={
                workspace.topupInfo?.enable_waffo_pancake_topup
              }
            />
          </div>
        }
        sidebar={
          <WalletStatsCard
            user={workspace.user}
            loading={workspace.userLoading}
            topupLink={workspace.topupInfo?.topup_link}
            redemptionCode={workspace.redemptionCode}
            onRedemptionCodeChange={workspace.setRedemptionCode}
            onRedeem={workspace.handleRedeem}
            redeeming={workspace.redeeming}
            subscriptionData={workspace.subscriptionData}
            subscriptionLoading={workspace.subscriptionLoading}
            onSubscriptionRefresh={workspace.fetchSubscriptionData}
          />
        }
      />

      <PaymentConfirmDialog
        open={workspace.confirmDialogOpen}
        onOpenChange={workspace.setConfirmDialogOpen}
        onConfirm={workspace.handlePaymentConfirm}
        topupAmount={workspace.topupAmount}
        paymentAmount={workspace.paymentAmount}
        paymentMethod={workspace.selectedPaymentMethod}
        calculating={workspace.calculating}
        processing={workspace.processing || workspace.pancakeProcessing}
        discountRate={workspace.getDiscountRate()}
        usdExchangeRate={workspace.effectiveUsdExchangeRate}
      />

      <BillingHistoryDialog
        open={workspace.billingDialogOpen}
        onOpenChange={workspace.setBillingDialogOpen}
      />

      <CreemConfirmDialog
        open={workspace.creemDialogOpen}
        onOpenChange={workspace.setCreemDialogOpen}
        onConfirm={workspace.handleCreemConfirm}
        product={workspace.selectedCreemProduct}
        processing={workspace.creemProcessing}
      />
    </>
  )
}
