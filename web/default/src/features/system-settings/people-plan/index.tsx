import { SettingsPage } from '../components/settings-page'
import type { PeoplePlanAdminSettings } from '../types'
import {
  PEOPLE_PLAN_DEFAULT_SECTION,
  getPeoplePlanSectionContent,
} from './section-registry.tsx'

const defaultPeoplePlanSettings: PeoplePlanAdminSettings = {
  'people_plan_setting.enabled': true,
  'people_plan_setting.entry_title': '人海计划',
  'people_plan_setting.entry_subtitle': '',
  'people_plan_setting.hero_title': 'Code Go 人海计划',
  'people_plan_setting.hero_subtitle': '',
  'people_plan_setting.hero_description': '',
  'people_plan_setting.team_rules': '{}',
  'people_plan_setting.achievements': '[]',
  'people_plan_setting.monthly': '[]',
  'people_plan_setting.popup': '{}',
  'people_plan_setting.submissions': '{}',
  'people_plan_setting.risk': '{}',
}

export function PeoplePlanSettings() {
  return (
    <SettingsPage
      routePath='/_authenticated/system-settings/people-plan/$section'
      defaultSettings={defaultPeoplePlanSettings}
      defaultSection={PEOPLE_PLAN_DEFAULT_SECTION}
      getSectionContent={getPeoplePlanSectionContent}
    />
  )
}
