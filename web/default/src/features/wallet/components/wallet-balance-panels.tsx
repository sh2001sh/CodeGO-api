import { Activity, Gift, Loader2, WalletCards } from 'lucide-react'
import { formatUsdAmount, quotaUnitsToUsd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { UserWalletData } from '../types'
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
            value={formatUsdAmount(quotaUnitsToUsd(props.user?.claude_quota ?? 0))}
          />
          <WalletStatItem
            label='累计消耗'
            value={formatUsdAmount(quotaUnitsToUsd(props.user?.used_quota ?? 0))}
          />
          <WalletStatItem
            label='API 请求'
            value={(props.user?.request_count ?? 0).toLocaleString()}
            icon={
              <Activity className='text-muted-foreground h-4 w-4' />
            }
          />
        </div>
      </div>

      <div className='app-page-shell p-4'>
        <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
          <Gift className='text-primary h-4 w-4' />
          兑换码
        </div>
        <div className='text-muted-foreground mt-1 text-xs leading-5'>
          适合线下充值或管理员发放的补充额度，兑换后会立即计入对应余额池。
        </div>
        <div className='mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
          <Input
            value={props.redemptionCode}
            onChange={(event) => props.onRedemptionCodeChange(event.target.value)}
            placeholder='输入兑换码'
            className='h-10'
          />
          <Button
            onClick={props.onRedeem}
            disabled={props.redeeming}
            className='h-10 px-4'
          >
            {props.redeeming ? <Loader2 className='h-4 w-4 animate-spin' /> : '兑换'}
          </Button>
        </div>
        {props.topupLink ? (
          <a
            href={props.topupLink}
            target='_blank'
            rel='noopener noreferrer'
            className='text-muted-foreground hover:text-foreground mt-3 inline-flex text-xs underline-offset-4 hover:underline'
          >
            获取兑换码
          </a>
        ) : null}
      </div>
    </div>
  )
}
