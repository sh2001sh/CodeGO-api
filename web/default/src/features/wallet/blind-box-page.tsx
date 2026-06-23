import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BadgePercent, Gift, Package, Sparkles, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { getGamificationDashboard } from '@/features/gamification/api'
import { WalletWorkspaceShell } from './components/wallet-workspace-shell'
import { useWalletWorkspace } from './hooks/use-wallet-workspace'
import type { BlindBoxSelfData } from './types'
import { BlindBoxCard } from './components/blind-box-card'
import {
  BlindBoxPrizePoolDialog,
  type BlindBoxPrizeItem,
} from './components/blind-box-dialogs'
import { getBlindBoxSelf, isApiSuccess } from './api'

const BLIND_BOX_PRIZE_POOL: BlindBoxPrizeItem[] = [
  { label: '普通额度 5 USD', detail: '直接进入钱包，可立即使用。', probability: '12%', tone: 'quota' },
  { label: '普通额度 12 USD', detail: '直接进入钱包，适合补充日常调用。', probability: '18%', tone: 'quota' },
  { label: '普通额度 25 USD', detail: '直接进入钱包，适合更高频使用。', probability: '14%', tone: 'quota' },
  { label: '普通额度 50 USD', detail: '直接进入钱包，属于高价值普通奖励。', probability: '4%', tone: 'quota' },
  { label: 'Claude 额度 8 USD', detail: '直接进入 Claude 额度池，按 1:1 口径到账。', probability: '18%', tone: 'claude' },
  { label: 'Claude 额度 20 USD', detail: '直接进入 Claude 额度池，适合 Claude 高频使用。', probability: '10%', tone: 'claude' },
  { label: '充值九折卡', detail: '对应充值按九折结算。', probability: '8%', tone: 'prop' },
  { label: '套餐九折卡', detail: '对应套餐按九折结算。', probability: '8%', tone: 'prop' },
  { label: '0.95 倍率卡', detail: '启用后 24 小时内按 0.95 倍结算。', probability: '4%', tone: 'prop' },
  { label: '0.9 倍率卡', detail: '启用后 24 小时内按 0.9 倍结算。', probability: '3%', tone: 'prop' },
  { label: '免费调用次数卡（20 次）', detail: '启用后可获得额外 20 次免费调用。', probability: '1.7%', tone: 'prop' },
  { label: 'Lite 月卡', detail: '隐藏款大奖，低概率出现。', probability: '0.3%', tone: 'hidden' },
]

interface BlindBoxPageProps {
  initialPaymentStatus?: 'success' | 'pending' | 'fail'
}

