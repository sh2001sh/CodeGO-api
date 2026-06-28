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
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Monitor, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import dayjs from '@/lib/dayjs'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import {
  listDesktopAuthorizedDevices,
  revokeDesktopAuthorizedDevice,
  type DesktopAuthorizedDevice,
} from '../api'
import {
  buildDesktopDeviceDisplaySummary,
  buildDesktopDevicesEmptyStateActions,
  getDesktopDeviceAccessLabel,
  isDesktopDeviceActive,
} from './desktop-devices-card-view'

export function DesktopDevicesCard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [pendingDevice, setPendingDevice] =
    useState<DesktopAuthorizedDevice | null>(null)

  const devicesQuery = useQuery({
    queryKey: ['profile', 'desktop-devices'],
    queryFn: async () => {
      const res = await listDesktopAuthorizedDevices()
      if (!res.success) {
        throw new Error(res.message || 'Failed to load desktop devices')
      }
      return res.data || []
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) => revokeDesktopAuthorizedDevice(id),
    onSuccess: async () => {
      toast.success(t('Desktop device revoked'))
      setPendingDevice(null)
      await queryClient.invalidateQueries({
        queryKey: ['profile', 'desktop-devices'],
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || t('Failed to revoke desktop device'))
    },
  })

  const activeCount = useMemo(
    () =>
      (devicesQuery.data || []).filter((item) => isDesktopDeviceActive(item))
        .length,
    [devicesQuery.data]
  )

  if (devicesQuery.isLoading) {
    return (
      <TitledCard
        title={t('Desktop Devices')}
        description={t('Review and revoke browser-approved desktop sessions')}
        icon={<Monitor className='h-4 w-4' />}
      >
        <div className='space-y-3'>
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className='h-20 w-full' />
          ))}
        </div>
      </TitledCard>
    )
  }

  return (
    <>
      <TitledCard
        title={t('Desktop Devices')}
        description={t('Review and revoke browser-approved desktop sessions')}
        icon={<Monitor className='h-4 w-4' />}
        action={
          <Button
            variant='outline'
            size='sm'
            onClick={() => devicesQuery.refetch()}
            disabled={devicesQuery.isFetching}
            className='gap-2'
          >
            <RefreshCw
              className={`h-4 w-4 ${devicesQuery.isFetching ? 'animate-spin' : ''}`}
            />
            {t('Refresh')}
          </Button>
        }
      >
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='gap-1.5'>
              <ShieldCheck className='h-3.5 w-3.5' />
              {t('{{count}} active', { count: activeCount })}
            </Badge>
          </div>

          {devicesQuery.isError ? (
            <div className='border-destructive/20 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm'>
              {devicesQuery.error instanceof Error
                ? devicesQuery.error.message
                : t('Failed to load desktop devices')}
            </div>
          ) : devicesQuery.data?.length ? (
            <div className='space-y-3'>
              {devicesQuery.data.map((device) => {
                const canRevoke = isDesktopDeviceActive(device)
                const summary = buildDesktopDeviceDisplaySummary(
                  device,
                  {
                    lastUsed: t('Last used'),
                    neverUsed: t('Never used'),
                    scopes: t('Scopes'),
                    legacyFullAccess: t('Legacy full access'),
                    authorized: t('Authorized'),
                  },
                  (timestamp) => dayjs.unix(timestamp).fromNow(),
                  (timestamp) =>
                    dayjs.unix(timestamp).format('YYYY-MM-DD HH:mm')
                )

                return (
                  <div
                    key={device.id}
                    className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between'
                  >
                    <div className='min-w-0 space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='text-sm font-medium'>
                          {device.device_name}
                        </p>
                        <Badge variant={canRevoke ? 'default' : 'secondary'}>
                          {getDesktopDeviceAccessLabel(device)}
                        </Badge>
                      </div>
                      {summary.subtitle && (
                        <p className='text-muted-foreground text-xs'>
                          {summary.subtitle}
                        </p>
                      )}
                      <p className='text-muted-foreground text-xs'>
                        {summary.lastUsedLabel}
                      </p>
                      <p className='text-muted-foreground text-xs break-all'>
                        {t('Scopes')}: {summary.scopeSummary}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {summary.authorizedLabel}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-destructive hover:text-destructive gap-2'
                        onClick={() => {
                          if (canRevoke) {
                            setPendingDevice(device)
                          }
                        }}
                        disabled={!canRevoke}
                      >
                        <Trash2 className='h-4 w-4' />
                        {t('Revoke')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className='text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-sm'>
              <div>{t('No authorized desktop devices yet')}</div>
              <div className='mt-2 max-w-2xl leading-6'>
                {t(
                  'Install Code Go Desktop to approve browser sessions and manage local tool imports from one place.'
                )}
              </div>
              <div className='mt-4 flex flex-wrap gap-3'>
                {buildDesktopDevicesEmptyStateActions(
                  t('Download Code Go Desktop'),
                  t('Open token console'),
                  '/keys'
                ).map((action) => (
                  <Button
                    key={action.href}
                    size='sm'
                    variant={action.variant}
                    render={
                      action.href === '/download' ? (
                        <Link to='/download' />
                      ) : (
                        <Link to='/keys' />
                      )
                    }
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </TitledCard>

      <AlertDialog
        open={pendingDevice !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDevice(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Revoke desktop device?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDevice
                ? t(
                    'This will immediately disconnect {{name}} until it is approved again in the browser.',
                    { name: pendingDevice.device_name }
                  )
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>
              {t('Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={!pendingDevice || revokeMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (pendingDevice) {
                  revokeMutation.mutate(pendingDevice.id)
                }
              }}
            >
              {revokeMutation.isPending ? t('Revoking...') : t('Revoke')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
