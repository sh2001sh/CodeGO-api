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
import { z } from 'zod'
import type { TFunction } from 'i18next'
import type { SubscriptionPlan, PlanPayload } from '../types'

type PlanQuotaMode = 'total' | 'weekly'

function isMonthlyCardPlanInput(
  durationUnit: string,
  durationValue: number
): boolean {
  return durationUnit === 'month' && Number(durationValue || 0) === 1
}

function deriveQuotaMode(plan: SubscriptionPlan): PlanQuotaMode {
  if (
    isMonthlyCardPlanInput(
      plan.duration_unit || 'month',
      Number(plan.duration_value || 0)
    ) &&
    plan.quota_reset_period === 'weekly' &&
    Number(plan.period_amount || 0) > 0
  ) {
    return 'weekly'
  }
  return 'total'
}

export function getPlanFormSchema(t: TFunction) {
  return z.object({
    title: z.string().min(1, t('Please enter plan title')),
    subtitle: z.string().optional(),
    price_amount: z.coerce.number().min(0, t('Please enter amount')),
    currency: z.string().min(1),
    duration_unit: z.enum(['year', 'month', 'day', 'hour', 'custom']),
    duration_value: z.coerce.number().min(1),
    custom_seconds: z.coerce.number().min(0).optional(),
    quota_reset_period: z.enum([
      'never',
      'daily',
      'weekly',
      'monthly',
      'custom',
    ]),
    quota_reset_custom_seconds: z.coerce.number().min(0).optional(),
    enabled: z.boolean(),
    sort_order: z.coerce.number(),
    max_purchase_per_user: z.coerce.number().min(0),
    quota_mode: z.enum(['total', 'weekly']),
    total_amount: z.coerce.number().min(0),
    period_amount: z.coerce.number().min(0),
    model_limits: z.string().optional(),
    upgrade_group: z.string().optional(),
    stripe_price_id: z.string().optional(),
    creem_product_id: z.string().optional(),
  })
}

export type PlanFormValues = z.infer<ReturnType<typeof getPlanFormSchema>>

export const PLAN_FORM_DEFAULTS: PlanFormValues = {
  title: '',
  subtitle: '',
  price_amount: 0,
  currency: 'CNY',
  duration_unit: 'month',
  duration_value: 1,
  custom_seconds: 0,
  quota_reset_period: 'never',
  quota_reset_custom_seconds: 0,
  enabled: true,
  sort_order: 0,
  max_purchase_per_user: 0,
  quota_mode: 'total',
  total_amount: 0,
  period_amount: 0,
  model_limits: '',
  upgrade_group: '',
  stripe_price_id: '',
  creem_product_id: '',
}

export function planToFormValues(plan: SubscriptionPlan): PlanFormValues {
  return {
    title: plan.title || '',
    subtitle: plan.subtitle || '',
    price_amount: Number(plan.price_amount || 0),
    currency: plan.currency || 'USD',
    duration_unit: plan.duration_unit || 'month',
    duration_value: Number(plan.duration_value || 1),
    custom_seconds: Number(plan.custom_seconds || 0),
    quota_reset_period: plan.quota_reset_period || 'never',
    quota_reset_custom_seconds: Number(plan.quota_reset_custom_seconds || 0),
    enabled: plan.enabled !== false,
    sort_order: Number(plan.sort_order || 0),
    max_purchase_per_user: Number(plan.max_purchase_per_user || 0),
    quota_mode: deriveQuotaMode(plan),
    total_amount: Number(plan.total_amount || 0),
    period_amount: Number(plan.period_amount || 0),
    model_limits: plan.model_limits || '',
    upgrade_group: plan.upgrade_group || '',
    stripe_price_id: plan.stripe_price_id || '',
    creem_product_id: plan.creem_product_id || '',
  }
}

export function formValuesToPlanPayload(values: PlanFormValues): PlanPayload {
  const isMonthlyCard = isMonthlyCardPlanInput(
    values.duration_unit,
    Number(values.duration_value || 0)
  )
  const useWeeklyQuota = isMonthlyCard && values.quota_mode === 'weekly'
  const periodAmount = useWeeklyQuota
    ? Number(values.period_amount || 0)
    : isMonthlyCard
      ? 0
      : Number(values.period_amount || 0)
  const totalAmount = useWeeklyQuota
    ? periodAmount * 4
    : Number(values.total_amount || 0)
  const quotaResetPeriod = useWeeklyQuota
    ? 'weekly'
    : values.quota_reset_period || 'never'

  return {
    plan: {
      title: values.title,
      subtitle: values.subtitle || '',
      price_amount: Number(values.price_amount || 0),
      currency: values.currency || 'USD',
      duration_unit: values.duration_unit,
      duration_value: Number(values.duration_value || 0),
      custom_seconds: Number(values.custom_seconds || 0),
      quota_reset_period: quotaResetPeriod,
      quota_reset_custom_seconds:
        quotaResetPeriod === 'custom'
          ? Number(values.quota_reset_custom_seconds || 0)
          : 0,
      enabled: values.enabled,
      sort_order: Number(values.sort_order || 0),
      max_purchase_per_user: Number(values.max_purchase_per_user || 0),
      total_amount: totalAmount,
      period_amount: periodAmount,
      model_limits: values.model_limits || '',
      upgrade_group: values.upgrade_group || '',
      stripe_price_id: values.stripe_price_id || '',
      creem_product_id: values.creem_product_id || '',
    },
  }
}
