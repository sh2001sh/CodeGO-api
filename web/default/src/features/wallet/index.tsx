import { useEffect } from 'react'
import { formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
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
            topupLink={workspace.topupInfo?.topup_link}
            redemptionCode={workspace.redemptionCode}
            onRedemptionCodeChange={workspace.setRedemptionCode}
            onRedeem={workspace.handleRedeem}
            redeeming={workspace.redeeming}
          />
        }
        framedMain={false}
        main={
          <div className='space-y-4'>
            <div className='app-page-shell p-4 sm:p-5'>
              <div className='app-section-kicker'>充值工作区</div>
              <div className='mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start'>
                <div>
                  <div className='text-foreground text-lg font-semibold tracking-tight'>
                    先确认余额和支付方式，再完成充值
                  </div>
                  <div className='text-muted-foreground mt-1 text-sm leading-6'>
                    钱包页优先解决普通余额和 Claude 额度充值。套餐转换、额度刷新与扣费顺序统一放在下方，避免右侧反复重复表单。
                  </div>
                </div>
                <div className='app-subtle-panel grid gap-2 px-4 py-3 text-sm'>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-muted-foreground'>普通余额</span>
                    <span className='font-semibold'>
                      {formatUsdAmount(quotaUnitsToUsd(workspace.user?.quota ?? 0))}
                    </span>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-muted-foreground'>Claude 余额</span>
                    <span className='font-semibold'>
                      {formatUsdAmount(
                        quotaUnitsToUsd(workspace.user?.claude_quota ?? 0)
                      )}
                    </span>
                  </div>
                  <div className='flex items-center justify-between gap-3'>
                    <span className='text-muted-foreground'>生效订阅</span>
                    <span className='font-semibold'>
                      {workspace.subscriptionData?.subscriptions?.length ?? 0}
                    </span>
                  </div>
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
              compact
            />

            <WalletPagePanels
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
              showBalancePanels={false}
            />
          </div>
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
