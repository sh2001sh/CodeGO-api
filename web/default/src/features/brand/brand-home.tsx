import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Braces,
  ChevronRight,
  Command,
  Flame,
  History,
  Layers3,
  Sparkles,
  TerminalSquare,
  Trophy,
} from 'lucide-react'
import { PublicLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'
import { Button } from '@/components/ui/button'

const searchRoutes = [
  { label: 'Codex API', href: '/topics/codex-api' },
  { label: 'Claude Code API', href: '/topics/claude-code-api' },
  { label: 'Codex 中转', href: '/topics/codex-zhongzhuan' },
  { label: 'Claude 中转', href: '/topics/claude-zhongzhuan' },
]

const keywordSignals = [
  'Codex API',
  'Claude Code API',
  'Codex 中转',
  'Claude 中转',
]

const valuePoints = [
  {
    title: '接入不散',
    text: '把 Codex、Claude Code 和多模型工作流收进同一条主线。',
    icon: Braces,
  },
  {
    title: '节奏不断',
    text: '入口、记录和使用节奏保持连续，不再每次都重新开始。',
    icon: Layers3,
  },
  {
    title: '过程可积累',
    text: '让 AI Coding 从一次调用，变成持续推进、持续解锁的过程。',
    icon: Flame,
  },
]

const quickLinks = [
  {
    title: '专题入口',
    text: '直接进入 Codex API、Claude Code API、教程、配置和问题页。',
    href: '/topics',
  },
  {
    title: '使用说明',
    text: '查看 Code Go 的实际使用方式、工作流入口和页面路径。',
    href: '/guide',
  },
  {
    title: '模型广场',
    text: '继续查看公开模型、能力范围和对应页面。',
    href: '/pricing',
  },
]

const terminalLines = [
  'connect codex workspace',
  'sync claude code context',
  'carry today into tomorrow',
  'unlock next milestone',
]

const brandMoments = [
  '今天的使用，不会在明天归零。',
  '每一次接入，都会变成下一次更顺手的起点。',
  '长期 AI Coding，需要的是连续感，不是临时可用。',
]

const progressItems = [
  {
    label: '接入',
    text: '把 Codex 和 Claude Code 放进同一条主线。',
    icon: Braces,
  },
  {
    label: '记录',
    text: '保留上下文、入口和每天推进过的痕迹。',
    icon: History,
  },
  {
    label: '解锁',
    text: '每次使用都成为下一次更顺手的起点。',
    icon: Trophy,
  },
]

export function BrandHome() {
  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title='Code Go | Codex API、Claude Code API、Codex 中转、Claude 中转'
        description='Code Go 是面向长期 AI Coding 的统一入口，覆盖 Codex API、Claude Code API、Codex 中转、Claude 中转与持续使用工作流。'
        keywords='Code Go, Codex API, Claude Code API, Codex 中转, Claude 中转, codex api中转, claude code api中转, AI Coding'
        canonicalPath='/'
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Code Go',
          url: 'https://shu26.cfd',
          description:
            'Code Go 是面向长期 AI Coding 的统一入口，覆盖 Codex API、Claude Code API、Codex 中转与 Claude 中转。',
        }}
      />

      <main className='relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(217,106,57,0.16),_transparent_28%),radial-gradient(circle_at_85%_16%,_rgba(62,118,210,0.1),_transparent_22%),linear-gradient(180deg,#f4ede7_0%,#efe6de_42%,#eceff3_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(217,106,57,0.14),_transparent_28%),linear-gradient(180deg,#171312_0%,#10151b_100%)]'>
        <section className='px-6 pb-10 pt-24 md:px-10 md:pb-14 md:pt-30'>
          <div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(350px,0.96fr)] lg:items-center'>
            <div className='max-w-3xl space-y-8'>
              <div className='inline-flex items-center gap-2 rounded-full border border-black/8 bg-white/78 px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-slate-700 shadow-sm backdrop-blur md:text-xs dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200'>
                <Sparkles className='size-3.5 text-amber-600' />
                Code Go · Long-run AI Coding
              </div>

              <div className='space-y-4'>
                <h1 className='max-w-4xl text-5xl leading-[1.04] font-semibold tracking-[-0.035em] text-slate-950 text-balance md:text-[5.5rem] md:leading-[1.02] dark:text-slate-50'>
                  让 AI Coding
                  <br />
                  的每一步，都算数
                </h1>
                <p className='max-w-3xl text-[15px] leading-8 text-slate-600 md:text-lg dark:text-slate-300'>
                  面向 Codex API、Claude Code API、Codex 中转、Claude 中转的长期入口，把接入、调用和持续使用接成同一条主线。
                </p>
              </div>

              <div className='flex flex-wrap gap-3 pt-1'>
                <Button
                  size='lg'
                  className='h-12 rounded-full px-6 text-sm font-semibold'
                  render={
                    <Link
                      to='/sign-in'
                      search={{ redirect: '/keys' }}
                    />
                  }
                >
                  立即开始
                  <ArrowRight className='ml-2 size-4' />
                </Button>
                <Button
                  size='lg'
                  variant='outline'
                  className='h-12 rounded-full px-6 text-sm font-semibold'
                  render={<Link to='/topics' />}
                >
                  看专题入口
                </Button>
              </div>

              <div className='grid gap-3 pt-1 sm:grid-cols-[repeat(3,minmax(0,1fr))]'>
                {brandMoments.map((item) => (
                  <div
                    key={item}
                    className='rounded-[22px] border border-black/6 bg-white/72 px-4 py-4 text-sm leading-7 text-slate-600 shadow-[0_10px_30px_rgba(15,20,27,0.05)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className='flex flex-wrap gap-2.5'>
                {keywordSignals.map((item) => (
                  <div
                    key={item}
                    className='inline-flex items-center rounded-full border border-slate-200/80 bg-white/78 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200'
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div className='flex flex-wrap gap-2.5'>
                {searchRoutes.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className='inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/78 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.06]'
                  >
                    {item.label}
                    <ChevronRight className='size-4' />
                  </Link>
                ))}
              </div>
            </div>

            <div className='relative'>
              <div className='absolute inset-0 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_top_left,_rgba(240,138,88,0.26),_transparent_30%),radial-gradient(circle_at_78%_24%,_rgba(217,106,57,0.18),_transparent_32%)] blur-2xl' />
              <div className='rounded-[34px] border border-white/60 bg-[linear-gradient(160deg,rgba(255,248,244,0.96),rgba(250,244,239,0.72))] p-5 shadow-[0_30px_80px_rgba(15,20,27,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(28,19,15,0.94),rgba(15,20,27,0.78))]'>
                <div className='rounded-[28px] border border-black/6 bg-[linear-gradient(180deg,#20130f,#130f11)] p-5 text-slate-100 shadow-[0_16px_44px_rgba(0,0,0,0.28)] dark:border-white/10'>
                  <div className='flex items-center justify-between'>
                    <div className='inline-flex items-center gap-2 text-xs font-medium text-orange-100/80'>
                      <Command className='size-3.5 text-orange-300' />
                      Code Go / Session
                    </div>
                    <div className='inline-flex items-center gap-2 text-xs text-orange-200/70'>
                      <span className='size-2 rounded-full bg-orange-300 terminal-demo-pulse' />
                      ongoing
                    </div>
                  </div>

                  <div className='mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4'>
                    <div className='flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-orange-100/45'>
                      <TerminalSquare className='size-3.5' />
                      Long-run loop
                    </div>
                    <div className='mt-4 rounded-2xl border border-white/6 bg-black/18 px-4 py-3 font-mono text-sm leading-7 text-orange-50/92'>
                      {terminalLines.map((line, index) => (
                        <div
                          key={line}
                          className='landing-animate-fade-up opacity-0'
                          style={{ animationDelay: `${index * 0.9}s` }}
                        >
                          <span className='mr-3 text-orange-300/70'>&gt;</span>
                          {line}
                          {index === terminalLines.length - 1 ? (
                            <span className='terminal-demo-blink ml-1 inline-block text-orange-300'>
                              |
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className='mt-4 rounded-2xl border border-orange-300/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4'>
                    <div className='flex items-center justify-between gap-4'>
                      <div>
                        <div className='text-[11px] uppercase tracking-[0.16em] text-orange-100/45'>
                          Core loop
                        </div>
                        <div className='mt-2 text-lg font-semibold text-orange-50'>
                          连接，记录，解锁
                        </div>
                      </div>
                      <div className='rounded-full border border-orange-300/12 bg-orange-300/8 px-3 py-1 text-xs text-orange-100/70'>
                        Codex + Claude Code
                      </div>
                    </div>

                    <div className='mt-4 space-y-3'>
                      {progressItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <div
                            key={item.label}
                            className='flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-3'
                          >
                            <div className='mt-0.5 inline-flex size-9 items-center justify-center rounded-2xl bg-orange-300/10 text-orange-200'>
                              <Icon className='size-4.5' />
                            </div>
                            <div>
                              <div className='text-sm font-semibold text-orange-50'>
                                {item.label}
                              </div>
                              <p className='mt-1 text-sm leading-6 text-orange-50/66'>
                                {item.text}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='px-6 py-8 md:px-10'>
          <div className='mx-auto grid max-w-7xl gap-4 md:grid-cols-3'>
            {valuePoints.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className='rounded-[28px] border border-black/6 bg-white/78 p-6 shadow-[0_14px_40px_rgba(15,20,27,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04]'
                >
                  <div className='inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-slate-50 dark:bg-white dark:text-slate-950'>
                    <Icon className='size-5' />
                  </div>
                  <div className='mt-5 text-lg font-semibold text-slate-950 dark:text-slate-50'>
                    {item.title}
                  </div>
                  <p className='mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300'>
                    {item.text}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className='px-6 py-10 md:px-10'>
          <div className='mx-auto max-w-7xl rounded-[36px] border border-black/6 bg-[linear-gradient(135deg,rgba(15,20,27,0.96),rgba(28,37,52,0.96))] p-7 text-slate-50 shadow-[0_28px_80px_rgba(15,20,27,0.16)] dark:border-white/10'>
            <div className='grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-end'>
              <div className='space-y-4'>
                <div className='inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-200'>
                  <Flame className='size-3.5 text-amber-400' />
                  Brand line
                </div>
                <h2 className='max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance md:text-4xl'>
                  你找的不是一个
                  <br />
                  临时能用的入口
                </h2>
                <p className='max-w-xl text-sm leading-8 text-slate-300 md:text-base'>
                  如果你搜的是 Codex API、Claude Code API、Codex 中转或 Claude 中转，你真正想找的是一个能持续推进、持续积累、持续解锁的长期入口。
                </p>
              </div>

              <div className='grid gap-3 sm:grid-cols-3'>
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className='rounded-[24px] border border-white/10 bg-white/[0.06] p-5 transition-colors hover:bg-white/[0.1]'
                  >
                    <div className='text-sm font-semibold'>{item.title}</div>
                    <p className='mt-2 text-sm leading-6 text-slate-300'>{item.text}</p>
                    <div className='mt-4 inline-flex items-center gap-2 text-sm text-slate-100'>
                      进入
                      <ArrowRight className='size-4' />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
