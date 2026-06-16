import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  Code2,
  Flame,
  GitBranch,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'
import { Button } from '@/components/ui/button'

const principles = [
  {
    title: '每次使用，都有痕迹',
    text: '调用、记录、反馈和升级会持续沉淀下来。',
  },
  {
    title: '适合长期使用',
    text: '更适合把 AI Coding 当成日常工作的一部分。',
  },
  {
    title: '一条路径接入多模型',
    text: 'Codex、Claude Code、OpenAI 等模型可以放在同一套工作流里。',
  },
]

const contentBlocks = [
  {
    title: '一句话',
    text: '让 AI Coding 的每一步，都算数。',
  },
  {
    title: '你会得到什么',
    text: '更稳定的调用方式、更清楚的额度管理和更持续的使用记录。',
  },
  {
    title: '适合什么人',
    text: '适合长期使用 Codex、Claude Code 和多模型工作流的开发者。',
  },
]

const promoTargets = [
  {
    title: 'Codex 用户',
    text: '适合需要稳定调用、持续记录和长期使用感的代码助手用户。',
  },
  {
    title: 'Claude Code 用户',
    text: '适合偏终端工作流、注重效率与连续反馈的重度开发者。',
  },
  {
    title: 'AI Coding 团队',
    text: '适合把调用、成本、增长和成就感统一管理的团队。',
  },
]

export function BrandHome() {
  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title='Code Go'
        description='让 AI Coding 的每一步，都算数。Code Go 把持续使用、成就进度和开发者工作流放在一起。'
        keywords='Code Go, AI Coding, Codex, Claude Code, 长期积累, 成就感, 开发者工具, AI API'
        canonicalPath='/'
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Code Go',
          url: 'https://shu26.cfd',
          description:
            '让 AI Coding 的每一步，都算数。一个面向开发者的持续积累型 AI 平台。',
        }}
      />

      <main className='relative overflow-hidden'>
        <section className='px-6 pb-12 pt-28 md:px-10 md:pb-16 md:pt-32'>
          <div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-end'>
            <div className='max-w-3xl space-y-6'>
              <div className='inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'>
                <Sparkles className='size-3.5' />
                AI Coding · 长期积累感
              </div>
              <div className='space-y-4'>
                <h1 className='text-4xl font-semibold tracking-tight text-slate-950 text-balance dark:text-slate-50 md:text-6xl'>
                  让 AI Coding 的每一步，<br />
                  都算数
                </h1>
                <p className='max-w-2xl text-base leading-8 text-muted-foreground md:text-lg'>
                  Code Go 让 AI Coding 不只是完成任务，也能持续积累、持续解锁、持续变强。
                </p>
              </div>
              <div className='flex flex-wrap gap-3'>
                <Button render={<Link to='/guide' />}>
                  查看使用说明
                  <ArrowRight className='ml-2 size-4' />
                </Button>
                <Button variant='outline' render={<Link to='/pricing' />}>
                  查看模型广场
                </Button>
              </div>
            </div>

            <div className='rounded-[28px] border border-border bg-background/80 p-6 shadow-sm backdrop-blur'>
              <div className='space-y-4'>
                <div className='flex items-center gap-2 text-sm font-semibold'>
                  <Code2 className='size-4 text-amber-600' />
                  快速了解
                </div>
                {contentBlocks.map((item) => (
                  <div key={item.title} className='rounded-2xl border bg-muted/30 p-4'>
                    <div className='text-sm font-medium'>{item.title}</div>
                    <div className='mt-1 text-sm leading-6 text-muted-foreground'>
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className='px-6 py-10 md:px-10'>
          <div className='mx-auto grid max-w-7xl gap-4 md:grid-cols-3'>
            {principles.map((item) => (
              <div key={item.title} className='rounded-3xl border bg-background p-5'>
                <div className='text-sm font-semibold'>{item.title}</div>
                <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className='px-6 py-10 md:px-10'>
          <div className='mx-auto max-w-7xl'>
            <div className='grid gap-4 md:grid-cols-3'>
              {promoTargets.map((item) => (
                <div key={item.title} className='rounded-3xl border bg-background p-5'>
                  <div className='flex items-center gap-2 text-sm font-semibold'>
                    <GitBranch className='size-4 text-sky-600' />
                    {item.title}
                  </div>
                  <div className='mt-2 text-sm leading-6 text-muted-foreground'>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
            <div className='mt-6 rounded-3xl border bg-muted/25 p-5'>
              <div className='flex items-center gap-2 text-sm font-semibold'>
                <Flame className='size-4 text-amber-600' />
                推荐介绍语
              </div>
              <p className='mt-2 max-w-3xl text-sm leading-7 text-muted-foreground'>
                Code Go，让 AI Coding 的每一步都算数。
              </p>
            </div>
          </div>
        </section>

        <section className='px-6 py-10 md:px-10'>
          <div className='mx-auto grid max-w-7xl gap-4 lg:grid-cols-2'>
            <div className='rounded-3xl border bg-background p-6'>
              <div className='flex items-center gap-2 text-sm font-semibold'>
                <TimerReset className='size-4 text-emerald-600' />
                适合的内容方向
              </div>
              <ul className='mt-4 space-y-3 text-sm leading-6 text-muted-foreground'>
                <li>Codex / Claude Code 接入与使用教程</li>
                <li>AI Coding 工作流记录、复盘与积累</li>
                <li>模型、额度、成本和成长记录</li>
              </ul>
            </div>
            <div className='rounded-3xl border bg-background p-6'>
              <div className='flex items-center gap-2 text-sm font-semibold'>
                <BookOpen className='size-4 text-violet-600' />
                适合放在哪
              </div>
              <p className='mt-4 text-sm leading-7 text-muted-foreground'>
                首页、关于页、FAQ、使用说明和社媒简介，都可以直接用这句主张。
              </p>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
