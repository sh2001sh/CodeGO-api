/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your
option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  Circle,
  KeyRound,
  LinkIcon,
  TerminalSquare,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/copy-button'
import type { SetupGuideState } from './setup-guide/use-setup-guide'

function formatSignalValue(label: string, value: string) {
  return value || (label === '路由状态' ? '在线' : '--')
}

function EndpointRow(props: {
  label: string
  value: string
  copyLabel: string
}) {
  return (
    <div className='bg-background/72 flex min-w-0 items-center gap-2 rounded-xl border border-white/60 px-3 py-2 dark:border-white/10'>
      <span className='text-muted-foreground shrink-0 text-[11px] font-medium'>
        {props.label}
      </span>
      <code
        className='text-foreground min-w-0 flex-1 truncate font-mono text-[11px]'
        title={props.value}
      >
        {props.value}
      </code>
      <CopyButton
        value={props.value}
        variant='ghost'
        size='sm'
        className='h-6 px-2 text-[11px]'
        tooltip={props.copyLabel}
        successTooltip='已复制'
        aria-label={props.copyLabel}
      >
        复制
      </CopyButton>
    </div>
  )
}

export function OverviewHeroPanel(props: { guide: SetupGuideState }) {
  const { guide } = props
  const signalItems = guide.heroSignals.slice(0, 3)
  const previewLines = guide.requestExample.curl.split('\n').map((line) => {
    if (line.includes('Authorization: Bearer')) {
      return `  -H "Authorization: Bearer ${guide.requestExample.displayKey}" \\`
    }
    return line
  })

  return (
    <section className='overview-hero-card p-5 sm:p-6 xl:p-7'>
      <div className='grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start'>
        <div className='flex min-w-0 flex-col gap-5'>
          <div className='space-y-3'>
            <div className='text-primary text-xs font-semibold tracking-[0.16em] uppercase'>
              快速开始
            </div>
            <h2 className='max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl xl:text-5xl'>
              三步开始调用 API
            </h2>
            <p className='text-muted-foreground max-w-xl text-sm leading-7 sm:text-[15px]'>
              创建密钥、复制示例请求、发起首次调用，几分钟即可完成接入。
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' render={<Link to='/keys' />}>
              <KeyRound data-icon='inline-start' />
              查看快速上手
            </Button>
            <Button render={<Link to='/keys' />}>
              <ArrowRight data-icon='inline-end' />
              创建 API 密钥
            </Button>
          </div>

          <div className='grid gap-2.5 sm:grid-cols-3'>
            {guide.startSteps.map((step, index) => {
              const StatusIcon = step.completed ? Check : Circle
              return (
                <div
                  key={step.title}
                  className='overview-soft-card flex min-w-0 gap-3 p-3.5'
                >
                  <span
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-xl border',
                      step.completed
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-border/70 bg-background/70 text-muted-foreground'
                    )}
                  >
                    <StatusIcon className='size-4' aria-hidden='true' />
                  </span>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2 text-sm font-medium'>
                      <span className='text-muted-foreground font-mono text-xs tabular-nums'>
                        {index + 1}.
                      </span>
                      <span className='truncate'>{step.title}</span>
                    </div>
                    <p className='text-muted-foreground mt-1 line-clamp-2 text-xs leading-5'>
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className='overview-soft-card flex min-w-0 flex-col gap-4 p-4 sm:p-5'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-2'>
              <span className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl'>
                <TerminalSquare className='size-4' aria-hidden='true' />
              </span>
              <div className='min-w-0'>
                <div className='text-sm font-semibold'>首次 API 请求</div>
                <div className='text-muted-foreground truncate text-xs'>
                  {guide.requestExample.ready
                    ? guide.requestExample.keyName
                    : '创建 API 密钥后可获得可直接运行的请求示例'}
                </div>
              </div>
            </div>
            {guide.requestExample.ready ? (
              <CopyButton
                value={guide.requestExample.curl}
                variant='outline'
                size='sm'
                className='h-8 gap-1.5 px-2.5 text-xs'
                tooltip='复制可直接运行的 curl'
                successTooltip='已复制'
                aria-label='复制可直接运行的 curl'
              >
                复制
              </CopyButton>
            ) : (
              <Button variant='outline' size='sm' render={<Link to='/keys' />}>
                <KeyRound data-icon='inline-start' />
                创建 API 密钥
              </Button>
            )}
          </div>

          <div className='bg-foreground/[0.04] rounded-2xl p-4 font-mono text-[11px] leading-6'>
            <div className='mb-3 flex items-center gap-1.5'>
              <span className='bg-destructive size-2 rounded-full' />
              <span className='bg-warning size-2 rounded-full' />
              <span className='bg-success size-2 rounded-full' />
            </div>
            <div className='space-y-1 overflow-hidden'>
              {previewLines.map((line, index) => (
                <code
                  key={`${line}-${index}`}
                  className='text-muted-foreground block truncate'
                  title={line}
                >
                  {line}
                </code>
              ))}
            </div>
          </div>

          <div className='space-y-2'>
            <div className='text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium'>
              <LinkIcon className='size-3.5' aria-hidden='true' />
              请求 URL
            </div>
            <EndpointRow
              label='OpenAI'
              value={guide.requestExample.openaiEndpoint}
              copyLabel='复制 OpenAI 兼容请求 URL'
            />
            <EndpointRow
              label='Anthropic'
              value={guide.requestExample.anthropicEndpoint}
              copyLabel='复制 Anthropic 兼容请求 URL'
            />
          </div>

          <div className='grid gap-2 sm:grid-cols-3'>
            {signalItems.map((signal) => {
              const Icon = signal.icon
              return (
                <div
                  key={signal.label}
                  className='bg-background/72 flex items-center gap-2.5 rounded-2xl border border-white/60 px-3 py-3 dark:border-white/10'
                >
                  <span className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl'>
                    <Icon className='size-3.5' aria-hidden='true' />
                  </span>
                  <div className='min-w-0'>
                    <div className='text-muted-foreground text-[11px] font-medium'>
                      {signal.label}
                    </div>
                    <div className='mt-0.5 truncate text-sm font-semibold'>
                      {formatSignalValue(signal.label, signal.value)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div className='bg-background/72 flex items-center gap-2.5 rounded-2xl border border-white/60 px-3 py-3 dark:border-white/10'>
              <span className='bg-accent text-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-xl'>
                <Timer className='size-3.5' aria-hidden='true' />
              </span>
              <div className='min-w-0'>
                <div className='text-muted-foreground text-[11px] font-medium'>
                  默认模型
                </div>
                <div className='mt-0.5 truncate text-sm font-semibold'>
                  {guide.requestExample.model}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function OverviewMiniSignals(props: {
  items: Array<{
    label: string
    value: string
    icon: React.ComponentType<{ className?: string }>
  }>
}) {
  return (
    <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-4'>
      {props.items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className='overview-soft-card flex items-center gap-2.5 px-3 py-3'
          >
            <span className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-xl'>
              <Icon className='size-3.5' aria-hidden='true' />
            </span>
            <div className='min-w-0'>
              <div className='text-muted-foreground text-[11px] font-medium'>
                {item.label}
              </div>
              <div className='mt-0.5 truncate text-sm font-semibold'>
                {item.value}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
