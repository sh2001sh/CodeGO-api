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
import { useNotificationStore } from '@/stores/notification-store'
import { getPeoplePlanOverview } from './api'

const POPUP_TITLE = 'Code Go 人海计划已开启'
const POPUP_SUBTITLE = '登录后可直接查看组队活动和投稿活动'
const POPUP_BODY =
  '组队活动看小队，投稿活动看个人。进入后可直接查看总奖池、完成次数和贡献分配。'

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-5xl overflow-hidden p-0'>
        <DialogHeader className='sr-only'>
          <DialogTitle>{POPUP_TITLE}</DialogTitle>
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
            <div className='max-w-3xl space-y-4 pt-2 lg:pt-6'>
              <div className='inline-flex w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80'>
                登录后自动弹窗提醒
              </div>
              <div className='space-y-3'>
                <h2 className='text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl'>
                  {POPUP_TITLE}
                </h2>
                <p className='text-sm leading-7 text-white/88 sm:text-base'>
                  {POPUP_SUBTITLE}
                </p>
              </div>
            </div>

            <div className='max-w-2xl rounded-3xl border border-white/12 bg-black/30 p-5 backdrop-blur-sm'>
              <p className='text-sm leading-7 text-white/88'>{POPUP_BODY}</p>
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
