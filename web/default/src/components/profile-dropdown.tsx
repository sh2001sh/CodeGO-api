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
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Sparkles, User, Wallet, LogOut, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { getGamificationDashboard } from '@/features/gamification/api'
import { resolveWorkshopIcon } from '@/features/gamification/components/icon-resolver'
import { getUserAvatarFallback, getUserAvatarStyle } from '@/lib/avatar'
import { ROLE } from '@/lib/roles'
import useDialogState from '@/hooks/use-dialog'
import { useUserDisplay } from '@/hooks/use-user-display'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'

const avatarFallbackClassName = 'font-semibold text-white'

export function ProfileDropdown() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useDialogState()
  const user = useAuthStore((state) => state.auth.user)
  const { displayName, roleLabel } = useUserDisplay(user)
  const isSuperAdmin = user?.role === ROLE.SUPER_ADMIN
  const avatarName = user?.username || displayName
  const avatarFallback = getUserAvatarFallback(avatarName)
  const avatarFallbackStyle = useMemo(
    () => getUserAvatarStyle(avatarName),
    [avatarName]
  )
  const companionQuery = useQuery({
    queryKey: ['gamification', 'dashboard'],
    queryFn: getGamificationDashboard,
    staleTime: 60 * 1000,
    enabled: Boolean(user),
  })
  const companion = companionQuery.data?.data?.companion
  const latestAchievement = companionQuery.data?.data?.achievement_stats?.latest
  const CompanionIcon = latestAchievement
    ? resolveWorkshopIcon(latestAchievement.icon)
    : Sparkles

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={
            <Button
              variant='ghost'
              className='relative h-8 gap-1 rounded-full px-1.5'
            />
          }
        >
          {companion ? (
            <span
              title={`${companion.name} · ${companion.title}`}
              className='hidden items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 sm:inline-flex'
            >
              <CompanionIcon className='size-3.5' />
              <span className='max-w-20 truncate'>{companion.name}</span>
            </span>
          ) : null}
          <Avatar className='size-6'>
            <AvatarFallback
              className={`${avatarFallbackClassName} text-[11px]`}
              style={avatarFallbackStyle}
            >
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' sideOffset={8} className='w-56'>
          <div className='flex items-center gap-2 px-1.5 py-1.5'>
            <Avatar className='size-8'>
              <AvatarFallback
                className={`${avatarFallbackClassName} text-xs`}
                style={avatarFallbackStyle}
              >
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-col gap-0.5 overflow-hidden'>
              <p className='text-foreground truncate text-sm font-medium'>
                {displayName}
              </p>
              <div className='flex items-center gap-1.5'>
                <span className='text-muted-foreground text-xs'>
                  {roleLabel}
                </span>
                {user?.group && (
                  <>
                    <span className='text-muted-foreground text-xs'>·</span>
                    <span className='text-muted-foreground truncate text-xs'>
                      {String(user.group)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {companion && (
            <>
              <div className='px-1.5 py-1'>
                <div className='rounded-xl border border-amber-200/70 bg-amber-50/80 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10'>
                  <div className='flex items-center gap-2'>
                    <div className='flex size-7 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm dark:bg-slate-950/70 dark:text-amber-200'>
                      <CompanionIcon className='size-4' />
                    </div>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-medium'>
                        {companion.name}
                      </div>
                      <div className='truncate text-xs text-muted-foreground'>
                        {companion.title}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => navigate({ to: '/profile' })}>
            <User className='size-4' />
            {t('Profile')}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate({ to: '/wallet' })}>
            <Wallet className='size-4' />
            {t('Wallet')}
          </DropdownMenuItem>

          {isSuperAdmin && (
            <DropdownMenuItem
              onClick={() =>
                navigate({
                  to: '/system-settings/site/$section',
                  params: { section: 'system-info' },
                })
              }
            >
              <Settings className='size-4' />
              {t('System Settings')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)}>
            <LogOut className='size-4' />
            {t('Sign out')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
