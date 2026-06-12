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
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Gift,
  PackageOpen,
  ShoppingBag,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { MOTION_TRANSITION } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type PromoTheme = {
  frame: string
  eyebrow: string
  title: string
  body: string
  chip: string
  iconTile: string
  cta: string
  glow: string
  rail: string
}

type ActivityPromoItem = {
  id: string
  eyebrow: string
  title: string
  description: string
  sideTitle: string
  sideDescription: string
  to: '/blind-box' | '/point-mall'
  ctaLabel: string
  icon: LucideIcon
  tags: Array<{
    label: string
    icon: LucideIcon
  }>
  theme: PromoTheme
}

const AUTO_ROTATE_MS = 5000

const PROMO_ITEMS: ActivityPromoItem[] = [
  {
    id: 'blind-box',
    eyebrow: '盲盒活动',
    title: '低门槛开盲盒，直接拿额度和订阅大奖',
    description:
      '盲盒活动把短期额度、保底机制和订阅大奖放在同一个入口处理，适合想快速补充额度、顺手搏一次高奖池的用户。',
    sideTitle: '付款、开奖、保底进度都在同一个入口',
    sideDescription:
      '进入盲盒页后可以直接选择数量、查看奖池、查询最近掉落和当前保底进度，不需要再跳转到钱包里的其他模块。',
    to: '/blind-box',
    ctaLabel: '去开盲盒',
    icon: PackageOpen,
    tags: [
      { label: '额度掉落', icon: Sparkles },
      { label: '保底机制', icon: Trophy },
      { label: '订阅大奖', icon: Gift },
    ],
    theme: {
      frame:
        'border-rose-200 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_24%),linear-gradient(145deg,rgba(255,241,242,0.98),rgba(255,247,237,0.98),rgba(255,255,255,0.98))] dark:border-rose-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(251,146,60,0.14),transparent_24%),linear-gradient(145deg,rgba(76,5,25,0.76),rgba(67,20,7,0.72),rgba(15,23,42,0.96))]',
      eyebrow: 'text-rose-700 dark:text-rose-200',
      title: 'text-slate-950 dark:text-white',
      body: 'text-slate-700 dark:text-slate-200',
      chip: 'border-white/60 bg-white/78 text-slate-800 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100',
      iconTile: 'text-rose-700 dark:text-rose-200',
      cta: 'bg-rose-600 text-white shadow-[0_18px_38px_rgba(190,24,93,0.22)] hover:bg-rose-500 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400',
      glow: 'bg-rose-200/45 dark:bg-rose-300/10',
      rail: 'bg-rose-600 dark:bg-rose-300',
    },
  },
  {
    id: 'point-mall',
    eyebrow: '积分商城',
    title: '积分兑换京东卡、月卡等实用奖品',
    description:
      '把积分直接换成最实用的礼品和权益，京东卡、月卡与其他可兑换商品都集中在积分商城里查看。',
    sideTitle: '从积分到权益的直达入口',
    sideDescription:
      '直接查看当前可兑换礼品和权益，按积分余额挑选最合适的兑换项。',
    to: '/point-mall',
    ctaLabel: '去积分商城',
    icon: Gift,
    tags: [
      { label: '京东卡', icon: ShoppingBag },
      { label: '月卡权益', icon: Sparkles },
      { label: '其他礼品', icon: Gift },
    ],
    theme: {
      frame:
        'border-amber-200 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_24%),linear-gradient(145deg,rgba(255,251,240,0.98),rgba(255,245,230,0.98),rgba(255,255,255,0.98))] dark:border-amber-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_24%),linear-gradient(145deg,rgba(69,26,3,0.78),rgba(37,25,8,0.9),rgba(15,23,42,0.96))]',
      eyebrow: 'text-amber-700 dark:text-amber-200',
      title: 'text-slate-950 dark:text-white',
      body: 'text-slate-700 dark:text-slate-200',
      chip: 'border-white/60 bg-white/78 text-slate-800 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-100',
      iconTile: 'text-amber-700 dark:text-amber-200',
      cta: 'bg-amber-600 text-white shadow-[0_18px_38px_rgba(180,83,9,0.22)] hover:bg-amber-500 dark:bg-amber-500 dark:text-white dark:hover:bg-amber-400',
      glow: 'bg-white/35 dark:bg-white/5',
      rail: 'bg-amber-600 dark:bg-amber-300',
    },
  },
]

function PromoTags(props: { item: ActivityPromoItem }) {
  return (
    <div className='mt-4 flex flex-wrap gap-2'>
      {props.item.tags.map((tag) => {
        const Icon = tag.icon

        return (
          <div
            key={tag.label}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium backdrop-blur',
              props.item.theme.chip
            )}
          >
            <Icon
              className={cn('size-4', props.item.theme.iconTile)}
              aria-hidden='true'
            />
            {tag.label}
          </div>
        )
      })}
    </div>
  )
}

