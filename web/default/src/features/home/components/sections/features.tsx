import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Gift,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react'

interface FeaturesProps {
  className?: string
}

const activityCards = [
  {
    icon: <Gift className='size-5 text-amber-600' />,
    tag: '盲盒活动',
    title: '首购保底，开盒拿随机额度',
    description:
      '首次开盒享保底美元额度，连续未中高额会累积保底进度。开出的额度优先用于 API 扣费。',
    to: '/blind-box',
    cta: '去开盲盒',
  },
  {
    icon: <ShoppingBag className='size-5 text-sky-600' />,
    tag: '积分商城',
    title: '积分兑换卡密、券与权益',
    description:
      '购买套餐和受邀注册都能攒积分，积分可兑换京东 E 卡、盲盒券和月卡权益。',
    to: '/point-mall',
    cta: '逛积分商城',
  },
  {
    icon: <RefreshCcw className='size-5 text-emerald-600' />,
    tag: '邀请与刷新',
    title: '邀请好友，换额度刷新机会',
    description:
      '被邀请人首购月卡，你就得 1 次订阅额度刷新机会，可清空当前订阅已用额度。',
    to: '/invite-rewards',
    cta: '邀请好友',
  },
  {
    icon: <Wallet className='size-5 text-violet-600' />,
    tag: '额度管理',
    title: '扣费顺序自己说了算',
    description:
      '盲盒额度、订阅额度和钱包余额共用一套扣费顺序，可随时调整，看清真实可用余额。',
    to: '/wallet',
    cta: '管理钱包',
  },
]

export function Features(_props: FeaturesProps) {
  return (
    <section className='px-6 py-20 md:px-10 md:py-24'>
      <div className='mx-auto max-w-7xl'>
        <div className='mx-auto max-w-3xl text-center'>
          <div className='ios-pill inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold text-[#2f5ea3] dark:text-[#98c0ff]'>
            <Sparkles className='h-3.5 w-3.5' />
            平台福利
          </div>
          <h2 className='mt-4 text-[clamp(2rem,4.4vw,3.2rem)] font-semibold tracking-[-0.03em] text-slate-950 dark:text-white'>
            充值之外，还有这些拿额度的方式
          </h2>
          <p className='text-muted-foreground mt-4 text-base leading-7 dark:text-slate-300'>
            盲盒、积分、邀请刷新各自独立，又都能换成可用额度。挑一个顺手的开始。
          </p>
        </div>

        <div className='mt-12 grid gap-5 md:grid-cols-2'>
          {activityCards.map((card) => (
            <Link
              key={card.tag}
              to={card.to}
              className='ios-floating-shell group flex flex-col p-6 transition-transform duration-200 hover:-translate-y-0.5'
            >
              <div className='flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-slate-500 dark:text-slate-400'>
                {card.icon}
                {card.tag}
              </div>
              <h3 className='mt-3 text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white'>
                {card.title}
              </h3>
              <p className='text-muted-foreground mt-2 flex-1 text-sm leading-6 dark:text-slate-300'>
                {card.description}
              </p>
              <span className='text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium'>
                {card.cta}
                <ArrowRight className='size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
