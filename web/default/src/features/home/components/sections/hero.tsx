import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CreditCard,
  Gift,
  Layers,
  MousePointerClick,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getLobeIcon } from '@/lib/lobe-icon'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

const models = [
  { key: 'OpenAI', label: 'OpenAI' },
  { key: 'Claude.Color', label: 'Claude' },
]

const advantages = [
  {
    icon: <CreditCard className='h-4 w-4 text-emerald-600' />,
    title: '价格更耐用',
    description: '人民币付费，按美元信用额度计费，长期调用更划算。',
  },
    {
      icon: <Gift className='h-4 w-4 text-amber-600' />,
      title: '活动福利多',
      description: '盲盒首抽奖励、积分商城、邀请刷新，多重福利叠加。',
    },
  {
    icon: <Layers className='h-4 w-4 text-sky-600' />,
    title: '多模型接入',
    description: 'OpenAI、Claude 主流模型统一 API 调用，无需切换接口。',
  },
]

const usagePaths = [
  {
    step: '1',
    icon: <Wallet className='h-4 w-4 text-emerald-600' />,
    title: '充值或选套餐',
    description: '按需选择月卡、日卡，或单独给 Claude 额度池充值。',
  },
  {
    step: '2',
    icon: <MousePointerClick className='h-4 w-4 text-sky-600' />,
    title: '统一调用模型',
    description: '一套 API 接入主流模型，盲盒、订阅与余额的扣费顺序自己可调。',
  },
    {
      step: '3',
      icon: <Gift className='h-4 w-4 text-amber-600' />,
      title: '领取活动福利',
      description: '开盲盒抽随机奖励、用积分兑权益、邀请好友得额度刷新。',
    },
]

export function Hero(props: HeroProps) {
  return (
    <section className='relative flex min-h-screen items-center overflow-hidden px-6 pb-20 pt-28 md:px-10 md:pb-24 md:pt-32'>
      <div
        aria-hidden
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(circle at 12% 14%, rgba(58,112,199,0.22), transparent 30%), radial-gradient(circle at 88% 12%, rgba(240,138,88,0.2), transparent 28%), radial-gradient(circle at 50% 96%, rgba(94,162,240,0.16), transparent 32%), linear-gradient(180deg, rgba(241,245,251,1), rgba(255,255,255,0.94))',
        }}
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background'
      />

      <div className='relative mx-auto w-full max-w-7xl'>
        <div className='grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)]'>
          <div className='max-w-2xl'>
            <div className='ios-pill inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-[#2f5ea3] dark:text-[#98c0ff]'>
              <Layers className='h-3.5 w-3.5' />
              Code Go · 多模型 AI 接入平台
            </div>
            <h1 className='mt-5 text-[clamp(2.4rem,4.8vw,4rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-slate-950 dark:text-white'>
              一个 API，
              <br className='hidden sm:block' />
              接入主流大模型
            </h1>
            <p className='mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300'>
              面向开发者的多模型 AI 接入平台。盲盒开奖励、积分兑权益、邀请换刷新，多重活动福利让你的额度越用越多。
            </p>

            <div className='mt-7'>
              <div className='text-xs font-medium tracking-[0.16em] text-slate-400 dark:text-slate-500'>
                已接入主流模型
              </div>
              <div className='mt-3 flex flex-wrap items-center gap-2.5'>
                {models.map((model) => (
                  <div
                    key={model.key}
                    className='ios-pill flex items-center gap-2 px-3 py-1.5'
                  >
                    {getLobeIcon(model.key, 18)}
                    <span className='text-xs font-medium text-slate-700 dark:text-slate-200'>
                      {model.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className='mt-8 flex flex-wrap items-center gap-3'>
              {props.isAuthenticated ? (
                <>
                  <Button
                    className='group rounded-full px-5'
                    render={<Link to='/dashboard' />}
                  >
                    进入控制台
                    <ArrowRight className='ml-1 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                  </Button>
                  <Button
                    variant='outline'
                    className='rounded-full px-5'
                    render={<a href='/pricing' />}
                  >
                    查看模型
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className='group rounded-full px-5'
                    render={<Link to='/sign-up' />}
                  >
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

          <div className='ios-floating-shell overflow-hidden p-6 md:p-7'>
            <div className='flex items-center justify-between'>
              <div>
                <div className='text-sm font-semibold text-slate-900 dark:text-white'>
                  三步开始使用
                </div>
                <div className='mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400'>
                  从充值到领取福利，整个流程都很直接。
                </div>
              </div>
              <span className='ios-pill px-2.5 py-1 text-[11px] font-medium text-[#2f5ea3] dark:text-[#98c0ff]'>
                Code Go
              </span>
            </div>

            <div className='mt-5 space-y-3'>
              {usagePaths.map((path) => (
                <div key={path.step} className='ios-pill flex items-start gap-3 p-4'>
                  <span className='bg-primary/12 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold'>
                    {path.step}
                  </span>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white'>
                      {path.icon}
                      {path.title}
                    </div>
                    <div className='mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300'>
                      {path.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='mt-12 grid gap-4 sm:grid-cols-3'>
          {advantages.map((item) => (
            <HeroFact
              key={item.title}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
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
    <div className='ios-floating-shell p-5'>
      <div className='flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white'>
        {props.icon}
        {props.title}
      </div>
      <div className='mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300'>
        {props.description}
      </div>
    </div>
  )
}
