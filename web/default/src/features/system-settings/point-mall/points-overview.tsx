import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { adminGetPointMallPoints } from '@/features/point-mall/api'
import { formatTime } from '@/features/point-mall/delivery-content'

function userLabel(row: { user_id: number; username?: string; display_name?: string }) {
  return row.display_name || row.username || `用户 ${row.user_id}`
}

function ledgerTypeLabel(type: string) {
  const labels: Record<string, string> = {
    earn: '获得',
    spend: '消耗',
    freeze: '冻结',
    release: '释放',
    refund: '退回',
  }
  return labels[type] ?? type
}

export function PointsOverview() {
  const pointsQuery = useQuery({
    queryKey: ['point-mall-admin', 'points'],
    queryFn: adminGetPointMallPoints,
  })
  const accounts = pointsQuery.data?.data?.accounts ?? []
  const ledgers = pointsQuery.data?.data?.recent_ledgers ?? []

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>用户积分情况</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>当前积分</TableHead>
                  <TableHead>冻结积分</TableHead>
                  <TableHead>累计获得</TableHead>
                  <TableHead>累计消耗</TableHead>
                  <TableHead>更新时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.user_id}>
                    <TableCell>
                      <div className='font-medium'>{userLabel(account)}</div>
                      <div className='text-muted-foreground text-xs'>
                        ID: {account.user_id}
                      </div>
                    </TableCell>
                    <TableCell>{account.balance}</TableCell>
                    <TableCell>{account.frozen_balance}</TableCell>
                    <TableCell>{account.total_earned}</TableCell>
                    <TableCell>{account.total_spent}</TableCell>
                    <TableCell>{formatTime(account.updated_at)}</TableCell>
                  </TableRow>
                ))}
                {!pointsQuery.isLoading && accounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className='py-8 text-center'>
                      暂无积分账户
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>最近积分流水</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>变动</TableHead>
                  <TableHead>变动后余额</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead>说明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgers.map((ledger) => (
                  <TableRow key={ledger.id}>
                    <TableCell>{formatTime(ledger.created_at)}</TableCell>
                    <TableCell>
                      <div className='font-medium'>{userLabel(ledger)}</div>
                      <div className='text-muted-foreground text-xs'>
                        ID: {ledger.user_id}
                      </div>
                    </TableCell>
                    <TableCell>{ledgerTypeLabel(ledger.type)}</TableCell>
                    <TableCell
                      className={
                        ledger.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }
                    >
                      {ledger.delta >= 0 ? '+' : ''}
                      {ledger.delta}
                    </TableCell>
                    <TableCell>{ledger.balance_after}</TableCell>
                    <TableCell>{ledger.source_type}</TableCell>
                    <TableCell>{ledger.note || '-'}</TableCell>
                  </TableRow>
                ))}
                {!pointsQuery.isLoading && ledgers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className='py-8 text-center'>
                      暂无积分流水
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
