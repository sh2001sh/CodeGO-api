import { Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { GroupBuyItem } from './types'

function formatRemaining(expiresAt: number) {
  const diff = Math.max(0, expiresAt * 1000 - Date.now())
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function nextRewardText(item: GroupBuyItem) {
  if (item.current_count < 2)
    return `再邀 1 人达到 2 人团，每人额外 +$${item.bonus_at_2}`
  if (item.current_count < 3)
    return `再邀 1 人达到 3 人团，每人额外 +$${item.bonus_at_3}`
  if (item.current_count < 5)
    return `再邀 ${5 - item.current_count} 人达到 5 人团，每人额外 +$${item.bonus_at_5}`
  return `已达到最高 5 人团奖励，每人额外 +$${item.bonus_at_5}`
}

function resolveUnlockedBonus(item: GroupBuyItem) {
  if (item.current_count >= 5) return item.bonus_at_5
  if (item.current_count >= 3) return item.bonus_at_3
  if (item.current_count >= 2) return item.bonus_at_2
  return 0
}

function resolveNextTier(item: GroupBuyItem) {
  if (item.current_count < 2) return { count: 2, bonus: item.bonus_at_2 }
  if (item.current_count < 3) return { count: 3, bonus: item.bonus_at_3 }
  if (item.current_count < 5) return { count: 5, bonus: item.bonus_at_5 }
  return null
}

export function GroupBuyCard(props: {
  item: GroupBuyItem
  onPurchase?: (item: GroupBuyItem) => void
}) {
  const progress = Math.min(
    100,
    (props.item.current_count / props.item.target_count) * 100
  )
  const full = props.item.current_count >= props.item.target_count
  const closed = props.item.status !== 'pending'
  const unlockedBonus = resolveUnlockedBonus(props.item)
  const nextTier = resolveNextTier(props.item)

  return (
    <Card className='border-border bg-card shadow-none'>
      <CardContent className='space-y-4 p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <h3 className='text-foreground text-lg font-semibold'>
              {props.item.plan_name}
            </h3>
            <p className='text-muted-foreground mt-1 text-sm'>
              现价 ¥{props.item.plan_price}，基础额度 ${props.item.base_quota_usd}
              ，最高可得 ${props.item.base_quota_usd + props.item.bonus_at_5}
            </p>
          </div>
          <span className='border-border bg-muted rounded-full border px-2.5 py-1 text-xs'>
            {props.item.current_count}/{props.item.target_count} 人
          </span>
        </div>

        <div className='grid grid-cols-2 gap-2 text-sm'>
          <MetricTile
            label='当前可结算额度'
            value={`$${props.item.base_quota_usd + unlockedBonus}`}
          />
          <MetricTile
            label='下一档目标'
            value={nextTier ? `${nextTier.count} 人团` : '已满 5 人团'}
          />
          <MetricTile
            label='下一档赠额'
            value={nextTier ? `+$${nextTier.bonus}` : `+$${props.item.bonus_at_5}`}
          />
          <MetricTile
            label='自动结算'
            value={`剩余 ${formatRemaining(props.item.expires_at)}`}
          />
        </div>

        <div className='space-y-2'>
          <div className='flex flex-wrap gap-1.5'>
            {[2, 3, 5].map((count) => {
              const active = props.item.current_count >= count
              const bonus =
                count === 2
                  ? props.item.bonus_at_2
                  : count === 3
                    ? props.item.bonus_at_3
                    : props.item.bonus_at_5
              return (
                <div
                  key={count}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs',
                    active
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground'
                  )}
                >
                  {count} 人团 +${bonus}
                </div>
              )
            })}
          </div>
          <Progress value={progress} />
        </div>

        <div className='text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm'>
          <span>{nextRewardText(props.item)}</span>
          <span className='flex items-center gap-1 tabular-nums'>
            <Clock3 className='h-4 w-4' />
            满 5 人或 48 小时自动结算
          </span>
        </div>

        <Button
          className='w-full'
          disabled={props.item.joined || full || closed}
          onClick={() => props.onPurchase?.(props.item)}
        >
          {props.item.joined
            ? '已参团'
            : full
              ? '已满员'
              : closed
                ? '已结算'
                : props.item.id > 0
                  ? '参与拼团'
                  : '进入拼团'}
        </Button>
      </CardContent>
    </Card>
  )
}

function MetricTile(props: { label: string; value: string }) {
  return (
    <div className='border-border/70 bg-muted/25 rounded-2xl border px-3 py-2.5'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='text-foreground mt-1 text-sm font-semibold tabular-nums'>
        {props.value}
      </div>
    </div>
  )
}
