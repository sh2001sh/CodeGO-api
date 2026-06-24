import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { api } from '@/lib/api'
import { getLobeIcon } from '@/lib/lobe-icon'
import { MOTION_TRANSITION } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PublicLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'
import {
  countFreeModels,
  getFreeEligibleGroups,
} from '@/features/pricing/lib/model-helpers'
import type { PricingData, PricingModel } from '@/features/pricing/types'

type HomeModel = Pick<PricingModel, 'model_name' | 'vendor_icon' | 'tags'> &
  Partial<Pick<PricingModel, 'enable_groups'>>

const fallbackModels = [
  { model_name: 'GPT-4o', vendor_icon: 'OpenAI', tags: 'multimodal' },
  { model_name: 'Claude-3.5-Sonnet', vendor_icon: 'Claude', tags: 'reasoning' },
  { model_name: 'DeepSeek-V3', vendor_icon: 'DeepSeek', tags: 'code' },
  { model_name: 'Gemini-Pro', vendor_icon: 'Gemini', tags: 'long context' },
  { model_name: 'Qwen-Plus', vendor_icon: 'Qwen', tags: '中文' },
  { model_name: 'Llama-3', vendor_icon: 'Meta', tags: 'open' },
] as HomeModel[]

function getModelTag(modelName: string, tags?: string) {
  const source = `${modelName} ${tags ?? ''}`.toLowerCase()
  if (source.includes('claude')) return 'Claude'
  if (source.includes('codex')) return 'Codex'
  if (source.includes('deepseek') || source.includes('code')) return 'Code'
  if (source.includes('gemini')) return 'Long ctx'
  if (source.includes('gpt')) return 'GPT'
  return 'API'
}

