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
import { Check, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Markdown } from '@/components/ui/markdown'
import { StatusBadge } from '@/components/status-badge'
import { getPublicPlans } from '@/features/subscriptions/api'
import {
  formatDuration,
  formatResetPeriod,
  formatSubscriptionPlanPrice,
  getSubscriptionPlanDescription,
  getSubscriptionPlanDetailText,
  getSubscriptionPlanSubtitle,
  isDayPassPlan,
} from '@/features/subscriptions/lib'
import type { PlanRecord } from '@/features/subscriptions/types'
import { useHomePagePackagesContent } from '../../hooks/use-home-page-packages-content'

function usePublicPackagePlans() {
  const [plans, setPlans] = useState<PlanRecord[]>([])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const response = await getPublicPlans()
        if (!mounted || !response.success || !response.data) return
        setPlans(response.data)
      } catch {
        if (mounted) setPlans([])
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  return plans
}

function getPurchaseRedirect() {
  return '/wallet#wallet-subscriptions'
}

function getPurchaseHref(isAuthenticated: boolean) {
  const redirectTarget = getPurchaseRedirect()
  if (isAuthenticated) return redirectTarget
  return `/sign-in?redirect=${encodeURIComponent(redirectTarget)}`
}

interface PackagesProps {
  isAuthenticated?: boolean
  hidden?: boolean
}

