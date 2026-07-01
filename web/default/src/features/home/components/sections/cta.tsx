import { ArrowRight, Gift, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  return (
    <section className='px-6 py-20 md:px-10 md:py-24'>
      <AnimateInView
        animation='fade-up'
        className='mx-auto max-w-6xl overflow-hidden rounded-[34px] border border-border bg-[linear-gradient(135deg,#0f172a,#1f3b6b_48%,#0f766e)] px-6 py-10 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] md:px-10'
      >
        <div className='max-w-3xl'>
          <div className='inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90'>
            <Sparkles className='h-3.5 w-3.5' />
            开始使用
          </div>
          <h2 className='mt-4 text-3xl font-semibold tracking-tight text-balance md:text-4xl'>
            选好套餐，开盒拿额度，立刻调用模型
          </h2>
          <p className='mt-4 max-w-2xl text-sm leading-7 text-white/78 md:text-base'>
            注册即可领取受邀积分，首抽盲盒享更实用的结果。统一 API
            接入主流模型，额度怎么扣由你决定。
          </p>
        </div>

        <div className='mt-8 flex flex-wrap items-center gap-3'>
          {props.isAuthenticated ? (
            <>
              <Button
                className='group rounded-full bg-white text-slate-950 hover:bg-white/90'
                render={<a href='/blind-box' />}
              >
                <Gift className='mr-2 h-4 w-4' />
                去开盲盒
              </Button>
              <Button
                variant='outline'
                className='rounded-full border-white/30 bg-transparent text-white hover:bg-white/10'
                render={<a href='/pricing' />}
              >
                查看模型
              </Button>
            </>
          ) : (
            <Button
              className='group rounded-full bg-white text-slate-950 hover:bg-white/90'
              render={<a href='/sign-up' />}
            >
              创建账号
              <ArrowRight className='ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5' />
            </Button>
          )}
        </div>
      </AnimateInView>
    </section>
  )
}
