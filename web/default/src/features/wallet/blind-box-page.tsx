import { useQuery } from '@tanstack/react-query'
import { Gift } from 'lucide-react'
import { getGamificationDashboard } from '@/features/gamification/api'
import {
  PixelPetSprite,
  getBlindBoxPetHighlights,
  getPetProfile,
} from '@/features/gamification/pet-catalog'
import { WalletStatsCard } from './components/wallet-stats-card'
import { BlindBoxCard } from './components/blind-box-card'
import { WalletWorkspaceShell } from './components/wallet-workspace-shell'
import { useWalletWorkspace } from './hooks/use-wallet-workspace'

const blindBoxPets = getBlindBoxPetHighlights()

export function BlindBoxPage() {
  const workspace = useWalletWorkspace()
  const dashboardQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
  })
  const activePet = dashboardQuery.data?.data?.companion?.equipped_pet
  const activeBuff = dashboardQuery.data?.data?.companion?.active_buff
  const activeProfile = activePet
    ? getPetProfile(activePet.achievement_key)
    : null

  return (
    <WalletWorkspaceShell
      title='盲盒活动'
      description='购买盲盒、查看开奖记录与当前增益。'
      main={
        <div className='space-y-4'>
          <div className='flex items-center gap-3 rounded-[22px] border border-amber-100 bg-[linear-gradient(135deg,rgba(255,244,227,0.96),rgba(255,255,255,0.98))] px-4 py-4 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(45,24,20,0.9),rgba(15,23,42,0.88))]'>
            <div className='flex size-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm'>
              <Gift className='size-5' />
            </div>
            <div className='space-y-1'>
              <div className='text-sm font-semibold text-foreground'>
                单个盲盒 2.5 元，连续 5 次低于 5 美元后，下次保底 10 美元
              </div>
            </div>
          </div>

          <div className='rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
            <div className='grid gap-3 md:grid-cols-3'>
                <div className='rounded-2xl border bg-background/70 p-3 text-xs leading-6 text-muted-foreground'>
                  <div className='font-medium text-foreground'>01 购买盲盒</div>
                  单个盲盒价格 2.5 元，数量自由调整，不再固定几个挡位。
                </div>
                <div className='rounded-2xl border bg-background/70 p-3 text-xs leading-6 text-muted-foreground'>
                  <div className='font-medium text-foreground'>02 保底规则</div>
                  连续 5 次都低于 5 美元额度时触发保底，下次必定获得 10 美元额度。
                </div>
                <div className='rounded-2xl border bg-background/70 p-3 text-xs leading-6 text-muted-foreground'>
                  <div className='font-medium text-foreground'>03 宠物增益</div>
                  若当前出战宠物带有盲盒增益，它会减少保底所需的低奖励次数，或在每次开盒时额外返还额度。
                </div>
              </div>
          </div>

          <BlindBoxCard
            onSubscriptionRefresh={workspace.fetchSubscriptionData}
            onUserRefresh={workspace.fetchUser}
          />

          <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
              <div className='flex items-center justify-between gap-3'>
                <div className='text-sm font-semibold text-foreground'>
                  盲盒宠物示意
                </div>
                <div className='rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'>
                  相关宠物
                </div>
              </div>

              <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                {blindBoxPets.map((pet) => (
                  <div
                    key={pet.id}
                    className='rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-3 dark:border-slate-800 dark:bg-slate-900/70'
                  >
                    <div className='aspect-square rounded-[20px] bg-[linear-gradient(180deg,#ffffff,#eefbf5)] p-2'>
                      <PixelPetSprite id={pet.id} label={pet.species} />
                    </div>
                    <div className='mt-3 space-y-1'>
                      <div className='text-sm font-semibold text-foreground'>
                        {pet.species}
                      </div>
                      <div className='text-xs leading-5 text-muted-foreground'>
                        {pet.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
              <div className='text-sm font-semibold text-foreground'>当前盲盒增益</div>
              {activePet && activeBuff ? (
                <div className='mt-4 space-y-3'>
                  <div className='flex items-center gap-3'>
                    <div className='flex size-16 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92))] p-2 shadow-xs dark:bg-slate-950/45'>
                      <PixelPetSprite
                        id={activeProfile?.id || 'gummy-shark'}
                        label={activeProfile?.species || 'active pet'}
                      />
                    </div>
                    <div>
                      <div className='text-sm font-semibold text-foreground'>
                        {activeProfile?.species || '当前宠物'}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        Lv.{activePet.level}/{activePet.max_level}
                      </div>
                    </div>
                  </div>
                  <div className='rounded-2xl border bg-background/70 p-3'>
                    <div className='text-xs text-muted-foreground'>生效增益</div>
                    <div className='mt-1 text-sm font-semibold text-foreground'>
                      {activeBuff.name} {activeBuff.value_text}
                    </div>
                    <div className='mt-1 text-xs leading-6 text-muted-foreground'>
                      {activeBuff.description}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='mt-4 rounded-2xl border border-dashed bg-background/60 p-4 text-sm leading-6 text-muted-foreground'>
                  先去宠物图鉴装备一只宠物，这里就会展示当前盲盒增益。
                </div>
              )}
            </div>
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
