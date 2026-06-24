import { Activity, WalletCards } from 'lucide-react'
import { formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
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
        <div className='mt-3 grid grid-cols-2 gap-2'>
          <div className='app-subtle-panel min-w-0 px-3 py-3'>
            <div className='text-muted-foreground text-xs'>普通余额</div>
            <div className='text-foreground mt-1 truncate font-mono text-xl font-bold tracking-tight tabular-nums'>
              {formatUsdAmount(quotaUnitsToUsd(props.user?.quota ?? 0))}
            </div>
          </div>
          <div className='app-subtle-panel min-w-0 px-3 py-3'>
            <div className='text-muted-foreground text-xs'>Claude 余额</div>
            <div className='text-foreground mt-1 truncate font-mono text-xl font-bold tracking-tight tabular-nums'>
              {formatUsdAmount(quotaUnitsToUsd(props.user?.claude_quota ?? 0))}
            </div>
          </div>
        </div>
        <div className='mt-2 grid gap-2'>
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
    </aside>
  )
}
