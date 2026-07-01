import { useEffect } from 'react'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { RechargeFormCard } from './components/recharge-form-card'
import { WalletPagePanels } from './components/wallet-page-panels'
import { WalletSummarySidebar } from './components/wallet-summary-sidebar'
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
        description='账户充值、Claude 额度转换、兑换码核销与扣费顺序管理都在这里完成。'
        sidebar={
          <WalletSummarySidebar
            user={workspace.user}
            activeSubscriptionCount={
              workspace.subscriptionData?.subscriptions?.length ?? 0
            }
          />
        }
        framedMain={false}
        main={
          <CardStaggerContainer className='flex min-w-0 flex-col gap-4'>
            <CardStaggerItem>
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
                compact
              />
            </CardStaggerItem>

            <CardStaggerItem>
              <WalletPagePanels
                user={workspace.user}
                plans={workspace.publicPlans}
                plansLoading={workspace.publicPlansLoading}
                loading={workspace.userLoading}
                topupLink={workspace.topupInfo?.topup_link}
                redemptionCode={workspace.redemptionCode}
                onRedemptionCodeChange={workspace.setRedemptionCode}
                onRedeem={workspace.handleRedeem}
                redeeming={workspace.redeeming}
                subscriptionData={workspace.subscriptionData}
                subscriptionLoading={workspace.subscriptionLoading}
                onSubscriptionRefresh={workspace.fetchSubscriptionData}
                showBalancePanels={false}
              />
            </CardStaggerItem>
          </CardStaggerContainer>
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
