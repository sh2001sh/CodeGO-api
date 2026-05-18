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
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getSelf } from '@/lib/api'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { SectionPageLayout } from '@/components/layout'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { getSelfSubscriptionFull } from '@/features/subscriptions/api'
import type { SelfSubscriptionData } from '@/features/subscriptions/types'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { RechargeFormCard } from './components/recharge-form-card'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import { DEFAULT_DISCOUNT_RATE } from './constants'
import {
  useTopupInfo,
  usePayment,
  useRedemption,
  useCreemPayment,
  useWaffoPayment,
  useWaffoPancakePayment,
} from './hooks'
import {
  getDefaultPaymentType,
  getMinTopupAmount,
  isWaffoPancakePayment,
} from './lib'
import type {
  UserWalletData,
  PaymentMethod,
  PresetAmount,
  CreemProduct,
} from './types'

interface WalletProps {
  initialShowHistory?: boolean
}

type WalletTab = 'subscription' | 'topup'

function getInitialWalletTab(): WalletTab {
  if (typeof window === 'undefined') return 'subscription'
  return window.location.hash === '#wallet-add-funds' ? 'topup' : 'subscription'
}

function setWalletHash(tab: WalletTab) {
  if (typeof window === 'undefined') return
  const hash = tab === 'topup' ? '#wallet-add-funds' : '#wallet-subscriptions'
  if (window.location.hash === hash) return
  window.history.replaceState({}, '', `${window.location.pathname}${hash}`)
}

