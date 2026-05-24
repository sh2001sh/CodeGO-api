import { api } from '@/lib/api'
import type {
  GeneMapApiResponse,
  GeneMapComparison,
  GeneMapPublicShare,
  GeneMapSharePayload,
  GeneMapSnapshot,
} from './types'

export async function generateGeneMap(days = 30) {
  const res = await api.get<GeneMapApiResponse<GeneMapSnapshot>>(
    '/api/user/gene-map/generate',
    {
      params: { days },
    }
  )
  return res.data
}

export async function createGeneMapShare(days = 30) {
  const res = await api.post<GeneMapApiResponse<GeneMapSharePayload>>(
    '/api/user/gene-map/share',
    {
      days,
    }
  )
  return res.data
}

export async function getPublicGeneMapShare(token: string) {
  const res = await api.get<GeneMapApiResponse<GeneMapPublicShare>>(
    `/api/gene-map/share/${token}`
  )
  return res.data
}

export async function compareGeneMapShare(token: string) {
  const res = await api.get<GeneMapApiResponse<GeneMapComparison>>(
    `/api/user/gene-map/compare/${token}`
  )
  return res.data
}
