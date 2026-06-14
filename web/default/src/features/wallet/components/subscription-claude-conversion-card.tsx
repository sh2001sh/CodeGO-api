import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRightLeft, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { formatQuota } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createSubscriptionClaudeConversion } from '@/features/subscriptions/api'
import {
  formatSubscriptionQuotaAmount,
  parseSubscriptionQuotaUSDToUnits,
  subscriptionQuotaUnitsToUSD,
} from '@/features/subscriptions/lib'
import type {
  SelfSubscriptionData,
  UserSubscription,
} from '@/features/subscriptions/types'

interface SubscriptionClaudeConversionCardProps {
  subscriptionData?: SelfSubscriptionData | null
  loading?: boolean
  compact?: boolean
  mode?: 'wallet' | 'dashboard'
  planTitles?: Record<number, { title: string; subtitle: string }>
  onRefresh?: () => Promise<void>
}

function buildRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `subscription-claude-${Date.now()}`
}

function formatDateTime(timestamp?: number): string {
  if (!timestamp) return '--'
  return new Date(timestamp * 1000).toLocaleString()
}

function getEligibleSubscriptions(data?: SelfSubscriptionData | null) {
  return (data?.subscriptions || []).filter(
    (item) => item.subscription.conversion_preview?.eligible
  )
}

function getPlanLabel(
  subscription: UserSubscription | undefined,
  planTitles?: Record<number, { title: string; subtitle: string }>
) {
  if (!subscription) return '当前套餐'
  return planTitles?.[subscription.plan_id]?.title || `套餐 #${subscription.id}`
}

