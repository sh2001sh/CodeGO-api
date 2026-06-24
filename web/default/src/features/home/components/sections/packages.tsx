import { useEffect, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { Check, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Markdown } from '@/components/ui/markdown'
import { AnimateInView } from '@/components/animate-in-view'
import { StatusBadge } from '@/components/status-badge'
import { getPublicPlans } from '@/features/subscriptions/api'
import {
  formatDuration,
  formatResetPeriod,
  formatSubscriptionPlanPrice,
  formatSubscriptionQuotaAmount,
  getSubscriptionPlanDescription,
  getSubscriptionPlanDetailText,
  getSubscriptionPlanSubtitle,
  isDayPassPlan,
  isMonthlyCardPlan,
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

    void load()

    return () => {
      mounted = false
    }
  }, [])

  return plans
}

function getPurchaseRedirect() {
  return '/packages'
}

function getPurchaseHref(isAuthenticated: boolean) {
  const redirectTarget = getPurchaseRedirect()
  if (isAuthenticated) return redirectTarget
  return `/sign-in?redirect=${encodeURIComponent(redirectTarget)}`
}

const passthroughT = ((value: string) => value) as unknown as TFunction

interface PackagesProps {
  isAuthenticated?: boolean
  hidden?: boolean
}

export function Packages({
  isAuthenticated = false,
  hidden = false,
}: PackagesProps) {
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
    const isMonthlyPlan = isMonthlyCardPlan(plan)
    const priceAmount = Number(record.amount_due ?? (plan.price_amount || 0))
    const summary = getSubscriptionPlanDescription(
      plan,
      totalAmount,
      periodAmount,
      passthroughT
    )
    const detailText = getSubscriptionPlanDetailText(
      plan,
      totalAmount,
      periodAmount,
      passthroughT
    )
    const resetText = formatResetPeriod(plan, passthroughT)
    const benefits = [
      `有效期：${formatDuration(plan, passthroughT)}`,
      !isMonthlyPlan && resetText !== 'No Reset'
        ? `额度重置：${resetText}`
        : null,
      !isMonthlyPlan && periodAmount > 0
        ? `周额度：${formatSubscriptionQuotaAmount(periodAmount)}`
        : null,
      totalAmount > 0
        ? `${isMonthlyPlan ? '本月可用额度' : '总额度'}：${formatSubscriptionQuotaAmount(totalAmount)}`
        : `${isMonthlyPlan ? '本月可用额度' : '总额度'}：不限`,
    ].filter(Boolean) as string[]

    return (
      <Card
        key={plan.id}
        className={cn(
          'ios-floating-shell overflow-hidden',
          index === 0 && 'border-primary/40 ring-primary/10 ring-4'
        )}
      >
        <CardContent className='flex h-full flex-col p-0'>
          <div className='bg-[radial-gradient(circle_at_top_right,rgba(240,138,88,0.14),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(237,243,250,0.88))] px-6 pt-6 pb-4 dark:bg-[radial-gradient(circle_at_top_right,rgba(240,138,88,0.16),transparent_38%),linear-gradient(135deg,rgba(18,24,33,0.92),rgba(23,29,40,0.88))]'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='text-muted-foreground text-xs font-semibold tracking-[0.16em]'>
                  {getSubscriptionPlanSubtitle(plan)}
                </p>
                <h3 className='mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white'>
                  {plan.title}
                </h3>
                <p className='text-muted-foreground mt-2 text-sm leading-6 dark:text-slate-300'>
                  {summary}
                </p>
              </div>
              {index === 0 && (
                <StatusBadge
                  variant='info'
                  copyable={false}
                  className='rounded-full'
                >
                  推荐
                </StatusBadge>
              )}
            </div>

            <div className='flex flex-1 flex-col px-6 pt-2 pb-6'>
              <div className='flex items-end gap-2'>
                <span className='text-4xl font-semibold tracking-tight text-slate-950 dark:text-white'>
                  {formatSubscriptionPlanPrice(priceAmount, plan.currency)}
                </span>
                <span className='text-muted-foreground pb-1 text-sm'>
                  / 套餐
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

              <div className='mt-5 rounded-3xl border border-white/60 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.05]'>
                <div className='text-xs font-semibold tracking-[0.16em] text-slate-500 dark:text-slate-300'>
                  套餐详情
                </div>
                <div className='mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300'>
                  {detailText}
                </div>
              </div>

              <Button
                className='mt-6 h-11 w-full rounded-full text-sm font-medium'
                render={<a href={getPurchaseHref(isAuthenticated)} />}
              >
                {isAuthenticated ? '进入套餐页' : '登录后购买'}
              </Button>
            </div>
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
            'radial-gradient(circle at 18% 18%, rgba(52,211,153,0.14), transparent 38%), radial-gradient(circle at 86% 22%, rgba(56,189,248,0.12), transparent 34%), linear-gradient(180deg, rgba(248,251,255,0.96), rgba(255,255,255,0.88))',
        }}
      />

      <div className='relative mx-auto max-w-7xl'>
        <AnimateInView className='mx-auto max-w-3xl text-center'>
          <div className='ios-pill inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-[#2f5ea3] dark:text-[#98c0ff]'>
            <Crown className='h-3.5 w-3.5' />
            套餐中心
          </div>
          <h2 className='mt-4 text-[clamp(2rem,4.4vw,3.4rem)] font-semibold tracking-[-0.03em] text-balance text-slate-950 dark:text-white'>
            月卡适合稳定开发，日卡适合短时冲量
          </h2>
          <p className='text-muted-foreground mt-4 text-base leading-7 md:text-lg dark:text-slate-300'>
            套餐价格按人民币支付，额度按美元信用值发放。可以根据长期主力使用或短时补量需求自由选择。
          </p>
        </AnimateInView>

        {packageIntro ? (
          <AnimateInView className='ios-floating-shell mx-auto mt-8 max-w-4xl p-6'>
            <Markdown className='prose prose-slate prose-p:leading-7 max-w-none text-left'>
              {packageIntro}
            </Markdown>
          </AnimateInView>
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
            <AnimateInView className='ios-floating-shell p-5 md:p-6'>
              <div className='mb-6'>
                <p className='text-xs font-semibold tracking-[0.16em] text-slate-500'>
                  月卡套餐
                </p>
                <h3 className='mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white'>
                  适合长期 Code Go 使用，一个月内自由使用
                </h3>
              </div>
              <div className='grid gap-5 lg:grid-cols-2'>
                {groupedPlans.month.map(renderPlanCard)}
              </div>
            </AnimateInView>
          )}

          {hasDayPlans && (
            <AnimateInView
              delay={hasMonthPlans ? 120 : 0}
              className='ios-floating-shell p-5 md:p-6'
            >
              <div className='mb-6'>
                <p className='text-xs font-semibold tracking-[0.16em] text-slate-500'>
                  日卡套餐
                </p>
                <h3 className='mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white'>
                  适合短时爆发使用，按天生效
                </h3>
              </div>
              <div className='grid gap-5'>
                {groupedPlans.day.map(renderPlanCard)}
              </div>
            </AnimateInView>
          )}
        </div>
      </div>
    </section>
  )
}
