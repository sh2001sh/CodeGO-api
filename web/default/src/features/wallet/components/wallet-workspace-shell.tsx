import type { ReactNode } from 'react'
import { SectionPageLayout } from '@/components/layout'

interface WalletWorkspaceShellProps {
  title: string
  description?: string
  main: ReactNode
  sidebar?: ReactNode
  framedMain?: boolean
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
              ? 'mx-auto grid w-full max-w-[1600px] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'
              : 'mx-auto w-full max-w-[1360px]'
          }
        >
          {props.framedMain === false ? (
            <div className='min-w-0'>{props.main}</div>
          ) : (
            <div className='app-page-shell min-w-0 p-4 sm:p-5'>
              {props.main}
            </div>
          )}
          {props.sidebar ? props.sidebar : null}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
