import { Binary, BookOpen, Crown, Gift, Sparkles, Wallet } from 'lucide-react'
import {
  PixelPetSprite,
  getHomePetHighlights,
} from '@/features/gamification/pet-catalog'

interface FeaturesProps {
  className?: string
}

const featureCards = [
  {
    icon: <Binary className='size-4 text-sky-600' />,
    title: '入口更清晰',
    description: '模型调用、套餐、钱包和盲盒分开管理，不再堆在同一页里。',
  },
  {
    icon: <Crown className='size-4 text-amber-600' />,
    title: '套餐信息明白',
    description: '每份套餐的状态、额度和到期时间都能单独查看。',
  },
  {
    icon: <Gift className='size-4 text-rose-600' />,
    title: '盲盒规则透明',
    description: '支持自定义购买数量，保底和奖励规则直接写清楚。',
  },
  {
    icon: <Wallet className='size-4 text-emerald-600' />,
    title: '扣费顺序可调',
    description: '盲盒额度、订阅额度和钱包余额共用一套顺序，随时可改。',
  },
]

const dexPets = getHomePetHighlights().map((pet, index) => ({
  id: pet.id,
  name: pet.species,
  note: pet.note,
  status: index < 2 ? '已解锁' : pet.lane === 'legend' ? '终阶伙伴' : '待解锁',
}))

export function Features(_props: FeaturesProps) {
  return (
    <section className='px-6 py-20 md:px-10 md:py-24'>
      <div className='mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <div className='rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-7'>
          <div className='max-w-2xl'>
            <div className='inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700'>
              <Sparkles className='h-3.5 w-3.5' />
              网站特点
            </div>
            <h2 className='mt-4 text-3xl font-semibold tracking-tight text-slate-950'>
              把充值、订阅和盲盒做成更容易理解的使用路径
            </h2>
            <p className='mt-3 text-base leading-7 text-slate-600'>
              首页不再只是信息堆叠，而是把充值、套餐、盲盒和宠物成长串成一条更顺手的路径。
            </p>
          </div>

          <div className='mt-8 grid gap-4 md:grid-cols-2'>
            {featureCards.map((card) => (
              <div
                key={card.title}
                className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4'
              >
                <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
                  {card.icon}
                  {card.title}
                </div>
                <p className='mt-2 text-sm leading-6 text-slate-600'>
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff,#f4fff8)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]'>
          <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
            <BookOpen className='h-4 w-4 text-emerald-600' />
            图鉴预览
          </div>
          <p className='mt-2 text-sm leading-6 text-slate-600'>
            直接展示宠物形象、解锁状态和成长方向，避免只剩下密集说明文字。
          </p>

          <div className='mt-5 grid grid-cols-2 gap-3'>
            {dexPets.map((pet) => (
              <div
                key={pet.id}
                className='rounded-[24px] border border-white/90 bg-white/92 p-3 shadow-[0_14px_36px_rgba(15,23,42,0.06)]'
              >
                <div className='aspect-square rounded-[22px] bg-[linear-gradient(180deg,#ffffff,#eefbf5)] p-2'>
                  <PixelPetSprite id={pet.id} label={pet.name} />
                </div>
                <div className='mt-3 flex items-start justify-between gap-2'>
                  <div>
                    <div className='text-sm font-semibold text-slate-900'>
                      {pet.name}
                    </div>
                    <div className='mt-1 text-[11px] leading-5 text-slate-500'>
                      {pet.note}
                    </div>
                  </div>
                  <span className='rounded-full bg-slate-900 px-2 py-1 text-[11px] text-white'>
                    {pet.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
