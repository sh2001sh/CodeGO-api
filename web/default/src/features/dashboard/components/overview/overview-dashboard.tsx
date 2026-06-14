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
import { OverviewHeroPanel } from './overview-hero-panel'
import { OverviewHealthPanel } from './overview-health-panel'
import { useSetupGuide } from './setup-guide/use-setup-guide'
import { SummaryCards } from './summary-cards'
import { AnnouncementsPanel } from './announcements-panel'
import { FAQPanel } from './faq-panel'

export function OverviewDashboard() {
  const setupGuide = useSetupGuide()

  return (
    <div className='flex flex-col gap-4'>
      <OverviewHeroPanel guide={setupGuide} />

      <SummaryCards />

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]'>
        <AnnouncementsPanel />
        <OverviewHealthPanel />
      </div>

      <FAQPanel />
    </div>
  )
}
