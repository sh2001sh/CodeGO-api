import { cn } from '@/lib/utils'

export type PixelPetId =
  | 'spark-dog'
  | 'byte-otter'
  | 'echo-cat'
  | 'night-owl'
  | 'mint-lizard'
  | 'cocoa-boar'
  | 'forge-tiger'
  | 'contract-turtle'
  | 'ribbon-fox'
  | 'gummy-shark'
  | 'prism-slime'
  | 'lucky-bird'
  | 'social-parrot'
  | 'confetti-capybara'
  | 'cloud-rabbit'
  | 'companion-dragon'

export type PetProfile = {
  achievementKey: string
  id: PixelPetId
  species: string
  accent: string
  splash: string
  lane: 'starter' | 'usage' | 'subscription' | 'blind-box' | 'social' | 'legend'
  note: string
  spotlight: 'home' | 'blind-box' | 'achievement'
}

const PET_COLLECTION: PetProfile[] = [
  {
    achievementKey: 'first-call',
    id: 'spark-dog',
    species: '火花犬',
    accent: 'from-orange-400 via-amber-300 to-rose-300',
    splash: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200',
    lane: 'starter',
    note: '首次成功调用就会加入队伍。',
    spotlight: 'home',
  },
  {
    achievementKey: 'ten-calls',
    id: 'byte-otter',
    species: '字节獭',
    accent: 'from-lime-300 via-emerald-300 to-teal-300',
    splash: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    lane: 'starter',
    note: '10 次调用后就会叼着键帽出现。',
    spotlight: 'home',
  },
  {
    achievementKey: 'hundred-calls',
    id: 'echo-cat',
    species: '回声猫',
    accent: 'from-sky-400 via-cyan-300 to-blue-300',
    splash: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
    lane: 'usage',
    note: '适合高频稳定调用的中前期主力宠。',
    spotlight: 'home',
  },
  {
    achievementKey: 'thousand-calls',
    id: 'night-owl',
    species: '夜巡枭',
    accent: 'from-indigo-400 via-violet-300 to-blue-300',
    splash: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200',
    lane: 'usage',
    note: '千次调用后解锁的夜班巡航伙伴。',
    spotlight: 'achievement',
  },
  {
    achievementKey: 'quota-scout',
    id: 'mint-lizard',
    species: '薄荷蜥',
    accent: 'from-emerald-400 via-lime-300 to-green-300',
    splash: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-200',
    lane: 'usage',
    note: '50 美元额度消耗节点的轻量回礼宠。',
    spotlight: 'home',
  },
  {
    achievementKey: 'quota-smith',
    id: 'cocoa-boar',
    species: '可可豚',
    accent: 'from-amber-300 via-orange-300 to-rose-200',
    splash: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
    lane: 'usage',
    note: '中程高频使用后才会慢吞吞赶来。',
    spotlight: 'achievement',
  },
  {
    achievementKey: 'thousand-forge',
    id: 'forge-tiger',
    species: '铸光虎机',
    accent: 'from-violet-500 via-fuchsia-400 to-rose-300',
    splash: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-200',
    lane: 'usage',
    note: '重度开发玩家会更快集齐它。',
    spotlight: 'home',
  },
  {
    achievementKey: 'contract-power',
    id: 'contract-turtle',
    species: '契约龟',
    accent: 'from-emerald-500 via-teal-400 to-lime-300',
    splash: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    lane: 'subscription',
    note: '购买任意套餐后会点亮的长期伙伴。',
    spotlight: 'home',
  },
  {
    achievementKey: 'plan-collector',
    id: 'ribbon-fox',
    species: '缎带狐',
    accent: 'from-pink-400 via-rose-300 to-fuchsia-300',
    splash: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
    lane: 'subscription',
    note: '更适合长期订阅用户收藏。',
    spotlight: 'achievement',
  },
  {
    achievementKey: 'blind-box-rookie',
    id: 'gummy-shark',
    species: '软糖鲨',
    accent: 'from-cyan-400 via-sky-300 to-blue-300',
    splash: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
    lane: 'blind-box',
    note: '首次开盒就会遇到的活动系伙伴。',
    spotlight: 'blind-box',
  },
  {
    achievementKey: 'blind-box-regular',
    id: 'prism-slime',
    species: '棱团怪',
    accent: 'from-sky-300 via-violet-300 to-fuchsia-300',
    splash: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
    lane: 'blind-box',
    note: '参与盲盒足够多后才会滚出来。',
    spotlight: 'blind-box',
  },
  {
    achievementKey: 'lucky-star',
    id: 'lucky-bird',
    species: '流星啾',
    accent: 'from-amber-400 via-yellow-300 to-orange-300',
    splash: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
    lane: 'blind-box',
    note: '盲盒大奖对应的高光传说宠。',
    spotlight: 'blind-box',
  },
  {
    achievementKey: 'social-crafter',
    id: 'social-parrot',
    species: '联机鹦',
    accent: 'from-emerald-400 via-sky-300 to-cyan-300',
    splash: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
    lane: 'social',
    note: '邀请成功后更容易点亮的社交型伙伴。',
    spotlight: 'achievement',
  },
  {
    achievementKey: 'community-core',
    id: 'confetti-capybara',
    species: '彩纸豚',
    accent: 'from-pink-300 via-amber-200 to-lime-200',
    splash: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-200',
    lane: 'social',
    note: '10 次邀请的纪念级庆祝宠。',
    spotlight: 'achievement',
  },
  {
    achievementKey: 'seven-day-streak',
    id: 'cloud-rabbit',
    species: '云团兔',
    accent: 'from-indigo-400 via-violet-300 to-pink-300',
    splash: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
    lane: 'usage',
    note: '单日高频调用冲到 30 次后，就会靠过来陪你冲刺。 ',
    spotlight: 'home',
  },
  {
    achievementKey: 'month-streak',
    id: 'companion-dragon',
    species: '像素龙',
    accent: 'from-blue-400 via-sky-300 to-indigo-300',
    splash: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
    lane: 'legend',
    note: '累计消耗 2000 美元额度后解锁的消费终阶守护者。',
    spotlight: 'achievement',
  },
]

