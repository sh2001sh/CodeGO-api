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
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getUserModels } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { ComboboxInput } from '@/components/ui/combobox-input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createDesktopImportLink } from '../../api'
import {
  DESKTOP_IMPORT_APP_CONFIGS,
  type DesktopImportApp,
} from './cc-switch-dialog-config'
import { openDesktopImportDeepLink } from './cc-switch-dialog-open'
import { submitDesktopImportRequest } from './cc-switch-dialog-submit'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tokenId: number | null
}

export function CCSwitchDialog(props: Props) {
  const { t } = useTranslation()
  const [app, setApp] = useState<DesktopImportApp>('claude')
  const [name, setName] = useState<string>(
    DESKTOP_IMPORT_APP_CONFIGS.claude.defaultName
  )
  const [models, setModels] = useState<Record<string, string>>({})

  const { data: modelsData } = useQuery({
    queryKey: ['user-models-ccswitch'],
    queryFn: getUserModels,
    enabled: props.open,
    staleTime: 5 * 60 * 1000,
  })

  const modelOptions = useMemo(() => {
    const items = modelsData?.data ?? []
    return items.map((m) => ({ value: m, label: m }))
  }, [modelsData?.data])

  useEffect(() => {
    if (props.open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModels({})

      setApp('claude')

      setName(DESKTOP_IMPORT_APP_CONFIGS.claude.defaultName)
    }
  }, [props.open])

  const currentConfig = DESKTOP_IMPORT_APP_CONFIGS[app]

  const handleAppChange = (val: string) => {
    const appVal = val as DesktopImportApp
    setApp(appVal)
    setName(DESKTOP_IMPORT_APP_CONFIGS[appVal].defaultName)
    setModels({})
  }

  const handleSubmit = async () => {
    const result = await submitDesktopImportRequest(
      {
        app,
        tokenId: props.tokenId,
        name,
        models,
      },
      {
        createDesktopImportLink,
        openDesktopImportDeepLink,
        t,
        windowLike: window,
      }
    )

    if (result.tone === 'warning') {
      toast.warning(result.message)
      return
    }

    if (result.tone === 'error') {
      toast.error(result.message)
      return
    }

    if (result.tone === 'success') {
      props.onOpenChange(false)
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('Import to Code Go Desktop')}</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>{t('Application')}</Label>
            <RadioGroup
              value={app}
              onValueChange={handleAppChange}
              className='grid grid-cols-2 gap-3 sm:grid-cols-3'
            >
              {(
                Object.entries(DESKTOP_IMPORT_APP_CONFIGS) as [
                  DesktopImportApp,
                  (typeof DESKTOP_IMPORT_APP_CONFIGS)[DesktopImportApp],
                ][]
              ).map(([key, cfg]) => (
                <div
                  key={key}
                  className='border-input bg-background flex items-center gap-2 rounded-md border px-3 py-2'
                >
                  <RadioGroupItem value={key} id={`app-${key}`} />
                  <Label
                    htmlFor={`app-${key}`}
                    className='cursor-pointer text-sm leading-5'
                  >
                    {cfg.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className='space-y-2'>
            <Label>{t('Name')}</Label>
            <ComboboxInput
              options={[]}
              value={name}
              onValueChange={setName}
              placeholder={currentConfig.defaultName}
              emptyText=''
            />
          </div>

          {currentConfig.modelFields.map((field) => (
            <div key={field.key} className='space-y-2'>
              <Label>
                {t(field.labelKey)}
                {field.required && (
                  <span className='text-destructive ml-0.5'>*</span>
                )}
              </Label>
              <ComboboxInput
                options={modelOptions}
                value={models[field.key] || ''}
                onValueChange={(v) =>
                  setModels((prev) => ({ ...prev, [field.key]: v }))
                }
                placeholder={t('Select or enter model name')}
                emptyText={t('No models found')}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => props.onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit}>{t('Open Code Go Desktop')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
