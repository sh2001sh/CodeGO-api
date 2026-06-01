import type { ReactNode } from 'react'
import { Gift, Sparkles, WalletCards } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota, QUOTA_PER_UNIT } from './format'

function Metric(props: {
  label: string
  value: string | number
  hint: string
}) {
  return (
    <div className='bg-background/70 rounded-lg border p-4'>
      <div className='text-muted-foreground text-sm'>{props.label}</div>
      <div className='mt-2 text-2xl font-semibold'>{props.value}</div>
      <div className='text-muted-foreground mt-1 text-xs'>{props.hint}</div>
    </div>
  )
}

function AssetSummary(props: {
  isLoading: boolean
  pointsBalance: number
  convertibleBonusQuota: number
  maxConvertiblePoints: number
  ordersAction: ReactNode
}) {
  return (
    <div className='space-y-5'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-start'>
        <div>
          <Badge variant='secondary' className='gap-1.5'>
            <Gift className='size-3.5' aria-hidden='true' />
            Code Go Rewards
          </Badge>
          <h2 className='mt-3 text-2xl font-semibold'>积分资产</h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            余额、赠送额度兑换和兑换记录集中在这里管理。
          </p>
        </div>
        {props.ordersAction}
      </div>

      {props.isLoading ? (
        <Skeleton className='h-36 w-full rounded-lg' />
      ) : (
        <div className='grid gap-3 md:grid-cols-3'>
          <Metric
            label='当前积分'
            value={props.pointsBalance}
            hint='可直接兑换上架奖品'
          />
          <Metric
            label='可兑换赠送额度'
            value={formatQuota(props.convertibleBonusQuota)}
            hint='仅统计赠送额度'
          />
          <Metric
            label='最多可换积分'
            value={props.maxConvertiblePoints}
            hint='$5 赠送额度 = 1 积分'
          />
        </div>
      )}
    </div>
  )
}

function ConversionControls(props: {
  maxConvertiblePoints: number
  convertPoints: number
  isConverting: boolean
  onConvertPointsChange: (points: number) => void
  onConvert: () => void
}) {
  return (
    <div className='mt-4 flex gap-2'>
      <Input
        aria-label='兑换积分数量'
        type='number'
        min={1}
        max={Math.max(props.maxConvertiblePoints, 1)}
        value={props.convertPoints}
        onChange={(event) =>
          props.onConvertPointsChange(Number(event.target.value || 1))
        }
      />
      <Button
        type='button'
        variant='outline'
        disabled={props.maxConvertiblePoints <= 0}
        onClick={() => props.onConvertPointsChange(props.maxConvertiblePoints)}
      >
        全部
      </Button>
      <Button
        type='button'
        disabled={
          props.isConverting ||
          props.convertPoints <= 0 ||
          props.convertPoints > props.maxConvertiblePoints
        }
        onClick={props.onConvert}
      >
        兑换
      </Button>
    </div>
  )
}

function ConversionStats(props: {
  convertibleBonusQuota: number
  convertPoints: number
}) {
  return (
    <>
      <div className='mt-4 grid grid-cols-2 gap-2 text-xs'>
        <div className='bg-background/80 rounded-md p-3'>
          <div className='text-muted-foreground'>剩余额度</div>
          <div className='mt-1 font-medium'>
            {formatQuota(props.convertibleBonusQuota)}
          </div>
        </div>
        <div className='bg-background/80 rounded-md p-3'>
          <div className='text-muted-foreground'>本次消耗</div>
          <div className='mt-1 font-medium'>
            {formatQuota(props.convertPoints * 5 * QUOTA_PER_UNIT)}
          </div>
        </div>
      </div>
      <p className='text-muted-foreground mt-3 text-xs'>
        每月最多兑换 $500 赠送额度。
      </p>
    </>
  )
}

function BonusConversionPanel(props: {
  convertibleBonusQuota: number
  maxConvertiblePoints: number
  convertPoints: number
  isConverting: boolean
  onConvertPointsChange: (points: number) => void
  onConvert: () => void
}) {
  return (
    <div className='bg-muted/25 rounded-lg border p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2 text-sm font-medium'>
            <Sparkles className='size-4' aria-hidden='true' />
            赠送额度兑换
          </div>
          <p className='text-muted-foreground mt-1 text-xs'>
            兑换后立即扣减赠送额度并增加积分。
          </p>
        </div>
        <WalletCards
          className='text-muted-foreground size-5'
          aria-hidden='true'
        />
      </div>
      <ConversionControls
        maxConvertiblePoints={props.maxConvertiblePoints}
        convertPoints={props.convertPoints}
        isConverting={props.isConverting}
        onConvertPointsChange={props.onConvertPointsChange}
        onConvert={props.onConvert}
      />
      <ConversionStats
        convertibleBonusQuota={props.convertibleBonusQuota}
        convertPoints={props.convertPoints}
      />
    </div>
  )
}

export function AssetConsole(props: {
  isLoading: boolean
  pointsBalance: number
  convertibleBonusQuota: number
  maxConvertiblePoints: number
  convertPoints: number
  isConverting: boolean
  onConvertPointsChange: (points: number) => void
  onConvert: () => void
  ordersAction: ReactNode
}) {
  return (
    <section className='bg-card rounded-lg border p-5 shadow-sm'>
      <div className='grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]'>
        <AssetSummary
          isLoading={props.isLoading}
          pointsBalance={props.pointsBalance}
          convertibleBonusQuota={props.convertibleBonusQuota}
          maxConvertiblePoints={props.maxConvertiblePoints}
          ordersAction={props.ordersAction}
        />
        <BonusConversionPanel
          convertibleBonusQuota={props.convertibleBonusQuota}
          maxConvertiblePoints={props.maxConvertiblePoints}
          convertPoints={props.convertPoints}
          isConverting={props.isConverting}
          onConvertPointsChange={props.onConvertPointsChange}
          onConvert={props.onConvert}
        />
      </div>
    </section>
  )
}
