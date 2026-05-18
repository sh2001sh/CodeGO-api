/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  Crown,
  ExternalLink,
  Loader2,
  Package,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatQuota } from '@/lib/format'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { GroupBadge } from '@/components/group-badge'
import {
  getSubscriptionOrderStatus,
  paySubscriptionCreem,
  paySubscriptionEpay,
  paySubscriptionStripe,
  paySubscriptionXunhu,
} from '../../api'
import { formatDuration, formatResetPeriod } from '../../lib'
import type {
  PlanRecord,
  SubscriptionPayResponse,
  SubscriptionOrderStatus,
} from '../../types'

interface PaymentMethod {
  type: string
  name?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: PlanRecord | null
  enableStripe?: boolean
  enableCreem?: boolean
  enableOnlineTopUp?: boolean
  epayMethods?: PaymentMethod[]
  purchaseLimit?: number
  purchaseCount?: number
}

type PaymentStage = 'idle' | 'pending' | 'success' | 'failed' | 'cancelled'

interface PaymentTracker {
  stage: PaymentStage
  orderId: string
  externalUrl: string
  qrCodeUrl: string
  amountDue: number
  methodLabel: string
  actionLabel: string
  message: string
}

const EMPTY_PAYMENT_TRACKER: PaymentTracker = {
  stage: 'idle',
  orderId: '',
  externalUrl: '',
  qrCodeUrl: '',
  amountDue: 0,
  methodLabel: '',
  actionLabel: '',
  message: '',
}

function getCurrencySymbol(currency?: string) {
  const normalized = (currency || '').toUpperCase()
  if (normalized === 'CNY') return '\u5143'
  if (normalized === 'EUR') return 'EUR '
  return '$'
}

function formatPlanPrice(priceAmount: number, currency?: string): string {
  const normalized = (currency || '').toUpperCase()
  const formatted = priceAmount
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1')

  if (normalized === 'CNY') return `${formatted} \u5143`
  return `${getCurrencySymbol(currency)}${formatted}`
}

function getPlanSubtitle(plan: PlanRecord['plan'] | null | undefined): string {
  const subtitle = String(plan?.subtitle || '').trim()
  if (subtitle) return subtitle
  const durationCount = Number(plan?.duration_value || 0)
  const durationUnit = String(plan?.duration_unit || '').toLowerCase()
  if (durationUnit === 'day' && durationCount > 0 && durationCount <= 2) {
    return '\u65e5\u5361'
  }
  return '\u6708\u5361'
}

function getPlanDetailsText(
  plan: PlanRecord['plan'],
  totalAmount: number,
  periodAmount: number,
  t: (key: string) => string
): string {
  const periodLabel =
    plan.quota_reset_period === 'weekly'
      ? '\u6bcf\u5468\u989d\u5ea6'
      : '\u5468\u671f\u989d\u5ea6'
  const totalLabel = totalAmount > 0 ? formatQuota(totalAmount) : '\u4e0d\u9650'
  const parts = [
    `\u6709\u6548\u671f ${formatDuration(plan, t)}`,
    periodAmount > 0 ? `${periodLabel} ${formatQuota(periodAmount)}` : null,
    `\u603b\u989d\u5ea6 ${totalLabel}`,
  ]
  return parts.filter(Boolean).join('\uFF1B')
}

function getPlanActionLabel(
  action: PlanRecord['action'] | undefined,
  t: (key: string) => string
): string {
  switch (action) {
    case 'renew':
      return '\u7eed\u8d39'
    case 'upgrade':
      return '\u5347\u7ea7'
    case 'disabled':
      return '\u4e0d\u53ef\u8ba2\u9605'
    default:
      return t('Subscribe Now')
  }
}

function getMethodLabel(
  type: string,
  methods: PaymentMethod[],
  t: (key: string) => string
): string {
  if (type === 'xunhu' || type === 'wxpay') {
    return t('WeChat Pay')
  }
  return methods.find((item) => item.type === type)?.name || type || t('Pay')
}

