import { ExternalLink, Gift, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface RedemptionCodePanelProps {
  title?: string
  description?: string
  topupLink?: string
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  className?: string
  compact?: boolean
}

export function RedemptionCodePanel(props: RedemptionCodePanelProps) {
  return (
    <div className={cn('app-page-shell p-4', props.className)}>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
            <Gift className='text-primary h-4 w-4' />
            {props.title || '兑换码'}
          </div>
          <div className='text-muted-foreground mt-1 max-w-2xl text-xs leading-5'>
            {props.description ||
              '输入管理员发放或线下购买的兑换码，成功后会立即写入对应余额、套餐或权益。'}
          </div>
        </div>
        {props.topupLink ? (
          <Button
            variant='outline'
            size='sm'
            render={
              <a
                href={props.topupLink}
                target='_blank'
                rel='noopener noreferrer'
              />
            }
          >
            获取兑换码
            <ExternalLink data-icon='inline-end' />
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          'mt-4 grid gap-2',
          props.compact
            ? 'grid-cols-[minmax(0,1fr)_auto]'
            : 'sm:grid-cols-[minmax(0,1fr)_auto]'
        )}
      >
        <Input
          value={props.redemptionCode}
          onChange={(event) => props.onRedemptionCodeChange(event.target.value)}
          placeholder='输入兑换码'
          className='h-10 min-w-0'
        />
        <Button
          onClick={props.onRedeem}
          disabled={props.redeeming}
          className='h-10 px-5'
        >
          {props.redeeming ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            '立即兑换'
          )}
        </Button>
      </div>
    </div>
  )
}
