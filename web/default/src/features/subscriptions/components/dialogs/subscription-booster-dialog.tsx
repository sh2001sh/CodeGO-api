import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  purchaseSubscriptionBooster,
  quoteSubscriptionBooster,
} from '../../api'
import type { SubscriptionBoosterQuote, UserSubscription } from '../../types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: UserSubscription | null
  title: string
  paymentMethod: string
  onCompleted?: () => Promise<void>
}

export function SubscriptionBoosterDialog(props: Props) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState(1)
  const [quote, setQuote] = useState<SubscriptionBoosterQuote | null>(null)
  const quotaPerUnit = quote?.quota_per_unit ?? 500_000
  const quota = Math.round(amount * quotaPerUnit)
  const quoteMutation = useMutation({
    mutationFn: quoteSubscriptionBooster,
    onSuccess: (response) => setQuote(response.data ?? null),
    onError: () => setQuote(null),
  })
  const requestQuote = quoteMutation.mutate
  const purchaseMutation = useMutation({
    mutationFn: purchaseSubscriptionBooster,
    onSuccess: (response) => {
      const target = response.data?.pay_link ?? response.url
      if (target) window.location.assign(target)
      else toast.success(t('Booster order created'))
      props.onOpenChange(false)
      void props.onCompleted?.()
    },
    onError: () => toast.error(t('Failed to create booster order')),
  })

  useEffect(() => {
    if (!props.open || !props.subscription) return
    requestQuote({ subscriptionId: props.subscription.id, quota })
  }, [props.open, props.subscription, quota, requestQuote])
  const expiresAt = props.subscription
    ? new Date(props.subscription.end_time * 1000).toLocaleString()
    : '--'
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('Continue using')}</DialogTitle>
          <DialogDescription>
            {t('Add quota to {{plan}} without extending its expiration date.', {
              plan: props.title,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          <div className='bg-muted/50 rounded-lg px-3 py-2.5 text-sm'>
            <div className='font-medium'>
              {t('Expiration remains unchanged')}
            </div>
            <div className='text-muted-foreground mt-1 text-xs tabular-nums'>
              {expiresAt}
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='booster-quota'>{t('Booster amount (USD)')}</Label>
            <Input
              id='booster-quota'
              type='number'
              min={(quote?.min_quota ?? 500_000) / quotaPerUnit}
              max={(quote?.max_quota ?? 500_000_000) / quotaPerUnit}
              step={(quote?.quota_step ?? 500_000) / quotaPerUnit}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
            <p className='text-muted-foreground text-xs'>
              {t(
                'The added quota keeps the current model limits and expires with this subscription.'
              )}
            </p>
          </div>
          <div className='grid grid-cols-2 gap-3 text-sm'>
            <div>
              <div className='text-muted-foreground text-xs'>
                {t('Booster rate')}
              </div>
              <div className='mt-1 font-mono font-semibold'>
                {quote?.rate ?? 0.12}
              </div>
            </div>
            <div>
              <div className='text-muted-foreground text-xs'>
                {t('Amount due')}
              </div>
              <div className='mt-1 font-mono font-semibold tabular-nums'>
                ¥{quote?.amount_due?.toFixed(2) ?? '--'}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button
            disabled={
              !quote || purchaseMutation.isPending || quoteMutation.isPending
            }
            onClick={() =>
              props.subscription &&
              purchaseMutation.mutate({
                subscriptionId: props.subscription.id,
                quota,
                paymentMethod: props.paymentMethod,
              })
            }
          >
            {purchaseMutation.isPending
              ? t('Creating order...')
              : t('Confirm payment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
