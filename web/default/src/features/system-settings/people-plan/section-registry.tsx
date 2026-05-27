import { AdminOperationsSection } from './admin-operations-section'
import { CampaignSettingsSection } from './campaign-settings-section'
import type { PeoplePlanAdminSettings } from '../types'
import { createSectionRegistry } from '../utils/section-registry'

const PEOPLE_PLAN_SECTIONS = [
  {
    id: 'campaign',
    titleKey: '活动配置',
    descriptionKey: '配置活动文案、规则、奖励与弹窗',
    build: (settings: PeoplePlanAdminSettings) => (
      <CampaignSettingsSection
        defaultValues={{
          enabled: settings['people_plan_setting.enabled'],
          entryTitle: settings['people_plan_setting.entry_title'],
          entrySubtitle: settings['people_plan_setting.entry_subtitle'],
          heroTitle: settings['people_plan_setting.hero_title'],
          heroSubtitle: settings['people_plan_setting.hero_subtitle'],
          heroDescription: settings['people_plan_setting.hero_description'],
          teamRules: settings['people_plan_setting.team_rules'],
          achievements: settings['people_plan_setting.achievements'],
          monthly: settings['people_plan_setting.monthly'],
          popup: settings['people_plan_setting.popup'],
          submissions: settings['people_plan_setting.submissions'],
          risk: settings['people_plan_setting.risk'],
        }}
      />
    ),
  },
  {
    id: 'operations',
    titleKey: '运营看板',
    descriptionKey: '查看成团情况、奖励审核与投稿审核',
    build: () => <AdminOperationsSection />,
  },
] as const

export type PeoplePlanSectionId = (typeof PEOPLE_PLAN_SECTIONS)[number]['id']

const peoplePlanRegistry = createSectionRegistry<
  PeoplePlanSectionId,
  PeoplePlanAdminSettings
>({
  sections: PEOPLE_PLAN_SECTIONS,
  defaultSection: 'campaign',
  basePath: '/system-settings/people-plan',
  urlStyle: 'path',
})

export const PEOPLE_PLAN_DEFAULT_SECTION = peoplePlanRegistry.defaultSection
export const PEOPLE_PLAN_SECTION_IDS = peoplePlanRegistry.sectionIds
export const getPeoplePlanSectionNavItems =
  peoplePlanRegistry.getSectionNavItems
export const getPeoplePlanSectionContent =
  peoplePlanRegistry.getSectionContent
