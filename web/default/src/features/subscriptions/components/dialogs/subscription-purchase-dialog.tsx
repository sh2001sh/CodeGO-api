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
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  Crown,
  ExternalLink,
  Loader2,
  QrCode,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
import {
  getSubscriptionOrderStatus,
  paySubscriptionCreem,
  paySubscriptionEpay,
  paySubscriptionStripe,
  paySubscriptionXunhu,
} from '../../api'
import {
  formatDuration,
  formatResetPeriod,
  formatSubscriptionPlanPrice,
  formatSubscriptionQuotaAmount,
  getSubscriptionPlanActionLabel,
  getSubscriptionPlanDetailText,
  getSubscriptionPlanSubtitle,
  normalizeSubscriptionText,
} from '../../lib'
import type {
  PlanRecord,
  SubscriptionOrderStatus,
  SubscriptionPayResponse,
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

function getMethodLabel(
  type: string,
  methods: PaymentMethod[],
  t: (key: string) => string
): string {
  if (type === 'xunhu' || type === 'wxpay') {
    return '微信支付'
  }
  return (
    normalizeSubscriptionText(methods.find((item) => item.type === type)?.name) ||
    type ||
    t('Pay')
  )
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

  for (const [key, value] of Object.entries(params)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = String(value)
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

function SummaryItem(props: { label: string; value: ReactNode }) {
  return (
    <div className='rounded-2xl border bg-white/80 px-3 py-3'>
      <div className='text-muted-foreground text-[11px] font-medium tracking-wide'>
        {props.label}
      </div>
      <div className='mt-1 text-sm font-medium text-slate-950'>
        {props.value}
      </div>
    </div>
  )
}

function StatusItem(props: { label: string; value: ReactNode }) {
  return (
    <div className='rounded-xl border bg-white/90 px-3 py-2.5'>
      <div className='text-muted-foreground text-[11px] font-medium tracking-wide'>
        {props.label}
      </div>
      <div className='mt-1 text-sm font-medium text-slate-950'>
        {props.value}
      </div>
    </div>
  )
}

export function SubscriptionPurchaseDialog(props: Props) {
  const { t } = useTranslation()
  const [paying, setPaying] = useState(false)
  const [selectedEpayMethod, setSelectedEpayMethod] = useState('')
  const [paymentTracker, setPaymentTracker] = useState<PaymentTracker>(
    EMPTY_PAYMENT_TRACKER
  )
  const hasTriggeredSuccessRef = useRef(false)

  const planRecord = props.plan
  const plan = planRecord?.plan
  const paymentMethods = props.epayMethods || []
  const isSafari =
    typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  useEffect(() => {
    if (!props.open) {
      setSelectedEpayMethod('')
      setPaymentTracker(EMPTY_PAYMENT_TRACKER)
      hasTriggeredSuccessRef.current = false
      return
    }
    if (paymentMethods.length > 0) {
      setSelectedEpayMethod((current) => current || paymentMethods[0]?.type || '')
    }
  }, [paymentMethods, props.open])

  useEffect(() => {
    if (
      !props.open ||
      paymentTracker.stage !== 'pending' ||
      !paymentTracker.orderId
    ) {
      return
    }

    let active = true
    const poll = async () => {
      try {
        const response = await getSubscriptionOrderStatus(paymentTracker.orderId)
        if (!active || !response.success || !response.data) return

        const order = response.data as SubscriptionOrderStatus
        if (order.status === 'success') {
          setPaymentTracker((current) => ({
            ...current,
            stage: 'success',
            message: '支付成功，套餐已经生效。',
          }))
          if (!hasTriggeredSuccessRef.current) {
            hasTriggeredSuccessRef.current = true
            window.dispatchEvent(new Event('subscription:changed'))
          }
          return
        }

        if (order.status === 'expired') {
          setPaymentTracker((current) => ({
            ...current,
            stage: 'failed',
            message: '订单已过期或支付未完成，请重新发起支付。',
          }))
        }
      } catch {
        // ignore polling error and keep waiting
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
  const totalAmount = Number(plan.total_amount || 0)
  const periodAmount = Number(plan.period_amount || 0)
  const effectiveAmount = Number(planRecord.amount_due ?? plan.price_amount ?? 0)
  const displayPrice = formatSubscriptionPlanPrice(effectiveAmount, plan.currency)
  const actionLabel = getSubscriptionPlanActionLabel(planRecord.action, t)
  const detailText = getSubscriptionPlanDetailText(
    plan,
    totalAmount,
    periodAmount,
    t
  )
  const limitReached =
    (props.purchaseLimit || 0) > 0 &&
    (props.purchaseCount || 0) >= (props.purchaseLimit || 0)
  const blockedByRule = planRecord.action === 'disabled'
  const blockedMessage =
    normalizeSubscriptionText(planRecord.disabled_reason) ||
    '当前已有更高等级的有效套餐，暂不支持降级订阅。'
  const disablePurchase =
    paying || limitReached || blockedByRule || paymentTracker.stage === 'pending'
  const resetText =
    formatResetPeriod(plan, t) === t('No Reset')
      ? '不重置'
      : formatResetPeriod(plan, t)

  const summaryItems = [
    { label: '购买方式', value: actionLabel },
    {
      label: '有效期',
      value: (
        <span className='flex items-center gap-1.5'>
          <CalendarClock className='h-3.5 w-3.5' />
          {formatDuration(plan, t)}
        </span>
      ),
    },
    {
      label: periodAmount > 0 ? '每周额度' : '总额度',
      value: formatSubscriptionQuotaAmount(
        periodAmount > 0 ? periodAmount : totalAmount
      ),
    },
    {
      label: periodAmount > 0 ? '月总额度' : '额度重置',
      value:
        periodAmount > 0
          ? totalAmount > 0
            ? formatSubscriptionQuotaAmount(totalAmount)
            : '不限'
          : resetText,
    },
    ...(periodAmount > 0 ? [{ label: '额度重置', value: resetText }] : []),
    {
      label: '支付价格',
      value: formatSubscriptionPlanPrice(effectiveAmount, plan.currency),
    },
  ]

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
        ? '请使用微信扫码完成支付，系统会自动等待支付结果回传。'
        : '请在新窗口完成支付，系统会自动等待支付结果回传。',
    })
    toast.success('支付请求已发起')
  }

  const handlePayStripe = async () => {
    setPaying(true)
    try {
      const response = await paySubscriptionStripe({ plan_id: plan.id })
      const payLink = response.data?.pay_link || ''
      if (response.message === 'success' && payLink && response.data?.order_id) {
        window.open(payLink, '_blank')
        startPendingPayment(response, 'Stripe', payLink)
      } else {
        toast.error(response.message || '支付请求失败')
      }
    } catch {
      toast.error('支付请求失败')
    } finally {
      setPaying(false)
    }
  }

  const handlePayCreem = async () => {
    setPaying(true)
    try {
      const response = await paySubscriptionCreem({ plan_id: plan.id })
      const checkoutUrl = response.data?.checkout_url || ''
      if (
        response.message === 'success' &&
        checkoutUrl &&
        response.data?.order_id
      ) {
        window.open(checkoutUrl, '_blank')
        startPendingPayment(response, 'Creem', checkoutUrl)
      } else {
        toast.error(response.message || '支付请求失败')
      }
    } catch {
      toast.error('支付请求失败')
    } finally {
      setPaying(false)
    }
  }

  const handlePayEpay = async () => {
    if (!selectedEpayMethod) {
      toast.error('请选择支付方式')
      return
    }

    setPaying(true)
    try {
      const isXunhu = selectedEpayMethod === 'xunhu'
      const response = isXunhu
        ? await paySubscriptionXunhu({ plan_id: plan.id })
        : await paySubscriptionEpay({
            plan_id: plan.id,
            payment_method: selectedEpayMethod,
          })

      if (response.message !== 'success') {
        toast.error(response.message || '支付请求失败')
        return
      }

      if (isXunhu) {
        const payUrl = response.data?.pay_url || ''
        const qrCodeUrl = response.data?.qrcode_url || ''
        if ((payUrl || qrCodeUrl) && response.data?.order_id) {
          startPendingPayment(response, '微信支付', payUrl, qrCodeUrl)
          return
        }
      } else if (response.url && response.data?.form && response.data?.order_id) {
        submitExternalPaymentForm(
          response.url,
          response.data.form as Record<string, unknown>,
          isSafari
        )
        startPendingPayment(response, selectedEpayMethodLabel, response.url)
        return
      }

      toast.error('支付请求失败')
    } catch {
      toast.error('支付请求失败')
    } finally {
      setPaying(false)
    }
  }

  const renderPaymentStatus = () => {
    if (paymentTracker.stage === 'idle') return null

    const statusConfig = {
      pending: {
        icon: <Loader2 className='h-5 w-5 animate-spin' />,
        title: '等待支付结果',
        tone: 'border-sky-200 bg-sky-50/70',
      },
      success: {
        icon: <CheckCircle2 className='h-5 w-5 text-emerald-600' />,
        title: '支付成功',
        tone: 'border-emerald-200 bg-emerald-50/70',
      },
      failed: {
        icon: <XCircle className='h-5 w-5 text-rose-600' />,
        title: '支付失败',
        tone: 'border-rose-200 bg-rose-50/70',
      },
      cancelled: {
        icon: <CircleSlash className='h-5 w-5 text-slate-500' />,
        title: '已取消等待',
        tone: 'border-slate-200 bg-slate-50/70',
      },
      idle: {
        icon: null,
        title: '',
        tone: '',
      },
    }[paymentTracker.stage]

    return (
      <div className={cn('space-y-4 rounded-2xl border p-4', statusConfig.tone)}>
        <div className='flex items-start gap-3'>
          <div className='bg-background flex h-10 w-10 shrink-0 items-center justify-center rounded-full border'>
            {statusConfig.icon}
          </div>
          <div className='min-w-0'>
            <div className='text-sm font-semibold text-slate-950'>
              {statusConfig.title}
            </div>
            <p className='text-muted-foreground mt-1 text-sm leading-6'>
              {paymentTracker.message}
            </p>
          </div>
        </div>

        <div className='grid gap-2 sm:grid-cols-2'>
          <StatusItem label='操作类型' value={paymentTracker.actionLabel} />
          <StatusItem label='支付方式' value={paymentTracker.methodLabel} />
          <StatusItem
            label='应付金额'
            value={formatSubscriptionPlanPrice(
              paymentTracker.amountDue,
              plan.currency
            )}
          />
          <StatusItem label='订单号' value={paymentTracker.orderId || '-'} />
        </div>

        {paymentTracker.qrCodeUrl && paymentTracker.stage === 'pending' ? (
          <div className='space-y-3 rounded-2xl border bg-white/90 p-3'>
            <div className='mx-auto w-full max-w-[180px] rounded-2xl border bg-white p-3 shadow-sm'>
              <img
                src={paymentTracker.qrCodeUrl}
                alt='wechat-pay-qrcode'
                className='mx-auto h-36 w-36 object-contain'
              />
            </div>
            <p className='text-center text-xs text-muted-foreground'>
              请使用微信扫码完成支付。
            </p>
          </div>
        ) : null}

        <div className='flex flex-wrap gap-2'>
          {paymentTracker.externalUrl && paymentTracker.stage === 'pending' ? (
            <Button
              variant='outline'
              onClick={() => window.open(paymentTracker.externalUrl, '_blank')}
            >
              <ExternalLink className='mr-1 h-4 w-4' />
              打开支付页面
            </Button>
          ) : null}

          {paymentTracker.stage === 'pending' ? (
            <Button
              variant='ghost'
              onClick={() =>
                setPaymentTracker((current) => ({
                  ...current,
                  stage: 'cancelled',
                  message:
                    '你已取消当前等待。如果支付页中继续完成付款，结果回传后套餐仍会自动生效。',
                }))
              }
            >
              取消支付
            </Button>
          ) : (
            <Button variant='default' onClick={() => props.onOpenChange(false)}>
              关闭
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='flex max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl'>
        <DialogHeader className='border-b border-slate-200 px-4 py-4 sm:px-5'>
          <DialogTitle className='flex items-center gap-2 text-lg'>
            <Crown className='h-5 w-5' />
            套餐购买
          </DialogTitle>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-5 sm:pb-5'>
          <div className='space-y-4'>
            <div className='overflow-hidden rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,rgba(248,251,255,0.98),rgba(255,255,255,0.94))] shadow-[0_20px_50px_rgba(15,23,42,0.06)]'>
              <div className='border-b border-sky-100 px-4 py-4 sm:px-5'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                  <div className='min-w-0'>
                    <p className='text-primary text-[11px] font-semibold tracking-[0.22em] uppercase'>
                      {getSubscriptionPlanSubtitle(plan)}
                    </p>
                    <h3 className='mt-1 truncate text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl'>
                      {normalizeSubscriptionText(plan.title) || t('Plan Name')}
                    </h3>
                    <p className='text-muted-foreground mt-2 text-sm leading-6'>
                      {detailText}
                    </p>
                  </div>
                  <div className='shrink-0 text-left sm:text-right'>
                    <div className='text-primary text-2xl font-semibold tracking-tight sm:text-3xl'>
                      {displayPrice}
                    </div>
                    <div className='text-muted-foreground mt-1 text-xs'>
                      应付金额
                    </div>
                  </div>
                </div>
              </div>

              <div className='px-4 py-4 sm:px-5'>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                  {summaryItems.map((item) => (
                    <SummaryItem
                      key={item.label}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </div>
            </div>

            {limitReached ? (
              <Alert variant='destructive'>
                <AlertDescription>
                  已达到该套餐购买上限（{props.purchaseCount}/{props.purchaseLimit}）。
                </AlertDescription>
              </Alert>
            ) : null}

            {blockedByRule ? (
              <Alert variant='destructive'>
                <AlertDescription>{blockedMessage}</AlertDescription>
              </Alert>
            ) : null}

            {renderPaymentStatus()}

            {paymentTracker.stage === 'idle' ? (
              hasStripe || hasCreem || hasEpay ? (
                <div className='rounded-2xl border bg-white p-4 shadow-sm'>
                  <div className='mb-3 flex items-center gap-2 text-sm font-medium text-slate-950'>
                    <QrCode className='h-4 w-4 text-sky-600' />
                    选择支付方式
                  </div>

                  <div className='space-y-3'>
                    {hasStripe || hasCreem ? (
                      <div className='grid grid-cols-2 gap-2'>
                        {hasStripe ? (
                          <Button
                            variant='outline'
                            className='w-full'
                            onClick={() => void handlePayStripe()}
                            disabled={disablePurchase}
                          >
                            Stripe
                          </Button>
                        ) : null}
                        {hasCreem ? (
                          <Button
                            variant='outline'
                            className='w-full'
                            onClick={() => void handlePayCreem()}
                            disabled={disablePurchase}
                          >
                            Creem
                          </Button>
                        ) : null}
                      </div>
                    ) : null}

                    {hasEpay ? (
                      <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]'>
                        <Select
                          value={selectedEpayMethod}
                          onValueChange={(value) =>
                            value !== null && setSelectedEpayMethod(value)
                          }
                          disabled={disablePurchase}
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue>{selectedEpayMethodLabel}</SelectValue>
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false}>
                            <SelectGroup>
                              {paymentMethods.map((item) => (
                                <SelectItem key={item.type} value={item.type}>
                                  {getMethodLabel(item.type, paymentMethods, t)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Button
                          className='w-full sm:w-auto'
                          onClick={() => void handlePayEpay()}
                          disabled={disablePurchase || !selectedEpayMethod}
                        >
                          {actionLabel}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>当前套餐暂未配置可用支付方式。</AlertDescription>
                </Alert>
              )
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