export function Wallet(props: WalletProps) {
  const { t } = useTranslation()
  const [user, setUser] = useState<UserWalletData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] =
    useState<SelfSubscriptionData | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState(0)
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
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(true)
  const [activeTab, setActiveTab] = useState<WalletTab>(getInitialWalletTab)

  const { status } = useStatus()
  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  // Calculate effective exchange rate - when display type is USD, use rate of 1
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
  const {
    redeeming,
    redeemCode,
  } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } =
    useWaffoPancakePayment()

  // Fetch and refresh user data
  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      const response = await getSelf()
      if (response.success && response.data) {
        setUser(response.data as UserWalletData)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user data:', error)
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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch subscription data:', error)
      setSubscriptionData(null)
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
    fetchSubscriptionData()
  }, [fetchSubscriptionData, fetchUser])

  useEffect(() => {
    if (props.initialShowHistory) {
      setBillingDialogOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [props.initialShowHistory])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const syncTabFromHash = () => {
      setActiveTab(
        window.location.hash === '#wallet-add-funds' ? 'topup' : 'subscription'
      )
    }

    syncTabFromHash()
    window.addEventListener('hashchange', syncTabFromHash)
    return () => {
      window.removeEventListener('hashchange', syncTabFromHash)
    }
  }, [])

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

  // Initialize topup amount when topup info is loaded
  useEffect(() => {
    if (topupInfo && topupAmount === 0) {
      const minTopup = getMinTopupAmount(topupInfo)
      setTopupAmount(minTopup)

      // Calculate initial payment amount with default payment type
      const defaultPaymentType = getDefaultPaymentType(topupInfo)
      calculatePaymentAmount(minTopup, defaultPaymentType)
    }
  }, [topupInfo, topupAmount, calculatePaymentAmount])

  // Get current payment type (selected or default)
  const getCurrentPaymentType = useCallback(() => {
    return selectedPaymentMethod?.type || getDefaultPaymentType(topupInfo)
  }, [selectedPaymentMethod, topupInfo])

  // Handle preset selection
  const handleSelectPreset = (preset: PresetAmount) => {
    setTopupAmount(preset.value)
    setSelectedPreset(preset.value)
    calculatePaymentAmount(preset.value, getCurrentPaymentType())
  }

  // Handle topup amount change
  const handleTopupAmountChange = (amount: number) => {
    setTopupAmount(amount)
    setSelectedPreset(null)
    calculatePaymentAmount(amount, getCurrentPaymentType())
  }

  // Handle payment method selection
  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    setPaymentLoading(method.type)

    try {
      // Validate minimum topup
      const minTopup = getMinTopupAmount(topupInfo)
      if (topupAmount < minTopup) {
        return
      }

      // Calculate payment amount and show confirmation dialog
      await calculatePaymentAmount(topupAmount, method.type)
      setConfirmDialogOpen(true)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Handle payment confirmation
  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) return

    const isPancake = isWaffoPancakePayment(selectedPaymentMethod.type)
    const success = isPancake
      ? await processWaffoPancakePayment(topupAmount)
      : await processPayment(topupAmount, selectedPaymentMethod.type)

    if (success) {
      setConfirmDialogOpen(false)
      await fetchUser()
    }
  }

  // Handle redemption
  const handleRedeem = async () => {
    if (!redemptionCode) return

    const success = await redeemCode(redemptionCode)
    if (success) {
      setRedemptionCode('')
      await fetchUser()
    }
  }

  // Handle Creem product selection
  const handleCreemProductSelect = (product: CreemProduct) => {
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }

  // Handle Creem payment confirmation
  const handleCreemConfirm = async () => {
    if (!selectedCreemProduct) return

    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
      await fetchUser()
    }
  }

  const handleWaffoMethodSelect = async (_method: unknown, index: number) => {
    const loadingKey = `waffo-${index}`
    setPaymentLoading(loadingKey)

    try {
      await processWaffoPayment(topupAmount, index)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Get discount rate for current topup amount
  const getDiscountRate = useCallback(() => {
    return topupInfo?.discount?.[topupAmount] || DEFAULT_DISCOUNT_RATE
  }, [topupInfo, topupAmount])

  const handleSubscriptionAvailabilityChange = useCallback(
    (available: boolean) => {
      setShowSubscriptionPanel(available)
    },
    []
  )

  useEffect(() => {
    if (!showSubscriptionPanel && activeTab === 'subscription') {
      setActiveTab('topup')
      setWalletHash('topup')
    }
  }, [activeTab, showSubscriptionPanel])

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Wallet')}</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div className='mx-auto grid w-full max-w-[1760px] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:p-5'>
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  const nextTab = value as WalletTab
                  setActiveTab(nextTab)
                  setWalletHash(nextTab)
                }}
                className='space-y-3'
              >
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <h2 className='text-lg font-semibold tracking-tight text-slate-950'>
                    钱包操作
                  </h2>
                  <TabsList className='grid h-11 w-full grid-cols-2 rounded-2xl bg-slate-100 p-1 sm:w-[320px]'>
                    <TabsTrigger
                      value='subscription'
                      disabled={!showSubscriptionPanel}
                      className='rounded-xl text-sm font-medium'
                    >
                      套餐购买
                    </TabsTrigger>
                    <TabsTrigger
                      value='topup'
                      className='rounded-xl text-sm font-medium'
                    >
                      额度充值
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value='subscription' className='mt-0'>
                  <SubscriptionPlansCard
                    topupInfo={topupInfo}
                    subscriptionData={subscriptionData}
                    subscriptionLoading={subscriptionLoading}
                    onAvailabilityChange={handleSubscriptionAvailabilityChange}
                    onSubscriptionRefresh={fetchSubscriptionData}
                  />
                </TabsContent>

                <TabsContent value='topup' className='mt-0'>
                  <div id='wallet-add-funds' className='scroll-mt-4'>
                    <RechargeFormCard
                      topupInfo={topupInfo}
                      presetAmounts={presetAmounts}
                      selectedPreset={selectedPreset}
                      onSelectPreset={handleSelectPreset}
                      topupAmount={topupAmount}
                      onTopupAmountChange={handleTopupAmountChange}
                      paymentAmount={paymentAmount}
                      calculating={calculating}
                      onPaymentMethodSelect={handlePaymentMethodSelect}
                      paymentLoading={paymentLoading}
                      redemptionCode={redemptionCode}
                      onRedemptionCodeChange={setRedemptionCode}
                      onRedeem={handleRedeem}
                      redeeming={redeeming}
                      topupLink={topupInfo?.topup_link}
                      loading={topupLoading}
                      showRedemptionSection={false}
                      priceRatio={(status?.price as number) || 1}
                      usdExchangeRate={effectiveUsdExchangeRate}
                      onOpenBilling={() => setBillingDialogOpen(true)}
                      creemProducts={topupInfo?.creem_products}
                      enableCreemTopup={topupInfo?.enable_creem_topup}
                      onCreemProductSelect={handleCreemProductSelect}
                      enableWaffoTopup={topupInfo?.enable_waffo_topup}
                      waffoPayMethods={topupInfo?.waffo_pay_methods}
                      waffoMinTopup={topupInfo?.waffo_min_topup}
                      onWaffoMethodSelect={handleWaffoMethodSelect}
                      enableWaffoPancakeTopup={
                        topupInfo?.enable_waffo_pancake_topup
                      }
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <WalletStatsCard
              user={user}
              loading={userLoading}
              topupLink={topupInfo?.topup_link}
              redemptionCode={redemptionCode}
              onRedemptionCodeChange={setRedemptionCode}
              onRedeem={handleRedeem}
              redeeming={redeeming}
              subscriptionData={subscriptionData}
              subscriptionLoading={subscriptionLoading}
              onSubscriptionRefresh={fetchSubscriptionData}
            />
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <PaymentConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handlePaymentConfirm}
        topupAmount={topupAmount}
        paymentAmount={paymentAmount}
        paymentMethod={selectedPaymentMethod}
        calculating={calculating}
        processing={processing || pancakeProcessing}
        discountRate={getDiscountRate()}
        usdExchangeRate={effectiveUsdExchangeRate}
      />

      <BillingHistoryDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />

      <CreemConfirmDialog
        open={creemDialogOpen}
        onOpenChange={setCreemDialogOpen}
        onConfirm={handleCreemConfirm}
        product={selectedCreemProduct}
        processing={creemProcessing}
      />
    </>
  )
}