export function SubscriptionClaudeConversionCard(
  props: SubscriptionClaudeConversionCardProps
) {
  const eligibleSubscriptions = useMemo(
    () => getEligibleSubscriptions(props.subscriptionData),
    [props.subscriptionData]
  )
  const recentConversions = props.subscriptionData?.recent_conversions || []
  const config = props.subscriptionData?.conversion_config
  const ratioText =
    config && config.ratio_denominator > 0
      ? `${config.ratio_numerator}:${config.ratio_denominator}`
      : '1:10'

  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number>(0)
  const [sourceQuotaInput, setSourceQuotaInput] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (eligibleSubscriptions.length === 0) {
      setSelectedSubscriptionId(0)
      return
    }
    const exists = eligibleSubscriptions.some(
      (item) => item.subscription.id === selectedSubscriptionId
    )
    if (!exists) {
      setSelectedSubscriptionId(eligibleSubscriptions[0].subscription.id)
    }
  }, [eligibleSubscriptions, selectedSubscriptionId])

  const selectedRecord = eligibleSubscriptions.find(
    (item) => item.subscription.id === selectedSubscriptionId
  )
  const selectedSubscription = selectedRecord?.subscription
  const selectedPlanMeta = selectedSubscription
    ? props.planTitles?.[selectedSubscription.plan_id]
    : undefined
  const sourceQuotaUSD = Number(sourceQuotaInput || 0)
  const sourceQuota = parseSubscriptionQuotaUSDToUnits(sourceQuotaUSD)
  const maxSourceQuota = Number(
    selectedSubscription?.conversion_preview?.max_source_quota || 0
  )
  const maxSourceQuotaUSD = subscriptionQuotaUnitsToUSD(maxSourceQuota)
  const previewClaudeQuota =
    sourceQuota > 0 && Number(config?.ratio_denominator || 0) > 0
      ? Math.floor(
          (sourceQuota * Number(config?.ratio_numerator || 0)) /
            Number(config?.ratio_denominator || 1)
        )
      : 0

  const totalConvertibleQuota = eligibleSubscriptions.reduce((sum, item) => {
    return sum + Number(item.subscription.conversion_preview?.max_source_quota || 0)
  }, 0)
  const totalPreviewClaudeQuota = eligibleSubscriptions.reduce((sum, item) => {
    return (
      sum + Number(item.subscription.conversion_preview?.preview_claude_quota || 0)
    )
  }, 0)

  const canSubmit =
    Boolean(config?.enabled) &&
    Boolean(selectedSubscriptionId) &&
    Number.isFinite(sourceQuotaUSD) &&
    sourceQuota > 0 &&
    sourceQuota <= maxSourceQuota &&
    previewClaudeQuota > 0 &&
    !submitting

  const submitConversion = async () => {
    if (!canSubmit || !selectedSubscriptionId) return
    setSubmitting(true)
    try {
      const result = await createSubscriptionClaudeConversion({
        subscriptionId: selectedSubscriptionId,
        sourceQuota,
        requestId: buildRequestId(),
      })
      if (!result.success || !result.data) {
        toast.error(result.message || '套餐转 Claude 失败')
        return
      }
      toast.success(
        `${getPlanLabel(selectedSubscription, props.planTitles)} 已转入 Claude 额度`
      )
      setSourceQuotaInput('')
      setConfirmOpen(false)
      await props.onRefresh?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('subscription:changed'))
      }
    } catch {
      toast.error('套餐转 Claude 失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (props.mode === 'dashboard') {
    return (
      <div className='border-border bg-card rounded-2xl border px-4 py-4'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
              <Sparkles className='text-primary h-4 w-4' />
              套餐转 Claude
            </div>
            <div className='text-muted-foreground mt-1 text-xs leading-5'>
              仅支持生效中的非日卡套餐。转换输入以美元计，按 {ratioText}
              折算为 Claude 永久额度，临时套餐额度会有损耗。
            </div>
          </div>
          <div className='border-border bg-muted text-muted-foreground rounded-full border px-3 py-1 text-xs'>
            最多 {formatSubscriptionQuotaAmount(totalConvertibleQuota)}
          </div>
        </div>

        <div className='mt-3 grid gap-2 sm:grid-cols-3'>
          <QuickStat
            label='可转套餐美元'
            value={formatSubscriptionQuotaAmount(totalConvertibleQuota)}
          />
          <QuickStat label='转换规则' value={ratioText} />
          <QuickStat label='预计最多到账 Claude' value={formatQuota(totalPreviewClaudeQuota)} />
        </div>

        <Button
          className='mt-3 w-full justify-between'
          render={<Link to='/wallet' search={{ wallet_type: 'claude' }} />}
        >
          <span>去钱包转换</span>
          <ArrowRightLeft className='h-4 w-4' />
        </Button>
      </div>
    )
  }

  return (
    <div className='app-page-shell p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='text-foreground flex items-center gap-2 text-sm font-semibold'>
            <ArrowRightLeft className='text-primary h-4 w-4' />
            套餐转 Claude
          </div>
          <div className='text-muted-foreground mt-1 text-xs leading-5'>
            仅支持生效中的非日卡套餐。输入按美元填写，当前规则 {ratioText}，
            临时套餐额度转为永久 Claude 额度后不可撤销。
          </div>
        </div>
        <div className='border-border bg-background/80 text-foreground rounded-full border px-3 py-1 text-xs font-semibold'>
          Claude {formatQuota(props.subscriptionData?.claude_quota || 0)}
        </div>
      </div>

      {props.loading ? (
        <div className='border-border/70 bg-background/72 text-muted-foreground mt-3 rounded-2xl border px-3 py-6 text-center text-xs'>
          正在加载可转换套餐...
        </div>
      ) : !config?.enabled ? (
        <div className='border-border/70 bg-background/60 text-muted-foreground mt-3 rounded-2xl border border-dashed px-3 py-3 text-xs'>
          当前未开启套餐转 Claude 功能。
        </div>
      ) : eligibleSubscriptions.length === 0 ? (
        <div className='border-border/70 bg-background/60 text-muted-foreground mt-3 rounded-2xl border border-dashed px-3 py-3 text-xs'>
          当前没有可转换的套餐。只有生效中的非日卡订阅才支持转换。
        </div>
      ) : (
        <>
          <div className='mt-3 space-y-2'>
            {eligibleSubscriptions.map((item) => {
              const checked = item.subscription.id === selectedSubscriptionId
              return (
                <button
                  key={item.subscription.id}
                  type='button'
                  onClick={() => setSelectedSubscriptionId(item.subscription.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    checked
                      ? 'border-foreground bg-background/80'
                      : 'border-border/70 bg-muted/32'
                  }`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='text-foreground text-sm font-semibold'>
                        {props.planTitles?.[item.subscription.plan_id]?.title ||
                          `套餐 #${item.subscription.id}`}
                      </div>
                      <div className='text-muted-foreground mt-1 text-xs'>
                        {props.planTitles?.[item.subscription.plan_id]?.subtitle || '订阅'}
                        {' '}
                        · 到期：
                        {formatDateTime(item.subscription.end_time)}
                      </div>
                    </div>
                    <div className='text-muted-foreground text-right text-xs'>
                      <div>
                        最多可转
                        {' '}
                        {formatSubscriptionQuotaAmount(
                          item.subscription.conversion_preview?.max_source_quota || 0
                        )}
                      </div>
                      <div className='text-foreground mt-1'>
                        最多到账
                        {' '}
                        {formatQuota(
                          item.subscription.conversion_preview?.preview_claude_quota ||
                            0
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className='app-subtle-panel mt-3 px-3 py-3'>
            <div className='text-muted-foreground text-[11px] font-medium'>
              输入转换美元
            </div>
            <div className='mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2'>
              <Input
                type='number'
                min='0.01'
                step='0.01'
                value={sourceQuotaInput}
                onChange={(event) => setSourceQuotaInput(event.target.value)}
                placeholder={`最多 ${maxSourceQuotaUSD.toFixed(2)}`}
                className='h-10'
              />
              <Button
                className='h-10 px-4'
                disabled={!canSubmit}
                onClick={() => setConfirmOpen(true)}
              >
                转换
              </Button>
            </div>
            <div className='mt-2 grid gap-2 text-xs sm:grid-cols-2'>
              <QuickStat
                label='本次扣减套餐美元'
                value={formatSubscriptionQuotaAmount(sourceQuota)}
              />
              <QuickStat label='预计到账 Claude' value={formatQuota(previewClaudeQuota || 0)} />
            </div>
            {selectedSubscription ? (
              <div className='text-muted-foreground mt-2 text-xs'>
                转换后该订阅剩余可转美元约为
                {' '}
                {formatSubscriptionQuotaAmount(
                  Math.max(0, maxSourceQuota - sourceQuota)
                )}
              </div>
            ) : null}
            <div className='text-muted-foreground mt-2 text-xs leading-5'>
              按美元输入只是为了更直观，后端仍按套餐原始额度结算。到账 Claude
              永久额度按向下取整计算。
            </div>
          </div>
        </>
      )}

      {recentConversions.length > 0 ? (
        <div className='app-subtle-panel mt-3 px-3 py-3'>
          <div className='text-foreground text-sm font-semibold'>最近转换记录</div>
          <div className='mt-2 space-y-2'>
            {recentConversions.slice(0, 3).map((item) => (
              <div key={item.id} className='flex items-center justify-between gap-3 text-xs'>
                <div className='text-muted-foreground'>
                  {formatDateTime(item.created_at)} · 订阅 #{item.user_subscription_id}
                </div>
                <div className='text-foreground font-medium'>
                  {formatSubscriptionQuotaAmount(item.source_quota)} →{' '}
                  {formatQuota(item.target_claude_quota)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认转换</AlertDialogTitle>
            <AlertDialogDescription>
              将从 {selectedPlanMeta?.title || '当前套餐'} 扣减
              {' '}
              {formatSubscriptionQuotaAmount(sourceQuota)}
              ，预计到账 Claude 永久额度
              {' '}
              {formatQuota(previewClaudeQuota || 0)}
              。提交后不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canSubmit}
              onClick={(event) => {
                event.preventDefault()
                void submitConversion()
              }}
            >
              {submitting ? <Loader2 className='mr-1 h-4 w-4 animate-spin' /> : null}
              确认转换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function QuickStat(props: { label: string; value: string }) {
  return (
    <div className='app-subtle-panel px-3 py-3'>
      <div className='text-muted-foreground text-[11px] font-medium'>{props.label}</div>
      <div className='text-foreground mt-1 font-mono text-sm font-semibold tabular-nums'>
        {props.value}
      </div>
    </div>
  )
}
