export type SearchPageContent = {
  slug: string
  title: string
  seoTitle: string
  description: string
  keywords: string
  hero: string
  intro: string
  sections: Array<{
    heading: string
    paragraphs: string[]
  }>
  faq: Array<{
    question: string
    answer: string
  }>
}

export const searchPages: SearchPageContent[] = [
  {
    slug: 'codex-api',
    title: 'Codex API',
    seoTitle: 'Codex API 接入与中转 | Code Go',
    description:
      'Code Go 提供适合长期使用的 Codex API 接入与中转方案，帮助你在 AI Coding 工作流里稳定调用模型。',
    keywords:
      'codex api, codex api中转, codex 中转, codex接口, codex api 接入, Code Go',
    hero: 'Codex API 接入与中转',
    intro:
      '如果你正在找一个更适合长期使用的 Codex API 入口，Code Go 可以把接入、调用和使用过程放到同一条工作流里。',
    sections: [
      {
        heading: '为什么很多人会搜 Codex API',
        paragraphs: [
          '因为越来越多开发者已经把 Codex 放进日常 AI Coding 流程里，重点不再只是能不能调用，而是能不能长期稳定地用下去。',
          'Code Go 更适合承接这种需求：接入更直接，记录更完整，使用过程也更连续。',
        ],
      },
      {
        heading: 'Code Go 适合什么样的 Codex 用户',
        paragraphs: [
          '如果你需要一个更稳定的 Codex API 中转入口，或者希望把多模型工作流放在同一套平台里，Code Go 会更顺手。',
          '它不仅适合临时调用，也适合长期使用、持续记录和反复迭代的工作方式。',
        ],
      },
      {
        heading: '除了 Codex API，你还能得到什么',
        paragraphs: [
          '你还可以同时管理额度、套餐、活动和长期使用记录。',
          '对长期做 AI Coding 的用户来说，这比一次性完成调用更重要。',
        ],
      },
    ],
    faq: [
      {
        question: 'Code Go 支持 Codex API 吗？',
        answer: '支持。Code Go 适合承接 Codex API 工作流，也适合长期使用。',
      },
      {
        question: 'Code Go 适合作为 Codex API 中转吗？',
        answer: '适合，尤其适合希望长期使用、持续记录和统一管理多模型调用的开发者。',
      },
      {
        question: 'Code Go 和普通 Codex API 中转有什么不同？',
        answer: 'Code Go 更重视长期使用体验，不只关心一次调用是否成功，也关心整个 AI Coding 过程是否能持续积累。',
      },
    ],
  },
  {
    slug: 'codex-api-jiaocheng',
    title: 'Codex API 教程',
    seoTitle: 'Codex API 教程 | Code Go',
    description:
      'Code Go 的 Codex API 教程，适合想把 Codex 接入长期 AI Coding 工作流的开发者。',
    keywords:
      'codex api 教程, codex api 接入教程, codex 中转教程, codex api中转, Code Go',
    hero: 'Codex API 教程',
    intro:
      '这篇教程会告诉你，怎么把 Codex 接入到一个更适合长期使用的工作流里。',
    sections: [
      {
        heading: '第一步：确认你的使用目标',
        paragraphs: [
          '如果你只是想临时体验一次，任何入口都能用。',
          '如果你希望把 Codex 变成日常 AI Coding 的一部分，那就需要一个更稳定的接入方式。',
        ],
      },
      {
        heading: '第二步：把 Codex 放进固定流程',
        paragraphs: [
          '把 Codex 作为日常开发中的固定工具，而不是临时替代品。',
          '这样你会更容易形成持续积累，而不是每次都重新开始。',
        ],
      },
      {
        heading: '第三步：让调用和记录放在一起',
        paragraphs: [
          '真正适合长期用的 Codex API，不只是能调用，还应该方便你持续查看和回顾使用过程。',
          'Code Go 的目标就是把这些事情放在同一条线上。',
        ],
      },
    ],
    faq: [
      {
        question: 'Codex API 教程里最重要的是什么？',
        answer: '最重要的是把 Codex 放进一个可以持续使用的流程，而不是只完成一次调用。',
      },
      {
        question: '这篇教程适合什么人？',
        answer: '适合已经想把 Codex 用在日常 AI Coding 里的开发者。',
      },
    ],
  },
  {
    slug: 'codex-zhongzhuan',
    title: 'Codex 中转',
    seoTitle: 'Codex 中转站 | Code Go',
    description:
      'Code Go 提供适合开发者长期使用的 Codex 中转站，让 AI Coding 的每一步都算数。',
    keywords:
      'codex中转, codex 中转站, codex api中转, codex代理, codex api, Code Go',
    hero: '适合长期使用的 Codex 中转站',
    intro:
      '如果你搜索 Codex 中转，通常不是只想临时调一次接口，而是希望找到一个可以长期使用的入口。',
    sections: [
      {
        heading: '什么样的 Codex 中转更值得长期用',
        paragraphs: [
          '真正值得长期用的 Codex 中转，不只是能通，还要能稳定、清楚、顺手。',
          'Code Go 更关注长期使用体验，让调用和使用记录都更容易持续沉淀。',
        ],
      },
      {
        heading: '为什么 Code Go 更适合这个场景',
        paragraphs: [
          '因为它不是只做一次调用，而是把长期 AI Coding 工作流也考虑进去了。',
          '对重度用户来说，这种连续感和积累感比单纯低价更重要。',
        ],
      },
    ],
    faq: [
      {
        question: 'Code Go 是 Codex 中转站吗？',
        answer: '是。Code Go 可以作为 Codex 中转站使用，也更适合长期工作流。',
      },
      {
        question: 'Codex 中转适合什么样的人？',
        answer: '适合已经把 Codex 用进日常开发流程，且需要更稳定入口的开发者。',
      },
    ],
  },
  {
    slug: 'codex-zhongzhuan-jiaocheng',
    title: 'Codex 中转教程',
    seoTitle: 'Codex 中转教程 | Code Go',
    description:
      'Code Go 的 Codex 中转教程，帮助你把 Codex 中转放入长期可用的 AI Coding 工作流。',
    keywords:
      'codex 中转教程, codex中转, codex api中转, codex 中转站, Code Go',
    hero: 'Codex 中转教程',
    intro:
      '这篇教程的重点不是“怎么临时连上”，而是“怎么长期用得顺手”。',
    sections: [
      {
        heading: '先理解 Codex 中转的意义',
        paragraphs: [
          'Codex 中转通常是为了解决调用入口和工作流连续性的问题。',
          '如果你经常使用 Codex，那么长期可用的中转入口会更重要。',
        ],
      },
      {
        heading: '把中转当成日常入口',
        paragraphs: [
          '不要把中转只当临时方案，而要把它当成固定入口。',
          '这样你会更容易形成长期使用习惯。',
        ],
      },
    ],
    faq: [
      {
        question: 'Codex 中转教程适合谁？',
        answer: '适合已经在找长期稳定入口的 Codex 用户。',
      },
      {
        question: 'Codex 中转和 Codex API 教程有什么区别？',
        answer: '前者更偏长期入口，后者更偏接入和调用流程。',
      },
    ],
  },
  {
    slug: 'claude-code-api',
    title: 'Claude Code API',
    seoTitle: 'Claude Code API 接入与中转 | Code Go',
    description:
      'Code Go 提供适合长期 AI Coding 工作流的 Claude Code API 接入与中转能力，适合终端型开发者持续使用。',
    keywords:
      'claude code api, claude code api中转, claude code接口, claude code 中转, Code Go',
    hero: 'Claude Code API 接入与中转',
    intro:
      '如果你正在找 Claude Code API 相关方案，Code Go 可以作为更稳定的使用入口，让日常工作流更连续。',
    sections: [
      {
        heading: '为什么很多人会搜 Claude Code API',
        paragraphs: [
          '因为 Claude Code 用户往往是重度终端用户，更在意长期工作流是否顺畅。',
          'Code Go 适合这种长期使用场景，不只强调调用结果，也看重过程本身。',
        ],
      },
      {
        heading: 'Code Go 适合什么样的 Claude Code 用户',
        paragraphs: [
          '如果你更习惯任务流、终端和持续迭代式开发，Code Go 会更适合作为你的调用入口。',
          '它也适合把 Claude Code 和其他模型工作流放在一起管理。',
        ],
      },
    ],
    faq: [
      {
        question: 'Code Go 支持 Claude Code API 吗？',
        answer: '支持。Code Go 适合承接 Claude Code API 调用，也适合长期使用。',
      },
      {
        question: 'Code Go 适合长期做 Claude Code 工作流吗？',
        answer: '适合。它更重视持续使用、连续记录和长期积累感。',
      },
    ],
  },
  {
    slug: 'claude-code-api-jiaocheng',
    title: 'Claude Code API 教程',
    seoTitle: 'Claude Code API 教程 | Code Go',
    description:
      'Code Go 的 Claude Code API 教程，适合想把 Claude Code 接入长期 AI Coding 工作流的开发者。',
    keywords:
      'claude code api 教程, claude code api中转, claude code 中转教程, Code Go',
    hero: 'Claude Code API 教程',
    intro:
      '这篇教程适合想把 Claude Code 变成长期工作流一部分的人。',
    sections: [
      {
        heading: '把 Claude Code 放进固定习惯',
        paragraphs: [
          'Claude Code 更适合被放进日常任务流，而不是偶尔使用。',
          '一旦变成固定习惯，它的价值会更明显。',
        ],
      },
      {
        heading: '让流程更连续',
        paragraphs: [
          '持续使用 Claude Code 的人，通常更在意流程是否连续、记录是否完整。',
          'Code Go 的目标就是让这件事更容易。',
        ],
      },
    ],
    faq: [
      {
        question: 'Claude Code API 教程适合谁？',
        answer: '适合长期使用 Claude Code 的开发者。',
      },
      {
        question: '这篇教程能解决什么问题？',
        answer: '帮助你把 Claude Code 放进更连续的 AI Coding 流程里。',
      },
    ],
  },
  {
    slug: 'claude-zhongzhuan',
    title: 'Claude 中转',
    seoTitle: 'Claude 中转站 | Code Go',
    description:
      'Code Go 是适合长期使用的 Claude 中转站，帮助开发者把 Claude 调用和 AI Coding 工作流放到同一条线上。',
    keywords:
      'claude中转, claude 中转站, claude api中转, claude code 中转, Claude Code, Code Go',
    hero: '适合长期使用的 Claude 中转站',
    intro:
      '如果你搜索 Claude 中转，通常是在找一个更稳定、更适合长期使用的入口。',
    sections: [
      {
        heading: 'Claude 中转不只是能用就够了',
        paragraphs: [
          '对于长期使用 Claude 的开发者来说，更重要的是稳定性、连续感和长期使用体验。',
          'Code Go 提供的不是一次性调用入口，而是更适合持续工作的使用方式。',
        ],
      },
      {
        heading: '为什么 Code Go 更适合长期 Claude 工作流',
        paragraphs: [
          '因为 Code Go 让调用、记录和积累都能放在一起，而不是把每次使用都变成孤立动作。',
          '这对长期 AI Coding 用户来说会更自然。',
        ],
      },
    ],
    faq: [
      {
        question: 'Code Go 是 Claude 中转站吗？',
        answer: '是。Code Go 可以作为 Claude 中转站使用，也更适合长期开发工作流。',
      },
      {
        question: 'Code Go 和普通 Claude 中转有什么区别？',
        answer: 'Code Go 不只关注调用，还更关注长期使用体验和持续积累。',
      },
    ],
  },
  {
    slug: 'claude-zhongzhuan-jiaocheng',
    title: 'Claude 中转教程',
    seoTitle: 'Claude 中转教程 | Code Go',
    description:
      'Code Go 的 Claude 中转教程，帮助开发者把 Claude 中转接入日常工作流并长期使用。',
    keywords:
      'claude 中转教程, claude中转, claude api中转, claude code 中转教程, Code Go',
    hero: 'Claude 中转教程',
    intro:
      '如果你在找 Claude 中转教程，多半是想找到一个更稳定、更适合长期使用的入口。',
    sections: [
      {
        heading: '为什么要把 Claude 中转做成固定入口',
        paragraphs: [
          '长期使用 Claude 的用户，通常不会只看一次调用是否成功。',
          '他们更看重长期稳定和持续使用体验。',
        ],
      },
      {
        heading: '把教程重点放在长期使用',
        paragraphs: [
          '真正值得收藏的教程，不是只教你如何连通，而是教你如何长期用下去。',
          '这也是 Code Go 更想强调的地方。',
        ],
      },
    ],
    faq: [
      {
        question: 'Claude 中转教程最适合什么人？',
        answer: '适合把 Claude 当成长期工作流工具的人。',
      },
      {
        question: '这篇教程和 Claude Code API 教程有什么不同？',
        answer: '前者更偏 Claude 中转入口，后者更偏 Claude Code 的工作流接入。',
      },
    ],
  },
  {
    slug: 'codex-api-jiaocheng-2',
    title: 'Codex 接入教程',
    seoTitle: 'Codex 接入教程 | Code Go',
    description:
      'Code Go 的 Codex 接入教程，帮助你把 Codex 接入 AI Coding 工作流。',
    keywords:
      'codex 接入教程, codex api 接入, codex API 教程, Code Go',
    hero: 'Codex 接入教程',
    intro:
      '这是一篇更偏实操的 Codex 接入说明，适合想快速开始的人。',
    sections: [
      {
        heading: '先把目标想清楚',
        paragraphs: [
          '你是要临时体验，还是要长期使用。',
          '如果是长期使用，接入方式和入口稳定性就很重要。',
        ],
      },
      {
        heading: '把接入变成固定习惯',
        paragraphs: [
          '最好的接入方式，是让它自然进入你的日常开发动作里。',
          '这样你会更容易持续积累。',
        ],
      },
    ],
    faq: [
      {
        question: 'Codex 接入教程和 Codex API 教程一样吗？',
        answer: '不完全一样。接入教程更偏快速上手，API 教程更偏使用流程。',
      },
    ],
  },
  {
    slug: 'claude-code-api-jiaocheng-2',
    title: 'Claude Code 接入教程',
    seoTitle: 'Claude Code 接入教程 | Code Go',
    description:
      'Code Go 的 Claude Code 接入教程，适合希望将 Claude Code 长期接入工作流的开发者。',
    keywords:
      'claude code 接入教程, claude code api 教程, claude code 中转, Code Go',
    hero: 'Claude Code 接入教程',
    intro:
      '这篇内容会更直接地告诉你，怎么把 Claude Code 接入到长期工作流里。',
    sections: [
      {
        heading: '先找对入口',
        paragraphs: [
          'Claude Code 的关键，不是只连上一次，而是之后还能一直顺手用。',
          'Code Go 适合承接这种长期使用方式。',
        ],
      },
      {
        heading: '把接入和使用连起来',
        paragraphs: [
          '接入完成之后，最重要的是持续使用、持续记录、持续迭代。',
          '这也是长期 AI Coding 最需要的部分。',
        ],
      },
    ],
    faq: [
      {
        question: 'Claude Code 接入教程适合谁？',
        answer: '适合想把 Claude Code 接入日常工作流的开发者。',
      },
    ],
  },
  {
    slug: 'codex-api-shangshou-jiaocheng',
    title: 'Codex API 上手教程',
    seoTitle: 'Codex API 上手教程 | Code Go',
    description:
      'Code Go 的 Codex API 上手教程，适合想快速进入长期 AI Coding 工作流的开发者。',
    keywords:
      'codex api 上手教程, codex api 使用教程, codex api 接入教程, Code Go',
    hero: 'Codex API 上手教程',
    intro:
      '这篇内容更适合第一次认真使用 Codex 的人，目标是让你尽快进入稳定的长期流程。',
    sections: [
      {
        heading: '先把 Codex 当成日常工具',
        paragraphs: [
          '不要只把 Codex 看成一次性尝鲜工具，而要把它当成可以持续使用的开发伙伴。',
          '这样你在后续使用时，更容易形成积累感。',
        ],
      },
      {
        heading: '从简单任务开始',
        paragraphs: [
          '先用它处理最常见的代码理解、修改和检查任务。',
          '当你确认流程顺手后，再把它放进更大的 AI Coding 场景里。',
        ],
      },
    ],
    faq: [
      {
        question: 'Codex API 上手教程适合谁？',
        answer: '适合第一次想认真把 Codex 用进开发流程的人。',
      },
      {
        question: '上手后最重要的是什么？',
        answer: '最重要的是让 Codex 变成固定习惯，而不是临时工具。',
      },
    ],
  },
  {
    slug: 'codex-zhongzhuan-shiyong-jiaocheng',
    title: 'Codex 中转使用教程',
    seoTitle: 'Codex 中转使用教程 | Code Go',
    description:
      'Code Go 的 Codex 中转使用教程，帮助你把 Codex 中转接入长期稳定的使用方式。',
    keywords:
      'codex 中转使用教程, codex 中转教程, codex api中转教程, Code Go',
    hero: 'Codex 中转使用教程',
    intro:
      '如果你在找 Codex 中转使用教程，通常说明你已经不满足于临时可用，而是想要更稳定的入口。',
    sections: [
      {
        heading: '先确认你要的是长期入口',
        paragraphs: [
          'Codex 中转的价值，不只是能连上，而是后面还能持续顺手地用。',
          '长期入口会让你的 AI Coding 工作流更连续。',
        ],
      },
      {
        heading: '把中转放进固定流程',
        paragraphs: [
          '把中转当成日常入口后，你会更容易沉淀自己的使用习惯。',
          '这也是 Code Go 更强调的方向。',
        ],
      },
    ],
    faq: [
      {
        question: 'Codex 中转使用教程适合什么人？',
        answer: '适合想把 Codex 作为长期入口使用的开发者。',
      },
      {
        question: '这类教程重点是什么？',
        answer: '重点是稳定使用，而不是一次连通。',
      },
    ],
  },
  {
    slug: 'claude-code-api-shangshou-jiaocheng',
    title: 'Claude Code API 上手教程',
    seoTitle: 'Claude Code API 上手教程 | Code Go',
    description:
      'Code Go 的 Claude Code API 上手教程，适合想快速进入 Claude Code 长期工作流的开发者。',
    keywords:
      'claude code api 上手教程, claude code api 使用教程, claude code api 接入教程, Code Go',
    hero: 'Claude Code API 上手教程',
    intro:
      '这篇教程面向第一次系统使用 Claude Code 的开发者，重点是尽快建立顺手的使用方式。',
    sections: [
      {
        heading: '先建立固定节奏',
        paragraphs: [
          'Claude Code 的价值，往往来自持续使用。',
          '把它放进固定节奏里，效果会更明显。',
        ],
      },
      {
        heading: '先从高频动作开始',
        paragraphs: [
          '先处理你每天都会遇到的开发动作，再逐步扩展到更复杂的任务。',
          '这样更容易建立长期使用感。',
        ],
      },
    ],
    faq: [
      {
        question: 'Claude Code API 上手教程适合谁？',
        answer: '适合想把 Claude Code 用成日常工具的人。',
      },
      {
        question: '上手时最重要的事是什么？',
        answer: '先让流程稳定，再追求更复杂的用法。',
      },
    ],
  },
  {
    slug: 'claude-zhongzhuan-shiyong-jiaocheng',
    title: 'Claude 中转使用教程',
    seoTitle: 'Claude 中转使用教程 | Code Go',
    description:
      'Code Go 的 Claude 中转使用教程，帮助你把 Claude 中转变成长期可用的开发入口。',
    keywords:
      'claude 中转使用教程, claude 中转教程, claude api中转教程, Code Go',
    hero: 'Claude 中转使用教程',
    intro:
      '如果你在找 Claude 中转使用教程，大概率是希望把它从临时方案变成长期入口。',
    sections: [
      {
        heading: '长期入口比临时可用更重要',
        paragraphs: [
          '对重度开发者来说，Claude 中转的重点不是一次成功，而是每次都能顺利进入工作流。',
          '长期连续性会直接影响使用体验。',
        ],
      },
      {
        heading: '让使用方式更统一',
        paragraphs: [
          '统一入口和统一习惯，会让你更容易坚持使用。',
          'Code Go 就是围绕这种连续感来组织的。',
        ],
      },
    ],
    faq: [
      {
        question: 'Claude 中转使用教程适合谁？',
        answer: '适合需要稳定 Claude 使用入口的开发者。',
      },
      {
        question: '这篇教程和 Claude 中转教程有什么区别？',
        answer: '前者更偏实际使用方法，后者更偏入口认知。',
      },
    ],
  },
  {
    slug: 'codex-api-jinjie-jiaocheng',
    title: 'Codex API 进阶教程',
    seoTitle: 'Codex API 进阶教程 | Code Go',
    description:
      'Code Go 的 Codex API 进阶教程，适合已经开始长期使用 Codex 的开发者。',
    keywords:
      'codex api 进阶教程, codex api 使用技巧, codex 中转进阶, Code Go',
    hero: 'Codex API 进阶教程',
    intro:
      '这篇内容不是教你第一次连通，而是教你如何把 Codex 用得更稳定、更顺手。',
    sections: [
      {
        heading: '把 Codex 用进更大的工作流',
        paragraphs: [
          '当你已经熟悉基础调用后，就可以把 Codex 放进更完整的开发流程。',
          '这时它的价值会从“工具”变成“习惯”。',
        ],
      },
      {
        heading: '关注长期积累',
        paragraphs: [
          '长期使用的核心不是堆功能，而是保持连续感。',
          'Code Go 想强调的就是这种积累。',
        ],
      },
    ],
    faq: [
      {
        question: 'Codex API 进阶教程适合谁？',
        answer: '适合已经在长期使用 Codex 的开发者。',
      },
      {
        question: '进阶阶段最该关注什么？',
        answer: '关注连续使用和长期积累，而不是一次性操作。',
      },
    ],
  },
  {
    slug: 'claude-code-api-jinjie-jiaocheng',
    title: 'Claude Code API 进阶教程',
    seoTitle: 'Claude Code API 进阶教程 | Code Go',
    description:
      'Code Go 的 Claude Code API 进阶教程，适合已经进入长期 AI Coding 阶段的开发者。',
    keywords:
      'claude code api 进阶教程, claude code api 使用技巧, claude 中转进阶, Code Go',
    hero: 'Claude Code API 进阶教程',
    intro:
      '如果你已经开始长期使用 Claude Code，这篇内容更适合你继续把流程做顺。',
    sections: [
      {
        heading: '把工具变成习惯',
        paragraphs: [
          '进阶不是多做一步，而是让每次使用都更自然。',
          '这样才会形成长期稳定的工作流。',
        ],
      },
      {
        heading: '让过程本身有价值',
        paragraphs: [
          '长期 AI Coding 的满足感，来自持续推进，而不是一次性完成。',
          'Code Go 更偏向这种使用方式。',
        ],
      },
    ],
    faq: [
      {
        question: 'Claude Code API 进阶教程适合谁？',
        answer: '适合已经持续使用 Claude Code 的开发者。',
      },
      {
        question: '进阶阶段最重要的是什么？',
        answer: '让长期使用更顺手、更连续。',
      },
    ],
  },
]

export function getSearchPageBySlug(slug: string) {
  return searchPages.find((item) => item.slug === slug) || null
}