const PET_PROFILE_MAP = Object.fromEntries(
  PET_COLLECTION.map((pet) => [pet.achievementKey, pet])
) as Record<string, PetProfile>

const COMPANION_LEVELS: PixelPetId[] = [
  'spark-dog',
  'echo-cat',
  'contract-turtle',
  'social-parrot',
  'companion-dragon',
]

export function getPetProfile(achievementKey: string): PetProfile {
  return (
    PET_PROFILE_MAP[achievementKey] || {
      achievementKey,
      id: 'companion-dragon',
      species: '未知伙伴',
      accent: 'from-slate-400 via-slate-300 to-slate-200',
      splash: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200',
      lane: 'legend',
      note: '等待后续补充档案。',
      spotlight: 'achievement',
    }
  )
}

export function getPetCatalog() {
  return PET_COLLECTION
}

export function getHomePetHighlights() {
  return PET_COLLECTION.filter((pet) => pet.spotlight === 'home')
}

export function getBlindBoxPetHighlights() {
  return PET_COLLECTION.filter(
    (pet) =>
      pet.lane === 'blind-box' ||
      pet.achievementKey === 'plan-collector' ||
      pet.achievementKey === 'social-crafter' ||
      pet.achievementKey === 'community-core' ||
      pet.achievementKey === 'seven-day-streak' ||
      pet.achievementKey === 'month-streak'
  )
}

export function getCompanionSprite(level: number): PixelPetId {
  return COMPANION_LEVELS[
    Math.max(0, Math.min(COMPANION_LEVELS.length - 1, level - 1))
  ]
}

export function PixelPetSprite(props: {
  id: PixelPetId
  className?: string
  label?: string
}) {
  const basePath = `/pets/generated/${props.id}`

  return (
    <picture className={cn('block aspect-square h-full w-full', props.className)}>
      <source srcSet={`${basePath}.webp`} type='image/webp' />
      <img
        src={`${basePath}.png`}
        alt={props.label || props.id}
        className='aspect-square h-full w-full object-contain'
        loading='lazy'
      />
    </picture>
  )
}
