import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import type { BlindBoxTierSetting } from '../types'

const tierSchema = z.object({
  name: z.string().min(1),
  min_usd: z.number().min(0),
  max_usd: z.number().min(0),
  probability: z.number().min(0).max(1),
})

const schema = z.object({
  enabled: z.boolean(),
  unitPrice: z.coerce.number().min(0),
  expireDays: z.coerce.number().int().min(1),
  dailyLimit: z.coerce.number().int().min(1),
  monthlyLimit: z.coerce.number().int().min(1),
  dailyOpenLimit: z.coerce.number().int().min(1),
  pityThreshold: z.coerce.number().int().min(1),
  pityGuaranteeUSD: z.coerce.number().min(0),
  lowRewardThresholdUSD: z.coerce.number().min(0),
  subscriptionPrizeProbability: z.coerce.number().min(0).max(1),
  subscriptionPlanTitle: z.string().min(1),
  countOptions: z.string().superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed) || parsed.some((item) => !Number.isInteger(item) || item <= 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide a JSON array of positive integers',
        })
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide valid JSON',
      })
    }
  }),
  tiers: z.string().superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Provide a JSON array',
        })
        return
      }
      const result = z.array(tierSchema).safeParse(parsed)
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each tier must include name, min_usd, max_usd, probability',
        })
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide valid JSON',
      })
    }
  }),
})

type Values = z.infer<typeof schema>

function normalizeCountOptions(value: string): string {
  const parsed = JSON.parse(value) as number[]
  const unique = Array.from(
    new Set(parsed.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))
  ).sort((left, right) => left - right)
  return JSON.stringify(unique)
}

