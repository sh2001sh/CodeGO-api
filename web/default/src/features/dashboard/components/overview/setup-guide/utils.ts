import { normalizePublicServerAddress } from '@/lib/server-url'
import type { ApiKey } from '@/features/keys/types'

export const SETUP_GUIDE_VISIBILITY_STORAGE_KEY =
  'dashboard_overview_setup_guide_expanded'

export const SETUP_GUIDE_CODE_PATTERN = [
  'const request = await client.responses.create({',
  "  model: 'gpt-4.1-mini',",
  "  input: 'Start routing traffic',",
  '})',
  '',
  'if (request.output_text) {',
  '  console.log(request.output_text)',
  '}',
].join('\n')

export function getSavedSetupGuideExpanded(): boolean | null {
  if (typeof window === 'undefined') return null
  const saved = window.localStorage.getItem(SETUP_GUIDE_VISIBILITY_STORAGE_KEY)
  if (saved === 'expanded') return true
  if (saved === 'collapsed') return false
  return null
}

export function saveSetupGuideExpanded(expanded: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    SETUP_GUIDE_VISIBILITY_STORAGE_KEY,
    expanded ? 'expanded' : 'collapsed'
  )
}

function getCurrentOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function normalizeServerBase(sourceUrl?: string): string {
  const fallback = getCurrentOrigin()
  const trimmed = sourceUrl?.trim()
  if (!trimmed) return normalizePublicServerAddress(fallback)

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')
  if (withoutTrailingSlash.endsWith('/v1/chat/completions')) {
    return normalizePublicServerAddress(
      withoutTrailingSlash.replace(/\/v1\/chat\/completions$/i, '')
    )
  }
  if (withoutTrailingSlash.endsWith('/v1/messages')) {
    return normalizePublicServerAddress(
      withoutTrailingSlash.replace(/\/v1\/messages$/i, '')
    )
  }
  if (withoutTrailingSlash.endsWith('/v1')) {
    return normalizePublicServerAddress(
      withoutTrailingSlash.replace(/\/v1$/i, '')
    )
  }
  return normalizePublicServerAddress(withoutTrailingSlash)
}

export function normalizeEndpoint(sourceUrl?: string): string {
  return `${normalizeServerBase(sourceUrl)}/v1/chat/completions`
}

export function normalizeAnthropicEndpoint(sourceUrl?: string): string {
  return `${normalizeServerBase(sourceUrl)}/v1/messages`
}

export function getPreferredKey(keys: ApiKey[]): ApiKey | null {
  return keys.find((item) => item.status === 1) ?? keys[0] ?? null
}

export function formatDisplayKey(key?: string): string {
  if (!key) return 'sk-...'
  if (key.length <= 14) return key
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

export function buildCurlCommand(args: {
  endpoint: string
  apiKey: string
  model: string
}): string {
  return [
    `curl ${args.endpoint} \\`,
    '  -H "Content-Type: application/json" \\',
    `  -H "Authorization: Bearer ${args.apiKey}" \\`,
    `  -d '{"model":"${args.model}","messages":[{"role":"user","content":"Say hello in one sentence."}]}'`,
  ].join('\n')
}
