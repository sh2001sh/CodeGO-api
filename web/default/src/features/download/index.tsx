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
import { Link } from '@tanstack/react-router'
import {
  Apple,
  ArrowUpRight,
  ExternalLink,
  Laptop,
  Loader2,
  Monitor,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { PublicLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'
import { getPublicPageSeoEntry } from '@/lib/public-page-seo'
import {
  detectDesktopArchitecture,
  detectDesktopPlatform,
  formatFileSize,
  RELEASE_PAGE_URL,
  RELEASES_URL,
} from './lib'
import type { DesktopDevice, DesktopRelease, DownloadCopy } from './types'
import { buildDownloadPageViewModel } from './view-model'

const downloadSeo = getPublicPageSeoEntry('/download')

function getDownloadCopy(t: (key: string) => string): DownloadCopy {
  return {
    windowsTitle: t('Windows'),
    windowsDescription: t(
      'Installer with automatic updates for Windows 10 and above.'
    ),
    windowsCta: t('Download for Windows'),
    appleSiliconLabel: t('Apple Silicon'),
    intelLabel: t('Intel'),
    macosAppleSiliconTitle: t('macOS Apple Silicon'),
    macosAppleSiliconDescription: t(
      'Signed DMG installer for macOS 12+ on Apple Silicon (M-series).'
    ),
    macosAppleSiliconCta: t('Download for Apple Silicon'),
    macosIntelTitle: t('macOS Intel'),
    macosIntelDescription: t('Signed DMG installer for macOS 12+ on Intel Macs.'),
    macosIntelCta: t('Download for Intel Mac'),
    macosFallbackCta: t('Install with Homebrew'),
    linuxTitle: t('Linux'),
    linuxDescription: t(
      'Portable AppImage for mainstream Linux distributions, with .deb and .rpm assets in the release.'
    ),
    linuxCta: t('Download for Linux'),
    linuxFallbackCta: t('Browse Linux assets'),
    releaseFallbackCta: t('Open release'),
  }
}

export function DownloadPage() {
  const { t } = useTranslation()

  const releaseQuery = useQuery({
    queryKey: ['desktop-download-release'],
    queryFn: async () => {
      const response = await fetch(RELEASES_URL, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'code-go-download-page',
        },
      })

      if (!response.ok) {
        throw new Error(t('Failed to contact the desktop release channel'))
      }

      const release = (await response.json()) as DesktopRelease
      if (!release?.tag_name || !Array.isArray(release.assets)) {
        throw new Error(t('Unexpected release payload'))
      }

      return release
    },
    staleTime: 5 * 60 * 1000,
  })

  const release = releaseQuery.data
  const copy = useMemo(() => getDownloadCopy(t), [t])
  const device = useMemo<DesktopDevice>(
    () => {
      if (typeof navigator === 'undefined') {
        return { platform: 'unknown', arch: 'unknown' }
      }
      const platform = detectDesktopPlatform(navigator.userAgent)
      return {
        platform,
        arch: detectDesktopArchitecture(navigator.userAgent, platform),
      }
    },
    []
  )
  const viewModel = useMemo(
    () =>
      buildDownloadPageViewModel({
        release,
        copy,
        device,
        isLoading: releaseQuery.isLoading,
        error: releaseQuery.error,
      }),
    [copy, device, release, releaseQuery.error, releaseQuery.isLoading]
  )
  const recommendedCard = viewModel.recommendedCard
  const hasMacArchitectureChoice = viewModel.downloadCards.some(
    (card) => card.key === 'macos-arm64'
  )

  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title={downloadSeo.title}
        description={downloadSeo.description}
        keywords={downloadSeo.keywords}
        canonicalPath={downloadSeo.path}
      />

      <main className='bg-background min-h-screen pt-28 pb-16'>
        <section className='mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 md:px-6'>
          <div className='grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)] lg:items-end'>
            <div className='space-y-6'>
              <div className='inline-flex w-fit items-center rounded-full border border-orange-500/20 bg-orange-500/8 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-300'>
                {t('Desktop release channel')}
              </div>
              <div className='space-y-3'>
                <h1 className='max-w-4xl text-4xl font-semibold tracking-tight text-balance md:text-5xl'>
                  {t('Download Code Go Desktop')}
                </h1>
                <p className='text-muted-foreground max-w-3xl text-base leading-7 md:text-lg'>
                  {t(
                    'Use browser-approved desktop access, import API tokens from the website, and configure Codex, Claude Code, Gemini CLI, OpenCode, OpenClaw, or Hermes from one local control surface.'
                  )}
                </p>
              </div>
              <div className='flex flex-wrap gap-3'>
                {recommendedCard ? (
                  <Button
                    size='lg'
                    render={
                      <a
                        href={recommendedCard.href}
                        target='_blank'
                        rel='noopener noreferrer'
                      />
                    }
                  >
                    {t('Recommended download')}: {recommendedCard.title}
                  </Button>
                ) : null}
                {!recommendedCard &&
                device.platform === 'macos' &&
                hasMacArchitectureChoice ? (
                  <Button size='lg' render={<a href='#desktop-downloads' />}>
                    {t('Choose your Mac build')}
                  </Button>
                ) : null}
                <Button
                  size='lg'
                  render={<Link to='/sign-in' search={{ redirect: '/keys' }} />}
                >
                  {t('Open token console')}
                </Button>
                <Button
                  size='lg'
                  variant='outline'
                  render={
                    <a
                      href={release?.html_url || RELEASE_PAGE_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  }
                >
                  {t('Open release')}
                  <ExternalLink className='size-4' />
                </Button>
              </div>
            </div>

            <div className='border-border/70 bg-card/80 rounded-3xl border p-6 shadow-sm backdrop-blur'>
              <div className='space-y-5'>
                <div>
                  <div className='text-muted-foreground text-sm'>
                    {t('Current desktop build')}
                  </div>
                  <div className='mt-1 text-2xl font-semibold'>
                    {viewModel.currentBuildLabel}
                  </div>
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <div className='text-muted-foreground text-sm'>
                      {t('Published')}
                    </div>
                    <div className='mt-1 font-medium'>
                      {viewModel.publishedAtLabel}
                    </div>
                  </div>
                  <div>
                    <div className='text-muted-foreground text-sm'>
                      {t('Support')}
                    </div>
                    <div className='mt-1 font-medium'>
                      {t('Windows, macOS, Linux')}
                    </div>
                  </div>
                </div>
                <div className='border-border/60 bg-background/80 rounded-2xl border p-4 text-sm leading-6'>
                  <div className='font-medium'>{t('What ships today')}</div>
                  <p className='text-muted-foreground mt-2'>
                    {t(
                      'The current public build, in-app updater, browser authorization, token import, and device revocation now resolve through the same Code Go release channel and website account.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div
            id='desktop-downloads'
            className='grid gap-5 md:grid-cols-2 xl:grid-cols-4'
          >
            {viewModel.downloadCards.map((card) => {
              const Icon =
                card.platform === 'windows'
                  ? Monitor
                  : card.platform === 'macos'
                    ? Apple
                    : Laptop
              const isRecommended = viewModel.recommendedCard?.key === card.key

              return (
                <section
                  key={card.key}
                  className='border-border/70 bg-card/80 flex h-full flex-col rounded-3xl border p-6 shadow-sm'
                >
                  <div className='flex items-start justify-between gap-4'>
                    <div className='space-y-1'>
                      <div className='inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950'>
                        <Icon className='size-5' />
                      </div>
                      <h2 className='pt-3 text-xl font-semibold'>
                        {card.title}
                      </h2>
                    </div>
                    <div className='flex flex-col items-end gap-2'>
                      {card.arch ? (
                        <span className='border-border rounded-full border px-2.5 py-1 text-xs font-medium'>
                          {card.archLabel || card.arch}
                        </span>
                      ) : null}
                      {isRecommended ? (
                        <span className='rounded-full border border-orange-500/20 bg-orange-500/8 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-300'>
                          {t('Recommended')}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className='text-muted-foreground mt-4 text-sm leading-6'>
                    {card.description}
                  </p>

                  <dl className='mt-6 space-y-3 text-sm'>
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>{t('Asset')}</dt>
                      <dd className='max-w-[65%] text-right font-medium break-all'>
                        {card.fileName || t('Latest release page')}
                      </dd>
                    </div>
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>
                        {t('Package size')}
                      </dt>
                      <dd className='font-medium'>
                        {card.fileSize ? formatFileSize(card.fileSize) : '-'}
                      </dd>
                    </div>
                    <div className='flex items-start justify-between gap-4'>
                      <dt className='text-muted-foreground'>SHA256</dt>
                      <dd className='max-w-[65%] text-right font-mono text-xs break-all'>
                        {card.digest?.replace('sha256:', '') || '-'}
                      </dd>
                    </div>
                  </dl>

                  <div className='mt-auto pt-6'>
                    <Button
                      className='w-full justify-center'
                      variant={card.fallback ? 'outline' : 'default'}
                      render={
                        <a
                          href={card.href}
                          target='_blank'
                          rel='noopener noreferrer'
                        />
                      }
                    >
                      {card.cta}
                      {card.fallback ? (
                        <ArrowUpRight className='size-4' />
                      ) : null}
                    </Button>
                  </div>
                </section>
              )
            })}
          </div>

          <div className='grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]'>
            <section className='border-border/70 bg-card/80 rounded-3xl border p-6 shadow-sm'>
              <h2 className='text-xl font-semibold'>
                {t('After installation')}
              </h2>
              <div className='mt-5 grid gap-4 sm:grid-cols-3'>
                <div className='border-border/60 bg-background/70 rounded-2xl border p-4'>
                  <div className='text-sm font-medium'>1. {t('Sign in')}</div>
                  <p className='text-muted-foreground mt-2 text-sm leading-6'>
                    {t(
                      'Start from browser authorization instead of entering your website password inside the desktop app.'
                    )}
                  </p>
                </div>
                <div className='border-border/60 bg-background/70 rounded-2xl border p-4'>
                  <div className='text-sm font-medium'>
                    2. {t('Import token')}
                  </div>
                  <p className='text-muted-foreground mt-2 text-sm leading-6'>
                    {t(
                      'Open any token row in the website console and send it to Code Go Desktop through the one-click import action.'
                    )}
                  </p>
                </div>
                <div className='border-border/60 bg-background/70 rounded-2xl border p-4'>
                  <div className='text-sm font-medium'>
                    3. {t('Configure local tools')}
                  </div>
                  <p className='text-muted-foreground mt-2 text-sm leading-6'>
                    {t(
                      'Use the desktop app to write Codex, Claude Code, Gemini CLI, OpenCode, OpenClaw, or Hermes settings with backup and recovery support.'
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section className='border-border/70 bg-card/80 rounded-3xl border p-6 shadow-sm'>
              <h2 className='text-xl font-semibold'>
                {t('Need another asset?')}
              </h2>
              <p className='text-muted-foreground mt-3 text-sm leading-6'>
                {t(
                  'Portable Windows builds, macOS archives, and Linux .deb/.rpm packages remain available on the release page.'
                )}
              </p>
              <div className='mt-5 space-y-3'>
                <Button
                  className='w-full justify-center'
                  variant='outline'
                  render={
                    <a
                      href={release?.html_url || RELEASE_PAGE_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  }
                >
                  {t('Browse all desktop assets')}
                  <ExternalLink className='size-4' />
                </Button>
              </div>
            </section>
          </div>

          <div className='grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]'>
            <section className='border-border/70 bg-card/80 rounded-3xl border p-6 shadow-sm'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <h2 className='text-xl font-semibold'>
                    {t('Platform setup checklist')}
                  </h2>
                  <p className='text-muted-foreground mt-2 text-sm leading-6'>
                    {t(
                      'Use the track that matches your operating system so the installer, browser authorization, and local tool changes happen in the expected order.'
                    )}
                  </p>
                </div>
                {viewModel.recommendedTrack ? (
                  <span className='rounded-full border border-orange-500/20 bg-orange-500/8 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-300'>
                    {t('Recommended')}: {viewModel.recommendedTrack.title}
                  </span>
                ) : null}
              </div>

              <div className='mt-5 grid gap-4 lg:grid-cols-3'>
                {viewModel.installationTracks.map((track) => (
                  <section
                    key={track.key}
                    className='border-border/60 bg-background/75 rounded-2xl border p-4'
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <h3 className='text-sm font-semibold'>{track.title}</h3>
                      {track.badge ? (
                        <span className='border-border rounded-full border px-2 py-0.5 text-[11px] font-medium'>
                          {track.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className='mt-4 space-y-4'>
                      {track.steps.map((step, index) => (
                        <div key={step.title} className='space-y-1.5'>
                          <div className='text-sm font-medium'>
                            {index + 1}. {t(step.title)}
                          </div>
                          <p className='text-muted-foreground text-sm leading-6'>
                            {t(step.description)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section className='border-border/70 bg-card/80 rounded-3xl border p-6 shadow-sm'>
              <h2 className='text-xl font-semibold'>
                {t('Verify before running')}
              </h2>
              <div className='mt-5 space-y-4'>
                {viewModel.verificationItems.map((item) => (
                  <div
                    key={item.title}
                    className='border-border/60 bg-background/75 rounded-2xl border p-4'
                  >
                    <div className='text-sm font-medium'>{t(item.title)}</div>
                    <p className='text-muted-foreground mt-2 text-sm leading-6'>
                      {t(item.description)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className='border-border/70 bg-card/80 rounded-3xl border p-6 shadow-sm'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div className='max-w-3xl'>
                <h2 className='text-xl font-semibold'>
                  {t('Need the full walkthrough?')}
                </h2>
                <p className='text-muted-foreground mt-2 text-sm leading-6'>
                  {t(
                    'Use the FAQ for product-level questions, the token console for one-click imports, and the release details page when you need alternate packages or checksum context.'
                  )}
                </p>
              </div>
              <div className='flex flex-wrap gap-3'>
                <Button variant='outline' render={<Link to='/faq' />}>
                  {t('Open FAQ')}
                </Button>
                <Button
                  variant='outline'
                  render={<Link to='/sign-in' search={{ redirect: '/keys' }} />}
                >
                  {t('Open token console')}
                </Button>
                <Button
                  variant='outline'
                  render={
                    <a
                      href={release?.html_url || RELEASE_PAGE_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  }
                >
                  {t('View source release')}
                  <ExternalLink className='size-4' />
                </Button>
              </div>
            </div>
          </section>

          {viewModel.isLoading ? (
            <div className='text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm'>
              <Loader2 className='size-4 animate-spin' />
              {t('Loading desktop release...')}
            </div>
          ) : null}

          {viewModel.errorMessage ? (
            <div className='border-destructive/20 bg-destructive/5 text-destructive rounded-2xl border px-4 py-3 text-sm'>
              {viewModel.errorMessage}
            </div>
          ) : null}
        </section>
      </main>
    </PublicLayout>
  )
}
