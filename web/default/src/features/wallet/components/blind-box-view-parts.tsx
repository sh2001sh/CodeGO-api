import { ShieldCheck, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { BlindBoxProp, BlindBoxRecord, PaymentMethod } from '../types'
import {
  formatBlindBoxTimestamp,
  getBlindBoxMethodLabel,
  resolveRewardTone,
} from './blind-box-dialogs'

export function PaymentMethodSelector(props: {
  methods: PaymentMethod[]
  current: PaymentMethod | null
  disabled: boolean
  onSelect: (method: PaymentMethod) => void
}) {
  return (
    <div className='mt-3 flex flex-wrap gap-2'>
      {props.methods.map((method) => (
        <Button
          key={method.type}
          type='button'
          variant={props.current?.type === method.type ? 'default' : 'outline'}
          size='sm'
          onClick={() => props.onSelect(method)}
          disabled={props.disabled}
        >
          {getBlindBoxMethodLabel(method)}
        </Button>
      ))}
    </div>
  )
}

function dropTagLabel(record: BlindBoxRecord) {
  if (record.reward_type === 'subscription') return '套餐'
  if (record.reward_type === 'prop') return '道具'
  return formatQuota(record.credit_amount || 0)
}

export function DropRecordList(props: { records: BlindBoxRecord[] }) {
  if (props.records.length === 0) {
    return (
      <div className='border-border/70 text-muted-foreground rounded-xl border border-dashed px-3 py-7 text-center text-sm'>
        还没有抽取记录
      </div>
    )
  }

  return (
    <div className='divide-border/60 divide-y'>
      {props.records.slice(0, 6).map((record) => (
        <div
          key={record.id}
          className='flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0'
        >
          <div className='min-w-0'>
            <div className='text-foreground truncate text-sm font-medium'>
              {record.reward_title}
            </div>
            <div className='text-muted-foreground mt-0.5 text-xs tabular-nums'>
              {formatBlindBoxTimestamp(record.create_time)}
            </div>
          </div>
          <div
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums',
              resolveRewardTone(record)
            )}
          >
            {dropTagLabel(record)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function BlindBoxPropsList(props: {
  props: BlindBoxProp[]
  disabled: boolean
  onUse: (prop: BlindBoxProp) => void
}) {
  const { t } = useTranslation()

  return (
    <section className='app-subtle-panel p-4'>
      <div className='text-foreground text-sm font-semibold'>
        {t('My props')}
      </div>
      <div className='text-muted-foreground mt-1 text-xs leading-5'>
        {t(
          'Use available multiplier cards here. Recharge and plan discount cards apply automatically to the next eligible order.'
        )}
      </div>
      <div className='mt-3 space-y-2'>
        {props.props.map((prop) => {
          const manual = isManualUseProp(prop)
          const available = prop.status === 'available'
          const active = prop.status === 'active'

          return (
            <div
              key={prop.id}
              className='border-border/70 bg-background/60 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5'
            >
              <div className='min-w-0'>
                <div className='text-foreground truncate text-sm font-medium'>
                  {prop.title}
                </div>
                <div className='text-muted-foreground mt-0.5 text-xs'>
                  {getPropDescription(prop, t)}
                </div>
              </div>
              {manual ? (
                <Button
                  type='button'
                  size='sm'
                  variant={active ? 'secondary' : 'default'}
                  onClick={() => props.onUse(prop)}
                  disabled={props.disabled || !available}
                >
                  {active
                    ? t('Active')
                    : available
                      ? t('Use')
                      : getPropStatusLabel(prop.status, t)}
                </Button>
              ) : (
                <span className='text-muted-foreground text-xs'>
                  {getPropStatusLabel(prop.status, t)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function isManualUseProp(prop: BlindBoxProp) {
  return [
    'consume_discount_95',
    'consume_discount_90',
    'zero_hour_multiplier',
  ].includes(prop.prop_type)
}

function getPropDescription(
  prop: BlindBoxProp,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (prop.status === 'active' && prop.expires_at) {
    return t('Active until {{date}}', {
      date: new Date(prop.expires_at * 1000).toLocaleString(),
    })
  }
  if (isManualUseProp(prop)) {
    if (prop.prop_type === 'zero_hour_multiplier') {
      return prop.status === 'available'
        ? '启用后 1 小时内可使用 zero-hour 分组，默认分组非生图模型按 0 倍率计费。'
        : 'zero-hour 分组已激活，仅限当前用户，单用户并发最多 5 个请求。'
    }
    return prop.status === 'available'
      ? t('Click Use to activate this card for {{hours}} hours.', {
          hours: Math.max(1, Math.round(prop.duration_seconds / 3600)),
        })
      : t('Multiplier card')
  }
  if (prop.status === 'available') {
    return t('Automatically applied to the next eligible order.')
  }
  return t('This prop is no longer available.')
}

function getPropStatusLabel(
  status: BlindBoxProp['status'],
  t: (key: string) => string
) {
  switch (status) {
    case 'available':
      return t('Available')
    case 'active':
      return t('Active')
    case 'reserved':
      return t('Reserved')
    case 'used':
      return t('Used')
    case 'expired':
      return t('Expired')
    default:
      return status
  }
}

export function PityStatusCard(props: {
  firstPurchaseEligible: boolean
  firstPurchaseUsd: number
  pityProgress: number
  pityThreshold: number
  remainingPity: number
}) {
  if (props.firstPurchaseEligible) {
    return (
      <div className='rounded-xl border border-primary/20 bg-primary/6 p-4'>
        <div className='flex items-start gap-3'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
            <Zap className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='text-foreground text-sm font-semibold'>
              首购保底20刀普通额度
            </div>
            <div className='text-muted-foreground mt-1 text-sm leading-6'>
              首次购买盲盒后，首抽普通额度最低保底 $
              {props.firstPurchaseUsd.toFixed(0)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pct =
    props.pityThreshold > 0
      ? Math.min(100, (props.pityProgress / props.pityThreshold) * 100)
      : 0

  return (
    <div className='app-subtle-panel p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <ShieldCheck className='text-muted-foreground size-4' />
          <span className='text-foreground text-sm font-semibold'>
            保底进度
          </span>
        </div>
        <span className='text-foreground text-sm font-semibold tabular-nums'>
          {props.pityProgress}
          <span className='text-muted-foreground font-normal'>
            {' '}
            / {props.pityThreshold}
          </span>
        </span>
      </div>
      <Progress value={pct} className='mt-3 h-2' />
      <div className='mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5'>
        <span className='text-muted-foreground text-xs'>
          {props.remainingPity > 0
            ? `再抽 ${props.remainingPity} 次可触发保底`
            : '下次开启将触发保底奖励'}
        </span>
        <span className='text-muted-foreground text-[11px]'>
          购买成功后会自动累计保底进度
        </span>
      </div>
    </div>
  )
}
