import { ArrowRight, Coins, PawPrint, Sparkles, Swords, Zap } from 'lucide-react'

const PLAYBOOK_STEPS = [
  {
    icon: PawPrint,
    title: '点亮图鉴',
    description:
      '调用、消费、盲盒、邀请和套餐行为都会解锁不同宠物，先把图鉴点亮，后面的养成才真正开始。',
  },
  {
    icon: Swords,
    title: '选择出战',
    description:
      '同一时间只能装备一只宠物。切换出战后，新的增益会立刻作用到任务、盲盒、升级和真实扣费。',
  },
  {
    icon: Coins,
    title: '投喂拿经验',
    description:
      '输入要投喂的美元额度后，系统会按套餐或余额顺序扣费；额度不够就会失败。1 美元额度基础可换 20 EXP。',
  },
  {
    icon: Zap,
    title: '做任务加速',
    description:
      '每日任务会同时发额度奖励和宠物经验。若当前出战宠物带有任务类加成，这两部分都会一起变多。',
  },
  {
    icon: Sparkles,
    title: '满经验再升级',
    description:
      '宠物满级为 5 级。经验够了以后再点击升级，升级会继续扣套餐或余额。后期宠物会提供永久 0.95 倍、0.90 倍扣费这类强效果。',
  },
]

export function CompanionPlaybook() {
  return (
    <div className='rounded-2xl border bg-card shadow-xs'>
      <div className='border-b px-4 py-3 sm:px-5'>
        <div className='text-base font-semibold'>宠物玩法示意</div>
        <div className='mt-1 text-sm text-muted-foreground'>
          用一条直观链路把解锁、出战、投喂、升级和增益生效的关系讲清楚。
        </div>
      </div>

      <div className='grid gap-3 p-4 md:grid-cols-5 md:p-5'>
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
