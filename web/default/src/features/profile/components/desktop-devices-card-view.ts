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
import type { DesktopAuthorizedDevice } from '../api'

export interface DesktopDevicesEmptyStateAction {
  label: string
  href: string
  variant: 'default' | 'outline'
}

export interface DesktopDeviceDisplaySummary {
  subtitle: string
  lastUsedLabel: string
  scopeSummary: string
  authorizedLabel: string
}

export function isDesktopDeviceActive(
  device: Pick<DesktopAuthorizedDevice, 'status' | 'revoked_at'>
) {
  return (
    device.revoked_at <= 0 && device.status.trim().toLowerCase() === 'active'
  )
}

export function getDesktopDeviceAccessLabel(
  device: Pick<DesktopAuthorizedDevice, 'status' | 'revoked_at'>
) {
  if (device.revoked_at > 0) {
    return 'revoked'
  }

  const normalizedStatus = device.status.trim().toLowerCase()
  return normalizedStatus || 'active'
}

export function buildDesktopDevicesEmptyStateActions(
  downloadLabel: string,
  tokenConsoleLabel: string,
  tokenConsoleHref = '/keys'
): DesktopDevicesEmptyStateAction[] {
  return [
    {
      label: downloadLabel,
      href: '/download',
      variant: 'default',
    },
    {
      label: tokenConsoleLabel,
      href: tokenConsoleHref,
      variant: 'outline',
    },
  ]
}

export function buildDesktopDeviceDisplaySummary(
  device: Pick<
    DesktopAuthorizedDevice,
    'platform' | 'app_version' | 'scopes' | 'last_used_at' | 'created_at'
  >,
  labels: {
    lastUsed: string
    neverUsed: string
    scopes: string
    legacyFullAccess: string
    authorized: string
  },
  formatRelativeTime: (timestamp: number) => string,
  formatDateTime: (timestamp: number) => string
): DesktopDeviceDisplaySummary {
  const subtitle = [device.platform, device.app_version]
    .filter(Boolean)
    .join(' · ')
  const lastUsedLabel =
    device.last_used_at > 0
      ? `${labels.lastUsed}: ${formatRelativeTime(device.last_used_at)}`
      : labels.neverUsed
  const scopeSummary =
    device.scopes?.length > 0
      ? device.scopes.join(', ')
      : labels.legacyFullAccess

  return {
    subtitle,
    lastUsedLabel,
    scopeSummary,
    authorizedLabel: `${labels.authorized}: ${formatDateTime(device.created_at)}`,
  }
}
