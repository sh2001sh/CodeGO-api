import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { buildCodeGoDesktopQuickActions } from './codego-desktop-entry.ts'

describe('buildCodeGoDesktopQuickActions', () => {
  test('returns the expected desktop control entry points', () => {
    const actions = buildCodeGoDesktopQuickActions()

    assert.deepEqual(actions, [
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
    ])
  })
})
