import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Bot,
  CreditCard,
  FileText,
  Image as ImageIcon,
  KeyRound,
  MessageSquare,
  Sparkles,
  Ticket,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { getUserModels } from '@/lib/api'
import {
  formatNumber,
  formatQuota,
  formatTimestampToDate,
} from '@/lib/format'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/copy-button'
import { getApiKeys, fetchTokenKey } from '@/features/keys/api'
import type { ApiKey } from '@/features/keys/types'
import { getSelfSubscriptionFull } from '@/features/subscriptions/api'
import type {
  SelfSubscriptionData,
  UserSubscription,
} from '@/features/subscriptions/types'
import { getBlindBoxSelf } from '@/features/wallet/api'

const EMPTY_SUBSCRIPTIONS: SelfSubscriptionData = {
  billing_preference: 'subscription_first',
  funding_source_order: ['blind_box', 'subscription', 'wallet'],
  subscription_order_ids: [],
  subscriptions: [],
  all_subscriptions: [],
}

function getPreferredKey(keys: ApiKey[]): ApiKey | null {
  return keys.find((item) => item.status === 1) ?? keys[0] ?? null
}

function getPrimarySubscription(
  data?: SelfSubscriptionData
): UserSubscription | null {
  return data?.subscriptions?.[0]?.subscription ?? null
}

function getRemainingDays(endTime?: number): number | null {
  if (!endTime) return null
  const diff = endTime - Math.floor(Date.now() / 1000)
  return diff > 0 ? Math.ceil(diff / 86400) : 0
}

function formatMaskedKey(key?: string): string {
  if (!key) return '尚未创建'
  if (key.length <= 16) return key
  return `${key.slice(0, 8)}...${key.slice(-4)}`
}

function ConversationBubble(props: {
  role: 'assistant' | 'user'
  title: string
  children: React.ReactNode
}) {
  const isAssistant = props.role === 'assistant'
  const Icon = isAssistant ? Bot : UserRound

  return (
    <div
      className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      {isAssistant ? (
        <span className='bg-slate-900 text-white flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm dark:bg-slate-100 dark:text-slate-900'>
          <Icon className='size-4' />
        </span>
      ) : null}

      <div
        className={`max-w-3xl rounded-[24px] border px-5 py-4 shadow-sm ${
          isAssistant
            ? 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'
            : 'border-emerald-200 bg-emerald-50 text-slate-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-slate-100'
        }`}
      >
        <div className='mb-2 flex items-center gap-2 text-sm font-semibold'>
          <Icon className='size-4' />
          <span>{props.title}</span>
        </div>
        <div className='space-y-3 text-sm leading-7'>{props.children}</div>
      </div>

      {!isAssistant ? (
        <span className='bg-emerald-500 text-white flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm'>
          <Icon className='size-4' />
        </span>
      ) : null}
    </div>
  )
}

function InfoChip(props: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70'>
      <div className='text-xs text-slate-500 dark:text-slate-400'>
        {props.label}
      </div>
      <div className='mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100'>
        {props.value}
      </div>
    </div>
  )
}