export function BlindBoxPage(props: BlindBoxPageProps) {
  const workspace = useWalletWorkspace()
  const [blindBoxData, setBlindBoxData] = useState<BlindBoxSelfData | null>(null)
  const [showPrizePool, setShowPrizePool] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [boxResult] = await Promise.all([
          getBlindBoxSelf(),
          getGamificationDashboard(),
        ])
        if (!active) return
        if (isApiSuccess(boxResult) && boxResult.data) {
          setBlindBoxData(boxResult.data)
        } else {
          setBlindBoxData(null)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载盲盒页失败')
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!props.initialPaymentStatus) return
    if (props.initialPaymentStatus === 'success') {
      toast.success('支付成功，正在同步开奖结果。')
    } else if (props.initialPaymentStatus === 'pending') {
      toast.message('支付处理中，结果稍后会自动同步。')
    } else {
      toast.error('支付未完成，请重新发起购买。')
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [props.initialPaymentStatus])

  const overview = blindBoxData?.overview
  const firstPurchaseEligible = blindBoxData?.first_purchase_guarantee_eligible ?? false
  const firstPurchaseUsd = blindBoxData?.first_purchase_guarantee_usd ?? 0
  const availableBoxes = overview?.available_boxes ?? 0
  const pendingBoxes = overview?.pending_boxes ?? 0
  const activeCredits = overview?.active_credit_count ?? 0
  const latestExpireAt = overview?.next_expire_at
    ? new Date(overview.next_expire_at * 1000).toLocaleString()
    : '--'
  const effectivePityThreshold =
    overview?.effective_pity_threshold || blindBoxData?.pity_threshold || 1
  const pityProgress = overview?.pity_progress || 0
  const remainingPity = Math.max(0, effectivePityThreshold - pityProgress)

  return (
    <>
      <WalletWorkspaceShell
        title='盲盒'
        description='购买后直接抽取，普通额度进入钱包，Claude 额度进入 Claude 额度池，道具可在结果弹窗中立即启用。'
        main={
        <div className='space-y-4'>
          <div className='overview-hero-card p-4 sm:p-5'>
            <div className='grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)] xl:items-start'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground'>
                  <Sparkles className='size-4 text-amber-500' />
                  <span>盲盒购买</span>
                  <span className='ios-pill px-2.5 py-0.5 text-[11px] text-primary'>
                    {firstPurchaseEligible ? '首抽规则生效' : '常规奖池'}
                  </span>
                </div>
                <h3 className='mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl'>
                  抽中后直接到账，结果会先弹窗展示
                </h3>
                <p className='mt-3 max-w-2xl text-sm leading-7 text-muted-foreground'>
                  普通额度直接进入钱包，Claude 额度直接进入 Claude 额度池。道具类奖励可在结果弹窗里直接启用，默认持续 24 小时。
                </p>

                <div className='mt-4 grid gap-3 md:grid-cols-4'>
                  <MetricCard label='可抽次数' value={String(availableBoxes)} />
                  <MetricCard label='待处理' value={String(pendingBoxes)} />
                  <MetricCard label='活跃额度' value={String(activeCredits)} />
                  <MetricCard label='最近到期' value={latestExpireAt} />
                </div>

                <div className='mt-4 flex flex-wrap gap-2'>
                  <Button render={<Link to='/wallet' />}>
                    <ArrowRight data-icon='inline-end' />
                    查看钱包
                  </Button>
                  <Button variant='outline' render={<Link to='/packages' />}>
                    <Package data-icon='inline-start' />
                    查看套餐
                  </Button>
                </div>
              </div>

              <div className='overview-soft-card p-4'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  首抽奖励
                </div>
                <div className='mt-2 text-foreground text-base font-semibold'>
                  首次抽取优先提高实用奖励占比
                </div>
                <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                  首抽至少能拿到 {firstPurchaseUsd.toFixed(2)} USD 的奖励保底。
                </div>

                <div className='mt-4'>
                  <Progress value={firstPurchaseEligible ? 100 : 0} />
                </div>
                <div className='text-muted-foreground mt-2 text-xs leading-5'>
                  {firstPurchaseEligible
                    ? `首抽规则已生效，本次至少可获得 ${firstPurchaseUsd.toFixed(2)} USD`
                    : '当前使用常规奖池。'}
                </div>
              </div>
            </div>
          </div>

          <div className='app-page-shell p-4 sm:p-5'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='app-section-kicker'>购买栏</div>
                <div className='mt-1 text-foreground text-lg font-semibold tracking-tight'>
                  购买后直接抽取，奖池可单独查看
                </div>
              </div>
              <Button variant='outline' size='sm' onClick={() => setShowPrizePool(true)}>
                查看奖池
              </Button>
            </div>

            <div className='mt-4'>
              <BlindBoxCard
                onSubscriptionRefresh={workspace.fetchSubscriptionData}
                onUserRefresh={workspace.fetchUser}
                paymentResult={props.initialPaymentStatus}
              />
            </div>

            <div className='mt-4 grid gap-3 md:grid-cols-3'>
              <RuleTile
                icon={Ticket}
                title='普通额度到账'
                body='直接进入钱包，不再使用临时额度口径。'
              />
              <RuleTile
                icon={BadgePercent}
                title='倍率卡'
                body='在结果弹窗点击立即使用后开始生效，持续 24 小时。'
              />
              <RuleTile
                icon={Gift}
                title='大奖宣传语'
                body='大奖包括 Lite 月卡、Claude 额度和高价值实用道具。'
              />
            </div>
          </div>

          <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='app-page-shell p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div className='text-foreground text-base font-semibold'>
                  最近结果
                </div>
                <div className='ios-pill px-3 py-1 text-xs font-medium text-muted-foreground'>
                  <Sparkles className='mr-1 inline size-3.5' />
                  实时同步
                </div>
              </div>
              <div className='text-muted-foreground mt-3 text-sm leading-6'>
                当前余额按到账规则直接进入对应账户，保底进度 {pityProgress}/{effectivePityThreshold}，距离保底还差 {remainingPity} 次。
              </div>
            </div>

            <div className='space-y-4'>
              <aside className='app-page-shell p-4'>
                <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
                  <Ticket className='text-primary size-4' />
                  规则说明
                </div>
                <div className='text-muted-foreground mt-2 text-sm leading-6'>
                  抽中普通额度会直接进入钱包，Claude 额度会直接进入 Claude 额度池。倍率卡需要在结果弹窗中点击使用后才开始生效。
                </div>
              </aside>
              <aside className='app-page-shell p-4'>
                <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
                  <Gift className='text-primary size-4' />
                  奖池提示
                </div>
                <div className='mt-3 space-y-2 text-sm leading-6 text-muted-foreground'>
                  <div>普通额度和 Claude 额度都能抽到，普通额度不再以临时额度展示。</div>
                  <div>充值九折卡和套餐九折卡可直接影响对应购买。</div>
                  <div>Lite 月卡属于隐藏款，概率为 0.3%。</div>
                </div>
                <Button className='mt-4 w-full justify-between' variant='outline' onClick={() => setShowPrizePool(true)}>
                  <span>展开完整奖池</span>
                  <ArrowRight data-icon='inline-end' />
                </Button>
              </aside>
              <aside className='app-page-shell p-4'>
                <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
                  <Sparkles className='text-primary size-4' />
                  当前状态
                </div>
                <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                  可用金额会直接写入钱包，最近到期时间 {latestExpireAt}。
                </div>
              </aside>
            </div>
          </div>
        </div>
      }
        sidebar={null}
        framedMain={false}
      />
      <BlindBoxPrizePoolDialog
        open={showPrizePool}
        onOpenChange={setShowPrizePool}
        items={BLIND_BOX_PRIZE_POOL}
      />
    </>
  )
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div className='overview-soft-card p-3'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='text-foreground mt-1 text-base font-semibold'>
        {props.value}
      </div>
    </div>
  )
}

function RuleTile(props: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  const Icon = props.icon
  return (
    <div className='overview-soft-card flex items-start gap-3 p-4'>
      <span className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl'>
        <Icon className='size-4' />
      </span>
      <div className='min-w-0'>
        <div className='text-foreground text-sm font-semibold'>{props.title}</div>
        <div className='text-muted-foreground mt-1 text-sm leading-6'>{props.body}</div>
      </div>
    </div>
  )
}
