import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpenText,
  Compass,
  FolderKanban,
  ShieldAlert,
} from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { MOTION_TRANSITION } from '@/lib/motion'
import { SiteSeo } from '@/components/seo'
import { getPublicPageSeoEntry } from '@/lib/public-page-seo'
import { Button } from '@/components/ui/button'
import { PublicLayout } from '@/components/layout'
import { guideSections } from './content'

const guideSeo = getPublicPageSeoEntry('/guide')

const SECTION_REVEAL: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: MOTION_TRANSITION.slow },
}

function GuideDiagram(props: { title: string; steps: string[] }) {
  return (
    <div className='overview-soft-card p-4'>
      <div className='text-sm font-medium text-foreground'>{props.title}</div>
      <div className='mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        {props.steps.map((step, index) => (
          <div key={step} className='relative rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm'>
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
  const shouldReduceMotion = Boolean(useReducedMotion())

  return (
    <motion.section
      id={section.id}
      className='scroll-mt-24 border-t border-border/50 py-10 first:border-t-0 first:pt-0'
      variants={SECTION_REVEAL}
      initial={shouldReduceMotion ? false : 'hidden'}
      whileInView='visible'
      viewport={{ once: true, margin: '-60px' }}
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
                  <span className='mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background'>
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
            <div className='rounded-2xl border border-amber-400/25 bg-amber-50/60 px-5 py-4 shadow-[0_0_0_1px_rgba(245,158,11,0.06)_inset] dark:border-amber-700/25 dark:bg-amber-950/20'>
              <div className='mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400'>
                <ShieldAlert className='size-4' />
                说明
              </div>
              <ul className='space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-300'>
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
              <div className='overflow-hidden rounded-2xl border border-border/60 bg-muted/35 shadow-[0_2px_12px_rgba(24,32,43,0.06)] transition-shadow hover:shadow-[0_4px_20px_rgba(24,32,43,0.1)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.24)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.32)]'>
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
    </motion.section>
  )
}

export function Guide() {
  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title={guideSeo.title}
        description={guideSeo.description}
        keywords={guideSeo.keywords}
        canonicalPath={guideSeo.path}
      />
      <main className='bg-background'>
        <section className='relative overflow-hidden border-b border-border/50 px-6 pb-10 pt-28 md:px-10 md:pb-14 md:pt-32'>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent)]' />
          <div className='mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between'>
            <div className='max-w-3xl space-y-4'>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'>
                <BookOpenText className='size-3.5' />
                {guideSeo.eyebrow}
              </div>
              <div className='space-y-3'>
                <h1 className='text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-5xl'>
                  {guideSeo.h1}
                </h1>
                <p className='max-w-2xl text-base leading-8 text-muted-foreground md:text-lg'>
                  {guideSeo.intro}
                </p>
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-3 lg:min-w-[440px]'>
              <div className='overview-soft-card px-4 py-4'>
                <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>章节数量</div>
                <div className='mt-2 text-2xl font-semibold'>
                  {guideSections.length}
                </div>
              </div>
              <div className='overview-soft-card px-4 py-4'>
                <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>说明范围</div>
                <div className='mt-2 text-sm font-medium leading-6'>
                  从首页到钱包
                </div>
              </div>
              <div className='overview-soft-card px-4 py-4'>
                <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>玩法文档</div>
                <div className='mt-2 text-sm font-medium leading-6'>
                  宠物、盲盒、套餐
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='px-6 py-8 md:px-10'>
          <div className='mx-auto grid max-w-7xl gap-10 xl:grid-cols-[240px_minmax(0,1fr)]'>
            <aside className='xl:sticky xl:top-24 xl:self-start'>
              <div className='overview-glass-card space-y-4 rounded-2xl p-4'>
                <div className='flex items-center gap-2 text-sm font-semibold'>
                  <Compass className='size-4' />
                  导航目录
                </div>

                <nav aria-label='使用说明章节目录'>
                  <ul className='space-y-1'>
                    {guideSections.map((section) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className='flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground'
                        >
                          <span className='text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60'>
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
