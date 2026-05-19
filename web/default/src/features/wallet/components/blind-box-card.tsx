import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    return `本次开启 ${records.length} 个盲盒，抽中 ${subscriptionHits} 份套餐奖励，并获得 ${quotaHits.toFixed(2)} 美元临时额度。`
  }

  return `本次开启 ${records.length} 个盲盒，获得 ${quotaHits.toFixed(2)} 美元临时额度。`
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
        setSelectedQuantity((current) => Math.max(1, current || 1))
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
    if (!selectedQuantity || selectedQuantity <= 0) return
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
    if (availableBoxes <= 0) return 1
    return Math.min(availableBoxes, 10)
  }, [availableBoxes])

  const pitySummary = useMemo(() => {
    const threshold =
      data?.overview?.effective_pity_threshold || data?.pity_threshold || 5
    const lowReward = data?.low_reward_threshold_usd || 5
    const guarantee = data?.pity_guarantee_usd || 10
    const progress = data?.overview?.pity_progress || 0
    const remaining = Math.max(0, threshold - progress)

    if (remaining === 0) {
      return `已经进入保底状态。只要下次不是套餐大奖，就必定获得 ${guarantee} 美元额度。`
    }

    return `如果连续 ${threshold} 次都抽到低于 ${lowReward} 美元的额度，就会触发保底；当前还差 ${remaining} 次，触发后下次必定获得 ${guarantee} 美元额度。`
  }, [data])

  const handlePay = async () => {
    if (!selectedPaymentMethod) {
      toast.error('请选择支付方式')
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
        toast.error(response.message || '开启盲盒失败')
        return
      }
      toast.success(summarizeOpenResult(response.data.records || []))
      await Promise.all([
        fetchSelf(),
        props.onSubscriptionRefresh(),
        props.onUserRefresh(),
      ])
    } catch (_error) {
      toast.error('开启盲盒失败')
    } finally {
      setOpeningCount(null)
    }
  }

  return (
    <div className='space-y-4'>
      <div className='space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40'>
        <div className='flex flex-row items-start justify-between gap-4'>
          <div className='space-y-2'>
            <h3 className='text-base font-semibold'>盲盒活动</h3>
            <p className='text-sm text-muted-foreground'>
              盲盒临时额度会优先于订阅额度和钱包余额消耗，适合短期冲量和爆发奖励。
            </p>
          </div>
          <Badge variant={data?.enabled ? 'default' : 'secondary'}>
            {data?.enabled ? '进行中' : '未开启'}
          </Badge>
        </div>

        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-800'>
            <div className='text-xs text-muted-foreground'>可开启盲盒</div>
            <div className='mt-1 text-2xl font-semibold'>{availableBoxes}</div>
          </div>
          <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-800'>
            <div className='text-xs text-muted-foreground'>盲盒临时额度</div>
            <div className='mt-1 text-lg font-semibold'>
              {formatQuota(data?.overview?.remaining_quota || 0)}
            </div>
          </div>
          <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-800'>
            <div className='text-xs text-muted-foreground'>最近到期时间</div>
            <div className='mt-1 text-sm font-medium'>
              {formatTime(data?.overview?.next_expire_at)}
            </div>
          </div>
          <div className='rounded-xl border border-slate-200 p-3 dark:border-slate-800'>
            <div className='text-xs text-muted-foreground'>保底进度</div>
            <div className='mt-1 text-lg font-semibold'>
              {(data?.overview?.pity_progress || 0)}/
              {data?.overview?.effective_pity_threshold || data?.pity_threshold || 0}
            </div>
          </div>
        </div>

        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='space-y-4'>
            <div className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <h3 className='text-sm font-semibold'>购买盲盒</h3>
                <span className='text-sm text-muted-foreground'>
                  单个盲盒价格 {data?.unit_price?.toFixed(1) || '0.0'} 元
                </span>
              </div>

              <div className='grid gap-4 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)]'>
                <div className='space-y-2'>
                  <div className='text-xs text-muted-foreground'>购买数量</div>
                  <div className='flex items-center gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        setSelectedQuantity((current) => Math.max(1, current - 1))
                      }
                      disabled={!data?.enabled || loading || selectedQuantity <= 1}
                    >
                      -1
                    </Button>
                    <Input
                      type='number'
                      min={1}
                      value={selectedQuantity}
                      onChange={(event) => {
                        const value = Number(event.target.value)
                        setSelectedQuantity(
                          Number.isFinite(value) && value > 0 ? value : 1
                        )
                      }}
                      className='h-9 text-center'
                      disabled={!data?.enabled || loading}
                    />
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setSelectedQuantity((current) => current + 1)}
                      disabled={!data?.enabled || loading}
                    >
                      +1
                    </Button>
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    今日已购 {data?.overview?.purchased_today || 0}/
                    {data?.daily_limit || 0}，本月已购{' '}
                    {data?.overview?.purchased_this_month || 0}/
                    {data?.monthly_limit || 0}
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='text-xs text-muted-foreground'>支付方式</div>
                  <div className='flex flex-wrap gap-2'>
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
                </div>
              </div>

              <div className='mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <div className='text-xs text-muted-foreground'>应付金额</div>
                  <div className='mt-1 text-lg font-semibold'>
                    {amountDue.toFixed(2)} 元
                  </div>
                </div>
                <Button
                  onClick={handlePay}
                  disabled={!data?.enabled || paying}
                  className='sm:min-w-32'
                >
                  {paying ? t('Processing...') : '立即支付'}
                </Button>
              </div>
            </div>

            <div className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
              <div className='mb-3 flex items-center justify-between'>
                <h3 className='text-sm font-semibold'>开启盲盒</h3>
                <span className='text-sm text-muted-foreground'>
                  当前可开 {availableBoxes} 个
                </span>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  type='button'
                  onClick={() => void handleOpen(1)}
                  disabled={availableBoxes < 1 || openingCount !== null}
                >
                  {openingCount === 1 ? '开启中...' : '开 1 个'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => void handleOpen(openBatchCount)}
                  disabled={availableBoxes < openBatchCount || openingCount !== null}
                >
                  {openingCount === openBatchCount
                    ? '开启中...'
                    : `开 ${openBatchCount} 个`}
                </Button>
              </div>
            </div>

            <div className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
              <h3 className='mb-3 text-sm font-semibold'>最近开启记录</h3>
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
                        <Badge variant='outline'>保底触发</Badge>
                      ) : null}
                      <Badge
                        variant={
                          record.reward_type === 'subscription'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {record.reward_type === 'subscription'
                          ? '套餐大奖'
                          : `${record.reward_usd?.toFixed(2) || '0.00'} 美元额度`}
                      </Badge>
                    </div>
                  </div>
                ))}
                {data?.overview?.recent_records?.length === 0 ? (
                  <div className='rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-muted-foreground dark:border-slate-800'>
                    暂无盲盒记录
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='rounded-xl border border-slate-200 p-4 dark:border-slate-800'>
              <h3 className='text-sm font-semibold'>奖励概率</h3>
              <div className='mt-3 space-y-2 text-sm'>
                {(data?.tiers || []).map((tier) => (
                  <div
                    key={tier.name}
                    className='flex items-center justify-between gap-3'
                  >
                    <span className='text-muted-foreground'>
                      {tier.min_usd} - {tier.max_usd} 美元额度
                    </span>
                    <span>{(tier.probability * 100).toFixed(1)}%</span>
                  </div>
                ))}
                <Separator className='my-2' />
                <div className='flex items-center justify-between gap-3 font-medium'>
                  <span>{data?.subscription_plan_title || '套餐大奖'}</span>
                  <span>
                    {((data?.subscription_prize_probability || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div className='rounded-xl border border-slate-200 p-4 text-sm text-muted-foreground dark:border-slate-800'>
              <div>盲盒临时额度会自动过期，请优先消耗。</div>
              <div className='mt-2'>
                消耗顺序：盲盒临时额度 {'>'} 订阅额度 {'>'} 钱包余额
              </div>
              <div className='mt-2'>{pitySummary}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
