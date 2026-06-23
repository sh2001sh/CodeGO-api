import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Gift, Package, Sparkles, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatUsdAmount } from '@/lib/format'
import { getGamificationDashboard } from '@/features/gamification/api'
import { WalletWorkspaceShell } from './components/wallet-workspace-shell'
import { useWalletWorkspace } from './hooks/use-wallet-workspace'
import type { BlindBoxRecord, BlindBoxSelfData } from './types'
import { BlindBoxCard } from './components/blind-box-card'
import { getBlindBoxSelf, isApiSuccess } from './api'

const BLIND_BOX_PRIZE_POOL = [
  { label: '5 USD', type: 'quota', probability: '10%' },
  { label: '8 USD', type: 'quota', probability: '12%' },
  { label: '12 USD', type: 'quota', probability: '15%' },
  { label: '20 USD', type: 'quota', probability: '14%' },
  { label: '35 USD', type: 'quota', probability: '7%' },
  { label: '60 USD', type: 'quota', probability: '3.7%' },
  { label: '+1 Claude', type: 'claude', probability: '12%' },
  { label: '+3 Claude', type: 'claude', probability: '11%' },
  { label: '+5 Claude', type: 'claude', probability: '8%' },
  { label: '+10 Claude', type: 'claude', probability: '5%' },
  { label: '充值九折卡', type: 'prop', probability: '5%' },
  { label: '套餐九折卡', type: 'prop', probability: '4%' },
  { label: '0.95 倍率卡', type: 'prop', probability: '7%' },
  { label: '0.9 倍率卡', type: 'prop', probability: '6%' },
  { label: '免费调用次数卡（20 次）', type: 'prop', probability: '2.3%' },
  { label: 'Lite 月卡', type: 'hidden', probability: '0.3%' },
] as const

const FIRST_DRAW_POOL = [
  '12 USD',
  '20 USD',
  '+3 Claude',
  '+5 Claude',
  '充值九折卡',
  '套餐九折卡',
  '0.95 倍率卡',
]

interface BlindBoxPageProps {
  initialPaymentStatus?: 'success' | 'pending' | 'fail'
}

type RewardCategory = 'quota' | 'claude' | 'prop' | 'subscription'

type DisplayRecord = BlindBoxRecord & {
  categoryLabel: string
  rewardLabel: string
  badgeTone: string
}

function buildDisplayRecords(records: BlindBoxRecord[]): DisplayRecord[] {
  return records.map((record) => {
    const rewardType = String(record.reward_type || '')
    const category: RewardCategory =
      rewardType === 'subscription'
        ? 'subscription'
        : rewardType === 'claude'
          ? 'claude'
          : rewardType === 'prop'
            ? 'prop'
            : 'quota'

    return {
      ...record,
      categoryLabel:
        category === 'subscription'
          ? '隐藏款'
          : category === 'claude'
            ? 'Claude'
            : category === 'prop'
              ? '道具'
              : '钱包',
      rewardLabel:
        category === 'subscription'
          ? record.reward_title || 'Lite 月卡'
          : category === 'claude'
            ? `${record.credit_amount || record.reward_usd || 0} Claude`
            : category === 'prop'
              ? record.reward_title || '实用道具'
              : `${Number(record.reward_usd || 0).toFixed(2)} USD`,
      badgeTone:
        category === 'subscription'
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : category === 'claude'
            ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
            : category === 'prop'
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    }
  })
}

