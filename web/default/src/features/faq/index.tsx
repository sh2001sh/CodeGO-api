import { ChevronRight, Code2, MessageSquareQuote, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { PublicLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'

const faqs = [
  {
    q: 'Code Go 是什么？',
    a: 'Code Go 是一个围绕 AI Coding 工作流构建的平台，帮助你把使用过程持续积累下来。',
  },
  {
    q: 'Code Go 的核心理念是什么？',
    a: '让 AI Coding 的每一步，都算数。',
  },
  {
    q: 'Code Go 适合哪些人？',
    a: '适合长期使用 Codex、Claude Code 和多模型工作流的开发者与团队。',
  },
  {
    q: 'Code Go 支持哪些使用场景？',
    a: '包括 API 调用、套餐订阅、额度管理、脚本下载、成就记录和持续使用记录。',
  },
  {
    q: '为什么要强调长期积累感？',
    a: '因为 AI Coding 不只是一次性完成任务，更重要的是持续使用和持续进步。',
  },
  {
    q: 'Code Go 和普通 AI API 平台有什么区别？',
    a: '它除了接入和计费，也会把使用过程、记录和进度一起保留下来。',
  },
]

export function FAQPage() {
  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title='FAQ'
        description='Code Go 常见问题：产品定位、Codex / Claude Code 使用场景、AI Coding 长期积累感与平台差异化。'
        keywords='Code Go FAQ, Codex, Claude Code, AI Coding, 长期积累, 常见问题'
        canonicalPath='/faq'
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.a,
            },
          })),
        }}
      />
      <main className='px-6 pb-16 pt-28 md:px-10 md:pt-32'>
        <div className='mx-auto max-w-5xl'>
          <div className='max-w-3xl space-y-4'>
            <div className='inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300'>
              <Search className='size-3.5' />
              常见问题
            </div>
            <h1 className='text-4xl font-semibold tracking-tight text-foreground'>
              先回答最关键的问题
            </h1>
            <p className='text-base leading-8 text-muted-foreground'>
              这一页不是堆规则，而是先让你一眼看懂 Code Go 到底在做什么。
            </p>
          </div>

          <div className='mt-10 grid gap-4'>
            {faqs.map((item) => (
              <section
                key={item.q}
                className='rounded-3xl border border-border bg-card p-6 text-card-foreground'
              >
                <div className='text-lg font-semibold text-foreground'>
                  {item.q}
                </div>
                <p className='mt-3 text-sm leading-7 text-muted-foreground'>
                  {item.a}
                </p>
              </section>
            ))}
          </div>

          <div className='mt-10 grid gap-4 md:grid-cols-2'>
            <Link
              to='/guide'
              className='rounded-3xl border border-border bg-card p-6 transition-colors hover:bg-muted/40'
            >
              <div className='flex items-center gap-2 text-sm font-semibold'>
                <Code2 className='size-4 text-amber-600' />
                使用说明
              </div>
              <p className='mt-3 text-sm leading-7 text-muted-foreground'>
                看实际使用流程、脚本下载和平台入口。
              </p>
              <div className='mt-4 inline-flex items-center gap-1 text-sm font-medium'>
                前往 Guide
                <ChevronRight className='size-4' />
              </div>
            </Link>
            <Link
              to='/about'
              className='rounded-3xl border border-border bg-card p-6 transition-colors hover:bg-muted/40'
            >
              <div className='flex items-center gap-2 text-sm font-semibold'>
                <MessageSquareQuote className='size-4 text-violet-600' />
                关于 Code Go
              </div>
              <p className='mt-3 text-sm leading-7 text-muted-foreground'>
                看品牌概念、核心卖点和公开表达口径。
              </p>
              <div className='mt-4 inline-flex items-center gap-1 text-sm font-medium'>
                前往 About
                <ChevronRight className='size-4' />
              </div>
            </Link>
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