function ActionLink(props: {
  to: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const Icon = props.icon

  return (
    <Link
      to={props.to}
      className='group rounded-3xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
    >
      <div className='bg-slate-100 text-slate-700 flex size-11 items-center justify-center rounded-2xl dark:bg-slate-900 dark:text-slate-200'>
        <Icon className='size-5' />
      </div>
      <div className='mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100'>
        {props.title}
      </div>
      <div className='mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400'>
        {props.description}
      </div>
    </Link>
  )
}

export function OverviewDashboard() {
  const user = useAuthStore((state) => state.auth.user)

  const remainQuota = Number(user?.quota ?? 0)
  const claudeQuota = Number(user?.claude_quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const requestCount = Number(user?.request_count ?? 0)
  const inviteCount = Number(user?.aff_count ?? 0)

  const apiKeysQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'api-keys'],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: 10 })
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const modelsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'models'],
    queryFn: async () => {
      const result = await getUserModels()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const subscriptionsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'subscriptions'],
    queryFn: async () => {
      const result = await getSelfSubscriptionFull()
      return result.success
        ? (result.data ?? EMPTY_SUBSCRIPTIONS)
        : EMPTY_SUBSCRIPTIONS
    },
    staleTime: 60 * 1000,
  })

  const blindBoxQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'blind-box'],
    queryFn: async () => {
      const result = await getBlindBoxSelf()
      return result.success ? result.data : null
    },
    staleTime: 60 * 1000,
  })

  const preferredKey = useMemo(
    () => getPreferredKey(apiKeysQuery.data ?? []),
    [apiKeysQuery.data]
  )

  const tokenKeyQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'token-key', preferredKey?.id],
    queryFn: async () => {
      if (!preferredKey?.id) return ''
      const result = await fetchTokenKey(preferredKey.id)
      return result.success && result.data?.key ? `sk-${result.data.key}` : ''
    },
    enabled: Boolean(preferredKey?.id),
    staleTime: 5 * 60 * 1000,
  })

  const availableModels = modelsQuery.data ?? []
  const primaryModel = availableModels[0] ?? '暂未获取到模型'
  const blindBoxOverview = blindBoxQuery.data?.overview
  const blindBoxQuota = Number(blindBoxOverview?.remaining_quota ?? 0)
  const blindBoxCount = Number(blindBoxOverview?.available_boxes ?? 0)
  const totalUsableQuota = remainQuota + blindBoxQuota
  const primarySubscription = getPrimarySubscription(subscriptionsQuery.data)
  const subscriptionRemainingDays = getRemainingDays(primarySubscription?.end_time)
  const tokenKey = tokenKeyQuery.data ?? ''

  const nextAction = useMemo(() => {
    if (!preferredKey) {
      return {
        title: '先创建 API 密钥',
        description: '没有可用密钥时，外部程序和脚本都无法调用。',
        to: '/keys',
      }
    }
    if (totalUsableQuota <= 0 && claudeQuota <= 0) {
      return {
        title: '先补充额度',
        description: '当前没有可用余额，先去钱包充值或购买套餐。',
        to: '/wallet',
      }
    }
    if (requestCount <= 0) {
      return {
        title: '先发起第一条请求',
        description: '建议先去 Playground 跑通一次文本调用，再进入生图。',
        to: '/playground',
      }
    }
    return {
      title: '可以直接开始使用',
      description: '你已经具备调用条件，可以继续对话、生图或查看日志。',
      to: '/images',
    }
  }, [claudeQuota, preferredKey, requestCount, totalUsableQuota])

  return (
    <div className='space-y-5'>
      <div className='rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#fffef7_0%,#f8fafc_42%,#eefbf4_100%)] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(2,6,23,0.98)_46%,rgba(6,78,59,0.24)_100%)]'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <div>
            <div className='text-xs font-medium tracking-[0.28em] text-slate-500 dark:text-slate-400'>
              对话式概览
            </div>
            <h2 className='mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
              今天的账户情况，我直接用中文告诉你
            </h2>
          </div>
          <Button render={<Link to={nextAction.to} />}>
            <Sparkles data-icon='inline-start' />
            {nextAction.title}
          </Button>
        </div>

        <div className='space-y-4'>
          <ConversationBubble role='assistant' title='系统概览'>
            <p>
              你现在可直接使用的综合额度是
              <span className='mx-1 font-semibold text-slate-950 dark:text-slate-50'>
                {formatQuota(totalUsableQuota)}
              </span>
              ，其中 Claude 专属额度是
              <span className='mx-1 font-semibold text-slate-950 dark:text-slate-50'>
                {formatQuota(claudeQuota)}
              </span>
              。
            </p>
            <p>
              当前累计请求
              <span className='mx-1 font-semibold text-slate-950 dark:text-slate-50'>
                {formatNumber(requestCount)}
              </span>
              次，累计消耗
              <span className='mx-1 font-semibold text-slate-950 dark:text-slate-50'>
                {formatQuota(usedQuota)}
              </span>
              ，默认可用模型从
              <span className='mx-1 font-semibold text-slate-950 dark:text-slate-50'>
                {primaryModel}
              </span>
              开始。
            </p>
          </ConversationBubble>

          <ConversationBubble role='user' title='我的当前状态'>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <InfoChip label='主余额' value={formatQuota(remainQuota)} />
              <InfoChip label='Claude 额度' value={formatQuota(claudeQuota)} />
              <InfoChip label='盲盒可开数量' value={formatNumber(blindBoxCount)} />
              <InfoChip label='已邀请人数' value={formatNumber(inviteCount)} />
            </div>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <InfoChip
                label='API 密钥状态'
                value={preferredKey ? '已创建' : '尚未创建'}
              />
              <InfoChip
                label='最近套餐状态'
                value={
                  primarySubscription
                    ? `有效，剩余 ${formatNumber(subscriptionRemainingDays ?? 0)} 天`
                    : '当前没有生效套餐'
                }
              />
              <InfoChip
                label='盲盒额度'
                value={formatQuota(blindBoxQuota)}
              />
              <InfoChip
                label='下次到期时间'
                value={formatTimestampToDate(blindBoxOverview?.next_expire_at)}
              />
            </div>
          </ConversationBubble>

          <ConversationBubble role='assistant' title='下一步建议'>
            <p>{nextAction.description}</p>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70'>
                <div className='text-xs text-slate-500 dark:text-slate-400'>
                  当前默认密钥
                </div>
                <div className='mt-2 break-all font-mono text-sm text-slate-900 dark:text-slate-100'>
                  {formatMaskedKey(tokenKey || preferredKey?.name)}
                </div>
                {tokenKey ? (
                  <div className='mt-3'>
                    <CopyButton
                      value={tokenKey}
                      variant='outline'
                      size='sm'
                      tooltip='复制真实密钥'
                      successTooltip='密钥已复制'
                      aria-label='复制真实密钥'
                    >
                      复制密钥
                    </CopyButton>
                  </div>
                ) : null}
              </div>

              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70'>
                <div className='text-xs text-slate-500 dark:text-slate-400'>
                  套餐与盲盒提醒
                </div>
                <div className='mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300'>
                  {primarySubscription
                    ? `当前套餐仍在生效，结束时间为 ${formatTimestampToDate(
                        primarySubscription.end_time
                      )}。`
                    : '你当前没有生效套餐，如果后续要高频使用，建议先购买套餐。'}
                  {blindBoxCount > 0
                    ? ` 另外你还有 ${formatNumber(
                        blindBoxCount
                      )} 个盲盒可以立即开启。`
                    : ' 当前没有待开启盲盒。'}
                </div>
              </div>
            </div>
          </ConversationBubble>
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
        <ActionLink
          to='/playground'
          title='去对话调试'
          description='快速验证模型响应、提示词效果和路由情况。'
          icon={MessageSquare}
        />
        <ActionLink
          to='/images'
          title='去生图'
          description='直接进入生图工作台，生成和管理图片记录。'
          icon={ImageIcon}
        />
        <ActionLink
          to='/wallet'
          title='去钱包'
          description='充值主余额、查看 Claude 额度和资金使用情况。'
          icon={Wallet}
        />
        <ActionLink
          to='/keys'
          title='管理 API 密钥'
          description='创建、复制、禁用和检查当前可用密钥。'
          icon={KeyRound}
        />
        <ActionLink
          to='/packages'
          title='查看套餐'
          description='购买或续费套餐，注意套餐额度不能用于 Claude 模型。'
          icon={CreditCard}
        />
        <ActionLink
          to='/usage-logs/common'
          title='查看使用日志'
          description='排查扣费、请求结果、失败原因和调用明细。'
          icon={FileText}
        />
      </div>

      <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
        <div className='rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950'>
          <div className='flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100'>
            <Ticket className='size-4' />
            今日重点
          </div>
          <div className='mt-4 grid gap-3 md:grid-cols-3'>
            <InfoChip label='可用模型数量' value={formatNumber(availableModels.length)} />
            <InfoChip
              label='盲盒最近到期'
              value={formatTimestampToDate(blindBoxOverview?.next_expire_at)}
            />
            <InfoChip
              label='套餐结束时间'
              value={formatTimestampToDate(primarySubscription?.end_time)}
            />
          </div>
        </div>

        <div className='rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70'>
          <div className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
            当前最适合的动作
          </div>
          <div className='mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300'>
            {nextAction.description}
          </div>
          <div className='mt-4'>
            <Button className='w-full justify-center' render={<Link to={nextAction.to} />}>
              <Sparkles data-icon='inline-start' />
              {nextAction.title}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
