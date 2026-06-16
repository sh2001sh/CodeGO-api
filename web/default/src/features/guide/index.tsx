import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpenText,
  Code2,
  Compass,
  FolderKanban,
  ShieldAlert,
  Terminal,
} from 'lucide-react'
import { SiteSeo } from '@/components/seo'
import { Button } from '@/components/ui/button'
import { PublicLayout } from '@/components/layout'
import { guideSections } from './content'

const brandSections = [
  {
    title: '适合 Codex 用户',
    text: '如果你已经把 Codex 用进日常工作，Code Go 可以继续承接这条工作流。',
  },
  {
    title: '适合 Claude Code 用户',
    text: '如果你偏终端、偏任务流，Code Go 可以作为日常调用和记录的入口。',
  },
  {
    title: '一句话介绍',
    text: '让 AI Coding 的每一步，都算数。',
  },
]

function GuideDiagram(props: { title: string; steps: string[] }) {
  return (
    <div className='rounded-2xl border bg-background/70 p-4'>
      <div className='text-sm font-medium text-foreground'>{props.title}</div>
      <div className='mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        {props.steps.map((step, index) => (
          <div key={step} className='relative rounded-2xl border bg-card p-3'>
            <div className='text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase'>
              Step {index + 1}
            </div>
            <div className='mt-2 text-sm font-medium leading-6'>{step}</div>
            {index < props.steps.length - 1 ? (
              <div className='pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 xl:block'>
                <div className='flex size-8 items-center justify-center rounded-full border bg-background shadow-xs'>
                  <ArrowRight className='size-4 text-muted-foreground' />
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function GuideSectionBlock(props: { section: (typeof guideSections)[number] }) {
  const { section } = props

  return (
    <section
      id={section.id}
      className='scroll-mt-24 border-t border-border/50 py-10 first:border-t-0 first:pt-0'
    >
      <div className='grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]'>
        <div className='space-y-5'>
          <div className='space-y-3'>
            <div className='text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground'>
              {section.eyebrow}
            </div>
            <h2 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
              {section.title}
            </h2>
            <p className='text-sm leading-7 text-muted-foreground'>
              {section.summary}
            </p>
          </div>

          {section.steps && section.steps.length > 0 ? (
            <ol className='space-y-3'>
              {section.steps.map((step, index) => (
                <li
                  key={`${section.id}-step-${index}`}
                  className='flex gap-3 text-sm leading-7 text-slate-700 dark:text-slate-300'
                >
                  <span className='mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground'>
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : null}

          {section.diagram_title && section.diagram_steps?.length ? (
            <GuideDiagram
              title={section.diagram_title}
              steps={section.diagram_steps}
            />
          ) : null}

          {section.notes && section.notes.length > 0 ? (
            <div className='rounded-2xl border border-amber-200/70 bg-muted/55 px-4 py-4 dark:border-amber-900/60'>
              <div className='mb-3 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300'>
                <ShieldAlert className='size-4' />
                说明
              </div>
              <ul className='space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300'>
                {section.notes.map((note, index) => (
                  <li key={`${section.id}-note-${index}`}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className='space-y-5'>
          {section.images.map((image) => (
            <figure key={image.src} className='space-y-3'>
              <div className='overflow-hidden rounded-2xl border border-slate-200/80 bg-muted/35 shadow-sm dark:border-slate-800'>
                <img
                  src={image.src}
                  alt={image.alt}
                  className='h-auto w-full object-cover'
                  loading='lazy'
                />
              </div>
              <figcaption className='text-sm leading-6 text-muted-foreground'>
                {image.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Guide() {
  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title='Guide'
        description='Code Go 使用说明与推广指南，覆盖 Codex、Claude Code、AI Coding 长期积累感、平台玩法与实际使用流程。'
        keywords='Code Go guide, Codex, Claude Code, AI Coding, 使用说明, 推广语, 长期积累'
        canonicalPath='/guide'
      />
      <main className='bg-background'>
        <section className='border-b border-border/50 px-6 pb-10 pt-28 md:px-10 md:pb-14 md:pt-32'>
          <div className='mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between'>
            <div className='max-w-3xl space-y-4'>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'>
                <BookOpenText className='size-3.5' />
                前端说明文档
              </div>
              <div className='space-y-3'>
                <h1 className='text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-5xl'>
                  Code Go 使用说明
                </h1>
                <p className='max-w-2xl text-base leading-8 text-muted-foreground md:text-lg'>
                  这里会告诉你怎么开始使用 Code Go，也会告诉你它为什么适合长期做 AI Coding。
                </p>
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-3 lg:min-w-[440px]'>
              <div className='rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800'>
                <div className='text-xs uppercase text-muted-foreground'>章节数量</div>
                <div className='mt-2 text-2xl font-semibold'>
                  {guideSections.length}
                </div>
              </div>
              <div className='rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800'>
                <div className='text-xs uppercase text-muted-foreground'>说明范围</div>
                <div className='mt-2 text-sm font-medium leading-6'>
                  从首页到钱包
                </div>
              </div>
              <div className='rounded-2xl border border-slate-200/70 px-4 py-4 dark:border-slate-800'>
                <div className='text-xs uppercase text-muted-foreground'>玩法文档</div>
                <div className='mt-2 text-sm font-medium leading-6'>
                  宠物、盲盒、套餐
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='px-6 py-8 md:px-10'>
          <div className='mx-auto max-w-7xl'>
            <div className='mb-6 max-w-3xl space-y-3'>
              <div className='inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold'>
                <Terminal className='size-3.5' />
                一句话介绍
              </div>
              <h2 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                为什么这句话适合放在首页
              </h2>
              <p className='text-sm leading-7 text-muted-foreground'>
                因为它直接说明了产品要解决的事：不是只完成一次调用，而是让 AI Coding 持续积累。
              </p>
            </div>
            <div className='grid gap-4 md:grid-cols-3'>
              {brandSections.map((item) => (
                <div key={item.title} className='rounded-3xl border bg-background p-5'>
                <div className='flex items-center gap-2 text-sm font-semibold'>
                  <Code2 className='size-4 text-amber-600' />
                  {item.title}
                </div>
                <p className='mt-2 text-sm leading-7 text-muted-foreground'>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className='px-6 py-8 md:px-10'>
          <div className='mx-auto max-w-7xl rounded-3xl border bg-background p-6'>
            <div className='max-w-3xl space-y-3'>
              <div className='inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold'>
                <Compass className='size-3.5' />
                关键词入口
              </div>
              <h2 className='text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                从搜索词直接进入 Code Go
              </h2>
              <p className='text-sm leading-7 text-muted-foreground'>
                如果你是从 Codex API、Claude Code API、Codex 中转、Claude 中转，或者教程、配置、对比、报错相关关键词进入，可以直接查看专题聚合页。
              </p>
            </div>
            <div className='mt-5 flex flex-wrap gap-3'>
              <Button variant='outline' render={<Link to='/topics' />}>
                查看专题聚合页
                <ArrowRight className='ml-2 size-4' />
              </Button>
              <Button variant='ghost' render={<Link to='/pricing' />}>
                查看模型广场
              </Button>
            </div>
          </div>
        </section>

        <section className='px-6 py-8 md:px-10'>
          <div className='mx-auto grid max-w-7xl gap-10 xl:grid-cols-[240px_minmax(0,1fr)]'>
            <aside className='xl:sticky xl:top-24 xl:self-start'>
              <div className='space-y-4 rounded-2xl border border-slate-200/70 bg-muted/40 p-4 dark:border-slate-800'>
                <div className='flex items-center gap-2 text-sm font-semibold'>
                  <Compass className='size-4' />
                  导航目录
                </div>

                <nav aria-label='使用说明章节目录'>
                  <ul className='space-y-1.5'>
                    {guideSections.map((section) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className='flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground'
                        >
                          <span className='text-[11px] font-semibold uppercase tracking-[0.22em]'>
                            {section.eyebrow}
                          </span>
                          <span>{section.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div className='border-t border-border/60 pt-4 text-sm leading-6'>
                <div className='mb-2 flex items-center gap-2 font-medium'>
                  <FolderKanban className='size-4' />
                    你会看到什么
                  </div>
                  <p className='text-muted-foreground'>
                    这里把套餐、盲盒、宠物和钱包入口分别说明，方便你直接开始使用。
                  </p>
                </div>

                <div className='flex flex-col gap-2 pt-1'>
                  <Button className='w-full' render={<Link to='/sign-up' />}>
                    立即注册
                  </Button>
                  <Button
                    variant='outline'
                    className='w-full'
                    render={<Link to='/pricing' />}
                  >
                    查看模型广场
                  </Button>
                </div>
              </div>
            </aside>

            <div className='min-w-0 space-y-2'>
              {guideSections.map((section) => (
                <GuideSectionBlock key={section.id} section={section} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