function submitExternalPaymentForm(
  url: string,
  params: Record<string, unknown>,
  isSafari: boolean
) {
  const form = document.createElement('form')
  form.action = url
  form.method = 'POST'
  if (!isSafari) {
    form.target = '_blank'
  }
  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = String(value)
    form.appendChild(input)
  })
  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

export function SubscriptionPurchaseDialog(props: Props) {
  const { t } = useTranslation()
  const [paying, setPaying] = useState(false)
  const [selectedEpayMethod, setSelectedEpayMethod] = useState('')
  const [paymentTracker, setPaymentTracker] = useState<PaymentTracker>(
    EMPTY_PAYMENT_TRACKER
  )
  const hasTriggeredSuccessRef = useRef(false)

  useEffect(() => {
    if (!props.open) {
      setSelectedEpayMethod('')
      setPaymentTracker(EMPTY_PAYMENT_TRACKER)
      hasTriggeredSuccessRef.current = false
      return
    }
    if (props.epayMethods && props.epayMethods.length > 0) {
      setSelectedEpayMethod((current) => current || props.epayMethods?.[0]?.type || '')
    }
  }, [props.open, props.epayMethods])

  const planRecord = props.plan
  const plan = planRecord?.plan
  const paymentMethods = props.epayMethods || []
  const isSafari =
    typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  useEffect(() => {
    if (!props.open || paymentTracker.stage !== 'pending' || !paymentTracker.orderId) {
      return
    }

    let active = true
    const poll = async () => {
      try {
        const res = await getSubscriptionOrderStatus(paymentTracker.orderId)
        if (!active || !res.success || !res.data) return
        const order = res.data as SubscriptionOrderStatus
        if (order.status === 'success') {
          setPaymentTracker((prev) => ({
            ...prev,
            stage: 'success',
            message: '\u652f\u4ed8\u6210\u529f\uff0c\u5957\u9910\u5df2\u751f\u6548\u3002',
          }))
          if (!hasTriggeredSuccessRef.current) {
            hasTriggeredSuccessRef.current = true
            window.dispatchEvent(new Event('subscription:changed'))
          }
          return
        }
        if (order.status === 'expired') {
          setPaymentTracker((prev) => ({
            ...prev,
            stage: 'failed',
            message: '\u652f\u4ed8\u672a\u5b8c\u6210\u6216\u5df2\u5173\u95ed\uff0c\u8ba2\u5355\u5df2\u5931\u6548\u3002',
          }))
        }
      } catch {
        // keep polling on transient errors
      }
    }

    void poll()
    const timer = window.setInterval(() => {
      void poll()
    }, 2000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [paymentTracker.orderId, paymentTracker.stage, props.open])

  const selectedEpayMethodLabel = useMemo(
    () => getMethodLabel(selectedEpayMethod, paymentMethods, t),
    [paymentMethods, selectedEpayMethod, t]
  )

  if (!plan || !planRecord) return null

  const hasStripe = props.enableStripe && !!plan.stripe_price_id
  const hasCreem = props.enableCreem && !!plan.creem_product_id
  const hasEpay = props.enableOnlineTopUp && paymentMethods.length > 0
  const hasAnyPayment = hasStripe || hasCreem || hasEpay
  const totalAmount = Number(plan.total_amount || 0)
  const periodAmount = Number(plan.period_amount || 0)
  const actionLabel = getPlanActionLabel(planRecord.action, t)
  const effectiveAmount = Number(planRecord.amount_due ?? plan.price_amount ?? 0)
  const displayPrice = formatPlanPrice(effectiveAmount, plan.currency)
  const limitReached =
    (props.purchaseLimit || 0) > 0 &&
    (props.purchaseCount || 0) >= (props.purchaseLimit || 0)
  const detailText = getPlanDetailsText(plan, totalAmount, periodAmount, t)
  const blockedByRule = planRecord.action === 'disabled'
  const blockedMessage =
    planRecord.disabled_reason ||
    '\u5f53\u524d\u5957\u9910\u4e0d\u53ef\u8ba2\u9605\uff0c\u8bf7\u5148\u7b49\u5f85\u5df2\u751f\u6548\u5957\u9910\u5230\u671f\u3002'
  const disablePurchase = limitReached || blockedByRule || paymentTracker.stage === 'pending'

  const startPendingPayment = (
    response: SubscriptionPayResponse,
    methodLabel: string,
    externalUrl: string,
    qrCodeUrl = ''
  ) => {
    const amountDue = Number(response.data?.amount_due ?? effectiveAmount ?? 0)
    setPaymentTracker({
      stage: 'pending',
      orderId: String(response.data?.order_id || ''),
      externalUrl,
      qrCodeUrl,
      amountDue,
      methodLabel,
      actionLabel,
      message: qrCodeUrl
        ? '\u8bf7\u4f7f\u7528\u5fae\u4fe1\u626b\u7801\u5b8c\u6210\u652f\u4ed8\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u7b49\u5f85\u56de\u4f20\u3002'
        : '\u6b63\u5728\u7b49\u5f85\u652f\u4ed8\u56de\u4f20\uff0c\u8bf7\u5728\u65b0\u7a97\u53e3\u5b8c\u6210\u652f\u4ed8\u3002',
    })
    toast.success('\u652f\u4ed8\u5df2\u53d1\u8d77')
  }

  const handlePayStripe = async () => {
    setPaying(true)
    try {
      const res = await paySubscriptionStripe({ plan_id: plan.id })
      const payLink = res.data?.pay_link || ''
      if (res.message === 'success' && payLink && res.data?.order_id) {
        window.open(payLink, '_blank')
        startPendingPayment(res, 'Stripe', payLink)
      } else {
        toast.error(
          res.message && res.message !== 'success'
            ? res.message
            : t('Payment request failed')
        )
      }
    } catch {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const handlePayCreem = async () => {
    setPaying(true)
    try {
      const res = await paySubscriptionCreem({ plan_id: plan.id })
      const checkoutUrl = res.data?.checkout_url || ''
      if (res.message === 'success' && checkoutUrl && res.data?.order_id) {
        window.open(checkoutUrl, '_blank')
        startPendingPayment(res, 'Creem', checkoutUrl)
      } else {
        toast.error(
          res.message && res.message !== 'success'
            ? res.message
            : t('Payment request failed')
        )
      }
    } catch {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const handlePayEpay = async () => {
    if (!selectedEpayMethod) {
      toast.error(t('Please select a payment method'))
      return
    }

    setPaying(true)
    try {
      const isXunhu = selectedEpayMethod === 'xunhu'
      const res = isXunhu
        ? await paySubscriptionXunhu({ plan_id: plan.id })
        : await paySubscriptionEpay({
            plan_id: plan.id,
            payment_method: selectedEpayMethod,
          })

      const payUrl = res.data?.pay_url || res.data?.qrcode_url || ''
      if (res.message === 'success' && isXunhu && payUrl && res.data?.order_id) {
        startPendingPayment(
          res,
          selectedEpayMethodLabel,
          res.data?.pay_url || '',
          res.data?.qrcode_url || ''
        )
      } else if (
        res.message === 'success' &&
        !isXunhu &&
        res.url &&
        res.data?.form &&
        res.data?.order_id
      ) {
        submitExternalPaymentForm(
          res.url,
          res.data.form as Record<string, unknown>,
          isSafari
        )
        startPendingPayment(res, selectedEpayMethodLabel, res.url)
      } else {
        toast.error(
          res.message && res.message !== 'success'
            ? res.message
            : t('Payment request failed')
        )
      }
    } catch {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const renderPaymentStatus = () => {
    if (paymentTracker.stage === 'idle') return null

    const stageConfig = {
      pending: {
        icon: <Loader2 className='h-5 w-5 animate-spin' />,
        title: '\u7b49\u5f85\u652f\u4ed8\u7ed3\u679c',
        tone: 'border-primary/30 bg-primary/5',
      },
      success: {
        icon: <CheckCircle2 className='h-5 w-5 text-emerald-500' />,
        title: '\u652f\u4ed8\u6210\u529f',
        tone: 'border-emerald-500/30 bg-emerald-500/5',
      },
      failed: {
        icon: <XCircle className='h-5 w-5 text-rose-500' />,
        title: '\u652f\u4ed8\u5931\u8d25',
        tone: 'border-rose-500/30 bg-rose-500/5',
      },
      cancelled: {
        icon: <CircleSlash className='h-5 w-5 text-slate-500' />,
        title: '\u5df2\u53d6\u6d88\u7b49\u5f85',
        tone: 'border-slate-400/30 bg-slate-500/5',
      },
      idle: {
        icon: null,
        title: '',
        tone: '',
      },
    }[paymentTracker.stage]

    return (
      <div className={`space-y-3 rounded-lg border p-3 ${stageConfig.tone}`}>
        <div className='flex items-center gap-2 text-sm font-medium'>
          {stageConfig.icon}
          <span>{stageConfig.title}</span>
        </div>
        <div className='space-y-1 text-xs text-muted-foreground'>
          <div>
            \u64cd\u4f5c\uff1a{paymentTracker.actionLabel}
          </div>
          <div>
            \u652f\u4ed8\u65b9\u5f0f\uff1a{paymentTracker.methodLabel}
          </div>
          <div>
            \u5e94\u4ed8\u91d1\u989d\uff1a{formatPlanPrice(paymentTracker.amountDue, plan.currency)}
          </div>
          <div>
            Order ID: {paymentTracker.orderId || '-'}
          </div>
        </div>
        <p className='text-sm text-muted-foreground'>{paymentTracker.message}</p>
        {paymentTracker.qrCodeUrl && paymentTracker.stage === 'pending' && (
          <div className='space-y-2'>
            <div className='rounded-lg border bg-white p-3'>
              <img
                src={paymentTracker.qrCodeUrl}
                alt='wechat-pay-qrcode'
                className='mx-auto h-44 w-44 object-contain'
              />
            </div>
            <p className='text-xs text-muted-foreground'>
              \u8bf7\u4f7f\u7528\u5fae\u4fe1\u626b\u7801\u5b8c\u6210\u652f\u4ed8\u3002
            </p>
          </div>
        )}
        <div className='flex flex-wrap gap-2'>
          {paymentTracker.externalUrl && paymentTracker.stage === 'pending' && (
            <Button
              variant='outline'
              onClick={() => window.open(paymentTracker.externalUrl, '_blank')}
            >
              <ExternalLink className='mr-1 h-4 w-4' />
              \u6253\u5f00\u652f\u4ed8\u9875
            </Button>
          )}
          {paymentTracker.stage === 'pending' && (
            <Button
              variant='ghost'
              onClick={() =>
                setPaymentTracker((prev) => ({
                  ...prev,
                  stage: 'cancelled',
                  message:
                    '\u5df2\u53d6\u6d88\u672c\u6b21\u7b49\u5f85\uff0c\u5982\u679c\u60a8\u5728\u652f\u4ed8\u9875\u7ee7\u7eed\u5b8c\u6210\u4ed8\u6b3e\uff0c\u8ba2\u5355\u4ecd\u4f1a\u5728\u56de\u8c03\u540e\u751f\u6548\u3002',
                }))
              }
            >
              \u53d6\u6d88\u652f\u4ed8
            </Button>
          )}
          {paymentTracker.stage !== 'pending' && (
            <Button variant='default' onClick={() => props.onOpenChange(false)}>
              {t('Close')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Crown className='h-5 w-5' />
            \u5957\u9910\u8ba2\u9605
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-3 sm:space-y-4'>
          <div className='bg-muted/50 space-y-2.5 rounded-lg border p-3 sm:space-y-3 sm:p-4'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground text-sm'>{t('Plan Name')}</span>
              <span className='max-w-[200px] truncate text-sm font-medium'>
                {plan.title}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground text-sm'>\u526f\u6807\u9898</span>
              <span className='max-w-[200px] truncate text-sm font-medium'>
                {getPlanSubtitle(plan)}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-muted-foreground text-sm'>\u8ba2\u9605\u7c7b\u578b</span>
              <span className='text-sm font-medium'>{actionLabel}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                {t('Validity Period')}
              </span>
              <span className='flex items-center gap-1 text-sm'>
                <CalendarClock className='h-3.5 w-3.5' />
                {formatDuration(plan, t)}
              </span>
            </div>
            {formatResetPeriod(plan, t) !== t('No Reset') && (
              <div className='flex justify-between'>
                <span className='text-muted-foreground text-sm'>
                  {t('Reset Period')}
                </span>
                <span className='text-sm'>{formatResetPeriod(plan, t)}</span>
              </div>
            )}
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                {t('Total Quota')}
              </span>
              <span className='flex items-center gap-1 text-sm'>
                <Package className='h-3.5 w-3.5' />
                {totalAmount > 0 ? formatQuota(totalAmount) : t('Unlimited')}
              </span>
            </div>
            {periodAmount > 0 && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-sm'>
                  {t('Period Quota')}
                </span>
                <span className='text-sm'>{formatQuota(periodAmount)}</span>
              </div>
            )}
            {plan.upgrade_group && (
              <div className='flex items-center justify-between'>
                <span className='text-muted-foreground text-sm'>
                  {t('Upgrade Group')}
                </span>
                <GroupBadge group={plan.upgrade_group} />
              </div>
            )}
            <div className='rounded-md border bg-background/70 p-3'>
              <div className='text-sm font-medium'>\u5957\u9910\u8be6\u60c5</div>
              <div className='text-muted-foreground mt-1 text-xs leading-5'>
                {detailText}
              </div>
            </div>
            <Separator />
            <div className='flex items-center justify-between'>
              <span className='text-sm font-medium'>\u5e94\u4ed8\u91d1\u989d</span>
              <span className='text-primary text-lg font-bold'>{displayPrice}</span>
            </div>
          </div>

          {limitReached && (
            <Alert variant='destructive'>
              <AlertDescription>
                {t('Purchase limit reached')} ({props.purchaseCount}/
                {props.purchaseLimit})
              </AlertDescription>
            </Alert>
          )}

          {blockedByRule && (
            <Alert variant='destructive'>
              <AlertDescription>{blockedMessage}</AlertDescription>
            </Alert>
          )}

          {renderPaymentStatus()}

          {paymentTracker.stage === 'idle' &&
            (hasAnyPayment ? (
              <div className='space-y-3'>
                <p className='text-muted-foreground text-xs'>
                  {t('Select payment method')}
                </p>
                {(hasStripe || hasCreem) && (
                  <div className='grid grid-cols-2 gap-2 sm:flex'>
                    {hasStripe && (
                      <Button
                        variant='outline'
                        className='flex-1'
                        onClick={handlePayStripe}
                        disabled={paying || disablePurchase}
                      >
                        Stripe
                      </Button>
                    )}
                    {hasCreem && (
                      <Button
                        variant='outline'
                        className='flex-1'
                        onClick={handlePayCreem}
                        disabled={paying || disablePurchase}
                      >
                        Creem
                      </Button>
                    )}
                  </div>
                )}
                {hasEpay && (
                  <div className='grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
                    <Select
                      items={[
                        ...paymentMethods.map((item) => ({
                          value: item.type,
                          label: item.name || item.type,
                        })),
                      ]}
                      value={selectedEpayMethod}
                      onValueChange={(value) =>
                        value !== null && setSelectedEpayMethod(value)
                      }
                      disabled={disablePurchase}
                    >
                      <SelectTrigger className='flex-1'>
                        <SelectValue>{selectedEpayMethodLabel}</SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {paymentMethods.map((item) => (
                            <SelectItem key={item.type} value={item.type}>
                              {item.name || item.type}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button
                      variant='default'
                      onClick={handlePayEpay}
                      disabled={paying || disablePurchase || !selectedEpayMethod}
                    >
                      {actionLabel}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  {t('No payment method is currently available for this plan')}
                </AlertDescription>
              </Alert>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
