export const QUOTA_PER_UNIT = 500000

export function formatQuota(quota: number) {
  return `$${(quota / QUOTA_PER_UNIT).toFixed(2)}`
}
