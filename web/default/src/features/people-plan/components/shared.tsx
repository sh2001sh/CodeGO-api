export function SummaryCard(props: {
  label: string
  value: string | number
  hint?: string
  dark?: boolean
  variant?: 'default' | 'highlight'
}) {
  const isDark = props.dark
  const isHighlight = props.variant === 'highlight'

  return (
    <div
      className={
        isDark
          ? 'rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur'
          : isHighlight
            ? 'rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40'
            : 'rounded-2xl border bg-card p-4'
      }
    >
      <div
        className={
          isDark
            ? 'text-xs text-white/70'
            : isHighlight
              ? 'text-xs font-medium text-amber-700 dark:text-amber-400'
              : 'text-xs text-muted-foreground'
        }
      >
        {props.label}
      </div>
      <div
        className={
          isHighlight
            ? 'mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200'
            : 'mt-2 text-2xl font-semibold'
        }
      >
        {props.value}
      </div>
      {props.hint ? (
        <div
          className={
            isDark
              ? 'mt-1 text-xs text-white/70'
              : isHighlight
                ? 'mt-1 text-xs text-amber-700/70 dark:text-amber-400/70'
                : 'mt-1 text-xs text-muted-foreground'
          }
        >
          {props.hint}
        </div>
      ) : null}
    </div>
  )
}
