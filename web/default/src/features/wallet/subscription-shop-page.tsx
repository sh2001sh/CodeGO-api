import { Crown, Info } from 'lucide-react'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import { WalletWorkspaceShell } from './components/wallet-workspace-shell'
import { useWalletWorkspace } from './hooks/use-wallet-workspace'

export function SubscriptionShopPage() {
  const workspace = useWalletWorkspace()

  return (
    <WalletWorkspaceShell
      title='套餐购买'
      description='先看你当前生效中的订阅，再决定购买新的月卡或日卡。套餐默认适用于 GPT 模型；Claude 使用独立钱包额度，生效中的套餐额度可按当前规则比例转换为 Claude 额度。'
      main={
        <div className='space-y-4'>
          <div className='app-page-shell flex items-center gap-3 px-4 py-4 sm:px-5'>
            <div className='bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-2xl shadow-[0_12px_26px_rgba(217,106,57,0.2)]'>
              <Crown className='size-5' />
            </div>
            <div className='space-y-1'>
              <div className='app-section-kicker'>订阅商店</div>
              <div className='text-foreground text-base font-semibold'>
                先确认已有订阅，再选择新的主力套餐
              </div>
              <div className='text-muted-foreground text-sm'>
                月卡适合长期高频开发，日卡适合短时冲量。GPT
                模型优先使用套餐额度，Claude 模型请在钱包中单独充值 Claude
                额度，也可将生效套餐按规则转换为 Claude 额度。
              </div>
            </div>
          </div>

          <div className='app-page-shell flex items-start gap-3 border-orange-500/20 bg-orange-500/8 px-4 py-3 sm:px-5'>
            <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-700 dark:text-orange-300'>
              <Info className='size-4' />
            </div>
            <div className='space-y-1'>
              <div className='text-foreground text-sm font-semibold'>
                套餐额度仅适用于 GPT 模型
              </div>
              <div className='text-muted-foreground text-sm leading-6'>
                Claude 模型不消耗套餐额度，需使用 Claude
                独立钱包余额；生效中的套餐额度可按当前规则比例转换为 Claude
                额度。购买套餐前请按你的主要模型选择充值方式。
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