export function Packages({
  isAuthenticated = false,
  hidden = false,
}: PackagesProps) {
  const { t } = useTranslation()
  const packageIntro = useHomePagePackagesContent()
  const plans = usePublicPackagePlans()

  const groupedPlans = useMemo(() => {
    const month: PlanRecord[] = []
    const day: PlanRecord[] = []

    for (const record of plans) {
      if (!record?.plan?.enabled) continue
      if (isDayPassPlan(record.plan)) {
        day.push(record)
      } else {
        month.push(record)
      }
    }

    return { month, day }
  }, [plans])

  if (hidden) return null
  if (groupedPlans.month.length === 0 && groupedPlans.day.length === 0) {
    return null
  }

  const renderPlanCard = (record: PlanRecord, index: number) => {
    const plan = record.plan
    const totalAmount = Number(plan.total_amount || 0)
    const periodAmount = Number(plan.period_amount || 0)
    const priceAmount = Number(plan.price_amount || 0)
    const summary = getSubscriptionPlanDescription(
      plan,
      totalAmount,
      periodAmount,
      t
    )
    const detailText = getSubscriptionPlanDetailText(
      plan,
      totalAmount,
      periodAmount,
      t
    )
    const resetText = formatResetPeriod(plan, t)
    const benefits = [
      `${t('Validity Period')}: ${formatDuration(plan, t)}`,
      resetText !== t('No Reset') ? `${t('Quota Reset')}: ${resetText}` : null,
      periodAmount > 0
        ? `${t('Weekly Quota')}: ${formatQuota(periodAmount)}`
        : null,
      totalAmount > 0
        ? `${t('Total Quota')}: ${formatQuota(totalAmount)}`
        : `${t('Total Quota')}: ${t('Unlimited')}`,
    ].filter(Boolean) as string[]

    return (
      <Card
        key={plan.id}
        className={cn(
          'border-border/60 bg-background/88 overflow-hidden rounded-[30px] border shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur',
          index === 0 && 'border-primary/40 ring-primary/10 ring-4'
        )}
      >
        <CardContent className='flex h-full flex-col p-0'>
          <div className='from-primary/[0.16] via-primary/[0.08] to-background flex items-start justify-between gap-3 bg-gradient-to-br px-6 pt-6 pb-4'>
            <div className='min-w-0'>
              <p className='text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase'>
                {getSubscriptionPlanSubtitle(plan)}
              </p>
              <h3 className='mt-2 text-2xl font-semibold tracking-tight text-slate-950'>
                {plan.title}
              </h3>
              <p className='text-muted-foreground mt-2 text-sm leading-6'>
                {summary}
              </p>
            </div>
            {index === 0 && (
              <StatusBadge variant='info' copyable={false} className='rounded-full'>
                <Sparkles className='mr-1 h-3 w-3' />
                {t('Recommended')}
              </StatusBadge>
            )}
          </div>

          <div className='flex flex-1 flex-col px-6 pt-2 pb-6'>
            <div className='flex items-end gap-2'>
              <span className='text-4xl font-semibold tracking-tight text-slate-950'>
                {formatSubscriptionPlanPrice(priceAmount, plan.currency)}
              </span>
              <span className='text-muted-foreground pb-1 text-sm'>
                / {t('per plan')}
              </span>
            </div>

            <div className='mt-5 space-y-2.5'>
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className='text-muted-foreground flex items-center gap-2 text-sm'
                >
                  <Check className='text-primary h-4 w-4 shrink-0' />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <div className='mt-5 rounded-3xl border border-slate-200 bg-slate-50/85 p-4'>
              <div className='text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase'>
                {t('Package Details')}
              </div>
              <div className='mt-2 text-sm leading-6 text-slate-700'>
                {detailText}
              </div>
            </div>

            <Button
              className='mt-6 h-11 w-full rounded-full text-sm font-medium'
              render={<a href={getPurchaseHref(isAuthenticated)} />}
            >
              {isAuthenticated ? t('Buy Now') : t('Login to Purchase')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasMonthPlans = groupedPlans.month.length > 0
  const hasDayPlans = groupedPlans.day.length > 0

  return (
    <section className='relative overflow-hidden px-6 py-18 md:px-10 md:py-24'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 opacity-80'
        style={{
          background:
            'radial-gradient(circle at 18% 18%, rgba(56,189,248,0.16), transparent 38%), radial-gradient(circle at 86% 22%, rgba(37,99,235,0.14), transparent 34%), linear-gradient(180deg, rgba(248,251,255,0.96), rgba(255,255,255,0.88))',
        }}
      />

      <div className='relative mx-auto max-w-7xl'>
        <div className='mx-auto max-w-3xl text-center'>
          <p className='text-primary text-xs font-semibold tracking-[0.28em] uppercase'>
            {t('Codex Packages')}
          </p>
          <h2 className='mt-4 text-[clamp(2rem,4.4vw,3.4rem)] font-semibold tracking-tight text-slate-950'>
            {t('Monthly cards for steady work, day passes for burst usage')}
          </h2>
          <p className='text-muted-foreground mt-4 text-base leading-7 md:text-lg'>
            {t(
              'All package payments are settled in CNY. Choose a long-running Codex plan or a one-day pass when you just need temporary capacity.'
            )}
          </p>
        </div>

        {packageIntro ? (
          <div className='mx-auto mt-8 max-w-4xl rounded-[28px] border border-sky-100 bg-white/88 p-6 shadow-[0_18px_50px_rgba(14,30,37,0.08)] backdrop-blur'>
            <Markdown className='prose prose-slate max-w-none text-left prose-p:leading-7'>
              {packageIntro}
            </Markdown>
          </div>
        ) : null}

        <div
          className={cn(
            'mt-12 grid gap-6',
            hasMonthPlans && hasDayPlans
              ? 'xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]'
              : 'xl:grid-cols-1'
          )}
        >
          {hasMonthPlans && (
            <div className='rounded-[32px] border border-sky-100 bg-white/88 p-5 shadow-[0_24px_60px_rgba(14,30,37,0.08)] backdrop-blur md:p-6'>
              <div className='mb-6'>
                <p className='text-slate-500 text-xs font-semibold tracking-[0.24em] uppercase'>
                  {t('Monthly Plans')}
                </p>
                <h3 className='mt-2 text-2xl font-semibold text-slate-950'>
                  {t('Stable weekly refresh for long Codex sessions')}
                </h3>
              </div>
              <div className='grid gap-5 lg:grid-cols-2'>
                {groupedPlans.month.map(renderPlanCard)}
              </div>
            </div>
          )}

          {hasDayPlans && (
            <div className='rounded-[32px] border border-sky-100 bg-white/88 p-5 shadow-[0_24px_60px_rgba(14,30,37,0.08)] backdrop-blur md:p-6'>
              <div className='mb-6'>
                <p className='text-slate-500 text-xs font-semibold tracking-[0.24em] uppercase'>
                  {t('Day Passes')}
                </p>
                <h3 className='mt-2 text-2xl font-semibold text-slate-950'>
                  {t('Short-term passes for temporary spikes')}
                </h3>
              </div>
              <div className='grid gap-5'>
                {groupedPlans.day.map(renderPlanCard)}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
