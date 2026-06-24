import { ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PetProfile } from '@/features/gamification/pet-catalog'
import type { CompanionBuffView } from '@/features/gamification/types'
import type { BlindBoxRecord, PaymentMethod } from '../types'
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

export function PityStatusCard(props: {
  firstPurchaseEligible: boolean
  firstPurchaseUsd: number
  pityProgress: number
  pityThreshold: number
  remainingPity: number
  petProfile: PetProfile | null
  petSkill: CompanionBuffView | null
}) {
  if (props.firstPurchaseEligible) {
    return (
      <div className='rounded-xl border border-amber-500/25 bg-amber-500/5 p-4'>
        <div className='flex items-start gap-3'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12 text-amber-600 dark:text-amber-400'>
            <Zap className='size-5' />
          </div>
          <div className='min-w-0 flex-1'>
            <div className='text-foreground text-sm font-semibold'>
              首抽奖励已提升
            </div>
            <div className='text-muted-foreground mt-1 text-sm leading-6'>
              首次购买盲盒后，首抽奖励从 $
              {props.firstPurchaseUsd.toFixed(0)} 档位起跳，开奖后进入常规奖池
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
  const buffAnnotation =
    props.petProfile && props.petSkill
      ? `${props.petProfile.species} ${props.petSkill.value_text}`.trim()
      : null

  return (
    <div className='app-subtle-panel p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <ShieldCheck className='text-muted-foreground size-4' />
          <span className='text-foreground text-sm font-semibold'>保底进度</span>
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
        {buffAnnotation ? (
          <span className='inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300'>
            <Sparkles className='size-3' />
            {buffAnnotation}
          </span>
        ) : null}
      </div>
    </div>
  )
}
