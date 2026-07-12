import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { purchaseSubscriptionFuel, quoteSubscriptionFuel } from '../../api'
import type { SubscriptionFuelQuote, UserSubscription } from '../../types'

type PaymentMethod = { type: string; name?: string }

interface SubscriptionFuelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: UserSubscription | null
  title: string
  minimumQuota: number
  quotaStep: number
  paymentMethods: PaymentMethod[]
  enableStripe?: boolean
  onCompleted?: () => Promise<void>
}

function formatDate(value: number): string {
  return new Date(value * 1000).toLocaleString()
}

export function SubscriptionFuelDialog(props: SubscriptionFuelDialogProps) {
  const fallbackQuotaPerUnit = 500_000
  const configuredMinimumQuota = props.minimumQuota || fallbackQuotaPerUnit
  const configuredQuotaStep = props.quotaStep || fallbackQuotaPerUnit
  const minimumConfiguredAmount =
    configuredMinimumQuota / fallbackQuotaPerUnit
  const [amount, setAmount] = useState(minimumConfiguredAmount)
  const [quote, setQuote] = useState<SubscriptionFuelQuote | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('')
  const paymentOptions = useMemo(
    () => [
      ...(props.enableStripe ? [{ type: 'stripe', name: 'Stripe' }] : []),
      ...props.paymentMethods,
    ],
    [props.enableStripe, props.paymentMethods]
  )
  const selectedPaymentMethod = paymentMethod || paymentOptions[0]?.type || ''
  const quotaPerUnit = quote?.quota_per_unit ?? 500_000
  const minimumAmount =
    (quote?.min_quota ?? configuredMinimumQuota) / quotaPerUnit
  const amountStep =
    (quote?.quota_step ?? configuredQuotaStep) / quotaPerUnit
  const quota = Math.round(amount * quotaPerUnit)
  const quoteMutation = useMutation({
    mutationFn: quoteSubscriptionFuel,
    onSuccess: (response) => setQuote(response.data ?? null),
    onError: () => setQuote(null),
  })
  const requestQuote = quoteMutation.mutate
  const purchaseMutation = useMutation({
    mutationFn: purchaseSubscriptionFuel,
    onSuccess: (response) => {
      const target = response.data?.pay_link ?? response.url
      if (target) window.location.assign(target)
      else toast.success('加油订单已创建')
      props.onOpenChange(false)
      void props.onCompleted?.()
    },
    onError: () => toast.error('创建加油订单失败，请稍后重试'),
  })

  useEffect(() => {
    if (!props.open || !props.subscription || amount <= 0) return
    const timer = window.setTimeout(() => {
      requestQuote({ subscriptionId: props.subscription!.id, quota })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [amount, props.open, props.subscription, quota, requestQuote])

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>为 {props.title} 加油</DialogTitle>
          <DialogDescription>
            额度直接追加到当前月卡，模型权限和到期时间保持不变。
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='bg-muted/30 rounded-lg border px-3 py-2.5 text-sm'>
            <div className='font-medium'>月卡到期时间不变</div>
            <div className='text-muted-foreground mt-1 text-xs tabular-nums'>
              {props.subscription
                ? formatDate(props.subscription.end_time)
                : '--'}
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='subscription-fuel-amount'>补充额度（$）</Label>
            <Input
              id='subscription-fuel-amount'
              type='number'
              min={minimumAmount}
              step={amountStep}
              value={Number.isFinite(amount) ? amount : ''}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
            <p className='text-muted-foreground text-xs'>
              最低 ${minimumAmount}，每次递增 ${amountStep}。
            </p>
          </div>

          <div className='grid grid-cols-2 gap-3 text-sm'>
            <div className='rounded-lg border px-3 py-2.5'>
              <div className='text-muted-foreground text-xs'>加油单价</div>
              <div className='mt-1 font-mono font-semibold'>
                ¥{quote?.unit_price.toFixed(3) ?? '--'} / $1
              </div>
            </div>
            <div className='rounded-lg border px-3 py-2.5'>
              <div className='text-muted-foreground text-xs'>应付金额</div>
              <div className='mt-1 font-mono font-semibold tabular-nums'>
                ¥{quote?.amount_due.toFixed(2) ?? '--'}
              </div>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>支付方式</Label>
            <Select
              value={selectedPaymentMethod}
              onValueChange={(value) => setPaymentMethod(value ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder='选择支付方式' />
              </SelectTrigger>
              <SelectContent>
                {paymentOptions.map((method) => (
                  <SelectItem key={method.type} value={method.type}>
                    {method.name || method.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <AlertCircle className='size-4' />
            <AlertDescription>
              加油不延长有效期、不升级模型权限，也不计入续费奖励。
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={
              !quote ||
              !selectedPaymentMethod ||
              quoteMutation.isPending ||
              purchaseMutation.isPending
            }
            onClick={() =>
              props.subscription &&
              purchaseMutation.mutate({
                subscriptionId: props.subscription.id,
                quota,
                paymentMethod: selectedPaymentMethod,
              })
            }
          >
            {purchaseMutation.isPending ? (
              <Loader2 className='mr-1 size-4 animate-spin' />
            ) : null}
            确认支付
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
