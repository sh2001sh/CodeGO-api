import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PixelPetSprite,
  getBlindBoxPetHighlights,
} from '@/features/gamification/pet-catalog'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CircleAlert, Loader2, Sparkles, WandSparkles, X } from 'lucide-react'
import type {
  BlindBoxCredit,
  BlindBoxSelfData,
  PaymentMethod,
} from '../types'
import { formatBlindBoxTimestamp } from './blind-box-dialogs'
import {
  ActiveCreditList,
  DropRecordList,
  MetricCard,
  PaymentMethodSelector,
} from './blind-box-view-parts'

interface BlindBoxCardViewProps {
  data: BlindBoxSelfData | null
  loading: boolean
  selectedQuantity: number
  selectedPaymentMethod: PaymentMethod | null
  amountDue: number
  paying: boolean
  openingCount: number | null
  availableBoxes: number
  effectivePityThreshold: number
  pityProgress: number
  remainingPity: number
  activeCredits: BlindBoxCredit[]
  showPrizeNotice: boolean
  onQuantityChange: (value: number) => void
  onPaymentMethodChange: (method: PaymentMethod) => void
  onPay: () => void
  onManualOpen: (count: number) => void
  onTogglePrizeNotice: () => void
  onClosePrizeNotice: () => void
}

const showcasePet = getBlindBoxPetHighlights()[0]

