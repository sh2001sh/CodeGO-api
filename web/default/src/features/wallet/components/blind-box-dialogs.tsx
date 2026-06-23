import {
  CheckCircle2,
  CircleSlash,
  ExternalLink,
  Gift,
  Loader2,
  QrCode,
  Trophy,
  XCircle,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BlindBoxRecord } from '../types'

export type PaymentStage = 'idle' | 'pending' | 'success' | 'failed'

export interface BlindBoxPaymentState {
  open: boolean
  stage: PaymentStage
  orderId: string
  amountDue: number
  methodLabel: string
  payUrl: string
  qrCodeUrl: string
  formUrl: string
  formFields: Record<string, unknown> | null
  quantity: number
  message: string
}

export interface PrizeDialogState {
  open: boolean
  records: BlindBoxRecord[]
  openCount: number
}

export interface BlindBoxPrizeItem {
  label: string
  detail: string
  probability: string
  tone: 'quota' | 'claude' | 'prop' | 'hidden'
}

export const EMPTY_PAYMENT_STATE: BlindBoxPaymentState = {
  open: false,
  stage: 'idle',
  orderId: '',
  amountDue: 0,
  methodLabel: '',
  payUrl: '',
  qrCodeUrl: '',
  formUrl: '',
  formFields: null,
  quantity: 0,
  message: '',
}

export const EMPTY_PRIZE_STATE: PrizeDialogState = {
  open: false,
  records: [],
  openCount: 0,
}

export function formatBlindBoxTimestamp(timestamp?: number) {
  if (!timestamp) return '--'
  return new Date(timestamp * 1000).toLocaleString()
}

export function getBlindBoxMethodLabel(method?: {
  type?: string
  name?: string
} | null) {
  if (!method) return '未选择'
  if (method.type === 'xunhu') return '微信扫码'
  return method.name || method.type || '在线支付'
}

export function summarizeOpenResult(records: BlindBoxRecord[]) {
  const subscriptionHits = records.filter((record) => record.reward_type === 'subscription').length
  const propHits = records.filter((record) => record.reward_type === 'prop').length
  const quotaTotal = records
    .filter((record) => record.reward_type === 'quota')
    .reduce((sum, record) => sum + (record.reward_usd || 0), 0)

  if (subscriptionHits > 0) {
    return `本次获得 ${records.length} 项奖励，包含 ${subscriptionHits} 份套餐奖励和 ${quotaTotal.toFixed(2)} 美元额度。`
  }

  if (propHits > 0) {
    return `本次获得 ${records.length} 项奖励，包含 ${propHits} 个实用道具和 ${quotaTotal.toFixed(2)} 美元额度。`
  }

  return `本次获得 ${records.length} 项奖励，共计 ${quotaTotal.toFixed(2)} 美元额度。`
}

export function resolveRewardTone(record: BlindBoxRecord) {
  if (record.reward_type === 'subscription') {
    return 'border-border/70 bg-background/72 text-foreground'
  }
  if (record.is_pity) {
    return 'border-border/70 bg-background/72 text-foreground'
  }
  return 'border-border/70 bg-background/72 text-foreground'
}

