import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HeroSection } from './components/hero-section'
import { RulesTab } from './components/rules-tab'
import { SubmissionBoard } from './components/submission-board'
import {
  TeamRewardsWorkspace,
  TeamTaskBoard,
  TeamWorkspace,
} from './components/rewards-tab'
import { usePeoplePlanMutations, usePeoplePlanQueries } from './hooks'
import type { PeoplePlanOverview, PeoplePlanProgress } from './types'
import {
  activityTabs,
  getRequestErrorMessage,
  type ActivityTab,
  type SubmissionType,
} from './utils'

function buildPeoplePlanInviteLink(inviteCode: string) {
  if (!inviteCode) return ''
  if (typeof window === 'undefined') {
    return `/sign-up?people_plan_invite=${encodeURIComponent(inviteCode)}`
  }
  return `${window.location.origin}/sign-up?people_plan_invite=${encodeURIComponent(inviteCode)}`
}

function PeoplePlanContent(props: {
  activeTab: ActivityTab
  setActiveTab: (value: ActivityTab) => void
  overview?: PeoplePlanOverview
  teamName: string
  inviteCode: string
  submissionType: SubmissionType
  submissionTitle: string
  submissionSummary: string
  submissionContent: string
  submissionContact: string
  submissionAttachments: string
  setTeamName: (value: string) => void
  setInviteCode: (value: string) => void
  setSubmissionType: (value: SubmissionType) => void
  setSubmissionTitle: (value: string) => void
  setSubmissionSummary: (value: string) => void
  setSubmissionContent: (value: string) => void
  setSubmissionContact: (value: string) => void
  setSubmissionAttachments: (value: string) => void
  peoplePlan: ReturnType<typeof usePeoplePlanQueries>
  progressMap: Map<string, PeoplePlanProgress>
  createTeamPending: boolean
  joinTeamPending: boolean
  leaveTeamPending: boolean
  removeMemberPending: boolean
  claimRewardPending: boolean
  createSubmissionPending: boolean
  inviteLink: string
  onCreateTeam: () => Promise<void>
  onJoinTeam: () => Promise<void>
  onCopyInviteCode: () => Promise<void>
  onCopyInviteLink: () => Promise<void>
  onLeaveTeam: () => Promise<void>
  onRemoveMember: (memberUserId: number) => Promise<void>
  onClaimReward: (rewardId: number) => void
  onCreateSubmission: () => Promise<void>
}) {
  const hasOverviewError = props.peoplePlan.overviewQuery.isError
  const teamRewards = props.peoplePlan.rewards.filter(
    (reward) => reward.source_type !== 'submission'
  )
  const submissionRewards = props.peoplePlan.rewards.filter(
    (reward) => reward.source_type === 'submission'
  )

  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col gap-5'>
      <HeroSection
        overview={props.overview}
        team={props.peoplePlan.team}
        rewardSummary={props.peoplePlan.rewardSummary}
      />

      {hasOverviewError ? (
        <Card>
          <CardHeader>
            <CardTitle>人海计划加载失败</CardTitle>
            <CardDescription>
              {getRequestErrorMessage(props.peoplePlan.overviewQuery.error)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                void props.peoplePlan.overviewQuery.refetch()
                void props.peoplePlan.rewardsQuery.refetch()
                void props.peoplePlan.submissionsQuery.refetch()
              }}
            >
              重新加载
            </Button>
          </CardContent>
        </Card>
      ) : props.overview?.enabled === false ? (
        <Card>
          <CardHeader>
            <CardTitle>活动暂未开启</CardTitle>
            <CardDescription>
              当前后台已关闭人海计划活动，请联系管理员开启。
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs
          value={props.activeTab}
          onValueChange={(value) => props.setActiveTab(value as ActivityTab)}
          className='space-y-5'
        >
          <TabsList className='grid h-auto w-full grid-cols-1 rounded-2xl bg-muted p-1 md:grid-cols-3'>
            {activityTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className='h-auto rounded-xl px-4 py-3'
              >
                <div className='text-center'>
                  <div className='text-sm font-semibold md:text-base'>
                    {tab.label}
                  </div>
                  <div className='mt-1 text-xs text-muted-foreground'>
                    {tab.hint}
                  </div>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value='rules' className='mt-0'>
            <RulesTab
              overview={props.overview}
              team={props.peoplePlan.team}
              rewardSummary={props.peoplePlan.rewardSummary}
            />
          </TabsContent>

          <TabsContent value='rewards' className='mt-0 space-y-5'>
            <div className='grid gap-5 xl:grid-cols-[1.04fr_0.96fr]'>
              <TeamWorkspace
                team={props.peoplePlan.team}
                teamName={props.teamName}
                inviteCode={props.inviteCode}
                inviteLink={props.inviteLink}
                setTeamName={props.setTeamName}
                setInviteCode={props.setInviteCode}
                onCreateTeam={props.onCreateTeam}
                onJoinTeam={props.onJoinTeam}
                onCopyInviteCode={props.onCopyInviteCode}
                onCopyInviteLink={props.onCopyInviteLink}
                onLeaveTeam={props.onLeaveTeam}
                onRemoveMember={props.onRemoveMember}
                creating={props.createTeamPending}
                joining={props.joinTeamPending}
                leaving={props.leaveTeamPending}
                removingMember={props.removeMemberPending}
              />
              <TeamRewardsWorkspace
                rewardSummary={props.peoplePlan.rewardSummary}
                rewards={teamRewards}
                claimPending={props.claimRewardPending}
                onClaim={props.onClaimReward}
              />
            </div>

            <TeamTaskBoard
              tasks={props.overview?.team_tasks ?? []}
              team={props.peoplePlan.team}
              progressMap={props.progressMap}
            />
          </TabsContent>

          <TabsContent value='submissions' className='mt-0'>
            <SubmissionBoard
              submissionType={props.submissionType}
              setSubmissionType={props.setSubmissionType}
              submissionTitle={props.submissionTitle}
              setSubmissionTitle={props.setSubmissionTitle}
              submissionSummary={props.submissionSummary}
              setSubmissionSummary={props.setSubmissionSummary}
              submissionContent={props.submissionContent}
              setSubmissionContent={props.setSubmissionContent}
              submissionAttachments={props.submissionAttachments}
              setSubmissionAttachments={props.setSubmissionAttachments}
              submissionContact={props.submissionContact}
              setSubmissionContact={props.setSubmissionContact}
              onSubmit={props.onCreateSubmission}
              submitting={props.createSubmissionPending}
              submissions={props.peoplePlan.submissions}
              rewards={submissionRewards}
              tasks={props.overview?.submission_tasks ?? []}
            />
          </TabsContent>
        </Tabs>
      )}

      {props.peoplePlan.isLoading ? (
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Sparkles className='h-4 w-4' />
          正在加载人海计划内容...
        </div>
      ) : null}
    </div>
  )
}

