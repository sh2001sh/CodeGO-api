import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  PixelPetSprite,
  type PetProfile,
} from '@/features/gamification/pet-catalog'
import type { CompanionBuffView } from '@/features/gamification/types'
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
  const petTitle = props.petProfile?.species || '盲盒宠物'
  const petNote =
    props.petProfile?.note || '装备盲盒系宠物后，保底推进或返还效果会立刻生效。'
  const petSkillName = props.petSkill
    ? `${props.petSkill.name} ${props.petSkill.value_text}`.trim()
    : '盲盒联动'
  const petSkillDescription =
    props.petSkill?.description ||
    '盲盒系宠物会缩短保底触发次数，或在开盒时返还额外额度。'

  return (
    <div className='space-y-4'>
      <div className='overview-hero-card p-4 sm:p-5'>
        <div className='grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)] xl:items-center'>
          <div>
            <div className='flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground'>
              <Sparkles className='size-4 text-amber-500' />
              <span>盲盒概览</span>
              {firstPurchaseEligible ? (
                <span className='ios-pill px-2.5 py-0.5 text-[11px] text-primary'>
                  首购保底进行中
                </span>
              ) : null}
            </div>
            <h3 className='mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl'>
              {firstPurchaseEligible
                ? `首次开盒至少拿 ${firstPurchaseStartUSD.toFixed(2)} 美元额度`
                : '购买盲盒，抽取随机额度奖励'}
            </h3>
            <p className='mt-3 max-w-2xl text-sm leading-7 text-muted-foreground'>
              {firstPurchaseEligible
                ? '首购福利会直接抬高第一次开盒收益，奖励到账后优先用于 API 消耗扣费。处理完首购后，再根据保底进度安排后续开盒。'
                : '开出的额度优先用于 API 消耗扣费，连续未开出高额奖励时会累积保底，到达门槛后保证最低收益。'}
            </p>
            <div className='mt-4 grid gap-3 md:grid-cols-4'>
              <MetricCard
                label='盲盒额度'
                value={formatQuota(props.data?.overview?.remaining_quota || 0)}
              />
              <MetricCard
                label='待开奖盲盒'
                value={String(props.availableBoxes)}
              />
              <MetricCard
                label='活跃额度份数'
                value={String(props.data?.overview?.active_credit_count || 0)}
              />
              <MetricCard
                label='保底进度'
                value={`${props.pityProgress}/${props.effectivePityThreshold}`}
              />
            </div>
          </div>

          <div className='space-y-3'>
            <div className='app-subtle-panel p-4'>
              <div className='text-muted-foreground text-[11px] font-medium'>
                当前盲盒余额
              </div>
              <div className='mt-2 text-3xl font-semibold tracking-tight text-foreground'>
                {formatQuota(props.data?.overview?.remaining_quota || 0)}
              </div>
              <div className='mt-2 text-xs leading-5 text-muted-foreground'>
                最近到期 {formatBlindBoxTimestamp(props.data?.overview?.next_expire_at)}
              </div>
            </div>
            <div className='app-subtle-panel p-4'>
              <div className='text-muted-foreground text-[11px] font-medium'>
                当前建议
              </div>
              <div className='mt-2 text-base font-semibold text-foreground'>
                {firstPurchaseEligible
                  ? '先完成首购福利，再看是否继续冲保底'
                  : props.availableBoxes > 0
                    ? `先处理 ${props.availableBoxes} 个待开奖盲盒`
                    : '直接根据保底进度安排下一轮购买'}
              </div>
              <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                奖励到账后会优先用于 API 消耗扣费，建议及时开启待开奖盲盒。
              </div>
            </div>
          </div>
        </div>

        <div className='mt-4'>
          <ActiveCreditList credits={props.activeCredits} />
        </div>
      </div>

      <div className='app-page-shell p-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <div className='text-muted-foreground flex items-center gap-2 text-[11px] font-medium'>
              <Sparkles className='size-4 text-amber-500' />
              盲盒活动
            </div>
            <h3 className='text-foreground mt-2 text-2xl font-semibold tracking-[-0.03em]'>
              盲盒购买与开奖
            </h3>
          </div>
          <div className='ios-pill px-3 py-1 text-xs font-medium text-foreground'>
            单盒 {props.data?.unit_price?.toFixed(1) || '0.0'} 元
          </div>
        </div>

        <div className='ios-floating-shell mt-5 p-4'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <div className='text-foreground text-base font-semibold'>
                本轮购买设置
              </div>
              <div className='text-muted-foreground text-sm'>
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
              <div className='text-foreground text-sm font-medium'>
                购买数量
              </div>
              {firstPurchaseEligible ? (
                <div className='border-border/70 bg-background/72 text-foreground mt-3 rounded-2xl border px-4 py-3 text-sm font-semibold'>
                  首购保底已生效，本次至少获得 {firstPurchaseStartUSD.toFixed(2)} 美元额度
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
                <div className='text-muted-foreground text-sm'>
                  自定义数量
                </div>
              </div>
            </div>

            <div>
              <div className='text-foreground text-sm font-medium'>
                支付方式
              </div>
              <PaymentMethodSelector
                methods={props.data?.pay_methods || []}
                current={props.selectedPaymentMethod}
                disabled={!props.data?.enabled || props.loading}
                onSelect={props.onPaymentMethodChange}
              />
            </div>

            <div className='app-subtle-panel p-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <div className='text-muted-foreground text-[11px] font-medium'>
                    应付金额
                  </div>
                  <div className='text-foreground mt-1 text-2xl font-semibold'>
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
              <div className='border-border/70 bg-background/72 text-foreground rounded-2xl border p-4 text-sm'>
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
                    <div className='border-border/70 text-muted-foreground border-t pt-3'>
                      连续开出低于 {props.data?.low_reward_threshold_usd || 0} 美元的奖励达到门槛后，下一次至少获得 {props.data?.pity_guarantee_usd || 0} 美元奖励。
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='text-muted-foreground hover:text-foreground h-8 w-8 shrink-0'
                    onClick={props.onClosePrizeNotice}
                  >
                    <X className='size-4' />
                  </Button>
                </div>
              </div>
            ) : null}
            <div className='app-subtle-panel p-4'>
              <div className='text-foreground text-sm font-medium'>
                {props.remainingPity > 0
                  ? `还差 ${props.remainingPity} 次低档奖励触发保底`
                  : '下一次低档奖励将直接进入保底结算'}
              </div>
              <div className='text-muted-foreground mt-2 text-sm'>
                当前进度 {props.pityProgress}/{props.effectivePityThreshold}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='app-page-shell p-4'>
        <div className='text-muted-foreground flex items-center gap-2 text-[11px] font-medium'>
          当前出战宠物
        </div>
        <div className='mt-4 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]'>
          <div className='app-subtle-panel p-4'>
            <div className='aspect-square rounded-[20px] border border-border/70 bg-background/80 p-3'>
              {props.petProfile ? (
                <PixelPetSprite id={props.petProfile.id} label={petTitle} />
              ) : (
                <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
                  暂无宠物
                </div>
              )}
            </div>
          </div>
          <div className='space-y-4'>
            <div>
              <div className='text-foreground text-2xl font-semibold'>
                {petTitle}
              </div>
              <div className='text-muted-foreground mt-2 text-sm leading-6'>
                {petNote}
              </div>
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='app-subtle-panel p-4'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  技能效果
                </div>
                <div className='text-foreground mt-2 text-base font-semibold'>
                  {petSkillName}
                </div>
                <div className='text-muted-foreground mt-2 text-sm leading-6'>
                  {petSkillDescription}
                </div>
              </div>
              <div className='app-subtle-panel p-4'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  当前进度
                </div>
                <div className='text-foreground mt-2 text-base font-semibold'>
                  {props.remainingPity > 0
                    ? `距离保底还差 ${props.remainingPity} 次`
                    : '下一次低档奖励直接保底'}
                </div>
                <div className='text-muted-foreground mt-2 text-sm leading-6'>
                  当前保底进度 {props.pityProgress}/{props.effectivePityThreshold}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {props.availableBoxes > 0 ? (
        <div className='app-page-shell p-4'>
          <div className='text-foreground flex items-center gap-2 text-base font-semibold'>
            <CircleAlert className='size-4' />
            待处理盲盒
          </div>
          <div className='text-muted-foreground mt-1 text-sm leading-6'>
            当前还有 {props.availableBoxes}{' '}
            个盲盒未处理，通常来自历史订单或支付回调延迟。你可以直接补开奖，不会重复扣费。
          </div>
          <Button
            type='button'
            variant='outline'
            className='mt-4'
            onClick={() => props.onManualOpen(props.availableBoxes)}
            disabled={props.openingCount !== null}
          >
            {props.openingCount === props.availableBoxes
              ? '补开奖中...'
              : `立即补开 ${props.availableBoxes} 个`}
          </Button>
        </div>
      ) : null}

      <div className='app-page-shell p-4'>
        <div className='flex items-center justify-between gap-3'>
          <div className='text-foreground text-base font-semibold'>
            最近掉落
          </div>
          <div className='ios-pill px-3 py-1 text-xs font-medium text-muted-foreground'>
            <WandSparkles className='mr-1 inline size-3.5' />
            实时同步
          </div>
        </div>
        <div className='mt-3'>
          <DropRecordList records={props.data?.overview?.recent_records || []} />
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
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background/80 text-foreground hover:border-foreground'
      )}
    >
      x{props.value}
    </button>
  )
}
