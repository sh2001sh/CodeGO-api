import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Compass,
  Layers3,
  Search,
  Sparkles,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'
import { getSearchPageBySlug, searchPages } from './data'

const topicGroups = [
  {
    title: '核心入口',
    description:
      '覆盖 Codex API、Claude Code API、Codex 中转、Claude 中转等主搜索词。',
    match: (slug: string) =>
      [
        'codex-api',
        'codex-zhongzhuan',
        'claude-code-api',
        'claude-zhongzhuan',
        'ai-api-zhongzhuan',
      ].includes(slug),
  },
  {
    title: '接入教程',
    description: '覆盖教程、上手、配置、怎么用、怎么接等高频入门词。',
    match: (slug: string) =>
      /jiaocheng|shangshou|jinjie|peizhi|zenme-yong|zenme-jie/.test(slug),
  },
  {
    title: '比较与排障',
    description: '覆盖区别、怎么选、稳定吗、报错怎么办等决策与问题词。',
    match: (slug: string) =>
      /vs|zenme-xuan|wending-ma|baocuo-zenmeban/.test(slug),
  },
]

const topicEntryLinks = [
  { label: '回到首页', to: '/' as const },
  { label: '查看模型', to: '/pricing' as const },
  { label: '使用教程', to: '/guide' as const },
]

function slugToLabel(slug: string) {
  return slug.replaceAll('-', ' / ')
}

function buildTopicTitle(page: {
  seoTitle: string
  title: string
  slug: string
}) {
  return page.seoTitle.includes('Code Go')
    ? page.seoTitle
    : `${page.seoTitle} | Code Go`
}

function buildTopicDescription(page: {
  description: string
  title: string
  intro: string
}) {
  return `${page.description} ${page.intro}`.trim()
}

const TOPICS_INDEX_TITLE =
  'Codex API、Claude Code API、Codex 中转、Claude 中转专题页 | Code Go'
const TOPICS_INDEX_DESCRIPTION =
  'Code Go 专题页汇总，覆盖 Codex API、Claude Code API、Codex 中转、Claude 中转、教程、配置、排障与模型选择。'

function topicKeywordsList(keywords: string) {
  return keywords
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
}

