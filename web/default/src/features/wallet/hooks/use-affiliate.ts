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
import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'
import { toast } from 'sonner'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { reportGamificationShareLink } from '@/features/gamification/api'
import { getAffiliateRewardsOverview, transferAffiliateQuota } from '../api'
import { generateAffiliateLink } from '../lib'

const AFFILIATE_OVERVIEW_QUERY_KEY = ['wallet', 'affiliate', 'overview'] as const

export function useAffiliate() {
  const queryClient = useQueryClient()
  const [transferring, setTransferring] = useState(false)
  const { copyToClipboard } = useCopyToClipboard()

  const overviewQuery = useQuery({
    queryKey: AFFILIATE_OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const response = await getAffiliateRewardsOverview()
      return response.success ? (response.data ?? null) : null
    },
    staleTime: 60 * 1000,
  })

  const affiliateCode = overviewQuery.data?.affiliate_code ?? ''
  const affiliateLink = useMemo(
    () => (affiliateCode ? generateAffiliateLink(affiliateCode) : ''),
    [affiliateCode]
  )

  const copyAffiliateLink = useCallback(async () => {
    if (!affiliateLink) return
    const copied = await copyToClipboard(affiliateLink)
    if (!copied) return
    try {
      const response = await reportGamificationShareLink()
      if (response.success && response.data?.claimed) {
        toast.success('分享任务已完成，奖励已到账')
        await queryClient.invalidateQueries({
          queryKey: ['gamification', 'dashboard'],
        })
      }
    } catch {
      // Share succeeded even if reward report fails.
    }
  }, [affiliateLink, copyToClipboard, queryClient])

  const transferQuota = useCallback(async (quota: number): Promise<boolean> => {
    try {
      setTransferring(true)
      const response = await transferAffiliateQuota({ quota })
      if (response.success) {
        toast.success(response.message || i18next.t('Transfer successful'))
        await queryClient.invalidateQueries({
          queryKey: AFFILIATE_OVERVIEW_QUERY_KEY,
        })
        await queryClient.invalidateQueries({
          queryKey: ['dashboard', 'overview', 'affiliate'],
        })
        return true
      }
      toast.error(response.message || i18next.t('Transfer failed'))
      return false
    } catch {
      toast.error(i18next.t('Transfer failed'))
      return false
    } finally {
      setTransferring(false)
    }
  }, [queryClient])

  return {
    overview: overviewQuery.data,
    affiliateCode,
    affiliateLink,
    loading: overviewQuery.isLoading,
    transferring,
    copyAffiliateLink,
    transferQuota,
    refetch: overviewQuery.refetch,
  }
}
