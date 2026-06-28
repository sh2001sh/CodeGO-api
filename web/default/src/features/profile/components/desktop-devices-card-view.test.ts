import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  buildDesktopDeviceDisplaySummary,
  buildDesktopDevicesEmptyStateActions,
  getDesktopDeviceAccessLabel,
  isDesktopDeviceActive,
} from './desktop-devices-card-view.ts'

describe('desktop devices card view helpers', () => {
  test('builds the empty state actions with the expected destinations', () => {
    const actions = buildDesktopDevicesEmptyStateActions(
      'Download Code Go Desktop',
      'Open token console',
      '/keys'
    )

    assert.equal(actions.length, 2)
    assert.equal(actions[0]?.href, '/download')
    assert.equal(actions[0]?.variant, 'default')
    assert.equal(actions[1]?.href, '/keys')
    assert.equal(actions[1]?.variant, 'outline')
  })

  test('builds a compact device summary from raw device data', () => {
    const summary = buildDesktopDeviceDisplaySummary(
      {
        platform: 'windows',
        app_version: '1.2.3',
        scopes: ['desktop:account:read', 'desktop:logs:read'],
        last_used_at: 1710001234,
        created_at: 1710000000,
      },
      {
        lastUsed: 'Last used',
        neverUsed: 'Never used',
        scopes: 'Scopes',
        legacyFullAccess: 'Legacy full access',
        authorized: 'Authorized',
      },
      () => 'relative time',
      () => '2024-03-09 12:00'
    )

    assert.equal(summary.subtitle, 'windows · 1.2.3')
    assert.equal(summary.lastUsedLabel, 'Last used: relative time')
    assert.equal(
      summary.scopeSummary,
      'desktop:account:read, desktop:logs:read'
    )
    assert.equal(summary.authorizedLabel, 'Authorized: 2024-03-09 12:00')
  })

  test('keeps conservative fallbacks when device metadata is sparse', () => {
    const summary = buildDesktopDeviceDisplaySummary(
      {
        platform: '',
        app_version: '',
        scopes: [],
        last_used_at: 0,
        created_at: 1710000000,
      },
      {
        lastUsed: 'Last used',
        neverUsed: 'Never used',
        scopes: 'Scopes',
        legacyFullAccess: 'Legacy full access',
        authorized: 'Authorized',
      },
      () => 'relative time',
      () => '2024-03-09 12:00'
    )

    assert.equal(summary.subtitle, '')
    assert.equal(summary.lastUsedLabel, 'Never used')
    assert.equal(summary.scopeSummary, 'Legacy full access')
  })

  test('treats revoked devices as inactive even when status still says active', () => {
    assert.equal(
      isDesktopDeviceActive({
        status: 'active',
        revoked_at: 1710009999,
      }),
      false
    )

    assert.equal(
      getDesktopDeviceAccessLabel({
        status: 'active',
        revoked_at: 1710009999,
      }),
      'revoked'
    )
  })

  test('normalizes active device access labels conservatively', () => {
    assert.equal(
      isDesktopDeviceActive({
        status: ' Active ',
        revoked_at: 0,
      }),
      true
    )

    assert.equal(
      getDesktopDeviceAccessLabel({
        status: ' Active ',
        revoked_at: 0,
      }),
      'active'
    )
  })
})