export function BlindBoxPaymentDialog(props: {
  state: BlindBoxPaymentState
  onOpenChange: (open: boolean) => void
  onOpenExternal: () => void
}) {
  const statusConfig = {
    pending: {
      icon: <Loader2 className='size-5 animate-spin' />,
      title: '等待支付完成',
      tone: 'border-border/70 bg-background/72',
    },
    success: {
      icon: <CheckCircle2 className='size-5 text-emerald-600' />,
      title: '支付成功',
      tone: 'border-border/70 bg-background/72',
    },
    failed: {
      icon: <XCircle className='size-5 text-rose-600' />,
      title: '支付失败',
      tone: 'border-border/70 bg-background/72',
    },
    idle: {
      icon: <CircleSlash className='size-5 text-slate-500 dark:text-muted-foreground' />,
      title: '等待支付',
      tone: 'border-border/70 bg-background/72',
    },
  }[props.state.stage]

  return (
    <Dialog open={props.state.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className='w-[calc(100vw-1rem)] max-w-xl overflow-hidden p-0'
        showCloseButton={props.state.stage !== 'pending'}
      >
        <DialogHeader className='border-b px-5 py-4'>
          <DialogTitle className='flex items-center gap-2'>
            <Gift className='size-5' />
            盲盒支付
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4 px-5 py-5'>
          <div className={cn('rounded-2xl border p-4', statusConfig.tone)}>
            <div className='flex items-start gap-3'>
              <div className='flex size-10 items-center justify-center rounded-full border bg-white/85 dark:border-border dark:bg-card/70'>
                {statusConfig.icon}
              </div>
              <div>
                <div className='text-foreground text-sm font-semibold'>
                  {statusConfig.title}
                </div>
                <div className='text-muted-foreground mt-1 text-sm leading-6'>
                  {props.state.message}
                </div>
              </div>
            </div>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <Metric label='数量' value={String(props.state.quantity)} />
            <Metric
              label='应付金额'
              value={`${props.state.amountDue.toFixed(2)} 元`}
            />
            <Metric label='支付方式' value={props.state.methodLabel} />
            <Metric label='订单号' value={props.state.orderId || '--'} mono />
          </div>

          {props.state.stage === 'pending' ? (
            <div className='app-subtle-panel p-4'>
              <div className='mx-auto flex w-full max-w-[240px] flex-col items-center gap-3'>
                {props.state.qrCodeUrl ? (
                  <div className='border-border bg-background rounded-[20px] border p-4'>
                    <img
                      src={props.state.qrCodeUrl}
                      alt='blind-box-payment-qrcode'
                      className='h-48 w-48 object-contain'
                    />
                  </div>
                ) : props.state.payUrl ? (
                  <div className='border-border bg-background rounded-[20px] border p-4'>
                    <QRCodeCanvas value={props.state.payUrl} size={192} />
                  </div>
                ) : (
                  <div className='border-border/70 text-muted-foreground rounded-2xl border border-dashed px-5 py-10 text-center text-sm'>
                    当前支付方式没有直接返回二维码，可以点击下方按钮继续支付。
                  </div>
                )}

                <div className='text-muted-foreground flex items-center gap-2 text-center text-xs leading-6'>
                  <QrCode className='size-4 shrink-0' />
                  支付完成后会在当前页面自动同步结果，无需跳转或手动刷新。
                </div>
              </div>
            </div>
          ) : null}

          <div className='flex flex-wrap gap-2'>
            {(props.state.payUrl || props.state.formUrl) &&
            props.state.stage === 'pending' ? (
              <Button variant='outline' onClick={props.onOpenExternal}>
                <ExternalLink data-icon='inline-start' />
                打开支付页
              </Button>
            ) : null}
            <Button
              variant='ghost'
              onClick={() => props.onOpenChange(false)}
              disabled={props.state.stage === 'pending'}
            >
              {props.state.stage === 'pending' ? '等待支付完成' : '关闭'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function BlindBoxPrizeDialog(props: {
  state: PrizeDialogState
  onOpenChange: (open: boolean) => void
  onUseReward?: (record: BlindBoxRecord) => void
  activePropKeys?: Record<string, number>
}) {
  return (
    <Dialog open={props.state.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='w-[calc(100vw-1rem)] max-w-2xl overflow-hidden p-0'>
        <DialogHeader className='border-b px-5 py-4'>
          <DialogTitle className='flex items-center gap-2'>
            <Trophy className='size-5 text-amber-500' />
            抽取结果
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4 px-5 py-5'>
          <div className='app-subtle-panel p-4'>
            <div className='text-foreground text-lg font-semibold'>
              {summarizeOpenResult(props.state.records)}
            </div>
            <div className='text-muted-foreground mt-1 text-sm'>
              本次共抽取 {props.state.openCount} 次，奖励已经写入对应账户。
            </div>
          </div>

          <div className='grid gap-3'>
            {props.state.records.map((record) => (
              <div
                key={record.id}
                className='app-subtle-panel p-4'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <div className='text-foreground text-base font-semibold'>
                      {record.reward_title}
                    </div>
                    <div className='text-muted-foreground mt-1 text-sm'>
                      {formatBlindBoxTimestamp(record.create_time)}
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <div
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium',
                        resolveRewardTone(record)
                      )}
                    >
                      {record.reward_type === 'subscription'
                        ? '套餐奖励'
                        : record.reward_type === 'prop'
                          ? '实用道具'
                        : `${formatQuota(record.credit_amount || 0)} 额度`}
                    </div>
                    {record.is_pity ? (
                      <div className='border-border bg-background/80 text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium'>
                        保底命中
                      </div>
                    ) : null}
                    {record.reward_type === 'prop' && props.onUseReward ? (
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => props.onUseReward?.(record)}
                      >
                        {props.activePropKeys?.[record.reward_title] ? '已启用' : '立即使用'}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {record.reward_type === 'prop' ? (
                  <div className='text-muted-foreground mt-3 text-xs leading-5'>
                    {props.activePropKeys?.[record.reward_title]
                      ? '已开始生效，自动持续 24 小时。'
                      : '点击“立即使用”后开始生效，持续 24 小时。'}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <Button onClick={() => props.onOpenChange(false)}>确定</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function BlindBoxPrizePoolDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: BlindBoxPrizeItem[]
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='w-[calc(100vw-1rem)] max-w-3xl overflow-hidden p-0'>
        <DialogHeader className='border-b px-5 py-4'>
          <DialogTitle className='flex items-center gap-2'>
            <Gift className='size-5 text-amber-500' />
            奖池说明
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4 px-5 py-5'>
          <div className='app-subtle-panel p-4'>
            <div className='text-foreground text-lg font-semibold'>
              大奖包括 Lite 月卡、Claude 额度和实用道具
            </div>
            <div className='text-muted-foreground mt-1 text-sm leading-6'>
              普通额度会直接进入钱包，Claude 额度会直接进入 Claude 额度池，道具可在盲盒结果中立即启用。
            </div>
          </div>

          <div className='grid gap-3 md:grid-cols-2'>
            {props.items.map((item) => (
              <div key={item.label} className='app-subtle-panel p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-foreground text-sm font-semibold'>
                      {item.label}
                    </div>
                    <div className='text-muted-foreground mt-1 text-sm leading-6'>
                      {item.detail}
                    </div>
                  </div>
                  <div className='border-border/70 bg-background/72 text-muted-foreground rounded-full border px-2.5 py-1 text-[11px] font-medium'>
                    {item.probability}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button className='w-full' onClick={() => props.onOpenChange(false)}>
            知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Metric(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div className='app-subtle-panel px-3 py-3'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div
        className={cn(
          'text-foreground mt-1 text-sm font-semibold',
          props.mono && 'break-all font-mono'
        )}
      >
        {props.value}
      </div>
    </div>
  )
}
