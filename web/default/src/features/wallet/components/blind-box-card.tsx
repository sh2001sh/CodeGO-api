import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getGamificationDashboard } from '@/features/gamification/api'
import { getPetProfile, type PetProfile } from '@/features/gamification/pet-catalog'
import type { CompanionBuffView } from '@/features/gamification/types'
import {
  calculateBlindBoxAmount,
  getBlindBoxOrderStatus,
  getBlindBoxSelf,
  isApiSuccess,
  openBlindBoxes,
  requestBlindBoxPayment,
} from '../api'
import { submitPaymentForm } from '../lib'
import type {
  BlindBoxOrderStatus,
  BlindBoxRecord,
  BlindBoxSelfData,
  PaymentMethod,
} from '../types'
import {
  BlindBoxPaymentDialog,
  BlindBoxPrizeDialog,
  EMPTY_PAYMENT_STATE,
  EMPTY_PRIZE_STATE,
  getBlindBoxMethodLabel,
  type BlindBoxPaymentState,
  type PrizeDialogState,
} from './blind-box-dialogs'
import { BlindBoxCardView } from './blind-box-view'

interface BlindBoxCardProps {
  onSubscriptionRefresh: () => Promise<void>
  onUserRefresh: () => Promise<void>
  paymentResult?: 'success' | 'pending' | 'fail'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function BlindBoxCard(props: BlindBoxCardProps) {
  const [data, setData] = useState<BlindBoxSelfData | null>(null)
  const [petProfile, setPetProfile] = useState<PetProfile | null>(null)
  const [petSkill, setPetSkill] = useState<CompanionBuffView | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null)
  const [amountDue, setAmountDue] = useState(0)
  const [paying, setPaying] = useState(false)
  const [openingCount, setOpeningCount] = useState<number | null>(null)
  const [showPrizeNotice, setShowPrizeNotice] = useState(false)
  const [paymentState, setPaymentState] =
    useState<BlindBoxPaymentState>(EMPTY_PAYMENT_STATE)
  const [prizeState, setPrizeState] = useState<PrizeDialogState>(EMPTY_PRIZE_STATE)
  const [activeProps, setActiveProps] = useState<Record<string, number>>({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('blind-box-active-props')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Record<string, number>
      const now = Date.now()
      const validEntries = Object.entries(parsed).filter(([, expireAt]) => expireAt > now)
      const next = Object.fromEntries(validEntries)
      setActiveProps(next)
      if (Object.keys(next).length !== Object.keys(parsed).length) {
        window.localStorage.setItem('blind-box-active-props', JSON.stringify(next))
      }
    } catch {
      window.localStorage.removeItem('blind-box-active-props')
    }
  }, [])

  const fetchSelf = useCallback(async () => {
    try {
      setLoading(true)
      const response = await getBlindBoxSelf()
      if (!isApiSuccess(response) || !response.data) return

      setData(response.data)
      setSelectedQuantity((current) => Math.max(1, current || 1))
      setSelectedPaymentMethod((current) => {
        if (
          current &&
          response.data?.pay_methods?.some((method) => method.type === current.type)
        ) {
          return current
        }
        return response.data?.pay_methods?.[0] || null
      })
    } catch {
      toast.error('加载盲盒数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCompanion = useCallback(async () => {
    try {
      const response = await getGamificationDashboard()
      if (!response.success || !response.data?.companion) return

      const equippedPet = response.data.companion.equipped_pet
      const activeBuff = response.data.companion.active_buff

      if (equippedPet?.achievement_key) {
        setPetProfile(getPetProfile(equippedPet.achievement_key))
        setPetSkill(equippedPet.buff || activeBuff || null)
        return
      }

      setPetProfile(null)
      setPetSkill(activeBuff || null)
    } catch {
      setPetProfile(null)
      setPetSkill(null)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchSelf(),
      fetchCompanion(),
      props.onSubscriptionRefresh(),
      props.onUserRefresh(),
    ])
  }, [fetchCompanion, fetchSelf, props])

  useEffect(() => {
    void fetchSelf()
  }, [fetchSelf])

  useEffect(() => {
    void fetchCompanion()
  }, [fetchCompanion])

  useEffect(() => {
    if (selectedQuantity <= 0) return

    const loadAmount = async () => {
      const response = await calculateBlindBoxAmount({ quantity: selectedQuantity })
      if (isApiSuccess(response) && response.data) {
        setAmountDue(parseFloat(response.data))
      } else {
        setAmountDue(0)
      }
    }

    void loadAmount()
  }, [selectedQuantity])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBlindBoxChanged = () => {
      void refreshAll()
    }

    window.addEventListener('blind-box:changed', handleBlindBoxChanged)
    return () => {
      window.removeEventListener('blind-box:changed', handleBlindBoxChanged)
    }
  }, [refreshAll])

  useEffect(() => {
    if (!props.paymentResult) return

    const syncPaymentResult = async () => {
      if (props.paymentResult === 'success') {
        toast.success('支付成功，系统正在同步盲盒结果。')
      } else if (props.paymentResult === 'pending') {
        toast.message('支付处理中，结果稍后会同步回来。')
      } else {
        toast.error('支付未完成，请重新发起购买。')
      }

      await refreshAll()
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    void syncPaymentResult()
  }, [props.paymentResult, refreshAll])

  useEffect(() => {
    if (
      !paymentState.open ||
      paymentState.stage !== 'pending' ||
      !paymentState.orderId
    ) {
      return
    }

    let active = true

    const pollOrder = async () => {
      try {
        const response = await getBlindBoxOrderStatus(paymentState.orderId)
        if (!active || !response.success || !response.data) return

        const order = response.data as BlindBoxOrderStatus
        if (order.status === 'success') {
          const refreshed = await getBlindBoxSelf()
          if (isApiSuccess(refreshed) && refreshed.data) {
            setData(refreshed.data)
            const openCount = Math.max(
              1,
              Number(order.opened_count || order.quantity || paymentState.quantity)
            )
            const resultRecords = (refreshed.data.overview?.recent_records || []).slice(
              0,
              openCount
            )
            setPrizeState({
              open: resultRecords.length > 0,
              records: resultRecords,
              openCount,
            })
          }
          await Promise.all([props.onSubscriptionRefresh(), props.onUserRefresh()])
          setPaymentState(EMPTY_PAYMENT_STATE)
          return
        }

        if (order.status === 'expired') {
          setPaymentState((current) => ({
            ...current,
            stage: 'failed',
            message: '订单已过期或支付未完成，请重新发起购买。',
          }))
        }
      } catch {
        // Keep polling until the state changes.
      }
    }

    void pollOrder()
    const timer = window.setInterval(() => {
      void pollOrder()
    }, 2000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [paymentState, props])

  const availableBoxes = data?.overview?.available_boxes || 0
  const effectivePityThreshold =
    data?.overview?.effective_pity_threshold || data?.pity_threshold || 1
  const pityProgress = data?.overview?.pity_progress || 0
  const remainingPity = Math.max(0, effectivePityThreshold - pityProgress)

  const activeCredits = useMemo(
    () => data?.overview?.active_credits?.slice(0, 3) || [],
    [data?.overview?.active_credits]
  )

  const startPendingPayment = useCallback(
    (args: {
      orderId: string
      amountDue: number
      quantity: number
      methodLabel: string
      payUrl?: string
      qrCodeUrl?: string
      formUrl?: string
      formFields?: Record<string, unknown> | null
    }) => {
        setPaymentState({
        open: true,
        stage: 'pending',
        orderId: args.orderId,
        amountDue: args.amountDue,
        methodLabel: args.methodLabel,
        payUrl: args.payUrl || '',
        qrCodeUrl: args.qrCodeUrl || '',
        formUrl: args.formUrl || '',
        formFields: args.formFields || null,
        quantity: args.quantity,
        message: '请在当前弹窗内扫码支付，付款完成后这里会自动显示结果。',
      })
    },
    []
  )

  const handlePay = useCallback(async () => {
    if (!selectedPaymentMethod) {
      toast.error('请选择支付方式')
      return
    }

    setPaying(true)
    try {
      const response = await requestBlindBoxPayment({
        quantity: selectedQuantity,
        payment_method: selectedPaymentMethod.type,
      })
      if (!isApiSuccess(response)) {
        throw new Error(response.message || '发起支付失败')
      }

      const payload = isRecord(response.data) ? response.data : {}
      const formFields = isRecord(payload.form) ? payload.form : null
      const orderId = String(payload.order_id || '')
      startPendingPayment({
        orderId,
        amountDue: Number(payload.amount_due || amountDue),
        quantity: Number(payload.quantity || selectedQuantity),
        methodLabel: getBlindBoxMethodLabel(selectedPaymentMethod),
        payUrl: String(payload.pay_url || response.url || ''),
        qrCodeUrl: String(payload.qrcode_url || ''),
        formUrl: formFields ? String(response.url || '') : '',
        formFields,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发起支付失败')
    } finally {
      setPaying(false)
    }
  }, [amountDue, selectedPaymentMethod, selectedQuantity, startPendingPayment])

  const handleManualOpen = useCallback(
    async (count: number) => {
      setOpeningCount(count)
      try {
        const response = await openBlindBoxes({ count })
        if (!response.success || !response.data) {
          throw new Error(response.message || '处理失败')
        }

        setPrizeState({
          open: true,
          records: response.data.records || [],
          openCount: response.data.open_count || count,
        })
        await refreshAll()
      } catch {
        toast.error('处理失败')
      } finally {
        setOpeningCount(null)
      }
    },
    [refreshAll]
  )

  const handleUseReward = useCallback((record: BlindBoxRecord) => {
    if (record.reward_type !== 'prop') return
    const expireAt = Date.now() + 24 * 60 * 60 * 1000
    setActiveProps((current) => {
      const next = { ...current, [record.reward_title]: expireAt }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('blind-box-active-props', JSON.stringify(next))
      }
      return next
    })
    toast.success(`${record.reward_title} 已启用，24 小时后自动失效。`)
  }, [])

  const handleOpenExternal = useCallback(() => {
    if (paymentState.formUrl && paymentState.formFields) {
      submitPaymentForm(paymentState.formUrl, paymentState.formFields)
      return
    }
    if (paymentState.payUrl) {
      window.open(paymentState.payUrl, '_blank', 'noopener,noreferrer')
    }
  }, [paymentState.formFields, paymentState.formUrl, paymentState.payUrl])

  return (
    <div className='space-y-4'>
      <BlindBoxCardView
        data={data}
        loading={loading}
        selectedQuantity={selectedQuantity}
        selectedPaymentMethod={selectedPaymentMethod}
        amountDue={amountDue}
        paying={paying}
        openingCount={openingCount}
        availableBoxes={availableBoxes}
        effectivePityThreshold={effectivePityThreshold}
        pityProgress={pityProgress}
        remainingPity={remainingPity}
        activeCredits={activeCredits}
        showPrizeNotice={showPrizeNotice}
        petProfile={petProfile}
        petSkill={petSkill}
        onQuantityChange={setSelectedQuantity}
        onPaymentMethodChange={setSelectedPaymentMethod}
        onPay={() => void handlePay()}
        onManualOpen={(count) => void handleManualOpen(count)}
        onTogglePrizeNotice={() => setShowPrizeNotice((current) => !current)}
        onClosePrizeNotice={() => setShowPrizeNotice(false)}
      />

      <BlindBoxPaymentDialog
        state={paymentState}
        onOpenChange={(open) => {
          if (!open && paymentState.stage === 'pending') return
          setPaymentState(open ? { ...paymentState, open } : EMPTY_PAYMENT_STATE)
        }}
        onOpenExternal={handleOpenExternal}
      />

      <BlindBoxPrizeDialog
        state={prizeState}
        onOpenChange={(open) =>
          setPrizeState((current) => ({
            ...current,
            open,
          }))
        }
        onUseReward={handleUseReward}
        activePropKeys={activeProps}
      />
    </div>
  )
}
