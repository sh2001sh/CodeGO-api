import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const baseUrl = 'https://shu26.cfd'

const { searchPages } = await import(
  pathToFileUrl(path.join(projectRoot, 'src/features/search-pages/data.ts')).href,
)

const topicGroups = [
  {
    title: '核心入口',
    description:
      '覆盖 Codex API、Claude Code API、Codex 中转、Claude 中转等主搜索词。',
    match: (slug) =>
      [
        'codex-api',
        'codex-zhongzhuan',
        'claude-code-api',
        'claude-zhongzhuan',
        'ai-api-zhongzhuan',
      ].includes(slug),
  },
  {
    title: '接入教程',
    description:
      '覆盖教程、上手、配置、怎么用、怎么接等高频入门词。',
    match: (slug) =>
      /jiaocheng|shangshou|jinjie|peizhi|zenme-yong|zenme-jie/.test(slug),
  },
  {
    title: '比较与排障',
    description:
      '覆盖区别、怎么选、稳定吗、报错怎么办等决策与问题词。',
    match: (slug) => /vs|zenme-xuan|wending-ma|baocuo-zenmeban/.test(slug),
  },
]

function pathToFileUrl(filePath) {
  const resolved = path.resolve(filePath).replace(/\\/g, '/')
  return new URL(`file:///${resolved}`)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function slugToLabel(slug) {
  return slug.replaceAll('-', ' / ')
}

function buildTopicTitle(page) {
  return page.seoTitle.includes('Code Go')
    ? page.seoTitle
    : `${page.seoTitle} | Code Go`
}

function buildTopicDescription(page) {
  return `${page.description} ${page.intro}`.trim()
}

function keywordList(keywords) {
  return keywords
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
}

function renderPage({
  title,
  description,
  canonicalPath,
  ogType = 'article',
  keywords = '',
  body,
  jsonLd,
}) {
  const canonical = `${baseUrl}${canonicalPath}`

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="title" content="${escapeHtml(title)}" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="keywords" content="${escapeHtml(keywords)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="Code Go" />
    <meta property="og:image" content="${baseUrl}/logo.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${baseUrl}/logo.png" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f7fb;
        --surface: rgba(255, 255, 255, 0.8);
        --surface-strong: rgba(255, 255, 255, 0.92);
        --text: #18202b;
        --muted: #5e6774;
        --line: rgba(136, 154, 176, 0.2);
        --primary: #d96a39;
        --primary-soft: rgba(217, 106, 57, 0.12);
        --info: #3e76d2;
        --shadow: 0 18px 50px rgba(15, 20, 27, 0.08);
      }
      * { box-sizing: border-box; }
      html { scroll-behavior: smooth; }
      body {
        margin: 0;
        font-family: "Public Sans", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(217, 106, 57, 0.12), transparent 26%),
          radial-gradient(circle at 82% 6%, rgba(62, 118, 210, 0.1), transparent 24%),
          var(--bg);
        color: var(--text);
      }
      a {
        color: inherit;
        text-decoration: none;
      }
      .shell {
        width: min(1160px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 64px;
      }
      .hero,
      .panel,
      .section {
        border: 1px solid var(--line);
        background: var(--surface);
        backdrop-filter: blur(14px);
        border-radius: 24px;
        box-shadow: var(--shadow);
      }
      .hero {
        padding: 32px;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--surface-strong);
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
        color: #425062;
      }
      h1 {
        margin: 20px 0 0;
        max-width: 16ch;
        font-size: clamp(2.35rem, 5vw, 4.2rem);
        line-height: 1.02;
        letter-spacing: -0.03em;
        text-wrap: balance;
      }
      .hero-copy {
        margin: 16px 0 0;
        max-width: 72ch;
        font-size: 15px;
        line-height: 2;
        color: var(--muted);
      }
      .hero-links,
      .keyword-list,
      .action-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .hero-links {
        margin-top: 24px;
      }
      .pill,
      .action-link {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--surface-strong);
        padding: 10px 15px;
        font-size: 13px;
        font-weight: 600;
        color: #405064;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 20px;
        margin-top: 20px;
      }
      .main {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .hero-grid {
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
      }
      .panel,
      .section {
        padding: 24px;
      }
      .panel h2,
      .section h2,
      .group-head h2 {
        margin: 10px 0 0;
        font-size: 1.7rem;
        line-height: 1.2;
        letter-spacing: -0.02em;
        text-wrap: balance;
      }
      .kicker {
        font-size: 12px;
        font-weight: 700;
        color: var(--primary);
      }
      p {
        margin: 0;
        max-width: 72ch;
        font-size: 15px;
        line-height: 2;
        color: var(--muted);
        text-wrap: pretty;
      }
      p + p {
        margin-top: 16px;
      }
      .keyword-list {
        margin-top: 18px;
      }
      .toc {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      .toc-card,
      .topic-card,
      .side-card,
      .faq-item {
        border: 1px solid var(--line);
        background: var(--surface-strong);
        border-radius: 18px;
      }
      .toc-card,
      .topic-card,
      .side-card {
        padding: 18px;
      }
      .toc-card strong,
      .topic-card strong,
      .side-card strong,
      .faq-item strong {
        display: block;
        color: var(--text);
      }
      .toc-index {
        font-size: 12px;
        font-weight: 700;
        color: var(--primary);
      }
      .toc-card p,
      .topic-card p,
      .side-card p,
      .faq-item p {
        margin-top: 8px;
        font-size: 14px;
        line-height: 1.85;
      }
      .faq {
        display: grid;
        gap: 12px;
        margin-top: 18px;
      }
      .faq-item {
        padding: 18px 20px;
      }
      .aside {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .aside ul {
        margin: 16px 0 0;
        padding-left: 18px;
        color: var(--muted);
      }
      .aside li {
        margin-top: 10px;
        line-height: 1.85;
      }
      .side-stack {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 16px;
      }
      .topic-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }
      .group-head p {
        margin-top: 10px;
      }
      @media (max-width: 980px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .hero-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 640px) {
        .shell {
          width: min(100% - 24px, 1160px);
          padding-top: 20px;
        }
        .hero,
        .panel,
        .section {
          border-radius: 20px;
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    ${body}
    <script type="application/ld+json">${escapeHtml(JSON.stringify(jsonLd))}</script>
  </body>
</html>`
}

function renderHeader(title, description, eyebrow) {
  const links = [
    { label: '回到首页', href: '/' },
    { label: '查看模型', href: '/pricing' },
    { label: '使用教程', href: '/guide' },
  ]

  return `<section class="hero">
    <div class="eyebrow">${escapeHtml(eyebrow)}</div>
    <h1>${escapeHtml(title)}</h1>
    <p class="hero-copy">${escapeHtml(description)}</p>
    <div class="hero-links">
      ${links
        .map(
          (item) =>
            `<a class="pill" href="${item.href}">${escapeHtml(item.label)}</a>`,
        )
        .join('')}
    </div>
  </section>`
}

function renderTopicDetail(page) {
  const relatedPages = searchPages.filter((item) => item.slug !== page.slug).slice(0, 6)
  const keywords = keywordList(page.keywords)

  const toc = page.sections
    .map(
      (section, index) => `<a class="toc-card" href="#section-${index + 1}">
  <div class="toc-index">${String(index + 1).padStart(2, '0')}</div>
  <strong>${escapeHtml(section.heading)}</strong>
  <p>${escapeHtml(section.paragraphs[0] || page.intro)}</p>
</a>`,
    )
    .join('')

  const sections = page.sections
    .map(
      (section, index) => `<section class="section" id="section-${index + 1}">
  <div class="kicker">第 ${index + 1} 节</div>
  <h2>${escapeHtml(section.heading)}</h2>
  <div style="margin-top:18px;">
    ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
  </div>
</section>`,
    )
    .join('')

  const faq = page.faq
    .map(
      (item) => `<div class="faq-item">
  <strong>${escapeHtml(item.question)}</strong>
  <p>${escapeHtml(item.answer)}</p>
</div>`,
    )
    .join('')

  const related = relatedPages
    .map(
      (item) => `<a class="side-card" href="/topics/${item.slug}">
  <strong>${escapeHtml(item.title)}</strong>
  <p>${escapeHtml(item.description)}</p>
</a>`,
    )
    .join('')

  return renderPage({
    title: buildTopicTitle(page),
    description: buildTopicDescription(page),
    canonicalPath: `/topics/${page.slug}`,
    keywords: page.keywords,
    ogType: 'article',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Code Go', item: `${baseUrl}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: '专题页',
            item: `${baseUrl}/topics`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: page.title,
            item: `${baseUrl}/topics/${page.slug}`,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: buildTopicTitle(page),
        description: buildTopicDescription(page),
        inLanguage: 'zh-CN',
        mainEntityOfPage: `${baseUrl}/topics/${page.slug}`,
        keywords: page.keywords,
        author: { '@type': 'Organization', name: 'Code Go' },
        publisher: { '@type': 'Organization', name: 'Code Go' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: page.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
    body: `<main class="shell">
  ${renderHeader(page.hero, page.intro, `Topic / ${slugToLabel(page.slug)}`)}
  <div class="layout">
    <div class="main">
      <section class="hero-grid">
        <div class="panel">
          <div class="kicker">本页适合谁</div>
          <h2>先理解关键词，再决定下一步看哪里</h2>
          <p style="margin-top:16px;">这一页不是单纯堆 SEO 文案，而是把“这个词为什么会被搜索、用户真正想解决什么、进入 Code Go 后应该先看哪里”讲清楚。你可以先通读，再根据目录进入对应章节。</p>
          <div class="keyword-list">
            ${keywords.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('')}
          </div>
        </div>
        <div class="panel">
          <div class="kicker">快速入口</div>
          <div class="side-stack">
            <a class="side-card" href="/pricing">
              <strong>查看模型</strong>
              <p>先看免费模型、Claude、GPT 与可用模型分组。</p>
            </a>
            <a class="side-card" href="/guide">
              <strong>查看教程</strong>
              <p>从配置、接入到使用路径继续往下看。</p>
            </a>
            <a class="side-card" href="/">
              <strong>回到首页</strong>
              <p>查看入口概览、核心功能导航与平台介绍。</p>
            </a>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="kicker">页面目录</div>
        <h2>按章节快速进入</h2>
        <div class="toc" style="margin-top:18px;">${toc}</div>
      </section>

      ${sections}

      <section class="section">
        <div class="kicker">常见问题</div>
        <h2>FAQ</h2>
        <div class="faq">${faq}</div>
      </section>
    </div>

    <aside class="aside">
      <section class="panel">
        <div class="kicker">本页定位</div>
        <ul>
          <li>承接搜索进入后的第一轮解释，而不是只做标题占位。</li>
          <li>帮用户快速看清这个关键词对应的任务、模型和下一步路径。</li>
          <li>让首页、教程页、模型页与专题页形成顺序阅读链路。</li>
        </ul>
      </section>

      <section class="panel">
        <div class="kicker">下一步</div>
        <div class="side-stack">
          <a class="side-card" href="/pricing">
            <strong>查看模型</strong>
            <p>先看免费模型，再决定是否切到 GPT 或 Claude。</p>
          </a>
          <a class="side-card" href="/guide">
            <strong>查看使用教程</strong>
            <p>从配置、接入到长期工作流进一步理解。</p>
          </a>
        </div>
      </section>

      <section class="panel">
        <div class="kicker">相关专题</div>
        <div class="side-stack">${related}</div>
      </section>
    </aside>
  </div>
</main>`,
  })
}

function renderTopicsIndex() {
  const groups = topicGroups
    .map((group) => ({
      ...group,
      items: searchPages.filter((item) => group.match(item.slug)),
    }))
    .filter((group) => group.items.length > 0)

  const sections = groups
    .map(
      (group) => `<section>
  <div class="group-head">
    <div class="kicker">Topic Group</div>
    <h2>${escapeHtml(group.title)}</h2>
    <p>${escapeHtml(group.description)}</p>
  </div>
  <div class="topic-grid" style="margin-top:16px;">
    ${group.items
      .map(
        (item) => `<a class="topic-card" href="/topics/${item.slug}">
  <strong>${escapeHtml(item.title)}</strong>
  <p>${escapeHtml(item.description)}</p>
</a>`,
      )
      .join('')}
  </div>
</section>`,
    )
    .join('')

  return renderPage({
    title: 'Codex API、Claude Code API、Codex 中转、Claude 中转专题页 | Code Go',
    description:
      'Code Go 专题页汇总，覆盖 Codex API、Claude Code API、Codex 中转、Claude 中转、教程、配置、排障与模型选择。',
    canonicalPath: '/topics',
    keywords:
      'Codex API, Claude Code API, Codex中转, Claude中转, AI API 中转, 教程, 配置, 排障, Code Go',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      headline: 'Codex API、Claude Code API、Codex 中转、Claude 中转专题页',
      description:
        'Code Go 专题页汇总，覆盖 Codex API、Claude Code API、Codex 中转、Claude 中转、教程、配置、排障与模型选择。',
      inLanguage: 'zh-CN',
      url: `${baseUrl}/topics`,
    },
    body: `<main class="shell">
  ${renderHeader(
    'Codex API、Claude Code API、Codex 中转、Claude 中转专题页',
    '这是 Code Go 的专题页总入口。适合从搜索直接进入的用户先看清关键词含义、适用场景、教程入口和模型选择路径，再决定下一步去模型页还是教程页。',
    'Topic / Index',
  )}
  <div class="main" style="margin-top:20px;">
    <section class="topic-grid">
      <div class="panel">
        <div class="kicker">搜索进入后先看什么</div>
        <h2>先看专题页，再决定下一步去哪里</h2>
        <p style="margin-top:16px;">先看专题页，把词义、模型、价格路径和教程入口理顺，再进入更具体的页面。</p>
      </div>
      <div class="panel">
        <div class="kicker">看目录再做选择</div>
        <h2>按搜索意图进入</h2>
        <p style="margin-top:16px;">按核心入口、接入教程、比较与排障三类组织，减少用户第一次进入时的判断成本。</p>
      </div>
      <div class="panel">
        <div class="kicker">专题页不是终点</div>
        <h2>继续去模型页或教程页</h2>
        <p style="margin-top:16px;">每一页都要把用户带回模型广场、教程页或首页，而不是停在一堆关键词里。</p>
      </div>
    </section>

    <section class="panel">
      <div class="kicker">专题导航</div>
      <h2>按搜索意图进入</h2>
      <p style="margin-top:16px;">如果你搜的是具体模型与中转词，先看核心入口；如果你搜的是教程、配置、怎么用，先看接入教程；如果你在比较或者排查问题，直接进入比较与排障。</p>
    </section>

    <div style="display:flex; flex-direction:column; gap:32px;">
      ${sections}
    </div>
  </div>
</main>`,
  })
}

await fs.mkdir(path.join(distDir, 'topics'), { recursive: true })
await fs.writeFile(
  path.join(distDir, 'topics', 'index.html'),
  renderTopicsIndex(),
  'utf8',
)

for (const page of searchPages) {
  const targetDir = path.join(distDir, 'topics', page.slug)
  await fs.mkdir(targetDir, { recursive: true })
  await fs.writeFile(
    path.join(targetDir, 'index.html'),
    renderTopicDetail(page),
    'utf8',
  )
}

console.log(`Generated ${searchPages.length + 1} static topic pages.`)
