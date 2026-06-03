import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSelf } from '@/lib/api'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { getSelfSubscriptionFull } from '@/features/subscriptions/api'
import type { SelfSubscriptionData } from '@/features/subscriptions/types'
import { DEFAULT_DISCOUNT_RATE } from '../constants'
import {
  getDefaultPaymentType,
  getMinTopupAmount,
  isWaffoPancakePayment,
} from '../lib'
import type {
  CreemProduct,
  PaymentMethod,
  PresetAmount,
  UserWalletData,
  WalletType,
} from '../types'
import { useCreemPayment } from './use-creem-payment'
import { usePayment } from './use-payment'
import { useRedemption } from './use-redemption'
import { useTopupInfo } from './use-topup-info'
import { useWaffoPancakePayment } from './use-waffo-pancake-payment'
import { useWaffoPayment } from './use-waffo-payment'

export function useWalletWorkspace() {
  const [user, setUser] = useState<UserWalletData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] =
    useState<SelfSubscriptionData | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState(0)
  const [selectedWalletType, setSelectedWalletType] =
    useState<WalletType>('default')
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>()
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [creemDialogOpen, setCreemDialogOpen] = useState(false)
  const [selectedCreemProduct, setSelectedCreemProduct] =
    useState<CreemProduct | null>(null)

  const { status } = useStatus()
  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  const effectiveUsdExchangeRate = useMemo(() => {
    return currency?.quotaDisplayType === 'USD'
      ? 1
      : currency?.usdExchangeRate || 1
  }, [currency?.quotaDisplayType, currency?.usdExchangeRate])

  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
  } = usePayment()
  const { redeeming, redeemCode } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } =
    useWaffoPancakePayment()

  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      const response = await getSelf()
      if (response.success && response.data) {
        setUser(response.data as UserWalletData)
      }
    } catch (_error) {
      // no-op
    } finally {
      setUserLoading(false)
    }
  }, [])

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setSubscriptionLoading(true)
      const response = await getSelfSubscriptionFull()
      if (response.success && response.data) {
        setSubscriptionData(response.data)
      } else {
        setSubscriptionData(null)
      }
    } catch (_error) {
      setSubscriptionData(null)
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUser()
    void fetchSubscriptionData()
  }, [fetchSubscriptionData, fetchUser])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSubscriptionChanged = () => {
      void fetchSubscriptionData()
      void fetchUser()
    }

    window.addEventListener('subscription:changed', handleSubscriptionChanged)
    return () => {
      window.removeEventListener(
        'subscription:changed',
        handleSubscriptionChanged
      )
    }
  }, [fetchSubscriptionData, fetchUser])

  useEffect(() => {
    if (topupInfo && topupAmount === 0) {
      const minTopup =
        selectedWalletType === 'claude' ? 1 : getMinTopupAmount(topupInfo)
      setTopupAmount(minTopup)

      const defaultPaymentType = getDefaultPaymentType(topupInfo)
      calculatePaymentAmount(minTopup, defaultPaymentType, selectedWalletType)
    }
  }, [topupInfo, topupAmount, calculatePaymentAmount, selectedWalletType])

  const getCurrentPaymentType = useCallback(() => {
    return selectedPaymentMethod?.type || getDefaultPaymentType(topupInfo)
  }, [selectedPaymentMethod, topupInfo])

  const handleSelectPreset = useCallback(
    (preset: PresetAmount) => {
      setTopupAmount(preset.value)
      setSelectedPreset(preset.value)
      calculatePaymentAmount(
        preset.value,
        getCurrentPaymentType(),
        selectedWalletType
      )
    },
    [calculatePaymentAmount, getCurrentPaymentType, selectedWalletType]
  )

  const handleTopupAmountChange = useCallback(
    (amount: number) => {
      setTopupAmount(amount)
      setSelectedPreset(null)
      calculatePaymentAmount(
        amount,
        getCurrentPaymentType(),
        selectedWalletType
      )
    },
    [calculatePaymentAmount, getCurrentPaymentType, selectedWalletType]
  )

  const handleWalletTypeChange = useCallback(
    (walletType: WalletType) => {
      setSelectedWalletType(walletType)
      const nextAmount =
        walletType === 'claude'
          ? Math.max(1, topupAmount)
          : Math.max(getMinTopupAmount(topupInfo), topupAmount)
      setTopupAmount(nextAmount)
      setSelectedPreset(null)
      calculatePaymentAmount(nextAmount, getCurrentPaymentType(), walletType)
    },
    [calculatePaymentAmount, getCurrentPaymentType, topupAmount, topupInfo]
  )

  const handlePaymentMethodSelect = useCallback(
    async (method: PaymentMethod) => {
      setSelectedPaymentMethod(method)
      setPaymentLoading(method.type)

      try {
        const minTopup =
          selectedWalletType === 'claude' ? 1 : getMinTopupAmount(topupInfo)
        if (topupAmount < minTopup) {
          return
        }

        await calculatePaymentAmount(
          topupAmount,
          method.type,
          selectedWalletType
        )
        setConfirmDialogOpen(true)
      } finally {
        setPaymentLoading(null)
      }
    },
    [calculatePaymentAmount, selectedWalletType, topupAmount, topupInfo]
  )

  const handlePaymentConfirm = useCallback(async () => {
    if (!selectedPaymentMethod) return

    const isPancake = isWaffoPancakePayment(selectedPaymentMethod.type)
    const success = isPancake
      ? await processWaffoPancakePayment(topupAmount, selectedWalletType)
      : await processPayment(
          topupAmount,
          selectedPaymentMethod.type,
          selectedWalletType
        )

    if (success) {
      setConfirmDialogOpen(false)
      await fetchUser()
    }
  }, [
    fetchUser,
    processPayment,
    processWaffoPancakePayment,
    selectedPaymentMethod,
    selectedWalletType,
    topupAmount,
  ])

  const handleRedeem = useCallback(async () => {
    if (!redemptionCode) return

    const success = await redeemCode(redemptionCode)
    if (success) {
      setRedemptionCode('')
      await fetchUser()
    }
  }, [fetchUser, redeemCode, redemptionCode])

  const handleCreemProductSelect = useCallback((product: CreemProduct) => {
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }, [])

  const handleCreemConfirm = useCallback(async () => {
    if (!selectedCreemProduct) return

    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
      await fetchUser()
    }
  }, [fetchUser, processCreemPayment, selectedCreemProduct])

  const handleWaffoMethodSelect = useCallback(
    async (_method: unknown, index: number) => {
      const loadingKey = `waffo-${index}`
      setPaymentLoading(loadingKey)

      try {
        await processWaffoPayment(topupAmount, index, selectedWalletType)
      } finally {
        setPaymentLoading(null)
      }
    },
    [processWaffoPayment, selectedWalletType, topupAmount]
  )

  const getDiscountRate = useCallback(() => {
    if (selectedWalletType === 'claude') {
      return DEFAULT_DISCOUNT_RATE
    }
    return topupInfo?.discount?.[topupAmount] || DEFAULT_DISCOUNT_RATE
  }, [selectedWalletType, topupInfo, topupAmount])

  return {
    user,
    userLoading,
    subscriptionData,
    subscriptionLoading,
    topupInfo,
    presetAmounts,
    topupLoading,
    topupAmount,
    selectedWalletType,
    selectedPreset,
    selectedPaymentMethod,
    paymentAmount,
    calculating,
    paymentLoading,
    redemptionCode,
    redeeming,
    status,
    effectiveUsdExchangeRate,
    confirmDialogOpen,
    billingDialogOpen,
    creemDialogOpen,
    selectedCreemProduct,
    processing,
    pancakeProcessing,
    creemProcessing,
    fetchUser,
    fetchSubscriptionData,
    handleSelectPreset,
    handleTopupAmountChange,
    handleWalletTypeChange,
    handlePaymentMethodSelect,
    handlePaymentConfirm,
    handleRedeem,
    handleCreemProductSelect,
    handleCreemConfirm,
    handleWaffoMethodSelect,
    getDiscountRate,
    setConfirmDialogOpen,
    setBillingDialogOpen,
    setCreemDialogOpen,
    setRedemptionCode,
  }
}
