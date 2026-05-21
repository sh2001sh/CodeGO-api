import { useQuery } from '@tanstack/react-query'
import { Gift } from 'lucide-react'
import { getGamificationDashboard } from '@/features/gamification/api'
import {
  PixelPetSprite,
  getBlindBoxPetHighlights,
  getPetProfile,
} from '@/features/gamification/pet-catalog'
import { BlindBoxCard } from './components/blind-box-card'
import { WalletStatsCard } from './components/wallet-stats-card'
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
      description='在这里购买盲盒、查看开盒记录，并了解当前宠物带来的额外收益。'
      main={
        <div className='space-y-4'>
          <div className='flex items-center gap-3 rounded-[22px] border border-amber-100 bg-[linear-gradient(135deg,rgba(255,244,227,0.96),rgba(255,255,255,0.98))] px-4 py-4 dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(45,24,20,0.9),rgba(15,23,42,0.88))]'>
            <div className='flex size-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm'>
              <Gift className='size-5' />
            </div>
            <div className='space-y-1'>
              <div className='text-foreground text-sm font-semibold'>
                单个盲盒 2.5 元；连续 5 次低奖励后，下次保底 10 美元额度。
              </div>
              <div className='text-muted-foreground text-sm'>
                盲盒奖励会按照你的扣费顺序参与结算，适合短期冲量或补充临时额度。
              </div>
            </div>
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            <div className='rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
              <div className='text-foreground text-sm font-semibold'>
                购买方式
              </div>
              <div className='text-muted-foreground mt-2 text-sm leading-6'>
                数量可自由调整，不再限制固定档位。
              </div>
            </div>
            <div className='rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
              <div className='text-foreground text-sm font-semibold'>
                保底规则
              </div>
              <div className='text-muted-foreground mt-2 text-sm leading-6'>
                连续低于 5 美元奖励达到门槛后，下次必得 10 美元额度。
              </div>
            </div>
            <div className='rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
              <div className='text-foreground text-sm font-semibold'>
                宠物加成
              </div>
              <div className='text-muted-foreground mt-2 text-sm leading-6'>
                部分宠物会缩短保底触发次数，或在开盒时返还额外额度。
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
                <div className='text-foreground text-sm font-semibold'>
                  盲盒宠物预览
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
                      <div className='text-foreground text-sm font-semibold'>
                        {pet.species}
                      </div>
                      <div className='text-muted-foreground text-xs leading-5'>
                        {pet.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
              <div className='text-foreground text-sm font-semibold'>
                当前盲盒增益
              </div>
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
                      <div className='text-foreground text-sm font-semibold'>
                        {activeProfile?.species || '当前宠物'}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        Lv.{activePet.level}/{activePet.max_level}
                      </div>
                    </div>
                  </div>
                  <div className='bg-background/70 rounded-2xl border p-3'>
                    <div className='text-muted-foreground text-xs'>
                      生效增益
                    </div>
                    <div className='text-foreground mt-1 text-sm font-semibold'>
                      {activeBuff.name} {activeBuff.value_text}
                    </div>
                    <div className='text-muted-foreground mt-1 text-xs leading-6'>
                      {activeBuff.description}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='bg-background/60 text-muted-foreground mt-4 rounded-2xl border border-dashed p-4 text-sm leading-6'>
                  先去图鉴装备一只宠物，这里就会显示当前盲盒增益。
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
