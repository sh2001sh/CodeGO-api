import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AlertCircle, ChevronDown, Gift, Loader2, Sparkles } from 'lucide-react'
import type { BlindBoxSelfData, BlindBoxTier, PaymentMethod } from '../types'
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
  onQuantityChange: (value: number) => void
  onPaymentMethodChange: (method: PaymentMethod) => void
  onPay: () => void
  onManualOpen: (count: number) => void
  onTogglePrizeNotice: () => void
  onClosePrizeNotice: () => void
}

function resolveTierRewardType(tier: BlindBoxTier) {
  if (tier.reward_type) return tier.reward_type
  if (tier.min_usd === 0 && tier.max_usd === 0) return 'prop'
  if (
    tier.wallet_type === 'claude' ||
    tier.name.toLowerCase().includes('claude')
  ) {
    return 'claude_quota'
  }
  return 'quota'
}

function formatBlindBoxTierLabel(tier: BlindBoxTier) {
  const rewardType = resolveTierRewardType(tier)
  if (rewardType === 'prop' || rewardType === 'subscription') {
    return tier.name
  }

  const amountText =
    tier.min_usd === tier.max_usd
      ? `$${tier.min_usd}`
      : `$${tier.min_usd} - $${tier.max_usd}`

  if (rewardType === 'claude_quota') {
    return `${amountText} Claude 额度`
  }
  return `${amountText} 普通额度`
}

function groupBlindBoxTiers(tiers: BlindBoxTier[]) {
  return {
    quota: tiers.filter((tier) => resolveTierRewardType(tier) === 'quota'),
    claude: tiers.filter(
      (tier) => resolveTierRewardType(tier) === 'claude_quota'
    ),
    props: tiers.filter((tier) => resolveTierRewardType(tier) === 'prop'),
  }
}

export function BlindBoxCardView(props: BlindBoxCardViewProps) {
  const firstPurchaseStartUSD = props.data?.first_purchase_guarantee_usd ?? 0
  const firstPurchaseEligible =
    props.data?.first_purchase_guarantee_eligible ?? false
  const groupedTiers = groupBlindBoxTiers(props.data?.tiers || [])

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
            <div className='text-foreground text-sm font-semibold'>盲盒奖池</div>
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
          <div className='space-y-4 text-sm'>
            <div className='rounded-xl border border-amber-500/20 bg-amber-500/5 p-3'>
              <div className='text-foreground text-sm font-semibold'>大奖包含</div>
              <div className='text-muted-foreground mt-1 text-xs leading-5'>
                80-120 美元普通额度、40-80 Claude 额度、隐藏款
                {` ${props.data?.subscription_plan_title || 'Lite 月卡'}`}
              </div>
            </div>

            <div>
              <div className='text-foreground text-sm font-semibold'>
                奖励到账说明
              </div>
              <div className='text-muted-foreground mt-2 space-y-1.5 text-xs leading-5'>
                <div>普通额度会直接进入钱包，永久有效。</div>
                <div>Claude 额度会直接进入 Claude 钱包，永久有效。</div>
                <div>道具会进入盲盒页，按规则自动生效或手动启用。</div>
              </div>
            </div>

            <div>
              <div className='text-foreground text-sm font-semibold'>常规奖池</div>
              <div className='mt-2 space-y-3'>
                <div>
                  <div className='text-foreground text-xs font-medium'>
                    普通额度
                  </div>
                  <div className='mt-1.5 space-y-2'>
                    {groupedTiers.quota.map((tier) => (
                      <div
                        key={tier.name}
                        className='flex items-center justify-between'
                      >
                        <span className='text-foreground'>
                          {formatBlindBoxTierLabel(tier)}
                        </span>
                        <span className='text-muted-foreground font-medium tabular-nums'>
                          {(tier.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className='text-foreground text-xs font-medium'>
                    Claude 额度
                  </div>
                  <div className='mt-1.5 space-y-2'>
                    {groupedTiers.claude.map((tier) => (
                      <div
                        key={tier.name}
                        className='flex items-center justify-between'
                      >
                        <span className='text-foreground'>
                          {formatBlindBoxTierLabel(tier)}
                        </span>
                        <span className='text-muted-foreground font-medium tabular-nums'>
                          {(tier.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className='text-foreground text-xs font-medium'>道具</div>
                  <div className='mt-1.5 space-y-2'>
                    {groupedTiers.props.map((tier) => (
                      <div
                        key={tier.name}
                        className='flex items-center justify-between'
                      >
                        <span className='text-foreground'>{tier.name}</span>
                        <span className='text-muted-foreground font-medium tabular-nums'>
                          {(tier.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className='text-foreground text-sm font-semibold'>隐藏款</div>
              <div className='mt-2 flex items-center justify-between'>
                <span className='text-foreground'>
                  {(props.data?.subscription_plan_title || 'Lite 月卡') + '（隐藏款）'}
                </span>
                <span className='text-muted-foreground font-medium tabular-nums'>
                  {((props.data?.subscription_prize_probability || 0) * 100).toFixed(
                    1
                  )}
                  %
                </span>
              </div>
            </div>

            <div>
              <div className='text-foreground text-sm font-semibold'>
                道具使用规则
              </div>
              <div className='text-muted-foreground mt-2 space-y-1.5 text-xs leading-5'>
                <div>充值九折卡：下次充值自动抵扣一次，仅生效 1 次。</div>
                <div>套餐九折卡：下次购买套餐自动抵扣一次，仅生效 1 次。</div>
                <div>0.95 倍率卡：在盲盒页点击使用后生效，持续 24 小时。</div>
                <div>0.9 倍率卡：在盲盒页点击使用后生效，持续 24 小时。</div>
              </div>
            </div>

            <div>
              <div className='text-foreground text-sm font-semibold'>保底规则</div>
              <div className='text-muted-foreground mt-2 space-y-1.5 text-xs leading-5'>
                <div>
                  连续 {props.data?.pity_threshold || 0} 次未获得高价值奖励后，下次将触发保底。
                </div>
                <div>
                  保底奖励按 ${(props.data?.pity_guarantee_usd || 0).toFixed(0)}{' '}
                  美元档位及以上发放。
                </div>
              </div>
            </div>

            <div>
              <div className='text-foreground text-sm font-semibold'>首抽奖励</div>
              <div className='text-muted-foreground mt-2 text-xs leading-5'>
                首购保底20刀普通额度。首次购买盲盒后，首抽普通额度最低保底 $
                {firstPurchaseStartUSD.toFixed(0)}。
              </div>
            </div>
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
