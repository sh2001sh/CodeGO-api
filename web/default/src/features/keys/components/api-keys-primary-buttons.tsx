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
import { Download, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadCodexSetupScript } from '../lib/codex-config-script'
import { useApiKeys } from './api-keys-provider'

export function ApiKeysPrimaryButtons() {
  const { t } = useTranslation()
  const { setOpen } = useApiKeys()
  return (
    <div className='flex gap-2'>
      <Button size='sm' onClick={() => setOpen('create')}>
        <Plus className='h-4 w-4' />
        {t('Create API Key')}
      </Button>
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          downloadCodexSetupScript('windows')
          toast.success(t('Downloaded Codex Windows setup script'))
        }}
      >
        <Download className='h-4 w-4' />
        {t('Download Codex Windows Script')}
      </Button>
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          downloadCodexSetupScript('linux')
          toast.success(t('Downloaded Codex Linux setup script'))
        }}
      >
        <Download className='h-4 w-4' />
        {t('Download Codex Linux Script')}
      </Button>
    </div>
  )
}
