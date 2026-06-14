import { BlindBoxCard } from './components/blind-box-card'
import { WalletWorkspaceShell } from './components/wallet-workspace-shell'
import { useWalletWorkspace } from './hooks/use-wallet-workspace'

interface BlindBoxPageProps {
  initialPaymentStatus?: 'success' | 'pending' | 'fail'
}

export function BlindBoxPage(props: BlindBoxPageProps) {
  const workspace = useWalletWorkspace()

  return (
    <WalletWorkspaceShell
      title='盲盒活动'
      description='购买盲盒抽取随机额度奖励，连续未开出高额时会累积保底。开出的额度优先用于 API 消耗扣费。'
      main={
        <div className='space-y-4'>
          <div className='app-page-shell p-4 sm:p-5'>
            <div className='app-section-kicker'>盲盒大厅</div>
            <div className='mt-2 text-foreground text-lg font-semibold tracking-tight'>
              购买盲盒，抽取随机额度奖励
            </div>
            <div className='text-muted-foreground mt-1 text-sm leading-6'>
              连续未开出高额奖励时会累积保底，到达门槛后下一次开盒保证最低收益。
            </div>
          </div>
          <BlindBoxCard
            onSubscriptionRefresh={workspace.fetchSubscriptionData}
            onUserRefresh={workspace.fetchUser}
            paymentResult={props.initialPaymentStatus}
          />
        </div>
      }
    />
  )
}
