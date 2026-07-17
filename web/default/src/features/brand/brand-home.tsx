import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, KeyRound, LayoutGrid, Zap } from 'lucide-react'
import { motion, useReducedMotion, type Variants } from 'motion/react'
import { getLobeIcon } from '@/lib/lobe-icon'
import { MOTION_TRANSITION } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/layout/components/footer'
import { PublicLayout } from '@/components/layout'
import { SiteSeo } from '@/components/seo'
import { getPricing } from '@/features/pricing/api'
import {
  countFreeModels,
  getFreeEligibleGroups,
} from '@/features/pricing/lib/model-helpers'
import type { PricingModel } from '@/features/pricing/types'

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
  if (source.includes('deepseek') || source.includes('code')) return '代码'
  if (source.includes('gemini')) return '长上下文'
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
                {isFree ? '免费' : getModelTag(model.model_name, model.tags)}
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

const featureHighlights = [
  {
    icon: KeyRound,
    title: '一个密钥，全部模型',
    desc: '接入 Codex API、Claude Code API 等主流模型，无需为每家服务商单独申请密钥。',
  },
  {
    icon: Zap,
    title: '按量计费，无隐藏成本',
    desc: '统一计费口径与实时用量看板，配额、日志和账单随时可查。',
  },
  {
    icon: LayoutGrid,
    title: '模型广场，随时比价',
    desc: '在同一个界面比较模型能力与价格，按场景切换而不锁定单一供应商。',
  },
] as const

export function BrandHome() {
  const shouldReduceMotion = Boolean(useReducedMotion())
  const { data: pricingData } = useQuery({
    queryKey: ['pricing'],
    queryFn: getPricing,
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
            logo: 'https://shu26.cfd/code-go-logo.svg',
            image: 'https://shu26.cfd/code-go-logo.svg',
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

      <main className='bg-background relative overflow-hidden'>
        <section className='relative px-5 py-10 md:px-10 md:py-12'>
          <div className='mx-auto flex max-w-7xl flex-col px-0 py-10 md:py-16'>
            <div className='flex flex-1 items-center justify-center pb-20 text-center md:pb-24'>
              <motion.div
                className='max-w-4xl'
                variants={HERO_STAGGER}
                initial={shouldReduceMotion ? false : 'hidden'}
                animate='visible'
              >
                <motion.h1
                  variants={HERO_ITEM}
                  className='text-foreground text-[clamp(2.6rem,5.6vw,4.6rem)] leading-[1.12] font-semibold tracking-[-0.03em] text-balance'
                >
                  让 AI 编程
                  <br />
                  的每一步，都算数
                </motion.h1>
                <motion.p
                  variants={HERO_ITEM}
                  className='text-muted-foreground mx-auto mt-6 max-w-2xl text-base leading-8 md:text-lg'
                >
                  面向 Codex API、Claude Code API、Codex中转、Claude中转，
                  把接入、调用、免费模型试用和持续使用接成同一条主线。
                </motion.p>
                <motion.div
                  variants={HERO_ITEM}
                  className='mt-8 flex flex-wrap items-center justify-center gap-3'
                >
                  <motion.div
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.02 }
                    }
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    transition={MOTION_TRANSITION.fast}
                    className='inline-flex'
                  >
                    <Button
                      size='lg'
                      className='h-11 rounded-full px-6 text-sm font-semibold'
                      render={
                        <Link to='/sign-in' search={{ redirect: '/keys' }} />
                      }
                    >
                      配置密钥
                      <ArrowRight className='ml-2 size-4' />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.02 }
                    }
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                    transition={MOTION_TRANSITION.fast}
                    className='inline-flex'
                  >
                    <Button
                      size='lg'
                      variant='outline'
                      className='h-11 rounded-full px-6 text-sm font-semibold'
                      render={<Link to='/pricing' />}
                    >
                      查看模型
                    </Button>
                  </motion.div>
                  <Button
                    size='lg'
                    variant='ghost'
                    className='h-11 rounded-full px-4 text-sm font-medium'
                    render={<Link to='/download' />}
                  >
                    下载桌面端
                  </Button>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              variants={MARQUEE_REVEAL}
              initial={shouldReduceMotion ? false : 'hidden'}
              whileInView='visible'
              viewport={{ once: true, margin: '-80px' }}
            >
              <div className='mb-4 flex items-center justify-between gap-4'>
                <div className='flex items-center gap-2'>
                  <div className='bg-success h-1.5 w-1.5 rounded-full' />
                  <div className='text-foreground text-sm font-semibold'>
                    当前模型储备
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  {models.length > 0 ? (
                    <div className='border-border/60 bg-muted text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium'>
                      {models.length}+ 个模型
                    </div>
                  ) : null}
                  {freeCount > 0 ? (
                    <div className='border-success/20 bg-success/10 text-success rounded-full border px-2.5 py-1 text-xs font-medium'>
                      {freeCount} 个免费
                    </div>
                  ) : null}
                </div>
              </div>
              <div className='home-marquee-shell'>
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
              <div className='text-muted-foreground mx-auto mt-6 max-w-4xl text-center text-sm leading-7'>
                面向 Codex、Claude Code 等 AI
                编程工作流，覆盖接入、调用与持续使用的完整链路。
              </div>
            </motion.div>
          </div>
        </section>

        <section className='mx-auto max-w-7xl px-5 pb-16 md:px-10 md:pb-24'>
          <div className='grid gap-4 md:grid-cols-3'>
            {featureHighlights.map((feature) => (
              <div key={feature.title} className='home-feature-panel'>
                <div className='home-feature-icon'>
                  <feature.icon className='size-5' />
                </div>
                <div className='text-foreground mt-4 text-base font-semibold'>
                  {feature.title}
                </div>
                <div className='text-muted-foreground mt-2 text-sm leading-6'>
                  {feature.desc}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </PublicLayout>
  )
}
