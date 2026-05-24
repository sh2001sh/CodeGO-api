import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CreditCard,
  Gift,
  Play,
  Sparkles,
  Stars,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { getSelfSubscriptionFull } from '@/features/subscriptions/api'
import type { SelfSubscriptionData } from '@/features/subscriptions/types'
import { getBlindBoxSelf } from '@/features/wallet/api'

const EMPTY_SUBSCRIPTIONS: SelfSubscriptionData = {
  billing_preference: 'subscription_first',
  funding_source_order: ['blind_box', 'subscription', 'wallet'],
  subscription_order_ids: [],
  subscriptions: [],
  all_subscriptions: [],
}

type PrimaryActionMode = 'blind_box' | 'topup' | 'subscription' | 'usage'
type PrimaryActionPath = '/blind-box' | '/wallet' | '/playground'

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '--'
  return new Date(timestamp * 1000).toLocaleString()
}

function getRemainingDays(timestamp?: number): number {
  if (!timestamp) return 0
  const now = Date.now() / 1000
  return Math.max(0, Math.ceil((timestamp - now) / 86400))
}

export function PrimaryActionCard() {
  const user = useAuthStore((state) => state.auth.user)
  const walletQuota = Number(user?.quota ?? 0)

  const blindBoxQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'primary-action', 'blind-box'],
    queryFn: async () => {
      const result = await getBlindBoxSelf()
      return result.success ? (result.data ?? null) : null
    },
    staleTime: 60 * 1000,
  })

  const subscriptionsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'primary-action', 'subscriptions'],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      return result.success
        ? (result.data ?? EMPTY_SUBSCRIPTIONS)
        : EMPTY_SUBSCRIPTIONS
    },
    staleTime: 60 * 1000,
  })

  const card = useMemo(() => {
    const blindBox = blindBoxQuery.data
    const subscriptions = subscriptionsQuery.data?.subscriptions ?? []
    const now = Date.now() / 1000
    const blindBoxQuota = Number(blindBox?.overview?.remaining_quota ?? 0)
    const totalAvailableQuota = walletQuota + blindBoxQuota
    const firstPurchaseEligible = Boolean(
      blindBox?.first_purchase_guarantee_eligible
    )
    const firstPurchaseStartUSD = Number(
      blindBox?.first_purchase_guarantee_usd ?? 10
    )
    const activeSubscription =
      subscriptions.find(
        (item) =>
          item.subscription.status === 'active' &&
          Number(item.subscription.end_time || 0) > now
      ) ?? null
    const remainingDays = getRemainingDays(
      activeSubscription?.subscription.end_time
    )
    const expiringSoon = Boolean(activeSubscription && remainingDays <= 3)

    let mode: PrimaryActionMode = 'usage'
    if (firstPurchaseEligible) {
      mode = 'blind_box'
    } else if (totalAvailableQuota <= 0) {
      mode = 'topup'
    } else if (!activeSubscription || expiringSoon) {
      mode = 'subscription'
    }

    switch (mode) {
      case 'blind_box':
        return {
          eyebrow: '盲盒首购活动',
          title: `首次开盒额度最低 ${firstPurchaseStartUSD.toFixed(2)} 美元起`,
          description:
            '支付完成后留在当前页直接开奖，常规奖池和最近掉落都在同一页处理。',
          primaryLabel: '去开盒',
          primaryTo: '/blind-box' as PrimaryActionPath,
          accentClass:
            'border-rose-200 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_24%),linear-gradient(140deg,rgba(255,241,242,0.98),rgba(255,247,237,0.98),rgba(255,255,255,0.98))] dark:border-rose-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_24%),linear-gradient(140deg,rgba(76,5,25,0.72),rgba(67,20,7,0.7),rgba(15,23,42,0.94))]',
          buttonClass:
            'bg-rose-600 text-white hover:bg-rose-500 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400',
          sideTitle: '活动说明',
          sideDescription:
            '当前账号仍可触发首购首盒活动池，首屏直接进入盲盒页即可参与。',
          chips: [
            {
              icon: Gift,
              label: `首购最低 ${firstPurchaseStartUSD.toFixed(2)} 美元起`,
            },
            {
              icon: Sparkles,
              label: `单盒 ${Number(blindBox?.unit_price ?? 2.5).toFixed(1)} 美元`,
            },
            {
              icon: CreditCard,
              label: `盲盒额度 ${formatQuota(blindBoxQuota)}`,
            },
          ],
          badge: '活动中',
        }
      case 'topup':
        return {
          eyebrow: '优先处理',
          title: '当前可用额度不足，建议先补充余额',
          description:
            '先充值再继续调用，避免高频使用时因为额度耗尽而中断请求。',
          primaryLabel: '去钱包充值',
          primaryTo: '/wallet' as PrimaryActionPath,
          accentClass:
            'border-sky-200 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_24%),linear-gradient(140deg,rgba(239,248,255,0.98),rgba(240,253,250,0.98),rgba(255,255,255,0.98))] dark:border-sky-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_24%),linear-gradient(140deg,rgba(3,37,65,0.96),rgba(15,23,42,0.95),rgba(17,24,39,0.94))]',
          buttonClass:
            'bg-sky-600 text-white hover:bg-sky-500 dark:bg-sky-500 dark:text-white dark:hover:bg-sky-400',
          sideTitle: '当前状态',
          sideDescription: `总可用额度 ${formatQuota(totalAvailableQuota)}，建议先去钱包补充后再继续调用。`,
          chips: [
            {
              icon: CreditCard,
              label: `钱包额度 ${formatQuota(walletQuota)}`,
            },
            {
              icon: Sparkles,
              label: `盲盒额度 ${formatQuota(blindBoxQuota)}`,
            },
          ],
          badge: null,
        }
      case 'subscription':
        return {
          eyebrow: activeSubscription ? '套餐续费提醒' : '推荐开通套餐',
          title: activeSubscription
            ? `当前套餐将在 ${remainingDays} 天后到期`
            : '开通套餐，锁定更稳定的总额度和周额度',
          description: activeSubscription
            ? '提前续费可以避免周额度或总额度在高频使用时中断。'
            : '如果你已经开始稳定使用，套餐比纯余额模式更容易管理成本。',
          primaryLabel: activeSubscription ? '查看套餐并续费' : '去看套餐',
          primaryTo: '/wallet' as PrimaryActionPath,
          accentClass:
            'border-emerald-200 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_24%),linear-gradient(145deg,rgba(255,255,255,0.98),rgba(240,253,250,0.98),rgba(248,250,252,0.98))] dark:border-emerald-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_24%),linear-gradient(145deg,rgba(2,6,23,0.96),rgba(15,23,42,0.95),rgba(17,24,39,0.94))]',
          buttonClass:
            'bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-400',
          sideTitle: '套餐状态',
          sideDescription: activeSubscription
            ? `到期时间：${formatDateTime(activeSubscription.subscription.end_time)}`
            : '当前没有生效中的套餐，概览页会优先提醒你处理套餐和额度。',
          chips: activeSubscription
            ? [
                {
                  icon: Stars,
                  label: `剩余 ${remainingDays} 天`,
                },
                {
                  icon: Zap,
                  label: `总额度 ${formatQuota(
                    Math.max(
                      0,
                      Number(activeSubscription.subscription.amount_total || 0) -
                        Number(activeSubscription.subscription.amount_used || 0)
                    )
                  )}`,
                },
              ]
            : [
                {
                  icon: CreditCard,
                  label: `当前可用 ${formatQuota(totalAvailableQuota)}`,
                },
              ],
          badge: activeSubscription ? '建议提前续费' : null,
        }
      case 'usage':
      default:
        return {
          eyebrow: '下一步建议',
          title: '额度和套餐状态正常，继续开始调用即可',
          description:
            '如果你还在验证模型效果，先去 Playground；如果准备接业务流量，就继续走真实 API 请求。',
          primaryLabel: '去 Playground',
          primaryTo: '/playground' as PrimaryActionPath,
          accentClass:
            'border-violet-200 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_24%),linear-gradient(140deg,rgba(248,250,252,0.98),rgba(245,243,255,0.98),rgba(255,255,255,0.98))] dark:border-violet-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_24%),linear-gradient(140deg,rgba(30,27,75,0.32),rgba(15,23,42,0.95),rgba(17,24,39,0.94))]',
          buttonClass:
            'bg-violet-600 text-white hover:bg-violet-500 dark:bg-violet-500 dark:text-white dark:hover:bg-violet-400',
          sideTitle: '当前状态',
          sideDescription: `总可用额度 ${formatQuota(totalAvailableQuota)}，可以直接继续验证模型或开始正式调用。`,
          chips: [
            {
              icon: Play,
              label: '先验证模型效果',
            },
            {
              icon: Sparkles,
              label: `总可用 ${formatQuota(totalAvailableQuota)}`,
            },
          ],
          badge: null,
        }
    }
  }, [blindBoxQuery.data, subscriptionsQuery.data, walletQuota])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[30px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.08)]',
        card.accentClass
      )}
    >
      <div
        className='pointer-events-none absolute inset-y-0 right-[-12%] w-[34%] rounded-full bg-white/20 blur-3xl dark:bg-white/5'
        aria-hidden='true'
      />
      <div className='relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between'>
        <div className='max-w-3xl'>
          <div className='flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300'>
            <Stars className='size-4' />
            {card.eyebrow}
          </div>

          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <h3 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-[2rem]'>
              {card.title}
            </h3>
            {card.badge ? (
              <span className='rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(225,29,72,0.25)]'>
                {card.badge}
              </span>
            ) : null}
          </div>

          <p className='mt-3 max-w-2xl text-sm leading-7 text-slate-700 dark:text-slate-200'>
            {card.description}
          </p>

          <div className='mt-4 flex flex-wrap gap-2'>
            {card.chips.map((chip) => {
              const Icon = chip.icon
              return (
                <div
                  key={chip.label}
                  className='inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/72 px-3 py-2 text-sm font-medium text-slate-800 backdrop-blur dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100'
                >
                  <Icon className='size-4 text-slate-700 dark:text-slate-200' />
                  {chip.label}
                </div>
              )
            })}
          </div>
        </div>

        <div className='flex w-full max-w-sm flex-col gap-3 lg:items-end'>
          <div className='w-full rounded-[24px] border border-white/55 bg-white/78 p-4 text-sm shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_18px_42px_rgba(2,6,23,0.32)]'>
            <div className='font-semibold text-slate-900 dark:text-slate-50'>
              {card.sideTitle}
            </div>
            <div className='mt-2 leading-6 text-slate-600 dark:text-slate-300'>
              {card.sideDescription}
            </div>
          </div>

          <Button
            size='lg'
            className={cn(
              'h-12 min-w-44 justify-between rounded-full px-5 shadow-[0_18px_38px_rgba(15,23,42,0.18)]',
              card.buttonClass
            )}
            render={<Link to={card.primaryTo} />}
          >
            <span>{card.primaryLabel}</span>
            <ArrowRight data-icon='inline-end' />
          </Button>
        </div>
      </div>
    </div>
  )
}
