import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatMoney } from './utils'
import { useNotificationStore } from '@/stores/notification-store'
import { getPeoplePlanOverview } from './api'

export function PeoplePlanEntryDialog() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const overviewQuery = useQuery({
    queryKey: ['people-plan', 'overview'],
    queryFn: getPeoplePlanOverview,
  })
  const notificationStore = useNotificationStore()
  const overview = overviewQuery.data?.data

  const shouldOpen = useMemo(() => {
    if (!overview?.enabled || !overview.popup.enabled) {
      return false
    }
    if (!overview.popup.version) {
      return false
    }
    if (notificationStore.peoplePlanDismissedVersion === overview.popup.version) {
      return false
    }
    if (notificationStore.isPeoplePlanClosed()) {
      return false
    }
    return true
  }, [
    notificationStore,
    overview?.enabled,
    overview?.popup.enabled,
    overview?.popup.version,
  ])

  useEffect(() => {
    if (shouldOpen) {
      setOpen(true)
    }
  }, [shouldOpen])

  const handleCloseToday = () => {
    notificationStore.setPeoplePlanClosedUntilDate(new Date().toDateString())
    setOpen(false)
  }

  const handleDismissVersion = () => {
    if (overview?.popup.version) {
      notificationStore.dismissPeoplePlanVersion(overview.popup.version)
    }
    setOpen(false)
  }

  const handleViewDetails = async () => {
    setOpen(false)
    await navigate({ to: '/people-plan' })
  }

  if (!overview?.enabled || !overview.popup.enabled) {
    return null
  }

  const popupTitle = overview.popup.title || 'Code Go 人海计划已开启'
  const maxTotal = overview.max_total_reward_usd ?? 0
  const maxTeam = overview.max_team_reward_usd ?? 0
  const maxSubmission = overview.max_submission_reward_usd ?? 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-5xl overflow-hidden p-0'>
        <DialogHeader className='sr-only'>
          <DialogTitle>{popupTitle}</DialogTitle>
        </DialogHeader>

        <div className='relative min-h-[460px] overflow-hidden bg-slate-950 text-white lg:min-h-[620px]'>
          <img
            src='/people-plan-poster.png'
            alt='人海计划活动海报'
            className='absolute inset-0 h-full w-full object-cover'
          />
          <div className='absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/38' />
          <div className='absolute inset-0 bg-gradient-to-t from-slate-950/96 via-transparent to-slate-950/18' />

          <div className='relative flex min-h-[460px] flex-col justify-between gap-8 p-6 sm:p-8 lg:min-h-[620px] lg:p-10'>
            <div className='max-w-3xl space-y-5 pt-2 lg:pt-6'>
              <div className='inline-flex w-fit rounded-full border border-amber-300/40 bg-amber-400/20 px-4 py-1.5 text-sm font-medium text-amber-100'>
                单人最高可获 {formatMoney(maxTotal)} 等值额度
              </div>
              <div className='space-y-4'>
                <h2 className='text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl'>
                  {popupTitle}
                </h2>
                <p className='max-w-xl text-base leading-7 text-white/90 sm:text-lg'>
                  组队做任务，按贡献分奖金；独立投稿，奖励个人独享。两项可叠加。
                </p>
              </div>

              <div className='flex flex-wrap gap-3'>
                <div className='rounded-2xl border border-white/12 bg-white/5 px-4 py-3 backdrop-blur-sm'>
                  <div className='text-xs text-white/60'>组队活动单人最高</div>
                  <div className='mt-0.5 text-xl font-semibold text-white'>{formatMoney(maxTeam)}</div>
                </div>
                <div className='rounded-2xl border border-white/12 bg-white/5 px-4 py-3 backdrop-blur-sm'>
                  <div className='text-xs text-white/60'>投稿活动单人最高</div>
                  <div className='mt-0.5 text-xl font-semibold text-white'>{formatMoney(maxSubmission)}</div>
                </div>
              </div>
            </div>

            <div className='max-w-xl rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm'>
              <p className='text-sm leading-6 text-white/80'>
                进入后可直接查看每项任务的总奖池、完成进度和你的预估分成。未组队也能先看全部内容。
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2 border-t px-6 py-4 sm:px-8'>
          <Button variant='outline' onClick={handleCloseToday}>
            今日稍后提醒
          </Button>
          <Button variant='outline' onClick={handleDismissVersion}>
            本版本不再提醒
          </Button>
          <Button onClick={handleViewDetails}>查看活动详情</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
