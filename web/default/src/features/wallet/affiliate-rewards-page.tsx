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
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSelf } from '@/lib/api'
import { SectionPageLayout } from '@/components/layout'
import { AffiliateRewardsCard } from './components/affiliate-rewards-card'
import { TransferDialog } from './components/dialogs/transfer-dialog'
import { WalletStatsCard } from './components/wallet-stats-card'
import { useAffiliate, useRedemption, useTopupInfo } from './hooks'
import type { UserWalletData } from './types'

export function AffiliateRewardsPage() {
  const { t } = useTranslation()
  const [user, setUser] = useState<UserWalletData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const { topupInfo } = useTopupInfo()
  const {
    affiliateLink,
    loading: affiliateLoading,
    transferQuota,
    transferring,
  } = useAffiliate()
  const { redeeming, redeemCode } = useRedemption()

  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      const response = await getSelf()
      if (response.success && response.data) {
        setUser(response.data as UserWalletData)
      }
    } finally {
      setUserLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const handleTransfer = async (amount: number) => {
    const success = await transferQuota(amount)
    if (success) {
      await fetchUser()
    }
    return success
  }

  const handleRedeem = async () => {
    if (!redemptionCode) return

    const success = await redeemCode(redemptionCode)
    if (success) {
      setRedemptionCode('')
      await fetchUser()
    }
  }

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Invite Rewards')}</SectionPageLayout.Title>
        <SectionPageLayout.Description>
          {t(
            'Share your invitation link, review pending rewards, and transfer available rewards into your main balance.'
          )}
        </SectionPageLayout.Description>
        <SectionPageLayout.Content>
          <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-5'>
            <div className='grid gap-3 md:grid-cols-3'>
              <div className='rounded-2xl border bg-card p-4'>
                <div className='text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
                  Step 1
                </div>
                <div className='mt-2 text-sm font-semibold'>复制邀请链接</div>
                <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                  从邀请奖励页复制专属链接，发给需要接入 Code Go 的新用户。
                </div>
              </div>
              <div className='rounded-2xl border bg-card p-4'>
                <div className='text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
                  Step 2
                </div>
                <div className='mt-2 text-sm font-semibold'>等待邀请生效</div>
                <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                  新用户通过链接注册并完成有效使用后，邀请奖励会累计到当前账号。
                </div>
              </div>
              <div className='rounded-2xl border bg-card p-4'>
                <div className='text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
                  Step 3
                </div>
                <div className='mt-2 text-sm font-semibold'>转入主余额</div>
                <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                  奖励额度会先记录在邀请余额里，确认后可以一键转入主余额继续使用。
                </div>
              </div>
            </div>

            <WalletStatsCard
              user={user}
              loading={userLoading}
              topupLink={topupInfo?.topup_link}
              redemptionCode={redemptionCode}
              onRedemptionCodeChange={setRedemptionCode}
              onRedeem={handleRedeem}
              redeeming={redeeming}
            />
            <AffiliateRewardsCard
              user={user}
              affiliateLink={affiliateLink}
              onTransfer={() => setTransferDialogOpen(true)}
              complianceConfirmed={
                topupInfo?.payment_compliance_confirmed !== false
              }
              loading={affiliateLoading || userLoading}
            />
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onConfirm={handleTransfer}
        availableQuota={user?.aff_quota ?? 0}
        transferring={transferring}
      />
    </>
  )
}
