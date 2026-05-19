import { Crown } from 'lucide-react'
import { WalletStatsCard } from './components/wallet-stats-card'
import { WalletWorkspaceShell } from './components/wallet-workspace-shell'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { useWalletWorkspace } from './hooks/use-wallet-workspace'

export function SubscriptionShopPage() {
  const workspace = useWalletWorkspace()

  return (
    <WalletWorkspaceShell
      title='套餐购买'
      description='在这里单独查看月卡、日卡和已购套餐。购买行为不再与钱包充值混在同一个标签页。'
      main={
        <div className='space-y-4'>
          <div className='flex items-center gap-3 rounded-[22px] border border-sky-100 bg-[linear-gradient(135deg,rgba(236,248,255,0.95),rgba(255,255,255,0.98))] px-4 py-4 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.88))]'>
            <div className='flex size-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm'>
              <Crown className='size-5' />
            </div>
            <div className='space-y-1'>
              <div className='text-sm font-semibold text-foreground'>
                选择适合你的主力套餐
              </div>
              <div className='text-sm text-muted-foreground'>
                月卡适合长期高频开发，日卡适合短时冲量和专项任务。
              </div>
            </div>
          </div>

          <SubscriptionPlansCard
            topupInfo={workspace.topupInfo}
            subscriptionData={workspace.subscriptionData}
            subscriptionLoading={workspace.subscriptionLoading}
            onSubscriptionRefresh={workspace.fetchSubscriptionData}
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
  )
}
