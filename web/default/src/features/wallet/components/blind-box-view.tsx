import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PetProfile } from '@/features/gamification/pet-catalog'
import type { CompanionBuffView } from '@/features/gamification/types'
import { cn } from '@/lib/utils'
import { AlertCircle, ChevronDown, Gift, Loader2, Sparkles } from 'lucide-react'
import type { BlindBoxSelfData, PaymentMethod } from '../types'
import { PaymentMethodSelector, PityStatusCard } from './blind-box-view-parts'

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
  showPrizeNotice: boolean
  petProfile: PetProfile | null
  petSkill: CompanionBuffView | null
  onQuantityChange: (value: number) => void
  onPaymentMethodChange: (method: PaymentMethod) => void
  onPay: () => void
  onManualOpen: (count: number) => void
  onTogglePrizeNotice: () => void
  onClosePrizeNotice: () => void
}

export function BlindBoxCardView(props: BlindBoxCardViewProps) {
  const firstPurchaseStartUSD = props.data?.first_purchase_guarantee_usd ?? 0
  const firstPurchaseEligible =
    props.data?.first_purchase_guarantee_eligible ?? false

  return (
    <div className='space-y-5'>
      {props.availableBoxes > 0 ? (
        <div className='flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-500'>
            <AlertCircle className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='text-foreground text-sm font-semibold'>
              有 {props.availableBoxes} 次待抽取
            </div>
            <div className='text-muted-foreground mt-1 text-sm leading-6'>
              来自之前的订单，立即抽取不会重复扣费
            </div>
            <Button
              type='button'
              size='sm'
              className='mt-3'
              onClick={() => props.onManualOpen(props.availableBoxes)}
              disabled={props.openingCount !== null}
            >
              {props.openingCount === props.availableBoxes
                ? '处理中...'
                : `立即抽取 ${props.availableBoxes} 次`}
            </Button>
          </div>
        </div>
      ) : null}

      <PityStatusCard
        firstPurchaseEligible={firstPurchaseEligible}
        firstPurchaseUsd={firstPurchaseStartUSD}
        pityProgress={props.pityProgress}
        pityThreshold={props.effectivePityThreshold}
        remainingPity={props.remainingPity}
        petProfile={props.petProfile}
        petSkill={props.petSkill}
      />

      <div>
        <div className='flex items-center justify-between gap-3'>
          <div className='text-foreground text-base font-semibold'>选择数量</div>
          <div className='text-muted-foreground text-sm'>
            单价 ¥{props.data?.unit_price?.toFixed(1) || '0.0'}
          </div>
        </div>

        <div className='mt-3 flex flex-wrap gap-2'>
          {(props.data?.count_options || [1, 3, 5, 10]).map((value) => (
            <QuantityChip
              key={value}
              value={value}
              current={props.selectedQuantity}
              onSelect={props.onQuantityChange}
            />
          ))}
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
            className='h-9 max-w-24'
            aria-label='自定义数量'
            disabled={!props.data?.enabled || props.loading}
          />
        </div>
      </div>

      <div>
        <div className='text-foreground text-base font-semibold'>支付方式</div>
        <PaymentMethodSelector
          methods={props.data?.pay_methods || []}
          current={props.selectedPaymentMethod}
          disabled={!props.data?.enabled || props.loading}
          onSelect={props.onPaymentMethodChange}
        />
      </div>

      <div className='app-subtle-panel p-4'>
        <div className='flex flex-wrap items-center justify-between gap-4'>
          <div>
            <div className='text-muted-foreground text-xs font-medium'>
              应付金额
            </div>
            <div className='text-foreground mt-1 text-2xl font-semibold tabular-nums'>
              ¥{props.amountDue.toFixed(2)}
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={props.onTogglePrizeNotice}
            >
              <Gift className='size-4' data-icon='inline-start' />
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
                  <Loader2 data-icon='inline-start' className='animate-spin' />
                  处理中
                </>
              ) : (
                <>
                  <Sparkles className='size-4' data-icon='inline-start' />
                  立即购买
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {props.showPrizeNotice ? (
        <div className='app-subtle-panel p-4'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div className='text-foreground text-sm font-semibold'>奖池概率</div>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={props.onClosePrizeNotice}
            >
              <ChevronDown className='size-4' />
              收起
            </Button>
          </div>
          <div className='space-y-2 text-sm'>
            {(props.data?.tiers || []).map((tier) => (
              <div key={tier.name} className='flex items-center justify-between'>
                <span className='text-foreground'>
                  ${tier.min_usd} - ${tier.max_usd}
                </span>
                <span className='text-muted-foreground font-medium tabular-nums'>
                  {(tier.probability * 100).toFixed(1)}%
                </span>
              </div>
            ))}
            <div className='flex items-center justify-between'>
              <span className='text-foreground'>
                {props.data?.subscription_plan_title || '月卡'}
              </span>
              <span className='text-muted-foreground font-medium tabular-nums'>
                {((props.data?.subscription_prize_probability || 0) * 100).toFixed(
                  1
                )}
                %
              </span>
            </div>
          </div>
          <div className='text-muted-foreground border-border/50 mt-3 border-t pt-3 text-xs leading-5'>
            连续 {props.data?.pity_threshold || 0} 次未中高价值奖励后，下次保底 $
            {props.data?.pity_guarantee_usd || 0}
          </div>
        </div>
      ) : null}
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
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background/80 text-foreground hover:border-foreground'
      )}
    >
      x{props.value}
    </button>
  )
}
