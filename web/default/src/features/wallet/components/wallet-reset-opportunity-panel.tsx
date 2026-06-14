import { Link } from '@tanstack/react-router'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SubscriptionResetOpportunitySummary } from '@/features/subscriptions/types'
import { WalletStatItem } from './wallet-panel-primitives'

interface WalletResetOpportunityPanelProps {
  resetOpportunity: SubscriptionResetOpportunitySummary
  currentSubscriptionTitle?: string
  canUseResetOpportunity: boolean
  usingResetOpportunity: boolean
  onUseResetOpportunity: () => void
}

export function WalletResetOpportunityPanel(
  props: WalletResetOpportunityPanelProps
) {
  return (
    <div className='app-page-shell p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
            <Sparkles className='text-warning h-4 w-4' />
            额度重置机会
          </div>
          <div className='text-muted-foreground mt-1 text-xs leading-5'>
            邀请新用户首购月卡后获得，机会可长期保存。每个自然月最多使用 1 次。
          </div>
        </div>
        <div className='border-border bg-background/80 text-foreground rounded-full border px-3 py-1 text-xs font-semibold'>
          可用 {props.resetOpportunity.available_count} 次
        </div>
      </div>

      <div className='mt-3 grid gap-2 sm:grid-cols-3'>
        <WalletStatItem
          label='累计获得'
          value={`${props.resetOpportunity.earned_total}`}
        />
        <WalletStatItem
          label='累计使用'
          value={`${props.resetOpportunity.used_total}`}
        />
        <WalletStatItem
          label='本月状态'
          value={props.resetOpportunity.used_this_month ? '已使用' : '可使用'}
        />
      </div>

      <div className='border-border/70 bg-background/72 text-muted-foreground mt-3 rounded-2xl border px-3 py-3 text-xs'>
        <div className='text-foreground font-medium'>
          当前会作用于：{props.currentSubscriptionTitle || '暂无生效订阅'}
        </div>
        <div className='mt-1 leading-5'>
          只清空当前排序第 1 个生效订阅的已用额度，不会延长到期时间，也不会修改订阅权益。
        </div>
        {props.resetOpportunity.used_this_month ? (
          <div className='text-warning mt-2'>
            本月已经使用过一次，请下个月再使用。
          </div>
        ) : null}
      </div>

      <div className='mt-3 flex flex-wrap gap-2'>
        <Button
          className='flex-1'
          onClick={props.onUseResetOpportunity}
          disabled={!props.canUseResetOpportunity || props.usingResetOpportunity}
        >
          {props.usingResetOpportunity ? (
            <Loader2 className='mr-1 h-4 w-4 animate-spin' />
          ) : null}
          立即重置当前订阅额度
        </Button>
        <Button
          variant='outline'
          className='flex-1'
          render={<Link to='/activities' />}
        >
          去活动中心查看说明
        </Button>
      </div>
    </div>
  )
}
