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
import { getHomePagePackagesContent } from '../api'

const STORAGE_KEY = 'home_page_packages_content'

export function useHomePagePackagesContent() {
  const [content, setContent] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (mounted && cached) {
        setContent(cached)
      }

      try {
        const response = await getHomePagePackagesContent()
        if (!mounted) return
        const nextContent = response.success && response.data ? response.data : ''
        setContent(nextContent)
        if (nextContent) {
          localStorage.setItem(STORAGE_KEY, nextContent)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        // Keep cached content on transient public fetch failures.
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  return content
}
