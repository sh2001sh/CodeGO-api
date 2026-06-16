import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const baseUrl = 'https://shu26.cfd'

const { searchPages } = await import(
  pathToFileUrl(path.join(projectRoot, 'src/features/search-pages/data.ts')).href
)

const topicGroups = [
  {
    title: '核心关键词',
    description:
      '直接承接 Codex API、Claude Code API、Codex 中转、Claude 中转这类主搜索词。',
    match: (slug) =>
      [
        'codex-api',
        'codex-zhongzhuan',
        'claude-code-api',
        'claude-zhongzhuan',
      ].includes(slug),
  },
  {
    title: '教程与上手',
    description: '承接教程、接入、上手、进阶、配置、怎么用、怎么接这类搜索意图。',
    match: (slug) =>
      /jiaocheng|shangshou|jinjie|peizhi|zenme-yong|zenme-jie/.test(slug),
  },
  {
    title: '对比与问题',
    description: '承接区别、怎么选、稳定吗、报错怎么办这类高意图搜索词。',
    match: (slug) => /vs|zenme-xuan|wending-ma|baocuo-zenmeban/.test(slug),
  },
]

function pathToFileUrl(filePath) {
  const resolved = path.resolve(filePath).replace(/\\/g, '/')
  return new URL(`file:///${resolved}`)
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderPage(title, description, canonicalPath, content) {
  const canonical = `${baseUrl}${canonicalPath}`
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow,max-image-preview:large" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:card" content="summary_large_image" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f8fb;
        --surface: rgba(255, 255, 255, 0.92);
        --surface-strong: #ffffff;
        --text: #18202b;
        --muted: #5e6774;
        --line: rgba(24, 32, 43, 0.1);
        --brand: #d96a39;
        --brand-soft: rgba(217, 106, 57, 0.1);
        --accent: #3e76d2;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Public Sans", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(217,106,57,0.12), transparent 28%),
          radial-gradient(circle at 82% 12%, rgba(62,118,210,0.12), transparent 24%),
          var(--bg);
        color: var(--text);
      }
      a { color: inherit; text-decoration: none; }
      .shell { width: min(1100px, calc(100% - 40px)); margin: 0 auto; }
      .hero { padding: 72px 0 28px; }
      .hero-grid {
        display: grid;
        gap: 22px;
        align-items: end;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.78);
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 12px;
        font-weight: 700;
      }
      h1 {
        margin: 18px 0 0;
        font-size: clamp(2.3rem, 5vw, 4.5rem);
        line-height: 0.98;
        letter-spacing: -0.03em;
        max-width: 10ch;
      }
      .intro {
        margin: 18px 0 0;
        max-width: 760px;
        font-size: 1rem;
        line-height: 1.9;
        color: var(--muted);
      }
      .meta-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }
      .meta-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(255,255,255,0.82);
        padding: 10px 14px;
        font-size: 0.9rem;
        color: var(--muted);
      }
      .grid {
        display: grid;
        gap: 18px;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        padding: 22px 0 64px;
      }
      .section,
      .card {
        border: 1px solid var(--line);
        border-radius: 28px;
        background: var(--surface);
        backdrop-filter: blur(16px);
        padding: 24px;
        box-shadow: 0 16px 44px rgba(15,20,27,0.06);
      }
      .section + .section { margin-top: 18px; }
      .toc {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        margin-top: 22px;
      }
      .toc a {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: rgba(255,255,255,0.82);
        padding: 16px 18px;
        font-size: 0.95rem;
        font-weight: 700;
      }
      h2 {
        margin: 0 0 14px;
        font-size: 1.5rem;
        line-height: 1.2;
        letter-spacing: -0.02em;
      }
      .section-kicker {
        display: inline-block;
        margin-bottom: 10px;
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--brand);
      }
      p {
        margin: 0;
        font-size: 0.96rem;
        line-height: 1.85;
        color: var(--muted);
      }
      p + p { margin-top: 12px; }
      .faq { display: grid; gap: 14px; margin-top: 18px; }
      .faq-item {
        border: 1px solid var(--line);
        border-radius: 22px;
        background: var(--surface-strong);
        padding: 18px 20px;
      }
      .faq-item strong {
        display: block;
        margin-bottom: 8px;
        font-size: 1rem;
      }
      .topic-link {
        display: block;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--surface);
        padding: 18px;
      }
      .topic-link-title {
        font-size: 1rem;
        font-weight: 700;
      }
      .topic-link-desc {
        margin-top: 8px;
        font-size: 0.92rem;
        line-height: 1.75;
        color: var(--muted);
      }
      .prose-list {
        margin: 16px 0 0;
        padding-left: 18px;
        color: var(--muted);
      }
      .prose-list li {
        margin-top: 10px;
        line-height: 1.8;
      }
      .footer-links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 18px;
      }
      .footer-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: white;
        padding: 10px 14px;
        font-size: 0.92rem;
      }
      .top-links {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        padding-top: 28px;
      }
      .top-link {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: white;
        padding: 10px 15px;
        font-size: 0.92rem;
        font-weight: 700;
      }
      .top-link-primary {
        border-color: rgba(217, 106, 57, 0.34);
        background: rgba(217, 106, 57, 0.1);
        color: #9b421f;
      }
      @media (max-width: 640px) {
        .shell { width: min(100% - 28px, 1100px); }
        .hero { padding-top: 54px; }
        .section, .card { border-radius: 24px; padding: 20px; }
      }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`
}

function renderTopicDetail(page) {
  const related = searchPages
    .filter((item) => item.slug !== page.slug)
    .slice(0, 8)
    .map(
      (item) => `<a class="topic-link" href="/topics/${item.slug}">
  <div class="topic-link-title">${escapeHtml(item.title)}</div>
  <div class="topic-link-desc">${escapeHtml(item.description)}</div>
