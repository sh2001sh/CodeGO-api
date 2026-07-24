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
import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { ROLE } from '@/lib/roles'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionPageLayout } from '@/components/layout'
import { RoutePoolsContent } from '@/features/route-pools'
import { ChannelsDialogs } from './components/channels-dialogs'
import { ChannelsPrimaryButtons } from './components/channels-primary-buttons'
import { ChannelsProvider } from './components/channels-provider'
import { ChannelsTable } from './components/channels-table'

const route = getRouteApi('/_authenticated/channels/')

export function Channels() {
  const { t } = useTranslation()
  const navigate = route.useNavigate()
  const search = route.useSearch()
  const isSuperAdmin = useAuthStore(
    (state) => state.auth.user?.role === ROLE.SUPER_ADMIN
  )
  const activeTab =
    isSuperAdmin && search.tab === 'route-pools' ? 'route-pools' : 'channels'

  const handleTabChange = (tab: string) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        tab: tab === 'route-pools' ? 'route-pools' : undefined,
      }),
    })
  }

  return (
    <ChannelsProvider>
      <SectionPageLayout>
        <SectionPageLayout.Title>
          {activeTab === 'route-pools' ? '智能路由池' : t('Channels')}
        </SectionPageLayout.Title>
        <SectionPageLayout.Description>
          {activeTab === 'route-pools'
            ? '配置分组可用渠道、采购成本和自动选择规则。'
            : '维护上游接入、凭据和模型能力；路由参与状态在智能路由池中管理。'}
        </SectionPageLayout.Description>
        <SectionPageLayout.Actions>
          {activeTab === 'channels' && <ChannelsPrimaryButtons />}
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <div className='space-y-4'>
            {isSuperAdmin && (
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className='h-auto max-w-full flex-wrap justify-start'>
                  <TabsTrigger value='channels'>渠道配置</TabsTrigger>
                  <TabsTrigger value='route-pools'>智能路由池</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            {activeTab === 'route-pools' ? (
              <RoutePoolsContent />
            ) : (
              <ChannelsTable />
            )}
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <ChannelsDialogs />
    </ChannelsProvider>
  )
}
