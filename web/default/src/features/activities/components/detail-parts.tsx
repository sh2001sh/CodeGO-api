import type { ReactNode } from 'react'
import type { ActivityDefinition } from '../lib/registry'

export function DetailMetric(props: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className='app-subtle-panel px-4 py-3'>
      <div className='text-muted-foreground text-[11px] font-medium'>
        {props.label}
      </div>
      <div className='text-foreground mt-1 text-lg font-semibold tracking-tight'>
        {props.value}
      </div>
      {props.hint ? (
        <div className='text-muted-foreground mt-1 text-xs leading-5'>
          {props.hint}
        </div>
      ) : null}
    </div>
  )
}

export function DetailStep(props: {
  index: number
  title: string
  body: string
}) {
  return (
    <div className='app-subtle-panel flex gap-3 p-4'>
      <div className='bg-primary/12 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold'>
        {props.index}
      </div>
      <div className='min-w-0'>
        <div className='text-foreground text-sm font-semibold'>
          {props.title}
        </div>
        <div className='text-muted-foreground mt-1 text-xs leading-5'>
          {props.body}
        </div>
      </div>
    </div>
  )
}

export function DetailCallout(props: { title: string; children: ReactNode }) {
  return (
    <div className='border-border/70 bg-muted/30 rounded-[20px] border border-dashed p-4'>
      <div className='text-foreground text-sm font-semibold'>{props.title}</div>
      <div className='text-muted-foreground mt-2 text-xs leading-6'>
        {props.children}
      </div>
    </div>
  )
}

export function DetailHero(props: {
  definition: ActivityDefinition
  headlineLabel: string
  headlineValue: string
  statusBadge: { tone: 'active' | 'idle'; text: string }
  primaryAction: ReactNode
}) {
  const { definition } = props
  const Icon = definition.icon
  const isActive = props.statusBadge.tone === 'active'
  const badgeClass = isActive
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : 'border-border bg-background/80 text-muted-foreground'

  return (
    <section
      className={`ios-floating-shell overflow-hidden p-5 sm:p-6 ${definition.posterTone}`}
    >
      <div className='grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] xl:items-center'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <span
              className={`flex size-9 items-center justify-center rounded-2xl ${definition.accentChip}`}
            >
              <Icon className='size-4.5' />
            </span>
            <span className='app-section-kicker'>{definition.badge}</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badgeClass}`}
            >
              {isActive ? (
                <span className='relative flex size-1.5'>
                  <span className='absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-70' />
                  <span className='relative inline-flex size-1.5 rounded-full bg-emerald-500' />
                </span>
              ) : null}
              {props.statusBadge.text}
            </span>
          </div>

          <h3 className='text-foreground mt-3 text-2xl font-semibold tracking-tight sm:text-3xl'>
            {definition.name}
          </h3>
          <p className='text-muted-foreground mt-2 max-w-2xl text-sm leading-7'>
            {definition.intro}
          </p>

          <div className='mt-4 flex flex-wrap gap-2'>{props.primaryAction}</div>
        </div>

        <div className='ios-floating-shell rounded-[22px] p-5'>
          <div className='text-muted-foreground text-[11px] font-medium'>
            {props.headlineLabel}
          </div>
          <div className='text-foreground mt-2 text-4xl font-semibold tracking-tight'>
            {props.headlineValue}
          </div>
          <div className='text-muted-foreground mt-2 text-xs leading-5'>
            {definition.tagline}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ActivityDetailShell(props: {
  definition: ActivityDefinition
  children: ReactNode
}) {
  return (
    <div className='flex w-full flex-col gap-4'>{props.children}</div>
  )
}
