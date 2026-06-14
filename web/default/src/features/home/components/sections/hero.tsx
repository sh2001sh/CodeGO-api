import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Gift, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PixelPetSprite,
  getHomePetHighlights,
} from '@/features/gamification/pet-catalog'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

const heroPets = getHomePetHighlights().slice(0, 4).map((pet, index) => ({
  id: pet.id,
  label: pet.species,
  title:
    ['热启动', '陪练型', '稳定型', '续航型'][index] || '图鉴型',
  note: pet.note,
}))

export function Hero(props: HeroProps) {
  return (
    <section className='relative overflow-hidden px-6 pb-18 pt-28 md:px-10 md:pb-24 md:pt-36'>
      <div
        aria-hidden
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(circle at 14% 18%, rgba(58,112,199,0.18), transparent 28%), radial-gradient(circle at 82% 16%, rgba(240,138,88,0.16), transparent 24%), radial-gradient(circle at 50% 80%, rgba(94,162,240,0.12), transparent 26%), linear-gradient(180deg, rgba(244,247,251,0.98), rgba(255,255,255,0.9))',
        }}
      />

      <div className='relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]'>
        <div className='max-w-2xl'>
          <div className='ios-pill inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-[#2f5ea3] dark:text-[#98c0ff]'>
            <Sparkles className='h-3.5 w-3.5' />
            Code Go · 统一 iOS 体验
          </div>
          <h1 className='mt-5 text-[clamp(2.5rem,5vw,4.8rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-slate-950 dark:text-white'>
            Code Go
          </h1>
          <p className='mt-4 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300'>
            一个把编码工作流、套餐购买、盲盒奖励和宠物养成统一进 iOS 风格玻璃界面的 AI 开发站点。
          </p>

          <div className='mt-8 grid gap-3 sm:grid-cols-3'>
              <HeroFact
                icon={<ShieldCheck className='h-4 w-4 text-emerald-600' />}
              title='稳定额度'
              description='月卡、日卡和钱包余额分工明确。'
              />
              <HeroFact
                icon={<Gift className='h-4 w-4 text-amber-600' />}
              title='盲盒福利'
              description='首购保底、随机奖励、优先抵扣都清晰可见。'
              />
              <HeroFact
                icon={<Sparkles className='h-4 w-4 text-sky-600' />}
              title='16 只图鉴'
              description='从首次调用到盲盒大奖，一共 16 只宠物可收集。'
            />
          </div>

          <div className='mt-8 flex flex-wrap items-center gap-3'>
            {props.isAuthenticated ? (
              <>
                <Button className='group rounded-full px-5' render={<Link to='/dashboard' />}>
                  进入控制台
                  <ArrowRight className='ml-1 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                </Button>
                <Button
                  variant='outline'
                  className='rounded-full px-5'
                  render={<a href='/packages' />}
                >
                  查看套餐
                </Button>
              </>
            ) : (
              <>
                <Button className='group rounded-full px-5' render={<Link to='/sign-up' />}>
                  立即开始
                  <ArrowRight className='ml-1 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                </Button>
                <Button
                  variant='outline'
                  className='rounded-full px-5'
                  render={<Link to='/pricing' />}
                >
                  查看定价
                </Button>
              </>
            )}
          </div>
        </div>

        <div className='grid gap-4 sm:grid-cols-2'>
          {heroPets.map((pet, index) => (
            <div
              key={pet.id}
              className='ios-floating-shell p-4'
            >
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-sm font-semibold text-slate-900 dark:text-white'>{pet.label}</div>
                  <div className='mt-0.5 text-xs text-slate-500 dark:text-slate-300'>{pet.title}</div>
                </div>
                <span className='ios-pill px-2 py-0.5 text-[11px] text-slate-700 dark:text-slate-200'>
                  No.0{index + 1}
                </span>
              </div>
              <div className='mt-4 aspect-square rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(233,241,251,0.8))] p-3 dark:bg-[linear-gradient(180deg,rgba(18,24,33,0.88),rgba(28,35,47,0.8))]'>
                <PixelPetSprite id={pet.id} label={pet.label} />
              </div>
              <div className='mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:bg-white/5 dark:text-slate-300'>
                {pet.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HeroFact(props: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className='ios-pill p-4'>
      <div className='flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white'>
        {props.icon}
        {props.title}
      </div>
      <div className='mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300'>
        {props.description}
      </div>
    </div>
  )
}