export function BlindBoxCardView(props: BlindBoxCardViewProps) {
  const firstPurchaseStartUSD = props.data?.first_purchase_guarantee_usd ?? 0
  const firstPurchaseEligible =
    props.data?.first_purchase_guarantee_eligible ?? false

  return (
    <div className='grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]'>
      <div className='overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_24%),linear-gradient(145deg,rgba(255,255,255,0.98),rgba(255,247,237,0.98),rgba(248,250,252,0.98))] p-4 shadow-[0_26px_90px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_24%),linear-gradient(145deg,rgba(30,20,8,0.96),rgba(15,23,42,0.96),rgba(17,24,39,0.94))]'>
        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400'>
                  <Sparkles className='size-4 text-amber-500' />
                  盲盒活动
                </div>
                <h3 className='mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                  盲盒购买与开奖
                </h3>
              </div>
              <div className='rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'>
                单盒 {props.data?.unit_price?.toFixed(1) || '0.0'} 元
              </div>
            </div>

            {showcasePet ? (
              <div className='grid gap-4 rounded-[28px] border border-slate-200 bg-white/84 p-4 dark:border-slate-800 dark:bg-slate-950/58 md:grid-cols-[220px_minmax(0,1fr)]'>
                <div className='rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#fff7ed,#fffbeb)] p-4 dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(30,41,59,0.88))]'>
                  <div className='aspect-square rounded-[20px] border border-slate-200 bg-white/85 p-3 dark:border-slate-700 dark:bg-slate-950/80'>
                    <PixelPetSprite id={showcasePet.id} label={showcasePet.species} />
                  </div>
                </div>
                <div className='flex flex-col justify-between gap-4'>
                  <div className='text-xl font-semibold text-slate-950 dark:text-slate-50'>
                    {showcasePet.species}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className='space-y-3'>
            <MetricCard label='待开奖盲盒' value={String(props.availableBoxes)} />
            <MetricCard
              label='盲盒额度'
              value={formatQuota(props.data?.overview?.remaining_quota || 0)}
            />
            <MetricCard
              label='最近到期'
              value={formatBlindBoxTimestamp(props.data?.overview?.next_expire_at)}
            />
            <MetricCard
              label='保底进度'
              value={`${props.pityProgress}/${props.effectivePityThreshold}`}
            />
          </div>
        </div>

        <div className='mt-5 rounded-[28px] border border-slate-200 bg-white/82 p-4 dark:border-slate-800 dark:bg-slate-950/58'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <div className='text-base font-semibold text-slate-950 dark:text-slate-50'>
                本轮购买设置
              </div>
              <div className='text-sm text-slate-500 dark:text-slate-400'>
                今日已购 {props.data?.overview?.purchased_today || 0}/
                {props.data?.daily_limit || 0}，本月已购{' '}
                {props.data?.overview?.purchased_this_month || 0}/
                {props.data?.monthly_limit || 0}
              </div>
            </div>
            <Badge variant={props.data?.enabled ? 'default' : 'secondary'}>
              {props.data?.enabled ? '活动进行中' : '暂未开放'}
            </Badge>
          </div>

          <div className='mt-4 space-y-4'>
            <div>
              <div className='text-sm font-medium text-slate-900 dark:text-slate-100'>
                购买数量
              </div>
              {firstPurchaseEligible ? (
                <div className='mt-3 rounded-2xl border border-rose-300 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'>
                  首次开盒额度最低 {firstPurchaseStartUSD.toFixed(2)} 美元起
                </div>
              ) : null}
              <div className='mt-3 flex flex-wrap gap-2'>
                {(props.data?.count_options || [1, 3, 5, 10]).map((value) => (
                  <QuantityChip
                    key={value}
                    value={value}
                    current={props.selectedQuantity}
                    onSelect={props.onQuantityChange}
                  />
                ))}
              </div>
              <div className='mt-3 flex items-center gap-2'>
                <Input
                  type='number'
                  min={1}
                  value={props.selectedQuantity}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    props.onQuantityChange(
                      Number.isFinite(value) && value > 0 ? value : 1
                    )
                  }}
                  className='max-w-28'
                  disabled={!props.data?.enabled || props.loading}
                />
                <div className='text-sm text-slate-500 dark:text-slate-400'>
                  自定义数量
                </div>
              </div>
            </div>

            <div>
              <div className='text-sm font-medium text-slate-900 dark:text-slate-100'>
                支付方式
              </div>
              <PaymentMethodSelector
                methods={props.data?.pay_methods || []}
                current={props.selectedPaymentMethod}
                disabled={!props.data?.enabled || props.loading}
                onSelect={props.onPaymentMethodChange}
              />
            </div>

            <div className='rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/80'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <div className='text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>
                    应付金额
                  </div>
                  <div className='mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50'>
                    {props.amountDue.toFixed(2)} 元
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={props.onTogglePrizeNotice}
                  >
                    查看奖池
                  </Button>
                  <Button
                    onClick={props.onPay}
                    disabled={
                      !props.data?.enabled ||
                      props.paying ||
                      !props.selectedPaymentMethod
                    }
                    className='min-w-36'
                  >
                    {props.paying ? (
                      <>
                        <Loader2
                          data-icon='inline-start'
                          className='animate-spin'
                        />
                        发起支付中
                      </>
                    ) : (
                      '立即购买并开奖'
                    )}
                  </Button>
                </div>
              </div>
            </div>
            {props.showPrizeNotice ? (
              <div className='rounded-[24px] border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='space-y-3'>
                    {(props.data?.tiers || []).map((tier) => (
                      <div key={tier.name} className='flex items-center justify-between gap-4'>
                        <span>
                          {tier.min_usd} - {tier.max_usd} 美元额度
                        </span>
                        <span className='font-semibold'>
                          {(tier.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                    <div className='flex items-center justify-between gap-4'>
                      <span>{props.data?.subscription_plan_title || '月卡大奖'}</span>
                      <span className='font-semibold'>
                        {(
                          (props.data?.subscription_prize_probability || 0) * 100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className='border-t border-amber-200/70 pt-3 dark:border-amber-500/20'>
                      连续开出低于 {props.data?.low_reward_threshold_usd || 0} 美元的奖励达到门槛后，下一次至少获得 {props.data?.pity_guarantee_usd || 0} 美元奖励。
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 shrink-0 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-500/10'
                    onClick={props.onClosePrizeNotice}
                  >
                    <X className='size-4' />
                  </Button>
                </div>
              </div>
            ) : null}
            <div className='rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/80'>
              <div className='text-sm font-medium text-slate-900 dark:text-slate-100'>
                {props.remainingPity > 0
                  ? `还差 ${props.remainingPity} 次低档奖励触发保底`
                  : '下一次低档奖励将直接进入保底结算'}
              </div>
              <div className='mt-2 text-sm text-slate-500 dark:text-slate-400'>
                当前进度 {props.pityProgress}/{props.effectivePityThreshold}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='space-y-4'>
        <div className='rounded-[30px] border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800'>
          <div className='text-base font-semibold text-slate-950 dark:text-slate-50'>
            盲盒额度使用情况
          </div>

          <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1'>
            <MetricCard
              label='临时额度余额'
              value={formatQuota(props.data?.overview?.remaining_quota || 0)}
              hint={`最近到期：${formatBlindBoxTimestamp(props.data?.overview?.next_expire_at)}`}
            />
            <MetricCard
              label='活跃额度份数'
              value={String(props.data?.overview?.active_credit_count || 0)}
              hint='只要还有余额，就会优先被消耗。'
            />
          </div>

          <div className='mt-4'>
            <ActiveCreditList credits={props.activeCredits} />
          </div>
        </div>

        {props.availableBoxes > 0 ? (
          <div className='rounded-[30px] border border-amber-200 bg-amber-50/85 p-4 dark:border-amber-500/20 dark:bg-amber-500/10'>
            <div className='flex items-center gap-2 text-base font-semibold text-amber-900 dark:text-amber-100'>
              <CircleAlert className='size-4' />
              待处理盲盒
            </div>
            <div className='mt-1 text-sm leading-6 text-amber-700 dark:text-amber-200'>
              当前还有 {props.availableBoxes}{' '}
              个盲盒未处理，通常来自历史订单或支付回调延迟。你可以直接补开奖，不会重复扣费。
            </div>
            <Button
              type='button'
              variant='outline'
              className='mt-4 border-amber-300 bg-white text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10'
              onClick={() => props.onManualOpen(props.availableBoxes)}
              disabled={props.openingCount !== null}
            >
              {props.openingCount === props.availableBoxes
                ? '补开奖中...'
                : `立即补开 ${props.availableBoxes} 个`}
            </Button>
          </div>
        ) : null}

        <div className='rounded-[30px] border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800'>
          <div className='flex items-center justify-between gap-3'>
            <div className='text-base font-semibold text-slate-950 dark:text-slate-50'>
              最近掉落
            </div>
            <div className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'>
              <WandSparkles className='mr-1 inline size-3.5' />
              实时同步
            </div>
          </div>
          <div className='mt-3'>
            <DropRecordList records={props.data?.overview?.recent_records || []} />
          </div>
        </div>
      </div>
    </div>
  )
}

function QuantityChip(props: {
  value: number
  current: number
  onSelect: (value: number) => void
}) {
  const active = props.value === props.current

  return (
    <button
      type='button'
      onClick={() => props.onSelect(props.value)}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-slate-950 bg-slate-950 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-slate-950'
          : 'border-slate-200 bg-white/80 text-slate-700 hover:border-slate-950 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-emerald-400'
      )}
    >
      x{props.value}
    </button>
  )
}
