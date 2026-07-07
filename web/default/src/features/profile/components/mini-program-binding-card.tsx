import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Smartphone, RefreshCw, Unlink, Link2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { toIntlLocale } from '@/i18n/languages'
import { CopyButton } from '@/components/copy-button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import {
  createMiniProgramBindCode,
  deleteMiniProgramBinding,
  getMiniProgramBinding,
} from '../api'
import type {
  MiniProgramBinding,
  MiniProgramBindCodePayload,
} from '../types'

export function MiniProgramBindingCard() {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [binding, setBinding] = useState<MiniProgramBinding | null>(null)
  const [bindCode, setBindCode] = useState<MiniProgramBindCodePayload | null>(
    null
  )
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchBinding = async () => {
      setLoading(true)
      try {
        const res = await getMiniProgramBinding()
        if (!mounted) return
        if (res.success && res.data) {
          setBinding(res.data)
        } else {
          toast.error(res.message || t('Failed to load binding status'))
        }
      } catch {
        if (mounted) {
          toast.error(t('Failed to load binding status'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchBinding()
    return () => {
      mounted = false
    }
  }, [t])

  const expiresAtLabel = useMemo(() => {
    if (!bindCode?.expires_at) return ''
    return new Date(bindCode.expires_at * 1000).toLocaleString(
      toIntlLocale(i18n.language)
    )
  }, [bindCode, i18n.language])

  const handleGenerateCode = async () => {
    setSubmitting(true)
    try {
      const res = await createMiniProgramBindCode()
      if (res.success && res.data) {
        setBindCode(res.data)
        toast.success(t('Bind code generated'))
      } else {
        toast.error(res.message || t('Failed to generate bind code'))
      }
    } catch {
      toast.error(t('Failed to generate bind code'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBinding = async () => {
    setSubmitting(true)
    try {
      const res = await deleteMiniProgramBinding()
      if (res.success) {
        setBinding({ bound: false })
        toast.success(t('Mini program binding removed'))
      } else {
        toast.error(res.message || t('Failed to remove binding'))
      }
    } catch {
      toast.error(t('Failed to remove binding'))
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  if (loading) {
    return (
      <TitledCard
        title={t('Mini Program Binding')}
        description={t('Connect your WeChat mini program session securely')}
        icon={<Smartphone className='h-4 w-4' />}
      >
        <div className='space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-28 w-full' />
        </div>
      </TitledCard>
    )
  }

  return (
    <>
      <TitledCard
        title={t('Mini Program Binding')}
        description={t(
          'Generate a one-time code on the website, then finish binding inside the mini program.'
        )}
        icon={<Smartphone className='h-4 w-4' />}
        action={
          <Button
            variant='outline'
            size='sm'
            render={<Link to='/miniapp/landing' />}
          >
            <Link2 className='mr-2 h-3.5 w-3.5' />
            {t('View Guide')}
          </Button>
        }
      >
        <div className='space-y-4'>
          <div className='rounded-2xl border bg-muted/25 p-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='text-sm font-medium'>{t('Current Status')}</div>
              {binding?.bound ? (
                <StatusBadge
                  variant='success'
                  label={t('Bound')}
                  copyable={false}
                />
              ) : (
                <StatusBadge
                  variant='neutral'
                  label={t('Not bound')}
                  copyable={false}
                />
              )}
            </div>
            <div className='text-muted-foreground mt-2 text-sm leading-6'>
              {binding?.bound ? (
                <>
                  <div>{binding.account_masked || binding.username_masked}</div>
                  <div>{binding.openid_masked}</div>
                </>
              ) : (
                <div>
                  {t(
                    'The mini program only reads usage data after binding. Account login and purchases stay on the website.'
                  )}
                </div>
              )}
            </div>
          </div>

          <div className='grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]'>
            <div className='rounded-2xl border p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <div className='text-sm font-medium'>{t('One-Time Bind Code')}</div>
                  <div className='text-muted-foreground mt-1 text-xs leading-5'>
                    {t('Valid for 10 minutes. The code can only be used once.')}
                  </div>
                </div>
                <Button
                  size='sm'
                  onClick={handleGenerateCode}
                  disabled={submitting}
                >
                  <RefreshCw className='mr-2 h-3.5 w-3.5' />
                  {bindCode ? t('Regenerate') : t('Generate')}
                </Button>
              </div>

              {bindCode ? (
                <div className='mt-4 rounded-2xl border border-dashed bg-muted/35 p-4'>
                  <div className='flex flex-wrap items-center gap-3'>
                    <div className='font-mono text-2xl font-semibold tracking-[0.32em]'>
                      {bindCode.code}
                    </div>
                    <CopyButton
                      value={bindCode.code}
                      variant='outline'
                      size='sm'
                      tooltip={t('Copy to clipboard')}
                      successTooltip={t('Copied!')}
                    >
                      {t('Copy')}
                    </CopyButton>
                  </div>
                  <div className='text-muted-foreground mt-3 text-xs leading-5'>
                    {t('Expires at')}: {expiresAtLabel}
                  </div>
                </div>
              ) : (
                <div className='text-muted-foreground mt-4 text-sm leading-6'>
                  {t(
                    'Generate a code here, then open the mini program and paste it into the Bind Account page.'
                  )}
                </div>
              )}
            </div>

            <div className='rounded-2xl border p-4'>
              <div className='text-sm font-medium'>{t('Binding Steps')}</div>
              <ol className='text-muted-foreground mt-3 space-y-2 text-sm leading-6'>
                <li>{t('1. Open the Code Go mini program in WeChat.')}</li>
                <li>{t('2. Tap “Bind Account” on the mini program home page.')}</li>
                <li>{t('3. Paste the code from this page and confirm binding.')}</li>
              </ol>

              {binding?.bound ? (
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-destructive hover:text-destructive mt-4 px-0'
                  onClick={() => setConfirmOpen(true)}
                  disabled={submitting}
                >
                  <Unlink className='mr-2 h-3.5 w-3.5' />
                  {t('Remove Binding')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </TitledCard>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('Remove Mini Program Binding')}
        desc={t(
          'This will disconnect the current WeChat mini program account from your website account.'
        )}
        confirmText={t('Remove Binding')}
        destructive
        handleConfirm={handleDeleteBinding}
        isLoading={submitting}
      />
    </>
  )
}
