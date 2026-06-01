import { api } from '@/lib/api'
import type {
  ApiResponse,
  BonusQuotaConversionResult,
  PointMallCardSecret,
  PointMallOrder,
  PointMallOverview,
  PointMallProduct,
  PointMallRules,
} from './types'

export async function getPointMallOverview() {
  const res = await api.get<ApiResponse<PointMallOverview>>(
    '/api/point-mall/overview'
  )
  return res.data
}

export async function convertBonusQuota(points: number) {
  const res = await api.post<ApiResponse<BonusQuotaConversionResult>>(
    '/api/point-mall/bonus-quota/convert',
    { points }
  )
  return res.data
}

export async function redeemPointMallProduct(productId: number) {
  const res = await api.post<ApiResponse<PointMallOrder>>(
    `/api/point-mall/products/${productId}/redeem`
  )
  return res.data
}

export async function getPointMallOrders() {
  const res = await api.get<ApiResponse<PointMallOrder[]>>(
    '/api/point-mall/orders'
  )
  return res.data
}

export async function adminGetPointMallProducts() {
  const res = await api.get<ApiResponse<PointMallProduct[]>>(
    '/api/point-mall/admin/products'
  )
  return res.data
}

export async function adminSavePointMallProduct(
  product: Partial<PointMallProduct>
) {
  const payload = { product }
  if (product.id) {
    const res = await api.put<ApiResponse<null>>(
      `/api/point-mall/admin/products/${product.id}`,
      payload
    )
    return res.data
  }
  const res = await api.post<ApiResponse<PointMallProduct>>(
    '/api/point-mall/admin/products',
    payload
  )
  return res.data
}

export async function adminGetPointMallCardSecrets(reveal = false) {
  const res = await api.get<ApiResponse<PointMallCardSecret[]>>(
    '/api/point-mall/admin/card-secrets',
    { params: { reveal } }
  )
  return res.data
}

export async function adminCreatePointMallCardSecret(payload: {
  product_id: number
  card_no: string
  card_secret: string
}) {
  const res = await api.post<ApiResponse<PointMallCardSecret>>(
    '/api/point-mall/admin/card-secrets',
    payload
  )
  return res.data
}

export async function adminVoidPointMallCardSecret(cardId: number) {
  const res = await api.patch<ApiResponse<null>>(
    `/api/point-mall/admin/card-secrets/${cardId}/void`
  )
  return res.data
}

export async function adminGetPointMallOrders(reveal = false) {
  const res = await api.get<ApiResponse<PointMallOrder[]>>(
    '/api/point-mall/admin/orders',
    { params: { reveal } }
  )
  return res.data
}

export async function adminPatchPointMallOrder(payload: {
  id: number
  status: string
  reason?: string
}) {
  const res = await api.patch<ApiResponse<null>>(
    `/api/point-mall/admin/orders/${payload.id}`,
    { status: payload.status, reason: payload.reason ?? '' }
  )
  return res.data
}

export async function adminGetPointMallRules() {
  const res = await api.get<ApiResponse<PointMallRules>>(
    '/api/point-mall/admin/rules'
  )
  return res.data
}

export async function adminUpdatePointMallRules(rules: PointMallRules) {
  const res = await api.put<ApiResponse<PointMallRules>>(
    '/api/point-mall/admin/rules',
    { rules }
  )
  return res.data
}
