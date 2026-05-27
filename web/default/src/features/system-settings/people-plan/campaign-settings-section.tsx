import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

type CampaignSettingsSectionProps = {
  defaultValues: {
    enabled: boolean
    entryTitle: string
    entrySubtitle: string
    heroTitle: string
    heroSubtitle: string
    heroDescription: string
    teamRules: string
    achievements: string
    monthly: string
    popup: string
    submissions: string
    risk: string
  }
}

function isJsonString(value: string) {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

export function CampaignSettingsSection(props: CampaignSettingsSectionProps) {
  const updateOption = useUpdateOption()
  const [enabled, setEnabled] = useState(props.defaultValues.enabled)
  const [entryTitle, setEntryTitle] = useState(props.defaultValues.entryTitle)
  const [entrySubtitle, setEntrySubtitle] = useState(
    props.defaultValues.entrySubtitle
  )
  const [heroTitle, setHeroTitle] = useState(props.defaultValues.heroTitle)
  const [heroSubtitle, setHeroSubtitle] = useState(
    props.defaultValues.heroSubtitle
  )
  const [heroDescription, setHeroDescription] = useState(
    props.defaultValues.heroDescription
  )
  const [teamRules, setTeamRules] = useState(props.defaultValues.teamRules)
  const [achievements, setAchievements] = useState(
    props.defaultValues.achievements
  )
  const [monthly, setMonthly] = useState(props.defaultValues.monthly)
  const [popup, setPopup] = useState(props.defaultValues.popup)
  const [submissions, setSubmissions] = useState(props.defaultValues.submissions)
  const [risk, setRisk] = useState(props.defaultValues.risk)

  const handleSave = async () => {
    const jsonFields = [teamRules, achievements, monthly, popup, submissions, risk]
    if (jsonFields.some((item) => !isJsonString(item))) {
      toast.error('JSON 配置存在格式错误，请先修正。')
      return
    }

    const updates = [
      { key: 'people_plan_setting.enabled', value: enabled },
      { key: 'people_plan_setting.entry_title', value: entryTitle.trim() },
      { key: 'people_plan_setting.entry_subtitle', value: entrySubtitle.trim() },
      { key: 'people_plan_setting.hero_title', value: heroTitle.trim() },
      { key: 'people_plan_setting.hero_subtitle', value: heroSubtitle.trim() },
      {
        key: 'people_plan_setting.hero_description',
        value: heroDescription.trim(),
      },
      { key: 'people_plan_setting.team_rules', value: teamRules.trim() },
      { key: 'people_plan_setting.achievements', value: achievements.trim() },
      { key: 'people_plan_setting.monthly', value: monthly.trim() },
      { key: 'people_plan_setting.popup', value: popup.trim() },
      { key: 'people_plan_setting.submissions', value: submissions.trim() },
      { key: 'people_plan_setting.risk', value: risk.trim() },
    ]

    for (const update of updates) {
      await updateOption.mutateAsync(update)
    }

    toast.success('人海计划活动配置已保存')
  }

  return (
    <SettingsSection
      title='活动配置'
      description='在这里维护活动标题、弹窗文案、组队规则、任务 JSON、投稿奖励与风控参数。'
    >
      <div className='grid gap-6'>
        <div className='flex items-center justify-between rounded-xl border p-4'>
          <div className='space-y-1'>
            <div className='text-sm font-medium'>启用人海计划</div>
            <div className='text-sm text-muted-foreground'>
              控制概览弹窗、活动入口和人海计划页面是否对用户可见。
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <Input
            value={entryTitle}
            onChange={(event) => setEntryTitle(event.target.value)}
            placeholder='入口标题'
          />
          <Input
            value={entrySubtitle}
            onChange={(event) => setEntrySubtitle(event.target.value)}
            placeholder='入口副标题'
          />
          <Input
            value={heroTitle}
            onChange={(event) => setHeroTitle(event.target.value)}
            placeholder='主视觉标题'
          />
          <Input
            value={heroSubtitle}
            onChange={(event) => setHeroSubtitle(event.target.value)}
            placeholder='主视觉副标题'
          />
        </div>

        <Textarea
          rows={4}
          value={heroDescription}
          onChange={(event) => setHeroDescription(event.target.value)}
          placeholder='主视觉说明'
        />

        <div className='grid gap-4'>
          <Textarea
            rows={6}
            value={teamRules}
            onChange={(event) => setTeamRules(event.target.value)}
            placeholder='组队规则 JSON'
          />
          <Textarea
            rows={8}
            value={achievements}
            onChange={(event) => setAchievements(event.target.value)}
            placeholder='长期任务 JSON'
          />
          <Textarea
            rows={6}
            value={monthly}
            onChange={(event) => setMonthly(event.target.value)}
            placeholder='月度任务 JSON'
          />
          <Textarea
            rows={5}
            value={popup}
            onChange={(event) => setPopup(event.target.value)}
            placeholder='活动弹窗 JSON'
          />
          <Textarea
            rows={5}
            value={submissions}
            onChange={(event) => setSubmissions(event.target.value)}
            placeholder='投稿活动奖励 JSON'
          />
          <Textarea
            rows={5}
            value={risk}
            onChange={(event) => setRisk(event.target.value)}
            placeholder='风控配置 JSON'
          />
        </div>

        <div className='flex justify-end'>
          <Button disabled={updateOption.isPending} onClick={handleSave}>
            保存活动配置
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}
