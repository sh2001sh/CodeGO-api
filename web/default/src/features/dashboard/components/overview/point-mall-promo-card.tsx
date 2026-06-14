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
      '花小钱抽取随机额度奖励，连续未开出高额时累积保底，还有机会开出整份订阅大奖，适合想快速补额度、顺手搏一把的用户。',
    sideTitle: '开出的额度优先用于扣费',
    sideDescription:
      '盲盒额度会优先于套餐和钱包余额参与 API 消耗，开出即可立即生效，无需额外操作。',
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
        'border-border/70 bg-background/78',
      eyebrow: 'text-muted-foreground',
      title: 'text-foreground',
      body: 'text-muted-foreground',
      chip: 'border-border/70 bg-background/72 text-foreground',
      iconTile: 'text-primary',
      cta: 'bg-primary text-primary-foreground hover:bg-primary/90',
      glow: 'bg-primary/10 dark:bg-primary/8',
      rail: 'bg-primary/55 dark:bg-primary/45',
    },
  },
  {
    id: 'point-mall',
    eyebrow: '积分商城',
    title: '积分兑换京东卡、月卡等实用奖品',
    description:
      '把积分直接换成最实用的礼品和权益，京东卡、月卡与其他可兑换商品都集中在积分商城里查看。',
    sideTitle: '积分直接兑换实用权益',
    sideDescription:
      '按当前积分余额挑选京东卡、月卡等可兑换权益，兑换后立即发放。',
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
        'border-border/70 bg-accent/14 dark:bg-accent/10',
      eyebrow: 'text-muted-foreground',
      title: 'text-foreground',
      body: 'text-muted-foreground',
      chip: 'border-border/70 bg-background/72 text-foreground',
      iconTile: 'text-accent-foreground',
      cta: 'bg-primary text-primary-foreground hover:bg-primary/90',
      glow: 'bg-accent/12 dark:bg-accent/10',
      rail: 'bg-primary/55 dark:bg-primary/45',
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
            'flex flex-wrap items-center gap-2 text-[11px] font-medium',
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
        <div className='app-subtle-panel w-full p-4 text-sm'>
          <div className='text-foreground font-semibold'>
            {props.item.sideTitle}
          </div>
          <div className='text-muted-foreground mt-2 leading-6'>
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
              'h-2.5 rounded-full transition-all focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              props.activeIndex === index
                ? 'bg-primary w-8'
                : 'bg-muted-foreground/40 hover:bg-muted-foreground/70 w-2.5'
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
          className='bg-background/80 size-9 rounded-full'
          aria-label='上一个活动宣传'
          onClick={props.onPrevious}
        >
          <ChevronLeft className='size-4' aria-hidden='true' />
        </Button>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='bg-background/80 size-9 rounded-full'
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
        'app-page-shell relative overflow-hidden p-4',
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
        <div className='app-section-kicker mb-2'>活动中心</div>
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