function normalizeTiers(value: string): string {
  const parsed = z.array(tierSchema).parse(JSON.parse(value))
  return JSON.stringify(parsed)
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function BlindBoxSettingsSection({
  defaultValues,
}: {
  defaultValues: {
    enabled: boolean
    unitPrice: number
    expireDays: number
    dailyLimit: number
    monthlyLimit: number
    dailyOpenLimit: number
    pityThreshold: number
    pityGuaranteeUSD: number
    lowRewardThresholdUSD: number
    subscriptionPrizeProbability: number
    subscriptionPlanTitle: string
    countOptions: number[]
    tiers: BlindBoxTierSetting[]
  }
}) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const form = useForm<Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values>,
    defaultValues: {
      enabled: defaultValues.enabled,
      unitPrice: defaultValues.unitPrice,
      expireDays: defaultValues.expireDays,
      dailyLimit: defaultValues.dailyLimit,
      monthlyLimit: defaultValues.monthlyLimit,
      dailyOpenLimit: defaultValues.dailyOpenLimit,
      pityThreshold: defaultValues.pityThreshold,
      pityGuaranteeUSD: defaultValues.pityGuaranteeUSD,
      lowRewardThresholdUSD: defaultValues.lowRewardThresholdUSD,
      subscriptionPrizeProbability: defaultValues.subscriptionPrizeProbability,
      subscriptionPlanTitle: defaultValues.subscriptionPlanTitle,
      countOptions: stringifyJson(defaultValues.countOptions),
      tiers: stringifyJson(defaultValues.tiers),
    },
  })

  const { isDirty, isSubmitting } = form.formState
  const enabled = form.watch('enabled')

  async function onSubmit(values: Values) {
    const normalizedCountOptions = normalizeCountOptions(values.countOptions)
    const normalizedTiers = normalizeTiers(values.tiers)
    const defaultCountOptions = JSON.stringify(defaultValues.countOptions)
    const defaultTiers = JSON.stringify(defaultValues.tiers)

    const updates: Array<{ key: string; value: string }> = []

    const pushIfChanged = (key: string, next: string | number | boolean, previous: string | number | boolean) => {
      if (next !== previous) {
        updates.push({ key, value: String(next) })
      }
    }

    pushIfChanged('blind_box_setting.enabled', values.enabled, defaultValues.enabled)
    pushIfChanged('blind_box_setting.unit_price', values.unitPrice, defaultValues.unitPrice)
    pushIfChanged('blind_box_setting.expire_days', values.expireDays, defaultValues.expireDays)
    pushIfChanged('blind_box_setting.daily_limit', values.dailyLimit, defaultValues.dailyLimit)
    pushIfChanged('blind_box_setting.monthly_limit', values.monthlyLimit, defaultValues.monthlyLimit)
    pushIfChanged('blind_box_setting.daily_open_limit', values.dailyOpenLimit, defaultValues.dailyOpenLimit)
    pushIfChanged('blind_box_setting.pity_threshold', values.pityThreshold, defaultValues.pityThreshold)
    pushIfChanged(
      'blind_box_setting.pity_guarantee_usd',
      values.pityGuaranteeUSD,
      defaultValues.pityGuaranteeUSD
    )
    pushIfChanged(
      'blind_box_setting.low_reward_threshold_usd',
      values.lowRewardThresholdUSD,
      defaultValues.lowRewardThresholdUSD
    )
    pushIfChanged(
      'blind_box_setting.subscription_prize_probability',
      values.subscriptionPrizeProbability,
      defaultValues.subscriptionPrizeProbability
    )
    pushIfChanged(
      'blind_box_setting.subscription_plan_title',
      values.subscriptionPlanTitle.trim(),
      defaultValues.subscriptionPlanTitle
    )

    if (normalizedCountOptions !== defaultCountOptions) {
      updates.push({
        key: 'blind_box_setting.count_options',
        value: normalizedCountOptions,
      })
    }
    if (normalizedTiers !== defaultTiers) {
      updates.push({
        key: 'blind_box_setting.tiers',
        value: normalizedTiers,
      })
    }

    if (updates.length === 0) {
      toast.info(t('No changes to save'))
      return
    }

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }

    form.reset({
      ...values,
      subscriptionPlanTitle: values.subscriptionPlanTitle.trim(),
      countOptions: stringifyJson(JSON.parse(normalizedCountOptions)),
      tiers: stringifyJson(JSON.parse(normalizedTiers)),
    })
  }

  return (
    <SettingsSection
      title={t('Blind Box Event')}
      description={t('Configure blind box sale rules, reward pool, and pity mechanism')}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <FormLabel className='text-base'>{t('Enable blind box')}</FormLabel>
                  <FormDescription>
                    {t('Expose blind box purchase and opening in the wallet page')}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={updateOption.isPending || isSubmitting}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
            <FormField control={form.control} name='unitPrice' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Unit price (USD)')}</FormLabel>
                <FormControl><Input type='number' step='0.01' min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='expireDays' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Quota expiry days')}</FormLabel>
                <FormControl><Input type='number' min={1} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='dailyLimit' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Daily purchase limit')}</FormLabel>
                <FormControl><Input type='number' min={1} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='monthlyLimit' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Monthly purchase limit')}</FormLabel>
                <FormControl><Input type='number' min={1} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
            <FormField control={form.control} name='dailyOpenLimit' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Daily open limit')}</FormLabel>
                <FormControl><Input type='number' min={1} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='pityThreshold' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Pity threshold')}</FormLabel>
                <FormControl><Input type='number' min={1} {...field} /></FormControl>
                <FormDescription>
                  {t('Guaranteed reward is triggered after this many low-value opens')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='pityGuaranteeUSD' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Pity guarantee (USD)')}</FormLabel>
                <FormControl><Input type='number' step='0.01' min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='lowRewardThresholdUSD' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Low reward threshold (USD)')}</FormLabel>
                <FormControl><Input type='number' step='0.01' min={0} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className='grid gap-6 md:grid-cols-2'>
            <FormField control={form.control} name='subscriptionPrizeProbability' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Subscription prize probability')}</FormLabel>
                <FormControl><Input type='number' step='0.0001' min={0} max={1} {...field} /></FormControl>
                <FormDescription>
                  {t('Use decimal probability. 0.003 means 0.3%.')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name='subscriptionPlanTitle' render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Subscription reward title')}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormDescription>
                  {t('Displayed when the rare subscription reward is opened')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {enabled ? (
            <>
              <FormField control={form.control} name='countOptions' render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Purchase quantity options')}</FormLabel>
                  <FormControl><Textarea rows={4} {...field} /></FormControl>
                  <FormDescription>
                    {t('JSON array, for example [1, 5, 10, 20, 50]')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name='tiers' render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Reward tiers')}</FormLabel>
                  <FormControl><Textarea rows={10} {...field} /></FormControl>
                  <FormDescription>
                    {t('JSON array with name, min_usd, max_usd, probability')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </>
          ) : null}

          <Button type='submit' disabled={!isDirty || updateOption.isPending || isSubmitting}>
            {updateOption.isPending || isSubmitting ? t('Saving...') : t('Save blind box settings')}
          </Button>
        </form>
      </Form>
    </SettingsSection>
  )
}
