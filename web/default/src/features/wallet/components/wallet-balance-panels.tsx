import { Activity, WalletCards } from 'lucide-react'
import { formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
import type { UserWalletData } from '../types'
import { RedemptionCodePanel } from './redemption-code-panel'
import { WalletStatItem } from './wallet-panel-primitives'

interface WalletBalancePanelsProps {
  user: UserWalletData | null
  topupLink?: string
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
}

export function WalletBalancePanels(props: WalletBalancePanelsProps) {
  return (
    <div className='grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]'>
      <div className='app-page-shell p-4'>
        <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
          <WalletCards className='text-primary h-4 w-4' />
          钱包余额
        </div>
        <div className='text-muted-foreground mt-1 text-xs leading-5'>
          核心余额统一按美元展示，Claude 专用额度与请求量保留独立口径。
        </div>
        <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <WalletStatItem
            label='普通余额'
            value={formatUsdAmount(quotaUnitsToUsd(props.user?.quota ?? 0))}
          />
          <WalletStatItem
            label='Claude 额度'
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
        </div>
      </div>

      <RedemptionCodePanel
        topupLink={props.topupLink}
        redemptionCode={props.redemptionCode}
        onRedemptionCodeChange={props.onRedemptionCodeChange}
        onRedeem={props.onRedeem}
        redeeming={props.redeeming}
        compact
      />
    </div>
  )
}
