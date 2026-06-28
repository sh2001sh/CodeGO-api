import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { DesktopRelease, DownloadCopy } from './types.ts'
import { buildDownloadPageViewModel } from './view-model.ts'

const copy: DownloadCopy = {
  windowsTitle: 'Windows',
  windowsDescription: 'windows-desc',
  windowsCta: 'Download for Windows',
  macosTitle: 'macOS',
  macosDescription: 'mac-desc',
  macosCta: 'Download for macOS',
  macosFallbackCta: 'Install with Homebrew',
  linuxTitle: 'Linux',
  linuxDescription: 'linux-desc',
  linuxCta: 'Download for Linux',
  linuxFallbackCta: 'Browse Linux assets',
  releaseFallbackCta: 'Open release',
}

const release: DesktopRelease = {
  tag_name: 'v3.16.4',
  version: '3.16.4',
  html_url: 'https://example.test/release',
  published_at: '2026-06-28T12:00:00Z',
  homebrew_url: 'https://example.test/homebrew',
  assets: [
    {
      name: 'CodeGo_3.16.4_x64_en-US.msi',
      size: 10485760,
      digest: 'sha256:windows-x64',
      browser_download_url: 'https://example.test/windows-x64.msi',
      platform: 'windows',
      arch: 'x64',
    },
    {
      name: 'CodeGo_3.16.4_universal.dmg',
      size: 20971520,
      digest: 'sha256:macos-dmg',
      browser_download_url: 'https://example.test/macos.dmg',
      platform: 'macos',
      arch: 'universal',
    },
    {
      name: 'CodeGo_3.16.4_x64.AppImage',
      size: 31457280,
      digest: 'sha256:linux-appimage',
      browser_download_url: 'https://example.test/linux.AppImage',
      platform: 'linux',
      arch: 'x64',
    },
  ],
}

describe('download page view model', () => {
  test('builds release-driven cards and platform recommendations for a resolved release', () => {
    const viewModel = buildDownloadPageViewModel({
      release,
      copy,
      platform: 'macos',
      isLoading: false,
    })

    assert.equal(viewModel.currentBuildLabel, 'v3.16.4')
    assert.match(viewModel.publishedAtLabel, /^2026-06-28 /)
    assert.equal(viewModel.downloadCards.length, 3)
    assert.equal(viewModel.recommendedCard?.key, 'macos')
    assert.equal(
      viewModel.recommendedCard?.href,
      'https://example.test/macos.dmg'
    )
    assert.equal(viewModel.recommendedTrack?.key, 'macos')
    assert.equal(viewModel.verificationItems.length, 3)
    assert.equal(viewModel.errorMessage, null)
    assert.equal(viewModel.isLoading, false)
  })

  test('falls back conservatively when release data is missing or still loading', () => {
    const viewModel = buildDownloadPageViewModel({
      release: null,
      copy,
      platform: 'unknown',
      isLoading: true,
      error: new Error('Desktop release channel unavailable'),
    })

    assert.equal(viewModel.currentBuildLabel, 'Loading...')
    assert.equal(viewModel.publishedAtLabel, '-')
    assert.equal(viewModel.downloadCards[0]?.href, '/download')
    assert.equal(viewModel.downloadCards[1]?.href, '/download')
    assert.equal(viewModel.downloadCards[2]?.href, '/download')
    assert.equal(viewModel.recommendedCard?.key, 'windows')
    assert.equal(viewModel.recommendedTrack?.key, 'windows')
    assert.equal(viewModel.errorMessage, 'Desktop release channel unavailable')
    assert.equal(viewModel.isLoading, true)
  })
})
