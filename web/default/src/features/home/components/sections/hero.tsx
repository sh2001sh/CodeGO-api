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
            'radial-gradient(circle at 14% 18%, rgba(52,211,153,0.18), transparent 28%), radial-gradient(circle at 82% 16%, rgba(56,189,248,0.18), transparent 24%), radial-gradient(circle at 50% 80%, rgba(251,191,36,0.12), transparent 26%), linear-gradient(180deg, rgba(244,253,249,0.98), rgba(255,255,255,0.92))',
        }}
      />

      <div className='relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]'>
        <div className='max-w-2xl'>
          <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm'>
            <Sparkles className='h-3.5 w-3.5' />
            Code Go 宠物工位
          </div>
          <h1 className='mt-5 text-[clamp(2.5rem,5vw,4.8rem)] font-semibold leading-[1.04] tracking-tight text-slate-950'>
            Code Go
          </h1>
          <p className='mt-4 max-w-xl text-lg leading-8 text-slate-600'>
            一个把编码工作流、套餐购买、盲盒奖励和宠物养成放在一起的 AI 开发站点。
          </p>

          <div className='mt-8 grid gap-3 sm:grid-cols-3'>
            <HeroFact
              icon={<ShieldCheck className='h-4 w-4 text-emerald-600' />}
              title='稳定额度'
              description='月卡、日卡和钱包余额分工明确。'
            />
            <HeroFact
              icon={<Gift className='h-4 w-4 text-amber-600' />}
              title='盲盒奖励'
              description='盲盒可补量，保底规则公开透明。'
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
              className='rounded-[28px] border border-white/85 bg-white/94 p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur'
            >
              <div className='flex items-center justify-between'>
                <div>
                  <div className='text-sm font-semibold text-slate-900'>{pet.label}</div>
                  <div className='mt-0.5 text-xs text-slate-500'>{pet.title}</div>
                </div>
                <span className='rounded-full bg-slate-900 px-2 py-0.5 text-[11px] text-white/95'>
                  No.0{index + 1}
                </span>
              </div>
              <div className='mt-4 aspect-square rounded-[24px] bg-[linear-gradient(180deg,#f8fbff,#eefbf5)] p-3'>
                <PixelPetSprite id={pet.id} label={pet.label} />
              </div>
              <div className='mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600'>
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
    <div className='rounded-2xl border border-white/70 bg-white/80 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur'>
      <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
        {props.icon}
        {props.title}
      </div>
      <div className='mt-1 text-sm leading-6 text-slate-600'>
        {props.description}
      </div>
    </div>
  )
}