</a>`,
    )
    .join('')

  const sections = page.sections
    .map(
      (section, index) => `<section class="section" id="section-${index + 1}">
  <div class="section-kicker">Code Go / Topic</div>
  <h2>${escapeHtml(section.heading)}</h2>
  ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
</section>`,
    )
    .join('')

  const outline = page.sections
    .map(
      (section, index) =>
        `<a href="#section-${index + 1}">${index + 1}. ${escapeHtml(section.heading)}</a>`,
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Code Go',
            item: `${baseUrl}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Topics',
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
        '@type': 'TechArticle',
        headline: page.seoTitle,
        description: page.description,
        inLanguage: 'zh-CN',
        author: {
          '@type': 'Organization',
          name: 'Code Go',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Code Go',
        },
        mainEntityOfPage: `${baseUrl}/topics/${page.slug}`,
        keywords: page.keywords,
      },
      {
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
  }

  return renderPage(
    page.seoTitle,
    page.description,
    `/topics/${page.slug}`,
    `<main class="shell">
  <nav class="top-links" aria-label="站点入口">
    <a class="top-link" href="/">回到首页</a>
    <a class="top-link" href="/topics">查看专题入口</a>
    <a class="top-link top-link-primary" href="/keys">进入 Keys</a>
  </nav>
  <section class="hero">
    <div class="hero-grid">
      <div>
        <div class="eyebrow">Code Go · SEO Topic</div>
        <h1>${escapeHtml(page.hero)}</h1>
        <p class="intro">${escapeHtml(page.intro)}</p>
        <div class="meta-strip">
          <div class="meta-pill">品牌：Code Go</div>
          <div class="meta-pill">主题：长期 AI Coding</div>
          <div class="meta-pill">关键词：${escapeHtml(page.title)}</div>
        </div>
      </div>
    </div>
    <nav class="toc" aria-label="页面目录">
      ${outline}
    </nav>
  </section>
  ${sections}
  <section class="section">
    <div class="section-kicker">FAQ</div>
    <h2>常见问题</h2>
    <div class="faq">${faq}</div>
  </section>
  <section class="section">
    <div class="section-kicker">Code Go</div>
    <h2>回到首页或直接开始</h2>
    <p>如果你已经确认 Code Go 适合你的 AI Coding 工作流，可以回到首页了解完整入口，或直接进入 Keys 开始配置。</p>
    <div class="footer-links">
      <a class="footer-link" href="/">首页</a>
      <a class="footer-link" href="/keys">立即开始</a>
    </div>
  </section>
  <section class="section">
    <div class="section-kicker">Next</div>
    <h2>继续查看</h2>
    <p>如果你还在比较接入方式、使用方式或具体问题，可以继续进入下面这些页面。</p>
    <div class="footer-links">
      <a class="footer-link" href="/topics">专题聚合页</a>
      <a class="footer-link" href="/guide">使用说明</a>
      <a class="footer-link" href="/pricing">模型广场</a>
    </div>
  </section>
  <section class="section">
    <div class="section-kicker">Related</div>
    <h2>相关专题</h2>
    <div class="grid">${related}</div>
  </section>
  <script type="application/ld+json">${escapeHtml(JSON.stringify(jsonLd))}</script>
</main>`,
  )
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
      (group) => `<section class="section">
  <div class="section-kicker">Topic Group</div>
  <h2>${escapeHtml(group.title)}</h2>
  <p>${escapeHtml(group.description)}</p>
  <div class="grid" style="padding-bottom:0; padding-top:18px;">
    ${group.items
      .map(
        (item) => `<a class="topic-link" href="/topics/${item.slug}">
  <div class="topic-link-title">${escapeHtml(item.title)}</div>
  <div class="topic-link-desc">${escapeHtml(item.description)}</div>
</a>`,
      )
      .join('')}
  </div>
</section>`,
    )
    .join('')

  return renderPage(
    'Code Go Topics',
    'Code Go 关键词专题聚合页，覆盖 Codex API、Claude Code API、Codex 中转、Claude 中转、教程、配置、问题与对比。',
    '/topics',
    `<main class="shell">
  <nav class="top-links" aria-label="站点入口">
    <a class="top-link" href="/">回到首页</a>
    <a class="top-link top-link-primary" href="/keys">进入 Keys</a>
  </nav>
  <section class="hero">
    <div class="eyebrow">Code Go · Topic Hub</div>
    <h1>Codex API、Claude Code API、Codex 中转、Claude 中转</h1>
    <p class="intro">这是 Code Go 的专题聚合入口页。你可以从这里直接进入核心关键词、教程与上手、对比与问题页面。</p>
    <div class="meta-strip">
      <div class="meta-pill">覆盖主搜索词</div>
      <div class="meta-pill">覆盖教程词</div>
      <div class="meta-pill">覆盖对比与问题词</div>
    </div>
    <ul class="prose-list">
      <li>如果你搜的是 Codex API、Claude Code API，可以先从核心关键词页进入。</li>
      <li>如果你搜的是教程、配置、怎么用、怎么接，可以直接进入教程与上手页。</li>
      <li>如果你在比较或者排查问题，可以进入对比与问题页。</li>
    </ul>
  </section>
  ${sections}
</main>`,
  )
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
