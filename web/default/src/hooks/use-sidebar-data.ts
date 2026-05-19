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
  Gem,
  ListTodo,
  MessageSquare,
  Radio,
  ScrollText,
  Settings,
  Share2,
  Ticket,
  User,
  Users,
  Footprints,
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
        title: t('Chat'),
        items: [
          {
            title: t('Playground'),
            url: '/playground',
            icon: FlaskConical,
          },
          {
            title: t('Chat'),
            icon: MessageSquare,
            type: 'chat-presets',
          },
        ],
      },
      {
        id: 'general',
        title: t('General'),
        items: [
          {
            title: t('Overview'),
            url: '/dashboard/overview',
            icon: Activity,
          },
          {
            title: t('Dashboard'),
            url: '/dashboard/models',
            icon: Footprints,
          },
          {
            title: '精灵图鉴',
            url: '/dashboard/achievements',
            icon: BookMarked,
          },
          {
            title: '荣誉榜',
            url: '/dashboard/hall-of-fame',
            icon: Award,
          },
          {
            title: t('API Keys'),
            url: '/keys',
            icon: BadgeCheck,
          },
          {
            title: t('Usage Logs'),
            url: '/usage-logs/common',
            icon: FileText,
          },
          {
            title: t('Task Logs'),
            url: '/usage-logs/task',
            activeUrls: ['/usage-logs/drawing'],
            configUrls: ['/usage-logs/drawing', '/usage-logs/task'],
            icon: ListTodo,
          },
        ],
      },
      {
        id: 'personal',
        title: t('Personal'),
        items: [
          {
            title: t('Wallet'),
            url: '/wallet',
            icon: Gem,
          },
          {
            title: '套餐购买',
            url: '/packages',
            icon: ScrollText,
          },
          {
            title: '盲盒活动',
            url: '/blind-box',
            icon: Egg,
          },
          {
            title: t('Invite Rewards'),
            url: '/invite-rewards',
            icon: Share2,
          },
          {
            title: t('Profile'),
            url: '/profile',
            icon: User,
          },
        ],
      },
      {
        id: 'admin',
        title: t('Admin'),
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
            title: t('Redemption Codes'),
            url: '/redemption-codes',
            icon: Ticket,
          },
          {
            title: t('Package Management'),
            url: '/subscriptions',
            icon: ScrollText,
          },
          {
            title: t('Blind Box Operations'),
            url: '/subscriptions#blind-box-admin',
            activeUrls: ['/subscriptions'],
            configUrls: ['/blind-box-admin'],
            icon: Egg,
          },
          {
            title: t('System Settings'),
            url: '/system-settings/site',
            activeUrls: ['/system-settings'],
            icon: Settings,
          },
        ],
      },
    ],
  }
}
