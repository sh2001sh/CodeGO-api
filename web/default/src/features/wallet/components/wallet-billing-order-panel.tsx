import { ArrowDown, ArrowUp, RefreshCw, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getFundingSourceDescription,
  getFundingSourceLabel,
} from '@/features/subscriptions/billing'
import type {
  FundingSource,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import {
  formatWalletDateTime,
  getSubscriptionUsageStatus,
  getWalletRemainingDays,
  type WalletPlanMeta,
} from './wallet-panel-utils'

interface WalletBillingOrderPanelProps {
  draftFundingSourceOrder: FundingSource[]
  disabledFundingSources: FundingSource[]
  subscriptionModeEnabled: boolean
  hasActiveSubscriptions: boolean
  orderedSubscriptions: UserSubscriptionRecord[]
  planMetaMap: Map<number, WalletPlanMeta>
  saving: boolean
  isLoading: boolean
  subscriptionLoading?: boolean
  onRefresh: () => void
  onSave: () => void
  onResetFundingSourceOrder: () => void
  onResetSubscriptionOrder: () => void
  onToggleFundingSource: (source: FundingSource) => void
  onMoveFundingSource: (source: FundingSource, direction: -1 | 1) => void
  onMoveSubscription: (id: number, direction: -1 | 1) => void
}

export function WalletBillingOrderPanel(props: WalletBillingOrderPanelProps) {
  return (
    <div className='app-page-shell p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='text-foreground text-sm font-semibold'>扣费顺序</div>
          <div className='text-muted-foreground mt-1 text-xs leading-5'>
            盲盒奖励、订阅额度和钱包余额共用同一套优先级，下面可以直接调整。
          </div>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={props.onRefresh}
            disabled={props.isLoading || props.saving}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                (props.subscriptionLoading || props.saving) && 'animate-spin'
              )}
            />
          </Button>
          <Button onClick={props.onSave} disabled={props.saving}>
            <Save className='mr-1 h-4 w-4' />
            保存设置
          </Button>
        </div>
      </div>

      <div className='mt-4 grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]'>
        <div className='space-y-3'>
          <div className='app-section-kicker'>
            扣费来源顺序
          </div>
          {props.draftFundingSourceOrder.map((source, index) => (
            <div
              key={source}
              className='app-subtle-panel px-3 py-3'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='text-foreground truncate text-sm font-semibold'>
                    {index + 1}. {getFundingSourceLabel(source, String)}
                  </div>
                  <div className='text-muted-foreground mt-1 text-xs'>
                    {getFundingSourceDescription(source, String)}
                  </div>
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                  {source === 'blind_box' ? (
                    <span className='border-border bg-background/80 text-muted-foreground rounded-full border px-2 py-1 text-[11px]'>
                      固定启用
                    </span>
                  ) : (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => props.onToggleFundingSource(source)}
                      disabled={props.saving}
                    >
                      停用
                    </Button>
                  )}
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => props.onMoveFundingSource(source, -1)}
                    disabled={index === 0 || props.saving}
                  >
                    <ArrowUp className='h-4 w-4' />
                  </Button>
                  <Button
                    variant='outline'
                    size='icon'
                    className='h-8 w-8'
                    onClick={() => props.onMoveFundingSource(source, 1)}
                    disabled={
                      index === props.draftFundingSourceOrder.length - 1 ||
                      props.saving
                    }
                  >
                    <ArrowDown className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {props.disabledFundingSources.length > 0 ? (
            <div className='border-border/70 bg-background/60 text-muted-foreground rounded-2xl border border-dashed px-3 py-4 text-xs'>
              <div className='text-foreground font-medium'>已停用来源</div>
              <div className='mt-2 flex flex-wrap gap-2'>
                {props.disabledFundingSources.map((source) => (
                  <Button
                    key={source}
                    variant='outline'
                    size='sm'
                    onClick={() => props.onToggleFundingSource(source)}
                    disabled={props.saving}
                  >
                    启用 {getFundingSourceLabel(source, String)}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              className='flex-1'
              onClick={props.onResetFundingSourceOrder}
              disabled={props.saving}
            >
              重置来源顺序
            </Button>
            <Button
              variant='outline'
              className='flex-1'
              onClick={props.onResetSubscriptionOrder}
              disabled={!props.hasActiveSubscriptions || props.saving}
            >
              重置订阅顺序
            </Button>
          </div>
        </div>

        <div className='space-y-3'>
          <div className='app-section-kicker'>
            订阅扣费顺序
          </div>
          {props.isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-14 rounded-2xl' />
              <Skeleton className='h-14 rounded-2xl' />
            </div>
          ) : !props.subscriptionModeEnabled ? (
            <div className='border-border/70 bg-background/60 text-muted-foreground rounded-2xl border border-dashed px-3 py-4 text-xs'>
              你已停用订阅扣费，结算时会跳过所有订阅。
            </div>
          ) : !props.hasActiveSubscriptions ? (
            <div className='border-border/70 bg-background/60 text-muted-foreground rounded-2xl border border-dashed px-3 py-4 text-xs'>
              暂无可排序的生效订阅。
            </div>
          ) : (
            <div className='space-y-2'>
              {props.orderedSubscriptions.map((record, index) => {
                const subscription = record.subscription
                const meta = props.planMetaMap.get(subscription.plan_id)
                const usageStatus = getSubscriptionUsageStatus(record, meta?.plan)

                return (
                  <div
                    key={subscription.id}
                    className='app-subtle-panel px-3 py-3'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <div className='text-foreground truncate text-sm font-semibold'>
                          {index + 1}. {meta?.title || `套餐 #${subscription.id}`}
                        </div>
                        <div className='text-muted-foreground mt-1 text-xs'>
                          {meta?.subtitle || '订阅'} · 约{' '}
                          {getWalletRemainingDays(subscription.end_time)} 天
                        </div>
                        <div className='text-warning mt-1 text-xs'>
                          {usageStatus.note || usageStatus.label}
                        </div>
                        <div className='text-muted-foreground mt-1 text-xs'>
                          到期时间：{formatWalletDateTime(subscription.end_time)}
                        </div>
                      </div>
                      <div className='flex shrink-0 items-center gap-1'>
                        <Button
                          variant='outline'
                          size='icon'
                          className='h-8 w-8'
                          onClick={() => props.onMoveSubscription(subscription.id, -1)}
                          disabled={index === 0 || props.saving}
                        >
                          <ArrowUp className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='outline'
                          size='icon'
                          className='h-8 w-8'
                          onClick={() => props.onMoveSubscription(subscription.id, 1)}
                          disabled={
                            index === props.orderedSubscriptions.length - 1 ||
                            props.saving
                          }
                        >
                          <ArrowDown className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
