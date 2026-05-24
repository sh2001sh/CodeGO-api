import { useQuery } from '@tanstack/react-query'
import { Gift } from 'lucide-react'
import { getGamificationDashboard } from '@/features/gamification/api'
import {
  PixelPetSprite,
  getBlindBoxPetHighlights,
} from '@/features/gamification/pet-catalog'
import { BlindBoxCard } from './components/blind-box-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import { WalletWorkspaceShell } from './components/wallet-workspace-shell'
import { useWalletWorkspace } from './hooks/use-wallet-workspace'

const blindBoxPets = getBlindBoxPetHighlights()

interface BlindBoxPageProps {
  initialPaymentStatus?: 'success' | 'pending' | 'fail'
}

export function BlindBoxPage(props: BlindBoxPageProps) {
  const workspace = useWalletWorkspace()
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })

  return (
    <WalletWorkspaceShell
      title='盲盒活动'
      description='支付后直接在当前页开奖，常规奖池、保底进度和盲盒额度使用情况都集中在这里。'
      main={
        <div className='space-y-4'>
          <BlindBoxCard
            onSubscriptionRefresh={workspace.fetchSubscriptionData}
            onUserRefresh={workspace.fetchUser}
            paymentResult={props.initialPaymentStatus}
          />

          <div className='rounded-[30px] border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-50'>
                  <Gift className='size-4 text-amber-500' />
                  相关宠物预览
                </div>
                <div className='mt-1 text-sm text-slate-500 dark:text-slate-400'>
                  盲盒系与裂变系宠物会缩短保底触发次数，或在开盒时返还额外额度。
                </div>
              </div>
              <div className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'>
                图鉴联动
              </div>
            </div>

            <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              {blindBoxPets.map((pet) => (
                <div
                  key={pet.id}
                  className='rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-3 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.88))]'
                >
                  <div className='aspect-square rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#eefbf5)] p-2 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.88))]'>
                    <PixelPetSprite id={pet.id} label={pet.species} />
                  </div>
                  <div className='mt-3'>
                    <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                      {pet.species}
                    </div>
                    <div className='mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400'>
                      {pet.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {dashboardQuery.data?.data?.companion?.active_buff ? (
              <div className='mt-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70'>
                <div className='text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>
                  当前生效中的盲盒增益
                </div>
                <div className='mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50'>
                  {dashboardQuery.data.data.companion.active_buff.name}{' '}
                  {dashboardQuery.data.data.companion.active_buff.value_text}
                </div>
                <div className='mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400'>
                  {dashboardQuery.data.data.companion.active_buff.description}
                </div>
              </div>
            ) : null}
          </div>
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
