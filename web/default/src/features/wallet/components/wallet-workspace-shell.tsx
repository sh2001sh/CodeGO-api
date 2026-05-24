import type { ReactNode } from 'react'
import { SectionPageLayout } from '@/components/layout'

interface WalletWorkspaceShellProps {
  title: string
  description?: string
  main: ReactNode
  sidebar?: ReactNode
}

export function WalletWorkspaceShell(props: WalletWorkspaceShellProps) {
  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{props.title}</SectionPageLayout.Title>
      {props.description ? (
        <SectionPageLayout.Description>
          {props.description}
        </SectionPageLayout.Description>
      ) : null}
      <SectionPageLayout.Content>
        <div
          className={
            props.sidebar
              ? 'mx-auto grid w-full max-w-[1760px] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]'
              : 'mx-auto w-full max-w-[1280px]'
          }
        >
          <div className='min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_18px_48px_rgba(2,6,23,0.45)] sm:p-5'>
            {props.main}
          </div>
          {props.sidebar ? props.sidebar : null}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