export function PeoplePlanPage() {
  const peoplePlan = usePeoplePlanQueries()
  const {
    createTeamMutation,
    joinTeamMutation,
    leaveTeamMutation,
    removeMemberMutation,
    claimRewardMutation,
    createSubmissionMutation,
  } = usePeoplePlanMutations()
  const [activeTab, setActiveTab] = useState<ActivityTab>('rules')
  const [teamName, setTeamName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [submissionType, setSubmissionType] = useState<SubmissionType>('content')
  const [submissionTitle, setSubmissionTitle] = useState('')
  const [submissionSummary, setSubmissionSummary] = useState('')
  const [submissionContent, setSubmissionContent] = useState('')
  const [submissionContact, setSubmissionContact] = useState('')
  const [submissionAttachments, setSubmissionAttachments] = useState('')

  const progressMap = useMemo(() => {
    const next = new Map<string, PeoplePlanProgress>()
    for (const item of peoplePlan.team?.achievements ?? []) {
      next.set(`${item.category}:${item.key}`, item)
    }
    return next
  }, [peoplePlan.team?.achievements])

  const inviteLink = buildPeoplePlanInviteLink(
    peoplePlan.team?.team.invite_code ?? ''
  )

  const handleCopyInviteCode = async () => {
    if (!peoplePlan.team?.team.invite_code) return
    await navigator.clipboard.writeText(peoplePlan.team.team.invite_code)
    toast.success('邀请码已复制')
  }

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    toast.success('邀请链接已复制')
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error('请先填写小队名称')
      return
    }
    await createTeamMutation.mutateAsync(teamName.trim())
    setTeamName('')
  }

  const handleJoinTeam = async () => {
    if (!inviteCode.trim()) {
      toast.error('请先填写邀请码')
      return
    }
    await joinTeamMutation.mutateAsync(inviteCode.trim())
    setInviteCode('')
  }

  const handleCreateSubmission = async () => {
    if (!submissionTitle.trim() || !submissionContent.trim()) {
      toast.error('标题和内容不能为空')
      return
    }

    const attachments = submissionAttachments
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)

    await createSubmissionMutation.mutateAsync({
      type: submissionType,
      title: submissionTitle.trim(),
      summary: submissionSummary.trim(),
      content: submissionContent.trim(),
      attachments,
      contact: submissionContact.trim(),
      public_display: false,
    })

    setSubmissionTitle('')
    setSubmissionSummary('')
    setSubmissionContent('')
    setSubmissionContact('')
    setSubmissionAttachments('')
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>人海计划</SectionPageLayout.Title>
      <SectionPageLayout.Description>
        单人最高{' '}
        {peoplePlan.overview?.max_total_reward_usd
          ? new Intl.NumberFormat('zh-CN', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 0,
            }).format(peoplePlan.overview.max_total_reward_usd)
          : '—'}
        ，组队按贡献分 + 投稿个人独享，两项可叠加。先看规则，再进组队或投稿页面。
      </SectionPageLayout.Description>
      <SectionPageLayout.Content>
        <PeoplePlanContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          overview={peoplePlan.overview}
          teamName={teamName}
          inviteCode={inviteCode}
          submissionType={submissionType}
          submissionTitle={submissionTitle}
          submissionSummary={submissionSummary}
          submissionContent={submissionContent}
          submissionContact={submissionContact}
          submissionAttachments={submissionAttachments}
          setTeamName={setTeamName}
          setInviteCode={setInviteCode}
          setSubmissionType={setSubmissionType}
          setSubmissionTitle={setSubmissionTitle}
          setSubmissionSummary={setSubmissionSummary}
          setSubmissionContent={setSubmissionContent}
          setSubmissionContact={setSubmissionContact}
          setSubmissionAttachments={setSubmissionAttachments}
          peoplePlan={peoplePlan}
          progressMap={progressMap}
          createTeamPending={createTeamMutation.isPending}
          joinTeamPending={joinTeamMutation.isPending}
          leaveTeamPending={leaveTeamMutation.isPending}
          removeMemberPending={removeMemberMutation.isPending}
          claimRewardPending={claimRewardMutation.isPending}
          createSubmissionPending={createSubmissionMutation.isPending}
          inviteLink={inviteLink}
          onCreateTeam={handleCreateTeam}
          onJoinTeam={handleJoinTeam}
          onCopyInviteCode={handleCopyInviteCode}
          onCopyInviteLink={handleCopyInviteLink}
          onLeaveTeam={() => leaveTeamMutation.mutateAsync().then(() => undefined)}
          onRemoveMember={(memberUserId) =>
            removeMemberMutation.mutateAsync(memberUserId).then(() => undefined)
          }
          onClaimReward={(rewardId) => claimRewardMutation.mutate(rewardId)}
          onCreateSubmission={handleCreateSubmission}
        />
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
