import type { GeneMapSnapshot } from './types'

const PALETTE = [
  ['#f43f5e', '#fb923c'],
  ['#0ea5e9', '#22d3ee'],
  ['#10b981', '#a3e635'],
  ['#8b5cf6', '#d946ef'],
  ['#f59e0b', '#fde047'],
  ['#334155', '#94a3b8'],
]

function getPalette(index: number) {
  return PALETTE[index % PALETTE.length]
}

function formatInt(value: number) {
  return new Intl.NumberFormat('zh-CN').format(Math.round(value))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportGeneMapPoster(args: {
  snapshot: GeneMapSnapshot
  shareUrl: string
  qrCanvas?: HTMLCanvasElement | null
}) {
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 1200
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('当前浏览器不支持画布导出')
  }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#ecfccb')
  gradient.addColorStop(0.35, '#ffffff')
  gradient.addColorStop(1, '#e0f2fe')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 58px "Segoe UI", sans-serif'
  ctx.fillText('API 调用基因图', 80, 110)
  ctx.font = '700 42px "Segoe UI", sans-serif'
  ctx.fillText(args.snapshot.archetype, 80, 175)
  ctx.font = '400 24px "Segoe UI", sans-serif'
  ctx.fillStyle = '#475569'
  ctx.fillText(args.snapshot.tagline, 80, 220)

  const metrics = [
    ['请求数', formatInt(args.snapshot.total_requests)],
    ['Token', formatInt(args.snapshot.total_tokens)],
    ['模型数', formatInt(args.snapshot.models.length)],
    ['周期', `${args.snapshot.window_days}天`],
  ]
  metrics.forEach(([label, value], index) => {
    const x = 80 + index * 240
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.fillRect(x, 280, 200, 108)
    ctx.strokeStyle = 'rgba(15,23,42,0.08)'
    ctx.strokeRect(x, 280, 200, 108)
    ctx.fillStyle = '#64748b'
    ctx.font = '600 18px "Segoe UI", sans-serif'
    ctx.fillText(label, x + 20, 320)
    ctx.fillStyle = '#0f172a'
    ctx.font = '700 30px "Segoe UI", sans-serif'
    ctx.fillText(value, x + 20, 360)
  })

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 28px "Segoe UI", sans-serif'
  ctx.fillText('模型构成', 80, 470)
  let y = 520
  args.snapshot.models.slice(0, 6).forEach((model, index) => {
    const [start, end] = getPalette(index)
    const width = Math.max(120, model.share * 780)
    const gradientBar = ctx.createLinearGradient(80, 0, 80 + width, 0)
    gradientBar.addColorStop(0, start)
    gradientBar.addColorStop(1, end)
    ctx.fillStyle = 'rgba(15,23,42,0.08)'
    ctx.fillRect(80, y, 780, 28)
    ctx.fillStyle = gradientBar
    ctx.fillRect(80, y, width, 28)
    ctx.fillStyle = '#0f172a'
    ctx.font = '600 22px "Segoe UI", sans-serif'
    ctx.fillText(model.model, 880, y + 22)
    ctx.font = '500 18px "Segoe UI", sans-serif'
    ctx.fillStyle = '#475569'
    ctx.fillText(
      `${(model.share * 100).toFixed(1)}% · ${formatInt(model.requests)} 次请求`,
      1140,
      y + 22
    )
    y += 52
  })

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 28px "Segoe UI", sans-serif'
  ctx.fillText('时段活跃度', 80, 900)
  y = 950
  args.snapshot.time_bands.forEach((band) => {
    ctx.fillStyle = '#64748b'
    ctx.font = '600 18px "Segoe UI", sans-serif'
    ctx.fillText(band.label, 80, y + 18)
    ctx.fillStyle = 'rgba(15,23,42,0.08)'
    ctx.fillRect(220, y, 420, 20)
    ctx.fillStyle = band.is_peak ? '#0f172a' : '#0ea5e9'
    ctx.fillRect(220, y, Math.max(24, band.weight * 420), 20)
    ctx.fillStyle = '#0f172a'
    ctx.fillText(formatInt(band.requests), 670, y + 18)
    y += 40
  })

  const sharePanelX = 980
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.fillRect(980, 280, 540, 760)
  ctx.strokeStyle = 'rgba(15,23,42,0.08)'
  ctx.strokeRect(980, 280, 540, 760)

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 28px "Segoe UI", sans-serif'
  ctx.fillText(args.snapshot.share_caption, sharePanelX + 36, 340)

  ctx.fillStyle = '#64748b'
  ctx.font = '400 19px "Segoe UI", sans-serif'
  const shareLines = wrapText(ctx, args.shareUrl, 430)
  shareLines.forEach((line, index) => {
    ctx.fillText(line, sharePanelX + 36, 396 + index * 28)
  })

  if (args.qrCanvas) {
    ctx.drawImage(args.qrCanvas, sharePanelX + 116, 470, 260, 260)
  } else {
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(sharePanelX + 116, 470, 260, 260)
  }

  ctx.fillStyle = '#0f172a'
  ctx.font = '700 24px "Segoe UI", sans-serif'
  ctx.fillText('稀有模型标记', sharePanelX + 36, 820)

  const rareText =
    args.snapshot.rare_models.length > 0
      ? args.snapshot.rare_models.map((item) => item.model).join('、')
      : '暂无稀有模型标记'
  const rareLines = wrapText(ctx, rareText, 430)
  ctx.fillStyle = '#475569'
  ctx.font = '500 18px "Segoe UI", sans-serif'
  rareLines.forEach((line, index) => {
    ctx.fillText(line, sharePanelX + 36, 868 + index * 26)
  })

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  )
  if (!blob) {
    throw new Error('导出图片失败')
  }

  downloadBlob(blob, `api-gene-map-${args.snapshot.generated_at}.png`)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const units = Array.from(text)
  const lines: string[] = []
  let current = ''

  units.forEach((unit) => {
    const next = `${current}${unit}`
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
      return
    }

    if (current) {
      lines.push(current)
    }
    current = unit
  })

  if (current) {
    lines.push(current)
  }

  return lines
}
