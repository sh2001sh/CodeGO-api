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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Skeleton } from '@/components/ui/skeleton'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <div className='relative min-h-svh overflow-hidden bg-background text-foreground'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,138,88,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(119,174,249,0.14),transparent_24%),linear-gradient(180deg,rgba(244,247,251,0.92),rgba(237,242,248,0.96))] dark:bg-[radial-gradient(circle_at_top_left,rgba(240,138,88,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(119,174,249,0.12),transparent_24%),linear-gradient(180deg,rgba(15,20,27,0.94),rgba(20,27,36,0.98))]' />
      <div className='pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10' />
      <Link
        to='/'
        className='absolute top-4 left-4 z-10 flex items-center gap-3 rounded-full border border-white/65 bg-white/72 px-3 py-2 text-sm shadow-[0_12px_30px_rgba(24,32,43,0.08)] backdrop-blur-xl transition-opacity hover:opacity-80 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_16px_36px_rgba(0,0,0,0.28)] sm:top-8 sm:left-8'
      >
        <div className='relative h-8 w-8'>
          {loading ? (
            <Skeleton className='absolute inset-0 rounded-full' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='h-8 w-8 rounded-full object-cover'
            />
          )}
        </div>
        {loading ? (
          <Skeleton className='h-6 w-24' />
        ) : (
          <h1 className='text-xl font-medium'>{systemName}</h1>
        )}
      </Link>
      <div className='relative container flex min-h-svh items-center justify-center px-4 py-20 sm:px-6 lg:px-8'>
        <div className='w-full max-w-[1040px]'>
          <div className='grid overflow-hidden rounded-[28px] border border-white/70 bg-white/78 shadow-[0_28px_72px_rgba(24,32,43,0.1)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_28px_72px_rgba(0,0,0,0.34)] lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]'>
            <div className='hidden flex-col justify-between border-r border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,250,253,0.42)),radial-gradient(circle_at_top_left,rgba(240,138,88,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(62,118,210,0.12),transparent_26%)] p-10 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02)),radial-gradient(circle_at_top_left,rgba(240,138,88,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(119,174,249,0.1),transparent_24%)] lg:flex'>
              <div className='space-y-5'>
                <div className='inline-flex items-center rounded-full border border-white/70 bg-white/78 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase shadow-sm dark:border-white/10 dark:bg-white/[0.04]'>
                  {t('Developer workspace')}
                </div>
                <div className='space-y-3'>
                  <h2 className='max-w-[12ch] text-4xl font-semibold tracking-tight text-foreground'>
                    {t('Manage your models, quota, and billing in one place')}
                  </h2>
                  <p className='max-w-[44ch] text-sm leading-7 text-muted-foreground'>
                    {t(
                      'Sign in to continue with API keys, subscriptions, usage tracking, and operational controls.'
                    )}
                  </p>
                </div>
              </div>

              <div className='grid gap-3'>
                <div className='rounded-[24px] border border-white/65 bg-white/72 p-5 shadow-[0_14px_34px_rgba(24,32,43,0.06)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_14px_34px_rgba(0,0,0,0.22)]'>
                  <div className='text-sm font-semibold text-foreground'>
                    {t('Reliable access')}
                  </div>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                    {t(
                      'Keep quota, subscription status, and workspace controls within immediate reach during active development.'
                    )}
                  </p>
                </div>
                <div className='rounded-[24px] border border-white/65 bg-white/58 p-5 shadow-[0_14px_34px_rgba(24,32,43,0.05)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_14px_34px_rgba(0,0,0,0.18)]'>
                  <div className='text-sm font-semibold text-foreground'>
                    {t('Dark mode first')}
                  </div>
                  <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                    {t(
                      'Authentication surfaces now inherit the same contrast and theme rules as the main product UI.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className='flex min-h-[640px] items-center'>
              <div className='mx-auto flex w-full max-w-[480px] flex-col justify-center px-5 py-8 sm:px-8 md:px-10'>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
