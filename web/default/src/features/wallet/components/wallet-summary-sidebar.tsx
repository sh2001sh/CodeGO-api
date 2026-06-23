import { Link } from '@tanstack/react-router'
import { Activity, ArrowRight, WalletCards } from 'lucide-react'
import { formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import type { UserWalletData } from '../types'
import { WalletStatItem } from './wallet-panel-primitives'

interface WalletSummarySidebarProps {
  user: UserWalletData | null
  activeSubscriptionCount: number
}

export function WalletSummarySidebar(props: WalletSummarySidebarProps) {
  return (
    <aside className='space-y-4 lg:sticky lg:top-4'>
      <div className='app-page-shell p-4'>
        <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
          <WalletCards className='text-primary h-4 w-4' />
          钱包余额
        </div>
        <div className='text-foreground mt-3 font-mono text-3xl font-bold tracking-tight tabular-nums'>
          {formatUsdAmount(quotaUnitsToUsd(props.user?.quota ?? 0))}
        </div>
        <div className='mt-4 grid gap-2'>
          <WalletStatItem
            label='Claude 余额'
            value={formatUsdAmount(
              quotaUnitsToUsd(props.user?.claude_quota ?? 0)
            )}
          />
          <WalletStatItem
            label='累计消耗'
            value={formatUsdAmount(
              quotaUnitsToUsd(props.user?.used_quota ?? 0)
            )}
          />
          <WalletStatItem
            label='API 请求'
            value={(props.user?.request_count ?? 0).toLocaleString()}
            icon={<Activity className='text-muted-foreground h-4 w-4' />}
          />
          <WalletStatItem
            label='生效订阅'
            value={`${props.activeSubscriptionCount}`}
          />
        </div>
      </div>

      <div className='app-subtle-panel p-4'>
        <div className='text-foreground text-sm font-semibold'>活动入口</div>
        <div className='text-muted-foreground mt-2 text-xs leading-5'>
          盲盒、邀请刷新、积分商城和 Claude 转换说明都可以从这里进入。
        </div>
        <Button
          variant='outline'
          className='mt-3 w-full justify-between'
          render={<Link to='/activities' />}
        >
          <span>打开活动中心</span>
          <ArrowRight data-icon='inline-end' />
        </Button>
      </div>
    </aside>
  )
}