function PromoSlide(props: {
  item: ActivityPromoItem
  shouldReduceMotion: boolean
}) {
  const Icon = props.item.icon
  const content = (
    <div className='relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
      <div className='max-w-3xl'>
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 text-[11px] font-semibold tracking-[0.24em] uppercase',
            props.item.theme.eyebrow
          )}
        >
          <Icon className='size-4' aria-hidden='true' />
          <span>{props.item.eyebrow}</span>
        </div>

        <h3
          className={cn(
            'mt-3 text-2xl font-semibold tracking-tight sm:text-[2rem]',
            props.item.theme.title
          )}
        >
          {props.item.title}
        </h3>

        <p
          className={cn(
            'mt-3 max-w-2xl text-sm leading-7',
            props.item.theme.body
          )}
        >
          {props.item.description}
        </p>

        <PromoTags item={props.item} />
      </div>

      <div className='flex w-full max-w-sm flex-col gap-3 lg:items-end'>
        <div className='w-full rounded-[24px] border border-white/55 bg-white/78 p-4 text-sm shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-slate-950/45 dark:shadow-[0_18px_42px_rgba(2,6,23,0.32)]'>
          <div className='font-semibold text-slate-900 dark:text-slate-50'>
            {props.item.sideTitle}
          </div>
          <div className='mt-2 leading-6 text-slate-600 dark:text-slate-300'>
            {props.item.sideDescription}
          </div>
        </div>

        <Button
          size='lg'
          className={cn(
            'h-12 min-w-44 justify-between rounded-full px-5',
            props.item.theme.cta
          )}
          render={<Link to={props.item.to} />}
        >
          <span>{props.item.ctaLabel}</span>
          <ArrowRight data-icon='inline-end' />
        </Button>
      </div>
    </div>
  )

  if (props.shouldReduceMotion) return content

  return (
    <motion.div
      key={props.item.id}
      initial={{ opacity: 0, x: 28, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -28, scale: 0.98 }}
      transition={MOTION_TRANSITION.slow}
    >
      {content}
    </motion.div>
  )
}

function PromoControls(props: {
  activeIndex: number
  onPrevious: () => void
  onNext: () => void
  onSelect: (index: number) => void
}) {
  return (
    <div className='relative mt-5 flex flex-wrap items-center justify-between gap-3'>
      <div
        className='flex items-center gap-2'
        role='tablist'
        aria-label='活动宣传切换'
      >
        {PROMO_ITEMS.map((item, index) => (
          <button
            key={item.id}
            type='button'
            className={cn(
              'h-2.5 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-white',
              props.activeIndex === index
                ? 'w-8 bg-slate-950 dark:bg-white'
                : 'w-2.5 bg-slate-400/45 hover:bg-slate-500/70 dark:bg-white/35 dark:hover:bg-white/55'
            )}
            aria-label={`切换到${item.eyebrow}`}
            aria-current={props.activeIndex === index ? 'true' : undefined}
            onClick={() => props.onSelect(index)}
          />
        ))}
      </div>

      <div className='flex items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-9 rounded-full border-white/70 bg-white/72 backdrop-blur dark:border-white/10 dark:bg-slate-950/45'
          aria-label='上一个活动宣传'
          onClick={props.onPrevious}
        >
          <ChevronLeft className='size-4' aria-hidden='true' />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='size-9 rounded-full border-white/70 bg-white/72 backdrop-blur dark:border-white/10 dark:bg-slate-950/45'
          aria-label='下一个活动宣传'
          onClick={props.onNext}
        >
          <ChevronRight className='size-4' aria-hidden='true' />
        </Button>
      </div>
    </div>
  )
}

export function PointMallPromoCard() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const shouldReduceMotion = Boolean(useReducedMotion())
  const activeItem = PROMO_ITEMS[activeIndex]

  const goToPrevious = () => {
    setActiveIndex(
      (current) => (current - 1 + PROMO_ITEMS.length) % PROMO_ITEMS.length
    )
  }

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % PROMO_ITEMS.length)
  }

  useEffect(() => {
    if (paused || shouldReduceMotion) return

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % PROMO_ITEMS.length)
    }, AUTO_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [paused, shouldReduceMotion])

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[30px] border p-5 shadow-[0_28px_90px_rgba(15,23,42,0.08)]',
        activeItem.theme.frame
      )}
      aria-label='活动宣传'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-[-10%] w-[30%] rounded-full blur-3xl',
          activeItem.theme.glow
        )}
        aria-hidden='true'
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left',
          activeItem.theme.rail
        )}
        aria-hidden='true'
      />

      <div className='relative'>
        <AnimatePresence mode='wait' initial={false}>
          <PromoSlide
            key={activeItem.id}
            item={activeItem}
            shouldReduceMotion={shouldReduceMotion}
          />
        </AnimatePresence>

        <PromoControls
          activeIndex={activeIndex}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onSelect={setActiveIndex}
        />
      </div>
    </section>
  )
}
