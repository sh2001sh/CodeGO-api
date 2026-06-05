/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { nanoid } from 'nanoid'
import {
  AlertCircle,
  Clock3,
  Download,
  History,
  ImagePlus,
  Images,
  PenSquare,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ImageDialog } from '@/features/usage-logs/components/dialogs/image-dialog'
import {
  fetchImageWorkspaceSourceFile,
  getImageWorkspaceGroups,
  getImageWorkspaceItems,
  getImageWorkspaceModels,
  submitImageEdit,
  submitImageGeneration,
} from './api'
import type {
  GroupOption,
  ImageWorkspaceFormState,
  ImageWorkspaceItem,
  ModelOption,
} from './types'

const SESSION_STORAGE_KEY = 'image_workspace_session_id'

const SIZE_OPTIONS = [
  '1024x1024',
  '1024x1536',
  '1536x1024',
  '1792x1024',
  '1024x1792',
]

const QUALITY_OPTIONS = ['standard', 'hd']
const COUNT_OPTIONS = ['1', '2', '3', '4']

function createSessionId() {
  return `imgs_${Date.now()}_${nanoid(8)}`
}

function createBatchId() {
  return `imgb_${Date.now()}_${nanoid(8)}`
}

function loadSessionId() {
  if (typeof window === 'undefined') {
    return createSessionId()
  }
  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (stored) {
    return stored
  }
  const next = createSessionId()
  window.localStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}

function saveSessionId(sessionId: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId)
  }
}

function getStatusVariant(status: ImageWorkspaceItem['status']) {
  if (status === 'ready') return 'default'
  if (status === 'expired') return 'outline'
  return 'destructive'
}

