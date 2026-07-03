import {
  Activity,
  BadgeCheck,
  Box,
  Command,
  Compass,
  Egg,
  FileText,
  FlaskConical,
  Gem,
  MessageSquare,
  Package,
  Radio,
  RefreshCcw,
  ScrollText,
  Settings,
  Ticket,
  User,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { WORKSPACE_IDS } from '@/components/layout/lib/workspace-registry'
import { type SidebarData } from '@/components/layout/types'

export function useSidebarData(): SidebarData {
  useTranslation()

  return {
    workspaces: [
      {
        id: WORKSPACE_IDS.DEFAULT,
        name: '',
        logo: Command,
        plan: '',
      },
    ],
    navGroups: [
      {
        id: 'chat',
        title: '聊天',
        items: [
          {
            title: '游乐场',
            url: '/playground',
            icon: FlaskConical,
          },
          {
            title: '预设',
            icon: MessageSquare,
            type: 'chat-presets',
          },
        ],
      },
      {
        id: 'general',
        title: '常规',
        items: [
          {
            title: '概览',
            url: '/dashboard/overview',
            icon: Activity,
          },
          {
            title: '分组状态',
            url: '/group-status',
            icon: Compass,
          },
          {
            title: '模型分析',
            url: '/dashboard/models',
            icon: Activity,
          },
          {
            title: 'API 密钥',
            url: '/keys',
            icon: BadgeCheck,
          },
          {
            title: '使用日志',
            url: '/usage-logs/common',
            icon: FileText,
          },
        ],
      },
      {
        id: 'personal',
        title: '个人',
        items: [
          {
            title: '钱包',
            url: '/wallet',
            icon: Gem,
          },
          {
            title: '套餐',
            url: '/packages',
            icon: Package,
          },
          {
            title: '拼团大厅',
            url: '/group-buy',
            icon: Users,
          },
          {
            title: '盲盒',
            url: '/blind-box',
            icon: Ticket,
          },
          {
            title: '邀请',
            url: '/invite-rewards',
            icon: RefreshCcw,
          },
          {
            title: '个人资料',
            url: '/profile',
            icon: User,
          },
        ],
      },
      {
        id: 'admin',
        title: '管理',
        items: [
          {
            title: '渠道',
            url: '/channels',
            icon: Radio,
          },
          {
            title: '模型',
            url: '/models/metadata',
            icon: Box,
          },
          {
            title: '用户',
            url: '/users',
            icon: Users,
          },
          {
            title: '兑换码',
            url: '/redemption-codes',
            icon: Ticket,
          },
          {
            title: '订阅',
            url: '/subscriptions',
            icon: ScrollText,
          },
          {
            title: '盲盒管理',
            url: '/subscriptions#blind-box-admin',
            activeUrls: ['/subscriptions'],
            configUrls: ['/blind-box-admin'],
            icon: Egg,
          },
          {
            title: '系统设置',
            url: '/system-settings/site',
            activeUrls: ['/system-settings'],
            icon: Settings,
          },
        ],
      },
    ],
  }
}
