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
      description='先看你当前生效中的订阅，再决定购买新的月卡或日卡。套餐页只处理订阅，不再混入充值主流程。'
      main={
        <div className='space-y-4'>
          <div className='app-page-shell flex items-center gap-3 px-4 py-4 sm:px-5'>
            <div className='bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl shadow-[0_12px_26px_rgba(217,106,57,0.2)]'>
              <Crown className='size-5' />
            </div>
            <div className='space-y-1'>
              <div className='app-section-kicker'>订阅商店</div>
              <div className='text-base font-semibold text-foreground'>
                先确认已有订阅，再选择新的主力套餐
              </div>
              <div className='text-sm text-muted-foreground'>
                月卡适合长期高频开发，日卡适合短时冲量。活动说明统一迁移到活动中心，套餐页只专注订阅判断与购买。
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
          subscriptionData={workspace.subscriptionData}
          subscriptionLoading={workspace.subscriptionLoading}
          onSubscriptionRefresh={workspace.fetchSubscriptionData}
        />
      }
    />
  )
}
