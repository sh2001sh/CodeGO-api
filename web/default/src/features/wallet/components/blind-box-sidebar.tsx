import { motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'
import { Boxes, Sparkles, Wallet } from 'lucide-react'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  PixelPetSprite,
  type PetProfile,
} from '@/features/gamification/pet-catalog'
import type { CompanionBuffView } from '@/features/gamification/types'
import type { BlindBoxRecord } from '../types'
import { DropRecordList } from './blind-box-view-parts'

const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const

const STACK: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

const STACK_ITEM: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT_QUINT },
  },
}

const REDUCED_STACK: Variants = { initial: {}, animate: {} }
const REDUCED_ITEM: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
}

export function BlindBoxSidebar(props: {
  remainingQuota: number
  claudeQuota: number
  availableBoxes: number
  pendingBoxes: number
  petProfile: PetProfile | null
  petSkill: CompanionBuffView | null
  records: BlindBoxRecord[]
}) {
  const reduced = useReducedMotion()

  return (
    <motion.aside
      className='space-y-4'
      variants={reduced ? REDUCED_STACK : STACK}
      initial='initial'
      animate='animate'
    >
      <motion.div variants={reduced ? REDUCED_ITEM : STACK_ITEM}>
        <AssetBoard
          remainingQuota={props.remainingQuota}
          claudeQuota={props.claudeQuota}
          availableBoxes={props.availableBoxes}
          pendingBoxes={props.pendingBoxes}
        />
      </motion.div>

      <motion.div variants={reduced ? REDUCED_ITEM : STACK_ITEM}>
        <PetCard petProfile={props.petProfile} petSkill={props.petSkill} />
      </motion.div>

      <motion.div variants={reduced ? REDUCED_ITEM : STACK_ITEM}>
        <div className='app-subtle-panel p-4'>
          <div className='mb-3 flex items-center gap-2'>
            <Sparkles className='text-muted-foreground size-4' />
            <div className='text-foreground text-sm font-semibold'>最近抽取</div>
          </div>
          <DropRecordList records={props.records} />
        </div>
      </motion.div>
    </motion.aside>
  )
}

function AssetBoard(props: {
  remainingQuota: number
  claudeQuota: number
  availableBoxes: number
  pendingBoxes: number
}) {
  return (
    <div className='app-subtle-panel p-4'>
      <div className='mb-3 flex items-center gap-2'>
        <Wallet className='text-muted-foreground size-4' />
        <div className='text-foreground text-sm font-semibold'>盲盒资产</div>
      </div>
      <div className='grid grid-cols-2 gap-2.5'>
        <Tile label='可用额度' value={formatQuota(props.remainingQuota)} />
        <Tile label='Claude 额度' value={formatQuota(props.claudeQuota)} />
        <Tile
          label='待开盲盒'
          value={String(props.availableBoxes)}
          highlight={props.availableBoxes > 0}
        />
        <Tile label='待结算' value={String(props.pendingBoxes)} />
      </div>
    </div>
  )
}

function Tile(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2.5',
        props.highlight
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border/70 bg-background/60'
      )}
    >
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='text-foreground mt-1 text-base font-semibold tabular-nums'>
        {props.value}
      </div>
    </div>
  )
}

function PetCard(props: {
  petProfile: PetProfile | null
  petSkill: CompanionBuffView | null
}) {
  if (!props.petProfile) {
    return (
      <div className='app-subtle-panel p-4'>
        <div className='flex items-center gap-2'>
          <Boxes className='text-muted-foreground size-4' />
          <div className='text-foreground text-sm font-semibold'>出战宠物</div>
        </div>
        <div className='text-muted-foreground mt-2 text-xs leading-5'>
          前往成就页解锁并装备宠物，开盒可获得额外增益
        </div>
      </div>
    )
  }

  return (
    <div className='app-subtle-panel p-4'>
      <div className='flex items-center gap-3'>
        <div className='border-border/70 bg-background/80 flex size-12 shrink-0 items-center justify-center rounded-xl border p-1.5'>
          <PixelPetSprite
            id={props.petProfile.id}
            label={props.petProfile.species}
          />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='text-foreground truncate text-sm font-semibold'>
            {props.petProfile.species}
          </div>
          <div className='text-muted-foreground mt-0.5 truncate text-xs'>
            {props.petSkill
              ? `${props.petSkill.name} ${props.petSkill.value_text}`.trim()
              : '暂无生效增益'}
          </div>
        </div>
      </div>
    </div>
  )
}
