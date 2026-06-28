/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your
option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export type CodeGoDesktopQuickAction = {
  label: string
  href: string
  variant: 'default' | 'outline'
}

export function buildCodeGoDesktopQuickActions() {
  const actions: CodeGoDesktopQuickAction[] = [
    {
      label: '打开下载页',
      href: '/download',
      variant: 'default',
    },
    {
      label: '进入 Token 控制台',
      href: '/keys',
      variant: 'outline',
    },
    {
      label: '查看桌面设备',
      href: '/profile',
      variant: 'outline',
    },
  ]

  return actions
}
