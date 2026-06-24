import { Link } from '@tanstack/react-router'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SubscriptionResetOpportunitySummary } from '@/features/subscriptions/types'

interface ResetOpportunityEntryCardProps {
  resetOpportunity: SubscriptionResetOpportunitySummary
  title?: string
  description?: string
  compact?: boolean
  className?: string
}

export function ResetOpportunityEntryCard(
  props: ResetOpportunityEntryCardProps
) {
  const availableCount = props.resetOpportunity.available_count
  const monthlyState = props.resetOpportunity.used_this_month
    ? '本月已使用'
    : availableCount > 0
      ? '本月可刷新 1 次'
      : '暂无可用机会'

  return (
    <div
      className={cn(
        'app-subtle-panel p-4',
        props.className
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
            <RotateCcw className='text-warning h-4 w-4' />
            {props.title || '额度刷新机会'}
          </div>
          <div className='text-muted-foreground mt-1 text-xs leading-5'>
            {props.description ||
              '邀请新用户首购月卡后获得，用于清空当前订阅已用额度。'}
          </div>
        </div>
        <div className='border-warning/20 bg-background/80 text-foreground rounded-full border px-3 py-1 text-xs font-semibold'>
          可用 {availableCount} 次
        </div>
      </div>

      <div className='mt-3 grid gap-2 sm:grid-cols-2'>
        <div className='border-border/70 bg-background/72 rounded-xl border px-3 py-2'>
          <div className='text-muted-foreground text-[11px] font-medium'>
            当前状态
          </div>
          <div className='mt-1 text-sm font-semibold'>{monthlyState}</div>
        </div>
        <div className='border-border/70 bg-background/72 rounded-xl border px-3 py-2'>
          <div className='text-muted-foreground text-[11px] font-medium'>
            累计获得 / 使用
          </div>
          <div className='mt-1 text-sm font-semibold'>
            {props.resetOpportunity.earned_total} / {props.resetOpportunity.used_total}
          </div>
        </div>
      </div>

      <Button
        className={cn('mt-3 w-full justify-between', props.compact && 'h-9')}
        variant='outline'
        render={<Link to='/invite-rewards' />}
      >
        <span>前往邀请与刷新</span>
        <ArrowRight data-icon='inline-end' />
      </Button>
    </div>
  )
}
