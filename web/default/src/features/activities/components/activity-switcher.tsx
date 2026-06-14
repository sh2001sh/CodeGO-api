import { Link } from '@tanstack/react-router'
import type { ActivityDefinition, ActivitySlug } from '../lib/registry'

export type SwitcherItem = {
  definition: ActivityDefinition
  status: { tone: 'active' | 'idle'; text: string }
}

export function ActivitySwitcher(props: {
  items: SwitcherItem[]
  active: ActivitySlug
}) {
  return (
    <nav
      aria-label='活动切换'
      className='grid grid-cols-2 gap-3 lg:grid-cols-4'
    >
      {props.items.map(({ definition, status }) => (
        <ActivitySwitcherTab
          key={definition.slug}
          definition={definition}
          status={status}
          selected={definition.slug === props.active}
        />
      ))}
    </nav>
  )
}

function ActivitySwitcherTab(props: {
  definition: ActivityDefinition
  status: { tone: 'active' | 'idle'; text: string }
  selected: boolean
}) {
  const { definition, status, selected } = props
  const Icon = definition.icon
  const isActive = status.tone === 'active'

  const frameClass = selected
    ? 'border-primary/55 bg-white/72 shadow-[0_18px_40px_rgba(24,32,43,0.1)] dark:bg-white/[0.07]'
    : 'border-white/55 bg-white/56 hover:-translate-y-0.5 hover:border-white/75 hover:shadow-[0_16px_34px_rgba(24,32,43,0.08)] dark:border-white/10 dark:bg-white/[0.04]'

  return (
    <Link
      to='/activities'
      search={{ activity: definition.slug as ActivitySlug }}
      aria-current={selected ? 'page' : undefined}
      className={`group focus-visible:ring-ring/50 relative flex flex-col gap-3 rounded-[22px] border p-4 backdrop-blur-xl transition-all duration-200 focus-visible:ring-3 focus-visible:outline-none ${frameClass}`}
    >
      <div className='flex items-center justify-between gap-2'>
        <span
          className={`flex size-9 items-center justify-center rounded-2xl ${definition.accentChip}`}
        >
          <Icon className='size-4.5' />
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isActive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-muted-foreground'
          }`}
        >
          {isActive ? (
            <span className='relative flex size-1.5'>
              <span className='absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-70' />
              <span className='relative inline-flex size-1.5 rounded-full bg-emerald-500' />
            </span>
          ) : null}
          {status.text}
        </span>
      </div>
      <div className='min-w-0'>
        <div
          className={`truncate text-sm font-semibold tracking-tight ${
            selected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
          }`}
        >
          {definition.name}
        </div>
        <div className='text-muted-foreground/80 mt-0.5 truncate text-[11px]'>
          {definition.badge}
        </div>
      </div>
      {selected ? (
        <span className='bg-primary absolute inset-x-4 -bottom-px h-0.5 rounded-full' />
      ) : null}
    </Link>
  )
}