function TopicShell(props: {
  title: string
  description: string
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <main className='public-topbar-spacer px-4 pb-12 sm:px-6 sm:pb-16 xl:px-8'>
      <div className='mx-auto max-w-7xl'>
        <section className='border-border/70 bg-card/80 rounded-[28px] border px-6 py-8 shadow-[0_18px_50px_rgba(15,20,27,0.08)] backdrop-blur sm:px-8 sm:py-10'>
          <div className='border-border/80 bg-background/90 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-200'>
            <Sparkles className='text-primary size-3.5' />
            {props.eyebrow}
          </div>
          <h1 className='mt-5 max-w-5xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl dark:text-slate-50'>
            {props.title}
          </h1>
          <p className='mt-4 max-w-4xl text-[15px] leading-8 text-slate-600 sm:text-base dark:text-slate-300'>
            {props.description}
          </p>
          <div className='mt-6 flex flex-wrap gap-2.5'>
            {topicEntryLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className='border-border/80 bg-background/90 hover:bg-background inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-slate-700 transition-colors dark:text-slate-200 dark:hover:bg-white/[0.04]'
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
        <div className='mt-6'>{props.children}</div>
      </div>
    </main>
  )
}

function TopicIndexCard(props: {
  title: string
  description: string
  slug: string
}) {
  return (
    <Link
      to='/topics/$slug'
      params={{ slug: props.slug }}
      className='group border-border/70 bg-card/78 hover:border-primary/30 dark:bg-card/72 rounded-[20px] border p-5 shadow-[0_10px_28px_rgba(15,20,27,0.05)] transition-transform duration-200 hover:-translate-y-0.5'
    >
      <div className='bg-primary/12 text-primary inline-flex size-10 items-center justify-center rounded-2xl'>
        <Search className='size-4.5' />
      </div>
      <div className='mt-5 text-base font-semibold text-slate-950 dark:text-slate-50'>
        {props.title}
      </div>
      <p className='text-muted-foreground mt-2 text-sm leading-7'>
        {props.description}
      </p>
      <div className='mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100'>
        查看专题
        <ArrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
      </div>
    </Link>
  )
}

function TopicAnchorCard(props: {
  title: string
  description: string
  href: string
  index: number
}) {
  return (
    <a
      href={props.href}
      className='border-border/70 bg-background/85 hover:border-primary/30 hover:bg-background rounded-[18px] border px-4 py-4 transition-colors'
    >
      <div className='text-primary text-[12px] font-semibold'>
        {String(props.index).padStart(2, '0')}
      </div>
      <div className='mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50'>
        {props.title}
      </div>
      <p className='text-muted-foreground mt-1 text-sm leading-6'>
        {props.description}
      </p>
    </a>
  )
}

export function SearchPage(props: { slug: string }) {
  const page = getSearchPageBySlug(props.slug)

  if (!page) {
    return (
      <PublicLayout showMainContainer={false}>
        <TopicShell
          eyebrow='Topic / Missing'
          title='未找到对应专题'
          description='该专题可能不存在，或者当前链接已经变更。你可以先回到专题页总入口，或者直接查看模型与教程。'
        >
          <section className='grid gap-4 md:grid-cols-3'>
            <TopicIndexCard
              title='专题入口'
              description='回到专题页总入口。'
              slug='codex-api'
            />
            <Link
              to='/pricing'
              className='border-border/70 bg-card/78 rounded-[20px] border p-5 shadow-[0_10px_28px_rgba(15,20,27,0.05)]'
            >
              <div className='bg-primary/12 text-primary inline-flex size-10 items-center justify-center rounded-2xl'>
                <Layers3 className='size-4.5' />
              </div>
              <div className='mt-5 text-base font-semibold text-slate-950 dark:text-slate-50'>
                查看模型
              </div>
              <p className='text-muted-foreground mt-2 text-sm leading-7'>
                继续浏览免费模型、Claude、GPT 与相关价格结构。
              </p>
            </Link>
            <Link
              to='/guide'
              className='border-border/70 bg-card/78 rounded-[20px] border p-5 shadow-[0_10px_28px_rgba(15,20,27,0.05)]'
            >
              <div className='bg-info/12 text-info inline-flex size-10 items-center justify-center rounded-2xl'>
                <BookOpen className='size-4.5' />
              </div>
              <div className='mt-5 text-base font-semibold text-slate-950 dark:text-slate-50'>
                查看教程
              </div>
              <p className='text-muted-foreground mt-2 text-sm leading-7'>
                从平台说明、模型选择到配置步骤继续往下看。
              </p>
            </Link>
          </section>
        </TopicShell>
      </PublicLayout>
    )
  }

  const keywordList = topicKeywordsList(page.keywords)
  const relatedPages = searchPages
    .filter((item) => item.slug !== page.slug)
    .slice(0, 6)

  return (
    <PublicLayout
      showMainContainer={false}
      showNotifications={false}
      showThemeSwitch={false}
    >
      <SiteSeo
        title={buildTopicTitle(page)}
        description={buildTopicDescription(page)}
        keywords={page.keywords}
        canonicalPath={`/topics/${page.slug}`}
        ogType='article'
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Code Go',
                item: 'https://shu26.cfd/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: '专题页',
                item: 'https://shu26.cfd/topics',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: page.title,
                item: `https://shu26.cfd/topics/${page.slug}`,
              },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: buildTopicTitle(page),
            description: buildTopicDescription(page),
            inLanguage: 'zh-CN',
            mainEntityOfPage: `https://shu26.cfd/topics/${page.slug}`,
            keywords: page.keywords,
            author: { '@type': 'Organization', name: 'Code Go' },
            publisher: { '@type': 'Organization', name: 'Code Go' },
          },
          {
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
          },
        ]}
      />

      <TopicShell
        eyebrow={`Topic / ${slugToLabel(page.slug)}`}
        title={page.hero}
        description={page.intro}
      >
        <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]'>
          <div className='space-y-5'>
            <section className='grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]'>
              <div className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
                <div className='text-primary text-[12px] font-semibold tracking-wide'>
                  本页适合谁
                </div>
                <h2 className='mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                  先理解关键词，再决定下一步看哪里
                </h2>
                <p className='text-muted-foreground mt-4 text-sm leading-7'>
                  这一页不是单纯堆 SEO
                  文案，而是把“这个词为什么会被搜索、用户真正想解决什么、进入
                  Code Go
                  后应该先看哪里”讲清楚。你可以先通读，再根据目录进入对应章节。
                </p>
                <div className='mt-5 flex flex-wrap gap-2'>
                  {keywordList.map((item) => (
                    <span
                      key={item}
                      className='border-border/70 bg-background/85 inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200'
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
                <div className='text-primary text-[12px] font-semibold tracking-wide'>
                  快速入口
                </div>
                <div className='mt-4 space-y-3'>
                  <Link
                    to='/pricing'
                    className='border-border/70 bg-background/85 hover:border-primary/30 flex items-start justify-between rounded-[18px] border px-4 py-4 transition-colors'
                  >
                    <div>
                      <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                        查看模型
                      </div>
                      <div className='text-muted-foreground mt-1 text-sm leading-6'>
                        先看免费模型、Claude、GPT 与可用模型分组。
                      </div>
                    </div>
                    <ChevronRight className='text-muted-foreground mt-0.5 size-4' />
                  </Link>
                  <Link
                    to='/guide'
                    className='border-border/70 bg-background/85 hover:border-primary/30 flex items-start justify-between rounded-[18px] border px-4 py-4 transition-colors'
                  >
                    <div>
                      <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                        查看教程
                      </div>
                      <div className='text-muted-foreground mt-1 text-sm leading-6'>
                        从接入、配置到使用路径继续往下看。
                      </div>
                    </div>
                    <ChevronRight className='text-muted-foreground mt-0.5 size-4' />
                  </Link>
                  <Link
                    to='/'
                    className='border-border/70 bg-background/85 hover:border-primary/30 flex items-start justify-between rounded-[18px] border px-4 py-4 transition-colors'
                  >
                    <div>
                      <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                        回到首页
                      </div>
                      <div className='text-muted-foreground mt-1 text-sm leading-6'>
                        查看入口概览、公告与核心功能导航。
                      </div>
                    </div>
                    <ChevronRight className='text-muted-foreground mt-0.5 size-4' />
                  </Link>
                </div>
              </div>
            </section>

            <section className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
              <div className='text-primary flex items-center gap-2 text-[12px] font-semibold tracking-wide'>
                <Compass className='size-3.5' />
                页面目录
              </div>
              <div className='mt-4 grid gap-3 md:grid-cols-2'>
                {page.sections.map((section, index) => (
                  <TopicAnchorCard
                    key={section.heading}
                    title={section.heading}
                    description={section.paragraphs[0] || page.intro}
                    href={`#section-${index + 1}`}
                    index={index + 1}
                  />
                ))}
              </div>
            </section>

            {page.sections.map((section, index) => (
              <section
                key={section.heading}
                id={`section-${index + 1}`}
                className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)] sm:p-7'
              >
                <div className='text-primary text-[12px] font-semibold tracking-wide'>
                  第 {index + 1} 节
                </div>
                <h2 className='mt-3 text-[1.7rem] font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                  {section.heading}
                </h2>
                <div className='mt-5 space-y-4'>
                  {section.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className='text-muted-foreground max-w-[72ch] text-[15px] leading-8'
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)] sm:p-7'>
              <div className='text-primary text-[12px] font-semibold tracking-wide'>
                常见问题
              </div>
              <h2 className='mt-3 text-[1.7rem] font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                FAQ
              </h2>
              <div className='mt-5 space-y-3'>
                {page.faq.map((item) => (
                  <div
                    key={item.question}
                    className='border-border/70 bg-background/88 rounded-[18px] border px-5 py-5'
                  >
                    <div className='text-base font-semibold text-slate-950 dark:text-slate-50'>
                      {item.question}
                    </div>
                    <p className='text-muted-foreground mt-2 text-sm leading-7'>
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className='space-y-5'>
            <section className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
              <div className='text-primary text-[12px] font-semibold tracking-wide'>
                本页定位
              </div>
              <ul className='text-muted-foreground mt-4 space-y-3 text-sm leading-7'>
                <li>承接搜索进入后的第一轮解释，而不是只做标题占位。</li>
                <li>帮用户快速看清这个关键词对应的任务、模型和下一步路径。</li>
                <li>让首页、教程页、模型页与专题页形成顺序阅读链路。</li>
              </ul>
            </section>

            <section className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
              <div className='text-primary text-[12px] font-semibold tracking-wide'>
                下一步
              </div>
              <div className='mt-4 space-y-3'>
                <Link
                  to='/pricing'
                  className='border-border/70 bg-background/85 hover:border-primary/30 block rounded-[18px] border px-4 py-4 transition-colors'
                >
                  <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                    查看模型
                  </div>
                  <div className='text-muted-foreground mt-1 text-sm leading-6'>
                    先看免费模型，再决定是否切到 GPT 或 Claude。
                  </div>
                </Link>
                <Link
                  to='/guide'
                  className='border-border/70 bg-background/85 hover:border-primary/30 block rounded-[18px] border px-4 py-4 transition-colors'
                >
                  <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                    查看使用教程
                  </div>
                  <div className='text-muted-foreground mt-1 text-sm leading-6'>
                    从配置、接入到长期工作流进一步理解。
                  </div>
                </Link>
              </div>
            </section>

            <section className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
              <div className='text-primary text-[12px] font-semibold tracking-wide'>
                相关专题
              </div>
              <div className='mt-4 space-y-3'>
                {relatedPages.map((item) => (
                  <Link
                    key={item.slug}
                    to='/topics/$slug'
                    params={{ slug: item.slug }}
                    className='border-border/70 bg-background/85 hover:border-primary/30 block rounded-[18px] border px-4 py-4 transition-colors'
                  >
                    <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                      {item.title}
                    </div>
                    <div className='text-muted-foreground mt-1 text-sm leading-6'>
                      {item.description}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </TopicShell>
    </PublicLayout>
  )
}

export function SearchTopicsIndex() {
  const groupedTopics = topicGroups
    .map((group) => ({
      ...group,
      items: searchPages.filter((item) => group.match(item.slug)),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <PublicLayout
      showMainContainer={false}
      showNotifications={false}
      showThemeSwitch={false}
    >
      <SiteSeo
        title={TOPICS_INDEX_TITLE}
        description={TOPICS_INDEX_DESCRIPTION}
        keywords='Codex API, Claude Code API, Codex中转, Claude中转, AI API 中转, 教程, 配置, 排障, Code Go'
        canonicalPath='/topics'
        ogType='website'
      />

      <TopicShell
        eyebrow='Topic / Index'
        title='Codex API、Claude Code API、Codex 中转、Claude 中转专题页'
        description='这是 Code Go 的专题页总入口。适合从搜索直接进入的用户先看清关键词含义、适用场景、教程入口和模型选择路径，再决定下一步去模型页还是教程页。'
      >
        <section className='grid gap-4 md:grid-cols-3'>
          <div className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
            <div className='bg-primary/12 text-primary inline-flex size-10 items-center justify-center rounded-2xl'>
              <Search className='size-4.5' />
            </div>
            <h2 className='mt-5 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
              搜索进入后先看什么
            </h2>
            <p className='text-muted-foreground mt-3 text-sm leading-7'>
              先看专题页，把词义、模型、价格路径和教程入口理顺，再进入更具体的页面。
            </p>
          </div>
          <div className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
            <div className='bg-info/12 text-info inline-flex size-10 items-center justify-center rounded-2xl'>
              <Compass className='size-4.5' />
            </div>
            <h2 className='mt-5 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
              看目录再做选择
            </h2>
            <p className='text-muted-foreground mt-3 text-sm leading-7'>
              按核心入口、接入教程、比较与排障三类组织，减少用户第一次进入时的判断成本。
            </p>
          </div>
          <div className='border-border/70 bg-card/80 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)]'>
            <div className='inline-flex size-10 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-600 dark:text-violet-300'>
              <BookOpen className='size-4.5' />
            </div>
            <h2 className='mt-5 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
              专题页不是终点
            </h2>
            <p className='text-muted-foreground mt-3 text-sm leading-7'>
              每一页都要把用户带回模型广场、教程页或首页，而不是停在一堆关键词里。
            </p>
          </div>
        </section>

        <section className='border-border/70 bg-card/80 mt-5 rounded-[24px] border p-6 shadow-[0_12px_32px_rgba(15,20,27,0.06)] sm:p-7'>
          <div className='text-primary text-[12px] font-semibold tracking-wide'>
            专题导航
          </div>
          <h2 className='mt-3 text-[1.7rem] font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
            按搜索意图进入
          </h2>
          <p className='text-muted-foreground mt-3 max-w-[72ch] text-[15px] leading-8'>
            如果你搜的是具体模型与中转词，先看核心入口；如果你搜的是教程、配置、怎么用，先看接入教程；如果你在比较或者排查问题，直接进入比较与排障。
          </p>
        </section>

        <div className='mt-5 space-y-8'>
          {groupedTopics.map((group) => (
            <section key={group.title} className='space-y-4'>
              <div>
                <div className='text-primary text-[12px] font-semibold tracking-wide'>
                  Topic Group
                </div>
                <h2 className='mt-2 text-[1.7rem] font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                  {group.title}
                </h2>
                <p className='text-muted-foreground mt-2 max-w-[72ch] text-[15px] leading-8'>
                  {group.description}
                </p>
              </div>

              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                {group.items.map((item) => (
                  <TopicIndexCard
                    key={item.slug}
                    title={item.title}
                    description={item.description}
                    slug={item.slug}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </TopicShell>
    </PublicLayout>
  )
}
