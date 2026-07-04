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
import { useQuery } from '@tanstack/react-query'
import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SiteSeo } from '@/components/seo'
import { getPublicPageSeoEntry } from '@/lib/public-page-seo'
import { Markdown } from '@/components/ui/markdown'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/components/layout'
import { getAboutContent } from './api'

const aboutSeo = getPublicPageSeoEntry('/about')

const fallbackAboutMarkdown = `## 品牌主张

让 AI Coding 的每一步，都算数。

## Code Go 在做什么

Code Go 让 AI Coding 更适合长期使用。

## 为什么这样做

如果你长期使用 Codex、Claude Code 或多模型工作流，你会需要一个更稳定的使用入口。

## Code Go 的差异化

- 不只是接入模型
- 不只是管理额度
- 也不只是看调用结果

我们更关心的是：你每天做 AI Coding 时，是否能感受到进度在持续累积。

## 适合谁

- 长期使用 Codex 的开发者
- 长期使用 Claude Code 的开发者
- 需要多模型、额度管理、成长反馈和工作流记录的团队

## 对外表达

如果只用一句话介绍 Code Go，就是：

**让 AI Coding 的每一步，都算数。**
`

function AboutHero() {
  return (
    <div className='space-y-4'>
      <div className='inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/8 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300'>
        {aboutSeo.eyebrow}
      </div>
      <div className='space-y-3'>
        <h1 className='text-4xl font-semibold tracking-tight text-foreground md:text-5xl'>
          {aboutSeo.h1}
        </h1>
        <p className='max-w-3xl text-base leading-8 text-muted-foreground md:text-lg'>
          {aboutSeo.intro}
        </p>
      </div>
    </div>
  )
}

function SupportGroupCard() {
  return (
    <div className='overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-sm'>
      <div className='grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_240px] md:items-center'>
        <div className='space-y-3'>
          <div className='text-xs font-semibold uppercase tracking-[0.24em] text-primary'>
            售后支持
          </div>
          <h2 className='text-2xl font-semibold tracking-tight text-foreground'>
            售后 QQ 群
          </h2>
          <p className='text-sm leading-7 text-muted-foreground'>
            注册、套餐、盲盒、宠物升级、脚本配置或控制台使用遇到问题时，可以直接进群处理。
          </p>
          <div className='rounded-2xl bg-muted/60 px-4 py-3 text-sm leading-7 text-foreground'>
            群号：<span className='font-semibold'>996040309</span>
          </div>
        </div>

        <div className='mx-auto w-full max-w-[220px] rounded-3xl border border-border bg-background p-3'>
          <img
            src='/guide/16-support-qq-group.png'
            alt='Code Go 售后 QQ 群二维码'
            className='h-auto w-full rounded-2xl'
            loading='lazy'
          />
        </div>
      </div>
    </div>
  )
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isLikelyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function EmptyAboutState() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <div className='flex min-h-[60vh] items-center justify-center p-8'>
      <div className='max-w-2xl space-y-6 text-center'>
        <div className='flex justify-center'>
          <Construction className='h-24 w-24 text-muted-foreground' />
        </div>
        <div className='space-y-2'>
          <h2 className='text-2xl font-bold text-foreground'>
            {t('No About Content Set')}
          </h2>
          <p className='text-muted-foreground'>
            {t(
              'The administrator has not configured any about content yet. You can set it in the settings page, supporting HTML or URL.'
            )}
          </p>
        </div>
        <div className='space-y-4 text-sm'>
          <p>
            codexforall repository:{' '}
            <a
              href='https://github.com/sh2001sh/new-api'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              https://github.com/sh2001sh/new-api
            </a>
          </p>
          <p className='text-muted-foreground'>
            <a
              href='https://github.com/sh2001sh/new-api'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              codexforall
            </a>{' '}
            © {currentYear}{' '}
            <a
              href='https://github.com/s2644752646'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              s2644752646
            </a>{' '}
            {t('| Based on')}{' '}
            <a
              href='https://github.com/songquanpeng/one-api'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('One API')}
            </a>{' '}
            © 2023{' '}
            <a
              href='https://github.com/songquanpeng'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('JustSong')}
            </a>
          </p>
          <p className='text-muted-foreground'>
            {t('This project must be used in compliance with the')}{' '}
            <a
              href='https://github.com/sh2001sh/new-api/blob/main/LICENSE'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {t('AGPL v3.0 License')}
            </a>
            .
          </p>
          <SupportGroupCard />
        </div>
      </div>
    </div>
  )
}

export function About() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['about-content'],
    queryFn: getAboutContent,
  })

  const rawContent = data?.data?.trim() ?? ''
  const hasContent = rawContent.length > 0
  const isUrl = hasContent && isValidUrl(rawContent)
  const isHtml = hasContent && !isUrl && isLikelyHtml(rawContent)

  if (isLoading) {
    return (
      <PublicLayout>
        <SiteSeo
          title={aboutSeo.title}
          description={aboutSeo.description}
          keywords={aboutSeo.keywords}
          canonicalPath={aboutSeo.path}
        />
        <div className='mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12'>
          <AboutHero />
          <Skeleton className='h-8 w-[45%]' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-[90%]' />
          <Skeleton className='h-4 w-[80%]' />
        </div>
      </PublicLayout>
    )
  }

  if (!hasContent) {
    return (
      <PublicLayout>
        <SiteSeo
          title={aboutSeo.title}
          description={aboutSeo.description}
          keywords={aboutSeo.keywords}
          canonicalPath={aboutSeo.path}
        />
        <div className='mx-auto max-w-6xl space-y-6 px-4 py-8'>
          <AboutHero />
          <SupportGroupCard />
          <Markdown className='prose-neutral dark:prose-invert max-w-none'>
            {fallbackAboutMarkdown}
          </Markdown>
          <EmptyAboutState />
        </div>
      </PublicLayout>
    )
  }

  if (isUrl) {
    return (
      <PublicLayout showMainContainer={false}>
        <SiteSeo
          title={aboutSeo.title}
          description={aboutSeo.description}
          keywords={aboutSeo.keywords}
          canonicalPath={aboutSeo.path}
        />
        <div className='space-y-4 px-4 py-6 md:px-6'>
          <div className='mx-auto max-w-6xl space-y-6'>
            <AboutHero />
            <SupportGroupCard />
            <p className='max-w-3xl text-sm leading-7 text-muted-foreground'>
              当前 About 内容由外部地址承载。为了保持公开页结构稳定，这里会保留统一标题、说明和支持入口，再跳转到外部内容容器展示。
            </p>
          </div>
          <iframe
            src={rawContent}
            className='h-[calc(100vh-18rem)] w-full border-0'
            title={t('About')}
          />
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <SiteSeo
        title={aboutSeo.title}
        description={aboutSeo.description}
        keywords={aboutSeo.keywords}
        canonicalPath={aboutSeo.path}
      />
      <div className='mx-auto max-w-6xl space-y-6 px-4 py-8'>
        <AboutHero />
        <SupportGroupCard />
        {isHtml ? (
          <div
            className='prose prose-neutral dark:prose-invert max-w-none'
            dangerouslySetInnerHTML={{ __html: rawContent }}
          />
        ) : (
          <Markdown className='prose-neutral dark:prose-invert max-w-none'>
            {rawContent}
          </Markdown>
        )}
      </div>
    </PublicLayout>
  )
}