export function BlindBoxPage(props: BlindBoxPageProps) {
  const workspace = useWalletWorkspace()
  const [blindBoxData, setBlindBoxData] = useState<BlindBoxSelfData | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentResult, setPaymentResult] = useState<
    BlindBoxPageProps['initialPaymentStatus']
  >(props.initialPaymentStatus)
  const [refreshKey, setRefreshKey] = useState(0)
  const [records, setRecords] = useState<DisplayRecord[]>([])
  const [selectedTab, setSelectedTab] = useState<'main' | 'pool' | 'history'>('main')

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      try {
        const [boxResult, gameResult] = await Promise.all([
          getBlindBoxSelf(),
          getGamificationDashboard(),
        ])
        if (!active) return

        if (isApiSuccess(boxResult) && boxResult.data) {
          setBlindBoxData(boxResult.data)
          setRecords(
            buildDisplayRecords(boxResult.data.overview?.recent_records ?? [])
          )
        } else {
          setBlindBoxData(null)
          setRecords([])
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载盲盒页失败')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [refreshKey])

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
  const firstPurchaseEligible =
    blindBoxData?.first_purchase_guarantee_eligible ?? false
  const firstPurchaseUsd = blindBoxData?.first_purchase_guarantee_usd ?? 0
  const pityThreshold = overview?.effective_pity_threshold ?? blindBoxData?.pity_threshold ?? 0
  const pityProgress = overview?.pity_progress ?? 0
  const remainingPity = Math.max(0, pityThreshold - pityProgress)
  const availableBoxes = overview?.available_boxes ?? 0
  const pendingBoxes = overview?.pending_boxes ?? 0
  const activeCredits = overview?.active_credit_count ?? 0
  const walletUsd = formatUsdAmount(Number(overview?.remaining_quota ?? 0))
  const latestExpireAt = overview?.next_expire_at
    ? new Date(overview.next_expire_at * 1000).toLocaleString()
    : '--'

  return (
    <WalletWorkspaceShell
      title='盲盒'
      description='抽中的普通额度会直接进入钱包，Claude 额度会直接进入 Claude 额度池，道具会直接发放到奖励中心。'
      main={
        <div className='space-y-4'>
          <div className='overview-hero-card p-4 sm:p-5'>
            <div className='grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)] xl:items-start'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground'>
                  <Sparkles className='size-4 text-amber-500' />
                  <span>盲盒抽取</span>
                  <span className='ios-pill px-2.5 py-0.5 text-[11px] text-primary'>
                    {firstPurchaseEligible ? '首抽规则生效' : '常规奖池'}
                  </span>
                </div>
                <h3 className='mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl'>
                  抽中后直接到账，结果会即时显示
                </h3>
                <p className='mt-3 max-w-2xl text-sm leading-7 text-muted-foreground'>
                  普通额度进入钱包，Claude 额度进入 Claude 额度池，道具进入奖励中心。
                  抽到后会先弹出结果，再确认收下。
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
                  首抽提示
                </div>
                <div className='mt-2 text-foreground text-base font-semibold'>
                  首次抽取优先使用首抽规则
                </div>
                <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                  首次抽取会优先给出更实用的结果，减少小额奖励占比。
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
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <div className='app-section-kicker'>抽取区</div>
                <div className='mt-1 text-foreground text-lg font-semibold tracking-tight'>
                  购买并抽取，结果会直接入账
                </div>
              </div>
              <div className='flex gap-2'>
                <Button variant={selectedTab === 'main' ? 'default' : 'outline'} size='sm' onClick={() => setSelectedTab('main')}>
                  主要操作
                </Button>
                <Button variant={selectedTab === 'pool' ? 'default' : 'outline'} size='sm' onClick={() => setSelectedTab('pool')}>
                  奖池公示
                </Button>
                <Button variant={selectedTab === 'history' ? 'default' : 'outline'} size='sm' onClick={() => setSelectedTab('history')}>
                  开奖记录
                </Button>
              </div>
            </div>

            {selectedTab === 'main' ? (
              <div className='mt-4'>
                <BlindBoxCard
                  onSubscriptionRefresh={workspace.fetchSubscriptionData}
                  onUserRefresh={workspace.fetchUser}
                  paymentResult={paymentResult}
                />
              </div>
            ) : null}

            {selectedTab === 'pool' ? (
              <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                {BLIND_BOX_PRIZE_POOL.map((item) => (
                  <div key={item.label} className='overview-soft-card p-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <div className='text-foreground text-sm font-semibold'>
                        {item.label}
                      </div>
                      <div className='border-border/70 bg-background/72 text-muted-foreground rounded-full border px-2.5 py-0.5 text-[11px] font-medium'>
                        {item.type}
                      </div>
                    </div>
                    <div className='text-muted-foreground mt-2 text-sm leading-6'>
                      概率 {item.probability}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {selectedTab === 'history' ? (
              <div className='mt-4 space-y-3'>
                {records.length > 0 ? (
                  records.map((record) => (
                    <div key={record.id} className='overview-soft-card flex items-start justify-between gap-3 p-4'>
                      <div className='min-w-0'>
                        <div className='text-foreground text-sm font-semibold'>
                          {record.rewardLabel}
                        </div>
                        <div className='text-muted-foreground mt-1 text-xs'>
                          {record.reward_title}
                        </div>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs font-medium ${record.badgeTone}`}>
                        {record.categoryLabel}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='border-border/70 bg-background/60 text-muted-foreground rounded-2xl border border-dashed px-4 py-8 text-center text-sm'>
                    还没有开奖结果。
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className='grid gap-4 xl:grid-cols-3'>
            <InfoCard title='奖励规则'>
              普通额度会直接进入钱包，Claude 额度会直接进入 Claude 额度池，道具会进入奖励中心。
            </InfoCard>
            <InfoCard title='隐藏款'>
              Lite 月卡为隐藏奖励，当前概率 0.3%。
            </InfoCard>
            <InfoCard title='首抽规则'>
              {FIRST_DRAW_POOL.join(' / ')}
            </InfoCard>
          </div>
        </div>
      }
      sidebar={
        <div className='space-y-4'>
          <aside className='app-page-shell p-4'>
            <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
              <Ticket className='text-primary size-4' />
              结果说明
            </div>
            <div className='text-muted-foreground mt-2 text-sm leading-6'>
              抽到后会弹出结果窗口，你可以直接关闭，或者点击确定收下奖励。普通额度和 Claude 额度都会按到账口径展示。
            </div>
          </aside>
          <aside className='app-page-shell p-4'>
            <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
              <Gift className='text-primary size-4' />
              道具说明
            </div>
            <div className='mt-3 space-y-2 text-sm leading-6 text-muted-foreground'>
              <div>0.95 / 0.9 倍率卡可降低后续扣费。</div>
              <div>充值九折卡和套餐九折卡可直接用于对应购买。</div>
              <div>免费调用次数卡适合短期试用。</div>
            </div>
          </aside>
        </div>
      }
      framedMain={false}
    />
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

function InfoCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div className='overview-soft-card p-4'>
      <div className='text-foreground text-sm font-semibold'>{props.title}</div>
      <div className='text-muted-foreground mt-2 text-sm leading-6'>
        {props.children}
      </div>
    </div>
  )
}