function dedupeItems(items: ImageWorkspaceItem[]) {
  const seen = new Set<number>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function ImageWorkspaceSkeleton() {
  return (
    <div className='grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]'>
      <Skeleton className='h-[38rem] rounded-3xl' />
      <Skeleton className='h-[38rem] rounded-3xl' />
    </div>
  )
}

export function ImageWorkspace() {
  const { t } = useTranslation()
  const [sessionId, setSessionId] = useState(loadSessionId)
  const [galleryTab, setGalleryTab] = useState('session')
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null)
  const [previewItem, setPreviewItem] = useState<ImageWorkspaceItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<ImageWorkspaceFormState>({
    mode: 'generate',
    model: '',
    group: '',
    prompt: '',
    size: SIZE_OPTIONS[0],
    quality: QUALITY_OPTIONS[0],
    count: COUNT_OPTIONS[0],
  })

  const modelsQuery = useQuery({
    queryKey: ['image-workspace-models'],
    queryFn: getImageWorkspaceModels,
  })

  const groupsQuery = useQuery({
    queryKey: ['image-workspace-groups'],
    queryFn: getImageWorkspaceGroups,
  })

  const sessionItemsQuery = useQuery({
    queryKey: ['image-workspace-items', sessionId],
    queryFn: () =>
      getImageWorkspaceItems({
        sessionId,
        page: 1,
        pageSize: 60,
      }),
  })

  const recentItemsQuery = useQuery({
    queryKey: ['image-workspace-items-recent'],
    queryFn: () =>
      getImageWorkspaceItems({
        page: 1,
        pageSize: 60,
      }),
  })

  useEffect(() => {
    const models = modelsQuery.data ?? []
    if (!form.model && models.length > 0) {
      const preferredModel =
        models.find((item) => item.value === 'gpt-image-2')?.value ??
        models[0].value
      setForm((prev) => ({ ...prev, model: preferredModel }))
    }
  }, [form.model, modelsQuery.data])

  useEffect(() => {
    const groups = groupsQuery.data ?? []
    if (!form.group && groups.length > 0) {
      const preferredGroup =
        groups.find((item) => item.value === 'default')?.value ??
        groups[0].value
      setForm((prev) => ({ ...prev, group: preferredGroup }))
    }
  }, [form.group, groupsQuery.data])

  const sessionItems = sessionItemsQuery.data?.items ?? []
  const recentItems = recentItemsQuery.data?.items ?? []
  const readySourceItems = dedupeItems(
    [...sessionItems, ...recentItems].filter(
      (item) => item.status === 'ready' && item.image_url
    )
  )
  const selectedSource =
    readySourceItems.find((item) => item.id === selectedSourceId) ?? null

  useEffect(() => {
    if (form.mode !== 'edit') return
    if (selectedSource) return
    if (readySourceItems.length > 0) {
      setSelectedSourceId(readySourceItems[0].id)
    }
  }, [form.mode, readySourceItems, selectedSource])

  const updateForm = <K extends keyof ImageWorkspaceFormState>(
    key: K,
    value: ImageWorkspaceFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleNewSession = () => {
    const nextSessionId = createSessionId()
    setSessionId(nextSessionId)
    saveSessionId(nextSessionId)
    setGalleryTab('session')
    setSelectedSourceId(null)
  }

  const handleSubmit = async () => {
    if (!form.model) {
      toast.error(t('Please choose a model'))
      return
    }
    if (!form.group) {
      toast.error(t('Please choose a group'))
      return
    }
    if (!form.prompt.trim()) {
      toast.error(t('Please enter a prompt'))
      return
    }

    if (form.mode === 'edit' && !selectedSource) {
      toast.error(t('Please choose a source image'))
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        model: form.model,
        prompt: form.prompt.trim(),
        size: form.size,
        quality: form.quality,
        n: Number(form.count),
      }
      const batchId = createBatchId()

      if (form.mode === 'generate') {
        await submitImageGeneration(payload, {
          group: form.group,
          sessionId,
          batchId,
        })
      } else if (selectedSource) {
        const imageFile = await fetchImageWorkspaceSourceFile(selectedSource)
        await submitImageEdit(
          payload,
          {
            group: form.group,
            sessionId,
            batchId,
            sourceItemId: selectedSource.id,
          },
          imageFile
        )
      }

      await Promise.all([
        sessionItemsQuery.refetch(),
        recentItemsQuery.refetch(),
      ])
      setGalleryTab('session')
      toast.success(
        form.mode === 'generate'
          ? t('Image generation completed')
          : t('Image edit completed')
      )
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t('Image request failed')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const applyItemPrompt = (item: ImageWorkspaceItem) => {
    setForm((prev) => ({
      ...prev,
      prompt: item.revised_prompt || item.prompt,
    }))
  }

  const startEditFromItem = (item: ImageWorkspaceItem) => {
    setSelectedSourceId(item.id)
    setForm((prev) => ({
      ...prev,
      mode: 'edit',
      prompt: item.revised_prompt || item.prompt,
      model: item.model || prev.model,
    }))
  }

  const isLoading =
    modelsQuery.isLoading ||
    groupsQuery.isLoading ||
    sessionItemsQuery.isLoading ||
    recentItemsQuery.isLoading

  if (isLoading && !modelsQuery.data && !groupsQuery.data) {
    return <ImageWorkspaceSkeleton />
  }

  const models = modelsQuery.data ?? []
  const groups = groupsQuery.data ?? []

  return (
    <>
      <div className='min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_24%),linear-gradient(180deg,_rgba(15,23,42,0.04),_transparent_32%),var(--background)] p-4 md:p-6'>
        <div className='mx-auto grid max-w-[1600px] gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]'>
          <Card className='border-border/70 overflow-hidden rounded-3xl xl:sticky xl:top-6 xl:h-fit'>
            <CardHeader className='bg-muted/30 relative overflow-hidden border-b pb-5'>
              <div className='absolute inset-x-0 top-0 h-24 bg-[linear-gradient(120deg,rgba(59,130,246,0.12),rgba(245,158,11,0.08),transparent)]' />
              <div className='relative flex items-start justify-between gap-3'>
                <div className='space-y-2'>
                  <Badge variant='outline' className='rounded-full'>
                    <Sparkles className='size-3.5' />
                    {t('Image Workspace')}
                  </Badge>
                  <CardTitle className='text-xl'>
                    {t('Generate and iterate on images')}
                  </CardTitle>
                  <CardDescription className='max-w-sm'>
                    {t(
                      'Use your own quota to create images, keep a temporary server-side history, and continue editing from saved results.'
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleNewSession}
                  disabled={isSubmitting}
                >
                  <RefreshCw className='size-4' />
                  {t('New Session')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-5 pt-5'>
              <div className='grid gap-3 rounded-2xl border border-dashed p-3'>
                <div className='flex items-center gap-2 text-sm font-medium'>
                  <Clock3 className='size-4 text-amber-500' />
                  {t('Temporary retention')}
                </div>
                <p className='text-muted-foreground text-sm leading-6'>
                  {t(
                    'Generated images are stored on the server for a limited time and cleaned up automatically to save disk space.'
                  )}
                </p>
                <div className='text-muted-foreground truncate text-xs'>
                  {t('Current session')}: {sessionId}
                </div>
              </div>

              <Tabs
                value={form.mode}
                onValueChange={(value) =>
                  updateForm('mode', value as ImageWorkspaceFormState['mode'])
                }
              >
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger value='generate'>
                    <WandSparkles className='size-4' />
                    {t('Generate')}
                  </TabsTrigger>
                  <TabsTrigger value='edit'>
                    <PenSquare className='size-4' />
                    {t('Edit')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className='grid gap-4'>
                <div className='grid gap-2'>
                  <Label>{t('Prompt')}</Label>
                  <Textarea
                    value={form.prompt}
                    onChange={(event) => updateForm('prompt', event.target.value)}
                    placeholder={t(
                      'Describe the scene, style, lighting, camera angle, and the visual details you want to preserve.'
                    )}
                    className='min-h-36'
                  />
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='grid gap-2'>
                    <Label>{t('Model')}</Label>
                    <Select
                      items={models.map((item: ModelOption) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      value={form.model}
                      onValueChange={(value) => updateForm('model', value ?? '')}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder={t('Select model')} />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {models.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='grid gap-2'>
                    <Label>{t('Group')}</Label>
                    <Select
                      items={groups.map((item: GroupOption) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      value={form.group}
                      onValueChange={(value) => updateForm('group', value ?? '')}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder={t('Select group')} />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {groups.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              <div className='flex items-center gap-2'>
                                <span>{item.label}</span>
                                <span className='text-muted-foreground text-xs'>
                                  x{item.ratio}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid gap-4 sm:grid-cols-3'>
                  <div className='grid gap-2'>
                    <Label>{t('Size')}</Label>
                    <Select
                      items={SIZE_OPTIONS.map((value) => ({
                        value,
                        label: value,
                      }))}
                      value={form.size}
                      onValueChange={(value) => updateForm('size', value ?? SIZE_OPTIONS[0])}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {SIZE_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='grid gap-2'>
                    <Label>{t('Quality')}</Label>
                    <Select
                      items={QUALITY_OPTIONS.map((value) => ({
                        value,
                        label: value,
                      }))}
                      value={form.quality}
                      onValueChange={(value) =>
                        updateForm('quality', value ?? QUALITY_OPTIONS[0])
                      }
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {QUALITY_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='grid gap-2'>
                    <Label>{t('Count')}</Label>
                    <Select
                      items={COUNT_OPTIONS.map((value) => ({
                        value,
                        label: value,
                      }))}
                      value={form.count}
                      onValueChange={(value) =>
                        updateForm('count', value ?? COUNT_OPTIONS[0])
                      }
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {COUNT_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.mode === 'edit' && (
                  <div className='grid gap-3 rounded-2xl border p-3'>
                    <div className='flex items-center justify-between gap-2'>
                      <div>
                        <div className='text-sm font-medium'>
                          {t('Source image')}
                        </div>
                        <p className='text-muted-foreground text-xs leading-5'>
                          {t(
                            'Choose a previously generated image to continue editing with the current prompt.'
                          )}
                        </p>
                      </div>
                      <Badge variant='outline'>
                        {readySourceItems.length} {t('available')}
                      </Badge>
                    </div>
                    {selectedSource ? (
                      <div className='grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]'>
                        <img
                          src={selectedSource.image_url}
                          alt={selectedSource.prompt}
                          className='h-28 w-full rounded-2xl border object-cover'
                        />
                        <div className='space-y-2'>
                          <div className='line-clamp-3 text-sm leading-6'>
                            {selectedSource.revised_prompt || selectedSource.prompt}
                          </div>
                          <div className='text-muted-foreground text-xs'>
                            {selectedSource.model} ·{' '}
                            {dayjs.unix(selectedSource.created_at).format('MM-DD HH:mm')}
                          </div>
                          <div className='flex flex-wrap gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setPreviewItem(selectedSource)}
                            >
                              {t('Preview')}
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => applyItemPrompt(selectedSource)}
                            >
                              {t('Reuse Prompt')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className='text-muted-foreground text-sm'>
                        {t('No available source image in your recent history yet.')}
                      </div>
                    )}
                    {readySourceItems.length > 0 && (
                      <div className='grid grid-cols-3 gap-2 md:grid-cols-4'>
                        {readySourceItems.slice(0, 8).map((item) => (
                          <button
                            key={item.id}
                            type='button'
                            onClick={() => setSelectedSourceId(item.id)}
                            className={`overflow-hidden rounded-2xl border text-left transition ${
                              selectedSourceId === item.id
                                ? 'border-primary ring-primary/20 ring-4'
                                : 'hover:border-primary/40'
                            }`}
                          >
                            <img
                              src={item.image_url}
                              alt={item.prompt}
                              className='aspect-square w-full object-cover'
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                <div className='flex flex-col gap-3 sm:flex-row'>
                  <Button
                    size='lg'
                    className='flex-1'
                    onClick={handleSubmit}
                    disabled={isSubmitting || !form.model || !form.group}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className='size-4 animate-spin' />
                        {t('Processing')}
                      </>
                    ) : (
                      <>
                        {form.mode === 'generate' ? (
                          <WandSparkles className='size-4' />
                        ) : (
                          <ImagePlus className='size-4' />
                        )}
                        {form.mode === 'generate'
                          ? t('Generate Images')
                          : t('Create Edited Images')}
                      </>
                    )}
                  </Button>
                  <Button
                    variant='outline'
                    size='lg'
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        prompt: '',
                      }))
                    }
                    disabled={isSubmitting}
                  >
                    {t('Clear Prompt')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className='grid gap-4'>
            <Card className='rounded-3xl border-border/70 overflow-hidden'>
              <CardHeader className='border-b bg-muted/20'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
                  <div>
                    <CardTitle>{t('Workspace gallery')}</CardTitle>
                    <CardDescription>
                      {t(
                        'Review your current session or jump across recent image batches.'
                      )}
                    </CardDescription>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() =>
                        Promise.all([
                          sessionItemsQuery.refetch(),
                          recentItemsQuery.refetch(),
                        ])
                      }
                    >
                      <RefreshCw className='size-4' />
                      {t('Refresh')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='pt-5'>
                <Tabs value={galleryTab} onValueChange={setGalleryTab}>
                  <TabsList className='mb-4 grid w-full grid-cols-2 sm:w-auto'>
                    <TabsTrigger value='session'>
                      <Images className='size-4' />
                      {t('Current Session')}
                    </TabsTrigger>
                    <TabsTrigger value='recent'>
                      <History className='size-4' />
                      {t('Recent History')}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value='session'>
                    <ImageGrid
                      t={t}
                      items={sessionItems}
                      emptyTitle={t('No images in this session')}
                      emptyDescription={t(
                        'Start with a prompt on the left. New results will appear here as soon as they are stored.'
                      )}
                      onPreview={setPreviewItem}
                      onReusePrompt={applyItemPrompt}
                      onEditFromItem={startEditFromItem}
                    />
                  </TabsContent>

                  <TabsContent value='recent'>
                    <ImageGrid
                      t={t}
                      items={recentItems}
                      emptyTitle={t('No recent image history')}
                      emptyDescription={t(
                        'Your recently generated images will be listed here until they expire and are cleaned up.'
                      )}
                      onPreview={setPreviewItem}
                      onReusePrompt={applyItemPrompt}
                      onEditFromItem={startEditFromItem}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ImageDialog
        imageUrl={previewItem?.image_url ?? ''}
        taskId={previewItem ? String(previewItem.id) : undefined}
        open={Boolean(previewItem)}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewItem(null)
          }
        }}
      />
    </>
  )
}

function ImageGrid({
  t,
  items,
  emptyTitle,
  emptyDescription,
  onPreview,
  onReusePrompt,
  onEditFromItem,
}: {
  t: (key: string) => string
  items: ImageWorkspaceItem[]
  emptyTitle: string
  emptyDescription: string
  onPreview: (item: ImageWorkspaceItem) => void
  onReusePrompt: (item: ImageWorkspaceItem) => void
  onEditFromItem: (item: ImageWorkspaceItem) => void
}) {
  if (items.length === 0) {
    return (
      <Empty className='min-h-72 rounded-3xl border'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Images className='size-4' />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='grid gap-4 md:grid-cols-2 2xl:grid-cols-3'>
      {items.map((item) => {
        const isReady = item.status === 'ready' && !!item.image_url
        const isExpired = item.status === 'expired'
        return (
          <Card
            key={item.id}
            size='sm'
            className='overflow-hidden rounded-3xl border-border/70'
          >
            <CardContent className='space-y-3 pt-3'>
              {isReady ? (
                <button
                  type='button'
                  onClick={() => onPreview(item)}
                  className='group relative block overflow-hidden rounded-2xl border'
                >
                  <img
                    src={item.image_url}
                    alt={item.prompt}
                    className='aspect-[1/1] w-full object-cover transition duration-300 group-hover:scale-[1.02]'
                  />
                </button>
              ) : (
                <div className='bg-muted flex aspect-square items-center justify-center rounded-2xl border'>
                  <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <AlertCircle className='size-4' />
                    {isExpired ? t('Expired') : t('Unavailable')}
                  </div>
                </div>
              )}

              <div className='flex items-start justify-between gap-3'>
                <div className='space-y-2'>
                  <div className='line-clamp-3 text-sm leading-6'>
                    {item.revised_prompt || item.prompt}
                  </div>
                  <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
                    <span>{item.model}</span>
                    <span>·</span>
                    <span>{dayjs.unix(item.created_at).format('MM-DD HH:mm')}</span>
                    {item.expires_at > 0 && !isExpired && (
                      <>
                        <span>·</span>
                        <span>
                          {t('Expires')} {dayjs.unix(item.expires_at).format('MM-DD HH:mm')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
              </div>

              {item.error_message && item.status !== 'ready' && (
                <div className='text-destructive rounded-2xl border border-dashed px-3 py-2 text-xs leading-5'>
                  {item.error_message}
                </div>
              )}

              <div className='flex flex-wrap gap-2'>
                {isReady && (
                  <Button variant='outline' size='sm' onClick={() => onPreview(item)}>
                    {t('Preview')}
                  </Button>
                )}
                {isReady && item.download_url && (
                  <Button
                    variant='outline'
                    size='sm'
                    render={
                      <a href={item.download_url}>
                        <Download className='size-4' />
                        {t('Download')}
                      </a>
                    }
                  />
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onReusePrompt(item)}
                >
                  {t('Reuse Prompt')}
                </Button>
                {isReady && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => onEditFromItem(item)}
                  >
                    {t('Edit From This')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