function ModelMarquee({
  models,
  groupRatios,
  reverse,
}: {
  models: HomeModel[]
  groupRatios: Record<string, number>
  reverse?: boolean
}) {
  const loopModels = [...models, ...models, ...models, ...models]

  return (
    <div className='home-marquee-row'>
      <div className={cn('home-marquee-track', reverse && 'is-reverse')}>
        {loopModels.map((model, index) => {
          const freeGroups = model.enable_groups
            ? getFreeEligibleGroups(model as PricingModel, groupRatios)
            : []
          const isFree = freeGroups.length > 0
          return (
            <div
              key={`${model.model_name}-${index}`}
              className={cn('home-model-chip', isFree && 'is-free')}
            >
              <span className='home-model-icon'>
                {model.vendor_icon
                  ? getLobeIcon(model.vendor_icon, 18)
                  : model.model_name.slice(0, 1)}
              </span>
              <span className='truncate font-mono text-sm font-semibold'>
                {model.model_name}
              </span>
              <span className='home-model-tag'>
                {isFree ? 'FREE' : getModelTag(model.model_name, model.tags)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const HERO_STAGGER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
}

const HERO_ITEM: Variants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: MOTION_TRANSITION.slow,
  },
}

const MARQUEE_REVEAL: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: MOTION_TRANSITION.slow,
  },
}

export function BrandHome() {
  const shouldReduceMotion = Boolean(useReducedMotion())
  const { data: pricingData } = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => {
      const res = await api.get<PricingData>('/api/pricing')
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const models = useMemo(() => {
    const source =
      pricingData?.data
        ?.filter(
          (model) =>
            model.model_name &&
            !model.model_name.toLowerCase().includes('embedding')
        )
        .slice(0, 18) ?? []
    return source.length > 0 ? source : fallbackModels
  }, [pricingData])

  const tracks = useMemo(() => {
    const midpoint = Math.ceil(models.length / 2)
    return [models.slice(0, midpoint), models.slice(midpoint)]
  }, [models])

  const groupRatios = pricingData?.group_ratio ?? {}
  const freeCount = pricingData
    ? countFreeModels(pricingData.data, groupRatios)
    : 0

  return (
    <PublicLayout showMainContainer={false}>
      <SiteSeo
        title='Code Go | Codex API、Claude Code API、Codex 中转、Claude 中转'
        description='Code Go 是面向长期 AI Coding 的统一入口，覆盖 Codex API、Claude Code API、Codex中转、Claude中转、免费模型、DeepSeek、GLM、模型广场、价格对比与持续使用工作流。'
        keywords='Code Go, Codex API, Claude Code API, Codex中转, Codex 中转, Claude中转, Claude 中转, codex api中转, claude code api中转, 免费模型, DeepSeek, GLM, AI Coding'
        canonicalPath='/'
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Code Go',
            url: 'https://shu26.cfd',
            logo: 'https://shu26.cfd/logo.png',
            image: 'https://shu26.cfd/logo.png',
            description:
              'Code Go 是面向长期 AI Coding 的统一入口，覆盖 Codex API、Claude Code API、Codex中转、Claude中转与免费模型。',
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Code Go',
            url: 'https://shu26.cfd',
            inLanguage: 'zh-CN',
            description:
              'Code Go 提供 Codex API、Claude Code API、Codex中转、Claude中转与免费模型入口。',
          },
        ]}
      />

      <main className='relative overflow-hidden bg-[#f4ede7] px-3 py-3'>
        <section className='home-immersive-hero'>
          <div className='home-hero-grain' />

          <div className='relative z-10 mx-auto flex min-h-[calc(100svh-1.5rem)] max-w-7xl flex-col px-5 py-10 md:px-10 md:py-12'>
            <div className='flex flex-1 items-center justify-center pt-16 pb-28 text-center md:pt-[4.5rem] md:pb-32'>
              <motion.div
                className='max-w-5xl'
                variants={HERO_STAGGER}
                initial={shouldReduceMotion ? false : 'hidden'}
                animate='visible'
              >
                <motion.h1
                  variants={HERO_ITEM}
                  className='text-[clamp(3.3rem,7.4vw,7.1rem)] leading-[1.1] font-semibold tracking-[-0.04em] text-balance text-slate-950'
                >
                  让 AI Coding
                  <br />
                  的每一步，都算数
                </motion.h1>
                <motion.p
                  variants={HERO_ITEM}
                  className='mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-700/82 md:text-lg'
                >
                  面向 Codex API、Claude Code API、Codex中转、Claude中转，
                  把接入、调用、免费模型试用和持续使用接成同一条主线。
                </motion.p>
                <motion.div
                  variants={HERO_ITEM}
                  className='mt-8 flex flex-wrap justify-center gap-3'
                >
                  <motion.div
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                    transition={MOTION_TRANSITION.fast}
                    className='inline-flex'
                  >
                    <Button
                      size='lg'
                      className='h-12 rounded-full bg-orange-600 px-6 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(217,106,57,0.24)] hover:bg-orange-700'
                      render={
                        <Link to='/sign-in' search={{ redirect: '/keys' }} />
                      }
                    >
                      配置 Key
                      <ArrowRight className='ml-2 size-4' />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                    transition={MOTION_TRANSITION.fast}
                    className='inline-flex'
                  >
                    <Button
                      size='lg'
                      variant='outline'
                      className='h-12 rounded-full border-white/70 bg-white/50 px-6 text-sm font-semibold text-slate-900 backdrop-blur hover:bg-white/70'
                      render={<Link to='/pricing' />}
                    >
                      查看模型
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              className='relative z-10 pb-2'
              variants={MARQUEE_REVEAL}
              initial={shouldReduceMotion ? false : 'hidden'}
              whileInView='visible'
              viewport={{ once: true, margin: '-80px' }}
            >
              <div className='mb-3 flex items-center justify-between gap-4'>
                <div className='text-sm font-semibold text-slate-800'>
                  当前模型储备
                </div>
                {freeCount > 0 ? (
                  <div className='rounded-full border border-emerald-600/18 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700'>
                    {freeCount} FREE
                  </div>
                ) : null}
              </div>
              <div className='home-marquee-shell is-immersive'>
                <ModelMarquee
                  models={tracks[0] ?? fallbackModels}
                  groupRatios={groupRatios}
                />
                <ModelMarquee
                  models={
                    tracks[1]?.length
                      ? tracks[1]
                      : fallbackModels.slice().reverse()
                  }
                  groupRatios={groupRatios}
                  reverse
                />
              </div>
              <div className='mx-auto mt-6 max-w-4xl text-center text-sm leading-7 text-slate-700/78'>
                适合搜索 Codex中转、Claude中转、Codex API、Claude Code API
                的开发者先看模型分组与免费模型，再决定什么时候切到 GPT
                或 Claude。当前也覆盖 DeepSeek、GLM、Kimi、Qwen
                等免费模型入口，方便先完成第一轮整理、改写和轻量代码任务。
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
