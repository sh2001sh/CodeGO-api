import { CircleSlash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function PackageModelScopeNotice(props: { className?: string }) {
  const { t } = useTranslation()
  return (
    <div
      role='note'
      className={cn(
        'border-border bg-muted/35 flex items-start gap-3 rounded-lg border px-4 py-3',
        props.className
      )}
    >
      <CircleSlash
        className='text-primary mt-0.5 size-4 shrink-0'
        aria-hidden='true'
      />
      <div>
        <p className='text-foreground text-sm font-semibold'>
          {t('Plans are for non-Claude models only')}
        </p>
        <p className='text-muted-foreground mt-0.5 text-xs leading-5'>
          {t(
            'Plan quota cannot be used with Claude models. Use Claude quota for Claude requests.'
          )}
        </p>
      </div>
    </div>
  )
}
