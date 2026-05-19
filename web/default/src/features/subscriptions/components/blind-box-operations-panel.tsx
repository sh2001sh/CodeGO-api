import { Link } from '@tanstack/react-router'
import { Gift, RefreshCw, Settings2, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useSystemOptions, getOptionValue } from '@/features/system-settings/hooks/use-system-options'
import type { BillingSettings } from '@/features/system-settings/types'
import { cn } from '@/lib/utils'

const DEFAULT_BLIND_BOX_SETTINGS: Pick<
  BillingSettings,
  | 'blind_box_setting.enabled'
  | 'blind_box_setting.unit_price'
  | 'blind_box_setting.expire_days'
  | 'blind_box_setting.daily_limit'
  | 'blind_box_setting.monthly_limit'
  | 'blind_box_setting.daily_open_limit'
  | 'blind_box_setting.pity_threshold'
  | 'blind_box_setting.pity_guarantee_usd'
  | 'blind_box_setting.low_reward_threshold_usd'
  | 'blind_box_setting.subscription_prize_probability'
  | 'blind_box_setting.subscription_plan_title'
  | 'blind_box_setting.count_options'
  | 'blind_box_setting.tiers'
> = {
  'blind_box_setting.enabled': false,
  'blind_box_setting.unit_price': 2.5,
  'blind_box_setting.expire_days': 7,
  'blind_box_setting.daily_limit': 50,
  'blind_box_setting.monthly_limit': 500,
  'blind_box_setting.daily_open_limit': 5000,
  'blind_box_setting.pity_threshold': 5,
  'blind_box_setting.pity_guarantee_usd': 10,
  'blind_box_setting.low_reward_threshold_usd': 5,
  'blind_box_setting.subscription_prize_probability': 0.003,
  'blind_box_setting.subscription_plan_title': 'Standard Monthly Plan',
  'blind_box_setting.count_options': [1, 5, 10, 20, 50],
  'blind_box_setting.tiers': [
    { name: 'starter', min_usd: 1, max_usd: 3, probability: 0.18 },
    { name: 'steady', min_usd: 4, max_usd: 7, probability: 0.3 },
    { name: 'core', min_usd: 8, max_usd: 12, probability: 0.31 },
    { name: 'boost', min_usd: 13, max_usd: 20, probability: 0.15 },
    { name: 'lucky', min_usd: 21, max_usd: 50, probability: 0.057 },
  ],
}

export function BlindBoxOperationsPanel() {
  const { t } = useTranslation()
  const optionsQuery = useSystemOptions()
  const settings = getOptionValue(optionsQuery.data?.data, DEFAULT_BLIND_BOX_SETTINGS)

  return (
    <div className='space-y-4'>
      <div className='rounded-2xl border bg-slate-50/70 p-4'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2 text-sm font-semibold text-slate-950'>
              <Gift className='h-4 w-4 text-amber-600' />
              {t('Blind Box Operations')}
            </div>
            <p className='text-muted-foreground text-sm leading-6'>
              {t(
                'Use this workspace to inspect blind box rules, open user management from the user list, and keep the event configuration aligned with wallet-side behavior.'
              )}
            </p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void optionsQuery.refetch()}
              disabled={optionsQuery.isFetching}
            >
              <RefreshCw
                className={cn('mr-1 h-4 w-4', optionsQuery.isFetching && 'animate-spin')}
              />
              {t('Refresh')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              render={<Link to='/system-settings/billing/$section' params={{ section: 'blind-box' }} />}
            >
              <Settings2 className='mr-1 h-4 w-4' />
              {t('Open settings')}
            </Button>
            <Button
              size='sm'
              onClick={() => window.location.assign('/blind-box')}
            >
              <Wallet className='mr-1 h-4 w-4' />
              {t('Open wallet entry')}
            </Button>
          </div>
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <MetricCard label={t('Status')} value={settings['blind_box_setting.enabled'] ? t('Enabled') : t('Disabled')} />
        <MetricCard label={t('Unit price')} value={`${settings['blind_box_setting.unit_price'].toFixed(2)} USD`} />
        <MetricCard label={t('Subscription prize')} value={`${(settings['blind_box_setting.subscription_prize_probability'] * 100).toFixed(2)}%`} />
        <MetricCard label={t('Reward title')} value={settings['blind_box_setting.subscription_plan_title']} />
        <MetricCard label={t('Daily purchase limit')} value={String(settings['blind_box_setting.daily_limit'])} />
        <MetricCard label={t('Monthly purchase limit')} value={String(settings['blind_box_setting.monthly_limit'])} />
        <MetricCard label={t('Daily open limit')} value={String(settings['blind_box_setting.daily_open_limit'])} />
        <MetricCard label={t('Pity threshold')} value={String(settings['blind_box_setting.pity_threshold'])} />
      </div>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
        <div className='rounded-2xl border p-4'>
          <div className='text-sm font-semibold'>{t('Reward tiers')}</div>
          <div className='mt-4 space-y-3'>
            {settings['blind_box_setting.tiers'].map((tier) => (
              <div
                key={tier.name}
                className='flex items-center justify-between gap-3 rounded-xl border px-3 py-2'
              >
                <div>
                  <div className='font-medium'>{tier.name}</div>
                  <div className='text-muted-foreground text-xs'>
                    {tier.min_usd}-{tier.max_usd} USD
                  </div>
                </div>
                <div className='text-sm font-semibold'>
                  {(tier.probability * 100).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-4'>
          <div className='rounded-2xl border p-4 text-sm'>
            <div className='font-semibold'>{t('Consumption order')}</div>
            <div className='text-muted-foreground mt-2 leading-6'>
              {t(
                'Blind box short-term quota is consumed before subscription and wallet balance. This is independent from the dashboard total used quota and from subscription package-local used quota.'
              )}
            </div>
          </div>

          <div className='rounded-2xl border p-4 text-sm'>
            <div className='font-semibold'>{t('Current options')}</div>
            <div className='text-muted-foreground mt-2 leading-6'>
              {settings['blind_box_setting.count_options'].join(', ')}
            </div>
            <div className='text-muted-foreground mt-3 leading-6'>
              {t('Pity guarantee')}: {settings['blind_box_setting.pity_guarantee_usd'].toFixed(2)} USD
            </div>
            <div className='text-muted-foreground leading-6'>
              {t('Low reward threshold')}: {settings['blind_box_setting.low_reward_threshold_usd'].toFixed(2)} USD
            </div>
            <div className='text-muted-foreground leading-6'>
              {t('Quota expiry days')}: {settings['blind_box_setting.expire_days']}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div className='rounded-xl border bg-white p-3'>
      <div className='text-muted-foreground text-xs'>{props.label}</div>
      <div className='mt-1 text-sm font-semibold break-all'>{props.value}</div>
    </div>
  )
}
