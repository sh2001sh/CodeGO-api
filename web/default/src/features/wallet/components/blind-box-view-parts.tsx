import { Button } from '@/components/ui/button'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  BlindBoxCredit,
  BlindBoxRecord,
  PaymentMethod,
} from '../types'
import {
  formatBlindBoxTimestamp,
  getBlindBoxMethodLabel,
  resolveRewardTone,
} from './blind-box-dialogs'

export function MetricCard(props: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className='rounded-[24px] border border-white/60 bg-white/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/55'>
      <div className='text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400'>
        {props.label}
      </div>
      <div className='mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50'>
        {props.value}
      </div>
      {props.hint ? (
        <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
          {props.hint}
        </div>
      ) : null}
    </div>
  )
}

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

export function ActiveCreditList(props: { credits: BlindBoxCredit[] }) {
  if (props.credits.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400'>
        还没有活跃中的盲盒额度。
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {props.credits.map((credit) => (
        <div
          key={credit.id}
          className='rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/70'
        >
          <div className='flex items-center justify-between gap-3'>
            <div className='font-medium text-slate-900 dark:text-slate-100'>
              {credit.reward_usd.toFixed(2)} 美元掉落
            </div>
            <div className='text-slate-600 dark:text-slate-300'>
              剩余 {formatQuota(credit.remaining_amount)}
            </div>
          </div>
          <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
            到期时间：{formatBlindBoxTimestamp(credit.expires_at)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DropRecordList(props: { records: BlindBoxRecord[] }) {
  if (props.records.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400'>
        还没有盲盒开奖记录。
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {props.records.slice(0, 8).map((record) => (
        <div
          key={record.id}
          className='rounded-2xl border border-slate-200 bg-white/85 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/55'
        >
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                {record.reward_title}
              </div>
              <div className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                {formatBlindBoxTimestamp(record.create_time)}
              </div>
            </div>
            <div
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                resolveRewardTone(record)
              )}
            >
              {record.reward_type === 'subscription'
                ? '套餐大奖'
                : `${formatQuota(record.credit_amount || 0)} 额度`}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
