import { Link } from '@tanstack/react-router'
import { ArrowRight, Search } from 'lucide-react'
import { PublicLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'
import { getSearchPageBySlug, searchPages } from './data'

const topicGroups = [
  {
    title: '核心关键词',
    description: '适合直接承接 Codex API、Claude Code API、Codex 中转、Claude 中转这类主搜索词。',
    match: (slug: string) =>
      [
        'codex-api',
        'codex-zhongzhuan',
        'claude-code-api',
        'claude-zhongzhuan',
      ].includes(slug),
  },
  {
    title: '教程与上手',
    description: '适合承接教程、接入、上手、进阶、配置这类搜索意图。',
    match: (slug: string) =>
      /jiaocheng|shangshou|jinjie|peizhi|zenme-yong|zenme-jie/.test(slug),
  },
  {
    title: '对比与问题',
    description: '适合承接区别、怎么选、稳定吗、报错怎么办这类高意图问题词。',
    match: (slug: string) =>
      /vs|zenme-xuan|wending-ma|baocuo-zenmeban/.test(slug),
  },
]

export function SearchPage(props: { slug: string }) {
  const page = getSearchPageBySlug(props.slug)

  if (!page) {
    return (
      <PublicLayout>
        <div className='mx-auto max-w-4xl py-16 text-sm text-muted-foreground'>
          Page not found.
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title={page.seoTitle}
        description={page.description}
        keywords={page.keywords}
        canonicalPath={`/topics/${page.slug}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: page.faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }}
      />
      <main className='px-6 pb-16 pt-28 md:px-10 md:pt-32'>
        <div className='mx-auto max-w-5xl'>
          <div className='max-w-3xl space-y-4'>
            <div className='inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'>
              <Search className='size-3.5' />
              专题页面
            </div>
            <h1 className='text-4xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50'>
              {page.hero}
            </h1>
            <p className='max-w-3xl text-base leading-8 text-muted-foreground'>
              {page.intro}
            </p>
            <div className='flex flex-wrap gap-2 pt-1'>
              <div className='ios-pill px-4 py-2 text-sm text-muted-foreground'>品牌：Code Go</div>
              <div className='ios-pill px-4 py-2 text-sm text-muted-foreground'>主题：长期 AI Coding</div>
              <div className='ios-pill px-4 py-2 text-sm text-muted-foreground'>{page.title}</div>
            </div>
          </div>

          <div className='mt-10 space-y-8'>
            {page.sections.map((section, index) => (
              <section key={section.heading} className='app-page-shell rounded-[28px] p-6 md:p-7'>
                <div className='app-section-kicker'>Code Go / Topic {index + 1}</div>
                <h2 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                  {section.heading}
                </h2>
                <div className='mt-4 space-y-4'>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className='text-sm leading-7 text-muted-foreground'>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <section className='app-page-shell mt-10 rounded-[28px] p-6 md:p-7'>
            <div className='app-section-kicker'>FAQ</div>
            <h2 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
              常见问题
            </h2>
            <div className='mt-6 space-y-4'>
              {page.faq.map((item) => (
                <div key={item.question} className='rounded-2xl border bg-muted/20 p-5'>
                  <div className='text-base font-semibold'>{item.question}</div>
                  <p className='mt-2 text-sm leading-7 text-muted-foreground'>
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className='app-page-shell mt-10 rounded-[28px] p-6 md:p-7'>
            <div className='app-section-kicker'>Next</div>
            <h2 className='text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
              继续查看
            </h2>
            <p className='mt-3 max-w-2xl text-sm leading-7 text-muted-foreground'>
              如果你还在比较接入方式、使用方式或具体问题，可以继续进入下面这些页面。
            </p>
            <div className='mt-4 grid gap-4 md:grid-cols-2'>
              <Link
                to='/pricing'
                className='overview-soft-card rounded-[22px] p-5 transition-colors hover:bg-muted/30'
              >
                <div className='text-sm font-semibold'>模型广场</div>
                <p className='mt-2 text-sm leading-7 text-muted-foreground'>
                  继续查看可用模型与公开页面。
                </p>
                <div className='mt-3 inline-flex items-center gap-1 text-sm font-medium'>
                  前往查看
                  <ArrowRight className='size-4' />
                </div>
              </Link>
              <Link
                to='/guide'
                className='overview-soft-card rounded-[22px] p-5 transition-colors hover:bg-muted/30'
              >
                <div className='text-sm font-semibold'>使用说明</div>
                <p className='mt-2 text-sm leading-7 text-muted-foreground'>
                  查看 Code Go 的实际使用方式和入口说明。
                </p>
                <div className='mt-3 inline-flex items-center gap-1 text-sm font-medium'>
                  前往查看
                  <ArrowRight className='size-4' />
                </div>
              </Link>
            </div>
          </section>

          <section className='app-page-shell mt-10 rounded-[28px] p-6 md:p-7'>
            <div className='app-section-kicker'>Related</div>
            <h2 className='text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
              相关专题
            </h2>
            <div className='mt-4 grid gap-3 md:grid-cols-2'>
              {searchPages
                .filter((item) => item.slug !== page.slug)
                .map((item) => (
                  <Link
                    key={item.slug}
                    to='/topics/$slug'
                    params={{ slug: item.slug }}
                    className='overview-soft-card rounded-[20px] px-4 py-4 text-sm transition-colors hover:bg-muted/25'
                  >
                    <div className='font-semibold'>{item.title}</div>
                    <div className='mt-1 leading-6 text-muted-foreground'>
                      {item.description}
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </main>
    </PublicLayout>
  )
}

export function SearchTopicsIndex() {
  const groupedTopics = topicGroups.map((group) => ({
    ...group,
    items: searchPages.filter((item) => group.match(item.slug)),
  }))

  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title='Code Go Topics'
        description='Code Go 关键词专题聚合页，覆盖 Codex API、Claude Code API、Codex 中转、Claude 中转、教程、配置、问题与对比。'
        keywords='Codex API, Codex中转, Claude Code API, Claude中转, Code Go, 教程, 配置, 对比, 报错'
        canonicalPath='/topics'
      />
      <main className='px-6 pb-16 pt-28 md:px-10 md:pt-32'>
        <div className='mx-auto max-w-5xl'>
          <div className='max-w-3xl space-y-4'>
            <div className='inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'>
              <Search className='size-3.5' />
              关键词专题
            </div>
            <h1 className='text-4xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50'>
              Codex API、Claude Code API、Codex 中转、Claude 中转
            </h1>
            <p className='text-base leading-8 text-muted-foreground'>
              这些专题页专门覆盖开发者常搜的关键词，帮助你更快找到 Code Go。
            </p>
            <div className='flex flex-wrap gap-2 pt-1'>
              <div className='ios-pill px-4 py-2 text-sm text-muted-foreground'>核心关键词</div>
              <div className='ios-pill px-4 py-2 text-sm text-muted-foreground'>教程与上手</div>
              <div className='ios-pill px-4 py-2 text-sm text-muted-foreground'>对比与问题</div>
            </div>
          </div>

          <div className='app-page-shell mt-8 rounded-[28px] p-6 md:p-7'>
            <div className='text-sm font-semibold'>你可以从这里开始</div>
            <p className='mt-2 max-w-3xl text-sm leading-7 text-muted-foreground'>
              如果你是第一次进入 Code Go，建议先看核心关键词页；如果你已经在比较或排查问题，可以直接进入教程、对比词和问题词页面。
            </p>
          </div>

          <div className='mt-10 space-y-8'>
            {groupedTopics.map((group) => (
              <section key={group.title} className='space-y-4'>
                <div className='space-y-2'>
                  <div className='app-section-kicker'>Topic Group</div>
                  <h2 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                    {group.title}
                  </h2>
                  <p className='text-sm leading-7 text-muted-foreground'>
                    {group.description}
                  </p>
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                  {group.items.map((item) => (
                    <Link
                      key={item.slug}
                      to='/topics/$slug'
                      params={{ slug: item.slug }}
                      className='app-page-shell rounded-[26px] p-6 transition-colors hover:bg-muted/20'
                    >
                      <div className='text-sm font-semibold'>{item.title}</div>
                      <div className='mt-2 text-sm leading-7 text-muted-foreground'>
                        {item.description}
                      </div>
                      <div className='mt-4 inline-flex items-center gap-1 text-sm font-medium'>
                        查看专题
                        <ArrowRight className='size-4' />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
