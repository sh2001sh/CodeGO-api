import {
  Activity,
  Award,
  BadgeCheck,
  BookMarked,
  Box,
  Command,
  Compass,
  Egg,
  FileText,
  FlaskConical,
  Footprints,
  Gem,
  Gift,
  MessageSquare,
  Radio,
  RefreshCcw,
  ScrollText,
  Settings,
  ShoppingBag,
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
            title: '活动中心',
            icon: Gift,
            items: [
              {
                title: '活动总览',
                url: '/activities',
                icon: Gift,
              },
              {
                title: '邀请与刷新',
                url: '/invite-rewards',
                icon: RefreshCcw,
              },
              {
                title: '积分商城',
                url: '/point-mall',
                icon: ShoppingBag,
              },
            ],
          },
          {
            title: '模型',
            url: '/dashboard/models',
            icon: Footprints,
          },
          {
            title: '成就',
            url: '/dashboard/achievements',
            icon: BookMarked,
          },
          {
            title: '名人堂',
            url: '/dashboard/hall-of-fame',
            icon: Award,
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
            icon: ScrollText,
          },
          {
            title: '盲盒',
            url: '/blind-box',
            icon: Ticket,
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
