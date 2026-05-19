import { ArrowRight, PawPrint, Sparkles, Swords, Zap } from 'lucide-react'

const PLAYBOOK_STEPS = [
  {
    icon: PawPrint,
    title: '点亮图鉴',
    description: '调用、签到、套餐、盲盒和邀请行为都会解锁对应宠物。',
  },
  {
    icon: Swords,
    title: '选择出战',
    description: '同一时间只能装备一只宠物，切换后新宠物增益立即生效。',
  },
  {
    icon: Zap,
    title: '做日常任务',
    description: '每日任务会同时发额度奖励和宠物经验，经验只给当前出战宠物。',
  },
  {
    icon: Sparkles,
    title: '消耗额度升级',
    description: '满足经验条件后手动升级，前期便宜，后期更贵，最高 5 级。',
  },
]

export function CompanionPlaybook() {
  return (
    <div className='rounded-2xl border bg-card shadow-xs'>
      <div className='border-b px-4 py-3 sm:px-5'>
        <div className='text-base font-semibold'>宠物玩法示意</div>
        <div className='mt-1 text-sm text-muted-foreground'>
          用一条直观链路说明解锁、装备、升级和增益生效的关系。
        </div>
      </div>

      <div className='grid gap-3 p-4 md:grid-cols-4 md:p-5'>
        {PLAYBOOK_STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <div key={step.title} className='relative rounded-2xl border bg-background/70 p-4'>
              <div className='mb-3 flex items-center justify-between gap-3'>
                <div className='flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                  <Icon className='size-4' />
                </div>
                <div className='text-xs font-semibold text-muted-foreground'>
                  0{index + 1}
                </div>
              </div>

              <div className='text-sm font-semibold'>{step.title}</div>
              <div className='mt-2 text-xs leading-6 text-muted-foreground'>
                {step.description}
              </div>

              {index < PLAYBOOK_STEPS.length - 1 ? (
                <div className='pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 md:block'>
                  <div className='flex size-8 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs'>
                    <ArrowRight className='size-4' />
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

