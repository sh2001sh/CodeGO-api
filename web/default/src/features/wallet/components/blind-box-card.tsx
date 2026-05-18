import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatQuota } from '@/lib/format'
import {
  calculateBlindBoxAmount,
  getBlindBoxSelf,
  isApiSuccess,
  openBlindBoxes,
  requestBlindBoxPayment,
} from '../api'
import { submitPaymentForm } from '../lib'
import type { BlindBoxRecord, BlindBoxSelfData, PaymentMethod } from '../types'

interface BlindBoxCardProps {
  onSubscriptionRefresh: () => Promise<void>
  onUserRefresh: () => Promise<void>
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString()
}

function summarizeOpenResult(records: BlindBoxRecord[]): string {
  const subscriptionHits = records.filter(
    (record) => record.reward_type === 'subscription'
  ).length
  const quotaHits = records
    .filter((record) => record.reward_type === 'quota')
    .reduce((sum, record) => sum + (record.reward_usd || 0), 0)
  if (subscriptionHits > 0) {
    return `Opened ${records.length} boxes, ${subscriptionHits} subscription reward(s), ${quotaHits.toFixed(2)} USD quota`
  }
  return `Opened ${records.length} boxes, ${quotaHits.toFixed(2)} USD short-term quota`
}

export function BlindBoxCard(props: BlindBoxCardProps) {
  const { t } = useTranslation()
  const [data, setData] = useState<BlindBoxSelfData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null)
  const [amountDue, setAmountDue] = useState(0)
  const [paying, setPaying] = useState(false)
  const [openingCount, setOpeningCount] = useState<number | null>(null)

  const fetchSelf = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getBlindBoxSelf()
      if (isApiSuccess(response) && response.data) {
        setData(response.data)
        setSelectedQuantity((current) => {
          if (response.data?.count_options?.includes(current)) return current
          return response.data?.count_options?.[0] || 1
        })
        setSelectedPaymentMethod((current) => {
          if (
            current &&
            response.data?.pay_methods?.some(
              (method) => method.type === current.type
            )
          ) {
            return current
          }
          return response.data?.pay_methods?.[0] || null
        })
      }
    } catch (_error) {
      toast.error(t('Failed to load blind box data'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void fetchSelf()
  }, [fetchSelf])

  useEffect(() => {
    if (!selectedQuantity) return
    void (async () => {
      const response = await calculateBlindBoxAmount({
        quantity: selectedQuantity,
      })
      if (isApiSuccess(response) && response.data) {
        setAmountDue(parseFloat(response.data))
      } else {
        setAmountDue(0)
      }
    })()
  }, [selectedQuantity])

  const availableBoxes = data?.overview?.available_boxes || 0
  const openBatchCount = useMemo(() => {
    if (!data?.count_options?.length) return 1
    const candidate = [...data.count_options]
      .filter((value) => value <= availableBoxes)
      .sort((left, right) => right - left)[0]
    return candidate || 1
  }, [availableBoxes, data?.count_options])

  const handlePay = async () => {
    if (!selectedPaymentMethod) {
      toast.error(t('Please select a payment method'))
      return
    }
    try {
      setPaying(true)
      const response = await requestBlindBoxPayment({
        quantity: selectedQuantity,
        payment_method: selectedPaymentMethod.type,
      })
      if (!isApiSuccess(response)) {
        toast.error(response.message || t('Payment request failed'))
        return
      }
      const directUrl =
        (response.data as { pay_url?: string; qrcode_url?: string })?.pay_url ||
        (response.data as { pay_url?: string; qrcode_url?: string })
          ?.qrcode_url
      if (directUrl) {
        window.open(directUrl, '_blank')
        return
      }
      const form = (response.data as { form?: Record<string, unknown> })?.form
      if (response.url && form) {
        submitPaymentForm(response.url, form)
        return
      }
      toast.error(t('Payment request failed'))
    } catch (_error) {
      toast.error(t('Payment request failed'))
    } finally {
      setPaying(false)
    }
  }

  const handleOpen = async (count: number) => {
    try {
      setOpeningCount(count)
      const response = await openBlindBoxes({ count })
      if (!isApiSuccess(response) || !response.data) {
        toast.error(response.message || t('Open blind box failed'))
        return
      }
      toast.success(summarizeOpenResult(response.data.records || []))
      await Promise.all([
        fetchSelf(),
        props.onSubscriptionRefresh(),
        props.onUserRefresh(),
      ])
    } catch (_error) {
      toast.error(t('Open blind box failed'))
    } finally {
      setOpeningCount(null)
    }
  }

  return (
    <div className='space-y-4'>
      <div className='space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
        <div className='flex flex-row items-start justify-between gap-4'>
          <div className='space-y-2'>
            <h3 className='text-base font-semibold'>
              {t('Blind box event')}
            </h3>
            <p className='text-sm text-muted-foreground'>
              {t(
                'Blind box quota is consumed before subscription and wallet balance.'
              )}
            </p>
          </div>
          <Badge variant={data?.enabled ? 'default' : 'secondary'}>
            {data?.enabled ? t('Enabled') : t('Disabled')}
          </Badge>
        </div>
        <div className='space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-800'>
              <div className='text-xs text-muted-foreground'>
                {t('Available boxes')}
              </div>
              <div className='mt-1 text-2xl font-semibold'>{availableBoxes}</div>
            </div>
            <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-800'>
              <div className='text-xs text-muted-foreground'>
                {t('Short-term quota')}
              </div>
              <div className='mt-1 text-lg font-semibold'>
                {formatQuota(data?.overview?.remaining_quota || 0)}
              </div>
            </div>
            <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-800'>
              <div className='text-xs text-muted-foreground'>
                {t('Next expiry')}
              </div>
              <div className='mt-1 text-sm font-medium'>
                {formatTime(data?.overview?.next_expire_at)}
              </div>
            </div>
            <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-800'>
              <div className='text-xs text-muted-foreground'>{t('Pity')}</div>
              <div className='mt-1 text-lg font-semibold'>
                {(data?.overview?.pity_progress || 0)}/{data?.pity_threshold || 0}
              </div>
            </div>
          </div>

          <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='space-y-4'>
              <div className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
                <div className='mb-3 flex items-center justify-between'>
                  <h3 className='text-sm font-semibold'>{t('Buy blind box')}</h3>
                  <span className='text-sm text-muted-foreground'>
                    {t('Unit price')}: {data?.unit_price?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  {(data?.count_options || []).map((option) => (
                    <Button
                      key={option}
                      type='button'
                      variant={selectedQuantity === option ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setSelectedQuantity(option)}
                      disabled={!data?.enabled || loading}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                <div className='mt-4 flex flex-wrap gap-2'>
                  {(data?.pay_methods || []).map((method) => (
                    <Button
                      key={method.type}
                      type='button'
                      variant={
                        selectedPaymentMethod?.type === method.type
                          ? 'default'
                          : 'outline'
                      }
                      size='sm'
                      onClick={() => setSelectedPaymentMethod(method)}
                      disabled={!data?.enabled || loading}
                    >
                      {method.name}
                    </Button>
                  ))}
                </div>
                <div className='mt-4 flex items-center justify-between'>
                  <div className='text-sm text-muted-foreground'>
                    {t('Amount due')}: {amountDue.toFixed(2)}
                  </div>
                  <Button onClick={handlePay} disabled={!data?.enabled || paying}>
                    {paying ? t('Processing...') : t('Pay now')}
                  </Button>
                </div>
              </div>

              <div className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
                <div className='mb-3 flex items-center justify-between'>
                  <h3 className='text-sm font-semibold'>{t('Open blind box')}</h3>
                  <span className='text-sm text-muted-foreground'>
                    {t('Today')}: {data?.overview?.purchased_today || 0}/
                    {data?.daily_limit || 0}
                  </span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    onClick={() => void handleOpen(1)}
                    disabled={availableBoxes < 1 || openingCount !== null}
                  >
                    {openingCount === 1 ? t('Opening...') : t('Open 1')}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => void handleOpen(openBatchCount)}
                    disabled={availableBoxes < openBatchCount || openingCount !== null}
                  >
                    {openingCount === openBatchCount
                      ? t('Opening...')
                      : `${t('Open')} ${openBatchCount}`}
                  </Button>
                </div>
              </div>

              <div className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
                <h3 className='mb-3 text-sm font-semibold'>{t('Recent opens')}</h3>
                <div className='space-y-3'>
                  {(data?.overview?.recent_records || []).slice(0, 8).map((record) => (
                    <div
                      key={record.id}
                      className='flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800'
                    >
                      <div className='space-y-1'>
                        <div className='font-medium'>{record.reward_title}</div>
                        <div className='text-xs text-muted-foreground'>
                          {formatTime(record.create_time)}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {record.is_pity ? (
                          <Badge variant='outline'>{t('Pity')}</Badge>
                        ) : null}
                        <Badge
                          variant={
                            record.reward_type === 'subscription'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {record.reward_type === 'subscription'
                            ? t('Subscription')
                            : `${record.reward_usd?.toFixed(2) || '0.00'} USD`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {data?.overview?.recent_records?.length === 0 ? (
                    <div className='rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-muted-foreground dark:border-slate-800'>
                      {t('No blind box records yet')}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
                <h3 className='text-sm font-semibold'>{t('Probability')}</h3>
                <div className='mt-3 space-y-2 text-sm'>
                  {(data?.tiers || []).map((tier) => (
                    <div
                      key={tier.name}
                      className='flex items-center justify-between gap-3'
                    >
                      <span className='text-muted-foreground'>
                        {tier.min_usd} - {tier.max_usd} USD
                      </span>
                      <span>{(tier.probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                  <Separator className='my-2' />
                  <div className='flex items-center justify-between gap-3 font-medium'>
                    <span>{data?.subscription_plan_title || t('Subscription')}</span>
                    <span>
                      {((data?.subscription_prize_probability || 0) * 100).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className='rounded-xl border border-slate-200 p-4 text-sm text-muted-foreground dark:border-slate-800'>
                <div>{t('Short-term blind box quota expires automatically.')}</div>
                <div className='mt-2'>
                  {t('Consumption order')}: blind box quota {'>'} subscription {'>'}{' '}
                  {t('wallet balance')}
                </div>
                <div className='mt-2'>
                  {t('Pity guarantee')}: {data?.pity_guarantee_usd || 0} USD
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
