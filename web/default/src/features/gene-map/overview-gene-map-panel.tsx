import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Dna, Download, Link2, QrCode, RefreshCw, Share2 } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { createGeneMapShare, generateGeneMap } from './api'
import { exportGeneMapPoster } from './export'
import { GeneMapCard } from './gene-map-card'
import type { GeneMapSharePayload } from './types'

interface OverviewGeneMapPanelProps {
  compact?: boolean
  className?: string
}

export function OverviewGeneMapPanel(props: OverviewGeneMapPanelProps) {
  const [open, setOpen] = useState(false)
  const [sharePayload, setSharePayload] = useState<GeneMapSharePayload | null>(
    null
  )
  const qrHostRef = useRef<HTMLDivElement | null>(null)

  const geneMapQuery = useQuery({
    queryKey: ['gene-map', 'self', 30],
    queryFn: async () => {
      const res = await generateGeneMap(30)
      return res.success && res.data ? res.data : null
    },
    enabled: open,
    staleTime: 60 * 1000,
  })

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await createGeneMapShare(30)
      if (!res.success || !res.data) {
        throw new Error(res.message || '生成分享链接失败')
      }
      return res.data
    },
    onSuccess: (data) => {
      setSharePayload(data)
      toast.success(
        data.rewarded
          ? '基因图已生成，分享任务奖励已到账。'
          : '基因图分享链接已生成。'
      )
    },
    onError: (error: Error) => {
      toast.error(error.message || '生成分享链接失败')
    },
  })

  const snapshot = sharePayload?.snapshot || geneMapQuery.data
  const shareUrl = sharePayload?.share_url || ''
  const readyToExport = useMemo(
    () => Boolean(snapshot && shareUrl),
    [shareUrl, snapshot]
  )

  const handleCopy = async () => {
    if (!sharePayload?.share_text) return
    await navigator.clipboard.writeText(sharePayload.share_text)
    toast.success('分享文案已复制')
  }

  const handleExport = async () => {
    if (!snapshot || !shareUrl) return
    const qrCanvas = qrHostRef.current?.querySelector('canvas') || null

    try {
      await exportGeneMapPoster({
        snapshot,
        shareUrl,
        qrCanvas,
      })
      toast.success('基因图海报已导出')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出图片失败')
    }
  }

  return (
    <>
      {props.compact ? (
        <button
          type='button'
          onClick={() => setOpen(true)}
          className={cn(
            'group rounded-[22px] border border-emerald-200 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_26%),linear-gradient(135deg,rgba(247,254,231,0.98),rgba(240,253,250,0.98),rgba(255,255,255,0.98))] p-4 text-left transition-transform hover:-translate-y-0.5 dark:border-emerald-500/20 dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(135deg,rgba(2,44,34,0.96),rgba(15,23,42,0.95),rgba(17,24,39,0.96))]',
            props.className
          )}
        >
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-200'>
                <Dna className='size-4' />
                基因测序
              </div>
              <div className='mt-2 text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50'>
                生成一张可分享的调用基因图
              </div>
              <div className='mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300'>
                模型占比、活跃时段和稀有模型调用会压成一张图，扫码后还能进入双人对比页。
              </div>
            </div>
            <span className='rounded-full border border-emerald-300 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-slate-950/40 dark:text-emerald-200'>
              立即生成
            </span>
          </div>
        </button>
      ) : (
        <div
          className={cn(
            'overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98),rgba(240,253,250,0.98))] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_30%),linear-gradient(145deg,rgba(2,6,23,0.96),rgba(15,23,42,0.96),rgba(17,24,39,0.94))]',
            props.className
          )}
        >
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='max-w-2xl'>
              <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400'>
                <Dna className='size-4' />
                分享裂变
              </div>
              <h3 className='mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white'>
                API 基因测序
              </h3>
              <p className='mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300'>
                把模型占比、调用时段和稀有模型痕迹压成一张可分享的调用基因图。好友扫码后可直接查看，登录后自动进入双人对比。
              </p>
            </div>

            <Button className='rounded-full px-5' onClick={() => setOpen(true)}>
              生成我的基因图
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='flex max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl'>
          <DialogHeader className='border-b border-slate-200 px-5 py-4 dark:border-slate-800'>
            <DialogTitle className='flex items-center gap-2 text-lg'>
              <Dna className='size-5' />
              API 调用基因图
            </DialogTitle>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto px-5 py-5'>
            <div className='space-y-4'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div className='text-sm text-slate-500 dark:text-slate-400'>
                  {snapshot
                    ? '图谱已生成，可以直接分享、复制文案或导出海报。'
                    : '正在读取最近 30 天的调用画像。'}
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    onClick={() => {
                      setSharePayload(null)
                      void geneMapQuery.refetch()
                    }}
                    disabled={geneMapQuery.isFetching}
                  >
                    <RefreshCw
                      data-icon='inline-start'
                      className={geneMapQuery.isFetching ? 'animate-spin' : ''}
                    />
                    刷新图谱
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => void shareMutation.mutateAsync()}
                    disabled={shareMutation.isPending}
                  >
                    <Share2 data-icon='inline-start' />
                    生成分享链接
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => void handleCopy()}
                    disabled={!sharePayload}
                  >
                    <Link2 data-icon='inline-start' />
                    复制文案
                  </Button>
                  <Button
                    onClick={() => void handleExport()}
                    disabled={!readyToExport}
                  >
                    <Download data-icon='inline-start' />
                    导出海报
                  </Button>
                </div>
              </div>

              {snapshot ? (
                <GeneMapCard snapshot={snapshot} />
              ) : (
                <div className='rounded-[28px] border border-dashed border-slate-300 px-6 py-20 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400'>
                  正在生成你的 API 调用基因图...
                </div>
              )}

              {sharePayload ? (
                <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]'>
                  <div className='rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/55'>
                    <div className='text-sm font-semibold text-slate-950 dark:text-slate-50'>
                      分享文案
                    </div>
                    <div className='mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200'>
                      {sharePayload.share_text}
                    </div>
                  </div>

                  <div className='rounded-[24px] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/55'>
                    <div className='flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-50'>
                      <QrCode className='size-4 text-emerald-500' />
                      分享二维码
                    </div>
                    <div
                      ref={qrHostRef}
                      className='mt-4 flex flex-col items-center gap-3'
                    >
                      <div className='rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700'>
                        <QRCodeCanvas value={sharePayload.share_url} size={220} />
                      </div>
                      <div className='break-all text-center text-xs leading-6 text-slate-500 dark:text-slate-400'>
                        {sharePayload.share_url}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
