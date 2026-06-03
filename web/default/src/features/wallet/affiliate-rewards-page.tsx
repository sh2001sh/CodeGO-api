/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useMemo, useState, type ComponentType } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Coins,
  Copy,
  Gift,
  Link2,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react'
import { formatNumber, formatQuota, formatTimestampToDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SectionPageLayout } from '@/components/layout'
import { TransferDialog } from './components/dialogs/transfer-dialog'
import { useAffiliate, useTopupInfo } from './hooks'
import type { AffiliateInviteeRewardStatus } from './types'

function StatCard(props: {
  title: string
  value: string
  hint: string
  icon: ComponentType<{ className?: string }>
}) {
  const Icon = props.icon

  return (
    <Card className='py-0'>
      <CardContent className='flex items-start justify-between gap-4 p-4'>
        <div className='min-w-0'>
          <div className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
            {props.title}
          </div>
          <div className='mt-2 text-2xl font-semibold tracking-tight'>
            {props.value}
          </div>
          <div className='text-muted-foreground mt-1 text-sm'>{props.hint}</div>
        </div>
        <div className='bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl border'>
          <Icon className='text-muted-foreground size-4' />
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge(props: { completed: boolean; doneText: string; todoText: string }) {
  return (
    <Badge variant={props.completed ? 'default' : 'outline'}>
      {props.completed ? props.doneText : props.todoText}
    </Badge>
  )
}

function getInviteeName(invitee: AffiliateInviteeRewardStatus) {
  return invitee.invitee_display_name || invitee.invitee_username || `用户 #${invitee.invitee_id}`
}

export function AffiliateRewardsPage() {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const {
    overview,
    affiliateLink,
    loading,
    transferring,
    copyAffiliateLink,
    transferQuota,
    refetch,
  } = useAffiliate()
  const { topupInfo } = useTopupInfo()

  const complianceConfirmed = topupInfo?.payment_compliance_confirmed !== false
  const legacyQuotaAvailable = overview?.legacy_affiliate_quota ?? 0
  const invitees = overview?.invitees ?? []

  const inviteeRows = useMemo(
    () =>
      invitees.map((invitee) => ({
        ...invitee,
        name: getInviteeName(invitee),
      })),
    [invitees]
  )

  const handleTransfer = async (amount: number) => {
    const success = await transferQuota(amount)
    if (success) {
      await refetch()
    }
    return success
  }

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>邀请奖励</SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <Button variant='outline' render={<Link to='/point-mall' />}>
            <Coins data-icon='inline-start' />
            积分商城
          </Button>
          <Button render={<Link to='/wallet' />}>
            <Wallet data-icon='inline-start' />
            钱包
          </Button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <div className='mx-auto flex w-full max-w-7xl flex-col gap-4'>
            <Card className='overflow-hidden border-slate-200 py-0 dark:border-slate-800'>
              <CardContent className='grid gap-4 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96),rgba(240,253,250,0.96))] p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.94),rgba(3,105,161,0.16))]'>
                <div className='min-w-0'>
                  <div className='text-muted-foreground text-xs font-medium tracking-[0.22em] uppercase'>
                    邀请中心
                  </div>
                  <div className='mt-2 text-2xl font-semibold tracking-tight sm:text-3xl'>
                    分享专属邀请链接，首调拿积分，首单再拿奖励额度
                  </div>
                  <div className='text-muted-foreground mt-2 max-w-2xl text-sm leading-6'>
                    新用户通过你的链接注册后，注册、首调、首充都会进入积分奖励流程；
                    首次真实消费还会给邀请人发放积分商城可用的奖励额度。
                  </div>

                  <div className='mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]'>
                    {loading ? (
                      <Skeleton className='h-11 rounded-xl' />
                    ) : (
                      <Input
                        value={affiliateLink}
                        readOnly
                        className='h-11 font-mono text-xs sm:text-sm'
                      />
                    )}
                    <div className='flex gap-2'>
                      <Button
                        onClick={() => void copyAffiliateLink()}
                        disabled={!affiliateLink}
                        className='h-11'
                      >
                        <Copy data-icon='inline-start' />
                        复制邀请链接
                      </Button>
                      <Button
                        variant='outline'
                        render={<Link to='/point-mall' />}
                        className='h-11'
                      >
                        <ArrowRight data-icon='inline-start' />
                        去积分商城
                      </Button>
                    </div>
                  </div>
                </div>

                <div className='grid gap-3 self-start rounded-2xl border border-slate-200/80 bg-white/78 p-4 dark:border-slate-800 dark:bg-slate-950/55'>
                  <div>
                    <div className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      奖励发放说明
                    </div>
                    <div className='mt-2 text-sm leading-6'>
                      注册先冻结积分，完成首次真实调用后释放并发放首调积分。
                      新用户首次现金消费后，再按商品类型给邀请人发放奖励额度。
                    </div>
                  </div>
                  <Separator />
                  <div className='grid gap-2 text-sm'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-muted-foreground'>注册</span>
                      <span>双方各冻结 2 积分</span>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-muted-foreground'>首调完成</span>
                      <span>双方各得 5 积分并释放冻结积分</span>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-muted-foreground'>首充完成</span>
                      <span>邀请人 12 积分 / 新用户 5 积分</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className='h-32 rounded-xl' />
                ))}
              </div>
            ) : (
              <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
                <StatCard
                  title='已邀请人数'
                  value={formatNumber(overview?.invited_count ?? 0)}
                  hint='通过你的链接完成注册的用户数'
                  icon={Users}
                />
                <StatCard
                  title='已获积分'
                  value={formatNumber(overview?.referral_points_earned ?? 0)}
                  hint='注册释放、首调、首充累计到账积分'
                  icon={Gift}
                />
                <StatCard
                  title='待释放积分'
                  value={formatNumber(overview?.referral_points_pending ?? 0)}
                  hint='新用户已注册但还未完成首调'
                  icon={Link2}
                />
                <StatCard
                  title='奖励额度'
                  value={formatQuota(overview?.referral_bonus_quota_earned ?? 0)}
                  hint='新用户首单消费后累计发放的额度'
                  icon={ShoppingBag}
                />
                <StatCard
                  title='首单完成数'
                  value={formatNumber(overview?.successful_purchase_invites ?? 0)}
                  hint='已完成首次真实消费的拉新人数'
                  icon={Coins}
                />
              </div>
            )}

            <div className='grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]'>
              <Card className='py-0'>
                <CardHeader>
                  <CardTitle>拉新奖励规则</CardTitle>
                  <CardDescription>
                    积分奖励和消费额度奖励会叠加发放，消费额度进入积分商城可用额度。
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4 pb-4'>
                  <div className='grid gap-3 md:grid-cols-3'>
                    <Card size='sm' className='py-0'>
                      <CardContent className='p-3'>
                        <div className='text-sm font-semibold'>盲盒首单</div>
                        <div className='text-muted-foreground mt-1 text-sm'>
                          邀请人获得奖励额度
                        </div>
                        <div className='mt-3 text-xl font-semibold'>$2</div>
                      </CardContent>
                    </Card>
                    <Card size='sm' className='py-0'>
                      <CardContent className='p-3'>
                        <div className='text-sm font-semibold'>日卡首单</div>
                        <div className='text-muted-foreground mt-1 text-sm'>
                          邀请人获得奖励额度
                        </div>
                        <div className='mt-3 text-xl font-semibold'>$5</div>
                      </CardContent>
                    </Card>
                    <Card size='sm' className='py-0'>
                      <CardContent className='p-3'>
                        <div className='text-sm font-semibold'>月卡首单</div>
                        <div className='text-muted-foreground mt-1 text-sm'>
                          邀请人获得奖励额度
                        </div>
                        <div className='mt-3 text-xl font-semibold'>$10</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className='overflow-hidden rounded-xl border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>阶段</TableHead>
                          <TableHead>触发条件</TableHead>
                          <TableHead>奖励</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className='font-medium'>邀请注册</TableCell>
                          <TableCell>新用户通过你的邀请链接注册</TableCell>
                          <TableCell>双方各冻结 2 积分，首调完成后释放</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className='font-medium'>邀请首调</TableCell>
                          <TableCell>新用户完成首次成功调用</TableCell>
                          <TableCell>双方各得 5 积分，并释放注册冻结积分</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className='font-medium'>邀请首充</TableCell>
                          <TableCell>新用户首次现金购买</TableCell>
                          <TableCell>邀请人 12 积分，新用户 5 积分</TableCell>
                        </TableRow>
                        {(overview?.rules ?? []).map((rule) => (
                          <TableRow key={rule.purchase_type}>
                            <TableCell className='font-medium'>
                              {rule.purchase_label || rule.purchase_type}
                            </TableCell>
                            <TableCell>新用户首次真实消费命中该商品类型</TableCell>
                            <TableCell>
                              邀请人获得 {formatQuota(rule.bonus_quota_amount)} 奖励额度
                              <span className='text-muted-foreground ml-2 text-xs'>
                                (${rule.bonus_quota_usd})
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className='flex flex-col gap-4'>
                <Card className='py-0'>
                  <CardHeader>
                    <CardTitle>积分商城入口</CardTitle>
                    <CardDescription>
                      消费额度奖励会直接进入积分商城相关额度，可用于兑换积分。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3 pb-4'>
                    <div className='rounded-xl border bg-muted/30 p-3'>
                      <div className='text-sm font-medium'>已获奖励额度</div>
                      <div className='mt-2 text-2xl font-semibold'>
                        {loading
                          ? '--'
                          : formatQuota(overview?.referral_bonus_quota_earned ?? 0)}
                      </div>
                      <div className='text-muted-foreground mt-1 text-xs'>
                        用于积分商城兑换，不影响你原有的钱包余额展示。
                      </div>
                    </div>
                    <Button className='w-full justify-between' render={<Link to='/point-mall' />}>
                      <span>查看积分商城</span>
                      <ArrowRight data-icon='inline-end' />
                    </Button>
                  </CardContent>
                </Card>

                <Card className='py-0'>
                  <CardHeader>
                    <CardTitle>历史邀请额度</CardTitle>
                    <CardDescription>
                      保留原有邀请额度划转能力，不影响当前积分商城奖励流程。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3 pb-4'>
                    <div className='rounded-xl border bg-muted/30 p-3'>
                      <div className='flex items-center justify-between gap-3'>
                        <span className='text-sm font-medium'>可划转额度</span>
                        <span className='text-lg font-semibold'>
                          {loading ? '--' : formatQuota(legacyQuotaAvailable)}
                        </span>
                      </div>
                      <div className='mt-2 flex items-center justify-between gap-3'>
                        <span className='text-muted-foreground text-sm'>
                          历史累计获得
                        </span>
                        <span className='text-sm'>
                          {loading
                            ? '--'
                            : formatQuota(overview?.legacy_affiliate_quota_earned ?? 0)}
                        </span>
                      </div>
                    </div>
                    <Button
                      className='w-full'
                      onClick={() => setTransferDialogOpen(true)}
                      disabled={!legacyQuotaAvailable || !complianceConfirmed}
                    >
                      划转到主余额
                    </Button>
                    {!complianceConfirmed ? (
                      <div className='text-muted-foreground text-xs'>
                        管理员未确认合规条款前，历史邀请额度暂不可划转。
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card className='py-0'>
              <CardHeader>
                <CardTitle>邀请明细</CardTitle>
                <CardDescription>
                  可以看到每个拉新用户是否完成了首调、首充和首次真实消费奖励。
                </CardDescription>
              </CardHeader>
              <CardContent className='pb-4'>
                {loading ? (
                  <div className='space-y-2'>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className='h-14 rounded-xl' />
                    ))}
                  </div>
                ) : inviteeRows.length === 0 ? (
                  <div className='text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm'>
                    还没有拉新记录。先复制邀请链接发给新用户。
                  </div>
                ) : (
                  <div className='overflow-hidden rounded-xl border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>用户</TableHead>
                          <TableHead>注册时间</TableHead>
                          <TableHead>首调</TableHead>
                          <TableHead>首充积分</TableHead>
                          <TableHead>首单消费奖励</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inviteeRows.map((invitee) => (
                          <TableRow key={invitee.invitee_id}>
                            <TableCell>
                              <div className='flex min-w-0 flex-col'>
                                <span className='font-medium'>{invitee.name}</span>
                                <span className='text-muted-foreground text-xs'>
                                  @{invitee.invitee_username}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{formatTimestampToDate(invitee.created_at)}</TableCell>
                            <TableCell>
                              <div className='flex flex-col gap-1'>
                                <StatusBadge
                                  completed={invitee.first_call_completed}
                                  doneText='已完成'
                                  todoText='未完成'
                                />
                                {invitee.first_call_completed ? (
                                  <span className='text-muted-foreground text-xs'>
                                    +{formatNumber(invitee.first_call_rewarded_points)} 积分
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='flex flex-col gap-1'>
                                <StatusBadge
                                  completed={invitee.first_topup_completed}
                                  doneText='已到账'
                                  todoText='未触发'
                                />
                                {invitee.first_topup_completed ? (
                                  <span className='text-muted-foreground text-xs'>
                                    +{formatNumber(invitee.first_topup_rewarded_points)} 积分
                                  </span>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='flex flex-col gap-1'>
                                <StatusBadge
                                  completed={invitee.first_purchase_completed}
                                  doneText='已发放'
                                  todoText='未消费'
                                />
                                {invitee.first_purchase_completed ? (
                                  <>
                                    <span className='text-xs font-medium'>
                                      {invitee.first_purchase_label || invitee.first_purchase_type}
                                    </span>
                                    <span className='text-muted-foreground text-xs'>
                                      +{formatQuota(invitee.first_purchase_reward_quota)}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onConfirm={handleTransfer}
        availableQuota={legacyQuotaAvailable}
        transferring={transferring}
      />
    </>
  )
}
