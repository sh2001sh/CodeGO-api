import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { openDesktopImportDeepLink } from './cc-switch-dialog-open.ts'

describe('openDesktopImportDeepLink', () => {
  test('opens the deep link through a blank popup first', () => {
    let openedUrl = ''
    const result = openDesktopImportDeepLink(
      {
        open: (url, target, features) => {
          assert.equal(url, '')
          assert.equal(target, '_blank')
          assert.equal(features, 'noopener,noreferrer')
          return {
            location: {
              get href() {
                return openedUrl
              },
              set href(value: string) {
                openedUrl = value
              },
            },
          }
        },
        location: {
          href: '',
        },
      },
      'codego://v1/import?resource=provider'
    )

    assert.equal(result, 'popup')
    assert.equal(openedUrl, 'codego://v1/import?resource=provider')
  })

  test('falls back to the current window when popup blocking occurs', () => {
    const windowLocation = { href: '' }
    const result = openDesktopImportDeepLink(
      {
        open: () => null,
        location: windowLocation,
      },
      'codego://v1/import?resource=provider'
    )

    assert.equal(result, 'redirect')
    assert.equal(windowLocation.href, 'codego://v1/import?resource=provider')
  })
})
