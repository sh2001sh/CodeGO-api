import {
  Activity,
  Award,
  BookMarked,
  BadgeCheck,
  Box,
  Command,
  Egg,
  FileText,
  FlaskConical,
  Footprints,
  Gem,
  Image,
  MessageSquare,
  Radio,
  Rocket,
  ScrollText,
  ShoppingBag,
  Settings,
  Share2,
  Ticket,
  User,
  Users,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { WORKSPACE_IDS } from '@/components/layout/lib/workspace-registry'
import { type SidebarData } from '@/components/layout/types'

export function useSidebarData(): SidebarData {
  const { t } = useTranslation()

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
        title: '对话',
        items: [
          {
            title: 'Playground',
            url: '/playground',
            icon: FlaskConical,
          },
          {
            title: '聊天预设',
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
            title: '生图',
            url: '/images',
            icon: Image,
          },
          {
            title: '数据看板',
            url: '/dashboard/models',
            icon: Footprints,
          },
          {
            title: '精灵图鉴',
            url: '/dashboard/achievements',
            icon: BookMarked,
          },
          {
            title: '荣耀榜',
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
            title: '套餐购买',
            url: '/packages',
            icon: ScrollText,
          },
          {
            title: '积分商城',
            url: '/point-mall',
            icon: ShoppingBag,
          },
          {
            title: '盲盒活动',
            url: '/blind-box',
            icon: Egg,
          },
          {
            title: '人海计划',
            url: '/people-plan',
            icon: Rocket,
          },
          {
            title: '邀请奖励',
            url: '/invite-rewards',
            icon: Share2,
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
            title: t('Channels'),
            url: '/channels',
            icon: Radio,
          },
          {
            title: t('Models'),
            url: '/models/metadata',
            icon: Box,
          },
          {
            title: t('Users'),
            url: '/users',
            icon: Users,
          },
          {
            title: '兑换码',
            url: '/redemption-codes',
            icon: Ticket,
          },
          {
            title: '套餐管理',
            url: '/subscriptions',
            icon: ScrollText,
          },
          {
            title: '盲盒运营',
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
