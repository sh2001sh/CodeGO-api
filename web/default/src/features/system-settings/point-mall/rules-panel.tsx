import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  adminGetPointMallRules,
  adminUpdatePointMallRules,
} from '@/features/point-mall/api'
import type { PointMallRules } from '@/features/point-mall/types'

const planKeys = ['Lite', 'Standard', 'Pro', 'Ultra'] as const

export function RulesPanel() {
  const queryClient = useQueryClient()
  const rulesQuery = useQuery({
    queryKey: ['point-mall-admin', 'rules'],
    queryFn: adminGetPointMallRules,
  })
  const [draft, setDraft] = useState<PointMallRules | null>(null)
  const saveMutation = useMutation({
    mutationFn: adminUpdatePointMallRules,
    onSuccess: async (res) => {
      if (res.success) {
        toast.success('规则已保存')
        await queryClient.invalidateQueries({
          queryKey: ['point-mall-admin', 'rules'],
        })
      }
    },
  })

  useEffect(() => {
    if (rulesQuery.data?.data) {
      setDraft(rulesQuery.data.data)
    }
  }, [rulesQuery.data])

  if (!draft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>规则配置</CardTitle>
        </CardHeader>
        <CardContent className='text-muted-foreground text-sm'>
          正在加载规则...
        </CardContent>
      </Card>
    )
  }

  const patch = (key: keyof PointMallRules, value: number) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  const patchPlan = (key: (typeof planKeys)[number], value: number) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            package_purchase_points: {
              ...current.package_purchase_points,
              [key]: value,
            },
          }
        : current
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>规则配置</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <NumberField
            label='赠送额度兑换比例（元/积分）'
            value={draft.bonus_quota_per_point_usd}
            onChange={(value) => patch('bonus_quota_per_point_usd', value)}
          />
          <NumberField
            label='每月兑换上限（元）'
            value={draft.monthly_bonus_convert_limit_usd}
            onChange={(value) =>
              patch('monthly_bonus_convert_limit_usd', value)
            }
          />
          <NumberField
            label='京东 E 卡每日次数'
            value={draft.jd_card_daily_limit}
            onChange={(value) => patch('jd_card_daily_limit', value)}
          />
          <NumberField
            label='京东 E 卡月面值'
            value={draft.jd_card_monthly_face_limit}
            onChange={(value) => patch('jd_card_monthly_face_limit', value)}
          />
        </div>

        <div className='space-y-3'>
          <div className='text-sm font-medium'>套餐购买赠送积分</div>
          <div className='grid gap-3 md:grid-cols-4'>
            {planKeys.map((key) => (
              <NumberField
                key={key}
                label={key}
                value={draft.package_purchase_points[key] ?? 0}
                onChange={(value) => patchPlan(key, value)}
              />
            ))}
          </div>
        </div>

        <Button
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(draft)}
        >
          保存规则
        </Button>
      </CardContent>
    </Card>
  )
}

function NumberField(props: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className='space-y-1.5'>
      <Label>{props.label}</Label>
      <Input
        type='number'
        min={0}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </div>
  )
}
