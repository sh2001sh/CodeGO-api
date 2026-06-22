/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your
option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useState } from 'react'
import { RedemptionCodePanel } from '@/features/wallet/components/redemption-code-panel'
import { useRedemption } from '@/features/wallet/hooks/use-redemption'
import { useTopupInfo } from '@/features/wallet/hooks/use-topup-info'
import { AnnouncementsPanel } from './announcements-panel'
import { FAQPanel } from './faq-panel'
import { OverviewHealthPanel } from './overview-health-panel'
import { OverviewHeroPanel } from './overview-hero-panel'
import { useSetupGuide } from './setup-guide/use-setup-guide'
import { SummaryCards } from './summary-cards'

export function OverviewDashboard() {
  const setupGuide = useSetupGuide()
  const [redemptionCode, setRedemptionCode] = useState('')
  const { topupInfo } = useTopupInfo()
  const { redeeming, redeemCode } = useRedemption()

  const handleRedeem = async () => {
    const success = await redeemCode(redemptionCode)
    if (success) setRedemptionCode('')
  }

  return (
    <div className='flex flex-col gap-4'>
      <OverviewHeroPanel guide={setupGuide} />

      <RedemptionCodePanel
        title='兑换码'
        description='有充值码、套餐码或活动码时可直接在这里兑换，无需再进入钱包页。'
        topupLink={topupInfo?.topup_link}
        redemptionCode={redemptionCode}
        onRedemptionCodeChange={setRedemptionCode}
        onRedeem={() => void handleRedeem()}
        redeeming={redeeming}
      />

      <SummaryCards />

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]'>
        <AnnouncementsPanel />
        <OverviewHealthPanel />
      </div>

      <FAQPanel />
    </div>
  )
}
