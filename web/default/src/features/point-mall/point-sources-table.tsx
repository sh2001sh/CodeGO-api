import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const pointSources = [
  {
    source: '购买 Lite 月卡',
    condition: '现金购买套餐并支付成功',
    reward: '10 积分',
  },
  {
    source: '购买 Standard 月卡',
    condition: '现金购买套餐并支付成功',
    reward: '18 积分',
  },
  {
    source: '购买 Pro 月卡',
    condition: '现金购买套餐并支付成功',
    reward: '30 积分',
  },
  {
    source: '购买 Ultra 月卡',
    condition: '现金购买套餐并支付成功',
    reward: '60 积分',
  },
  {
    source: '邀请注册',
    condition: '新用户通过邀请链接注册；完成首次成功 API 调用后释放',
    reward: '双方各 2 冻结积分，首调成功后转为可用积分',
  },
  {
    source: '邀请首调',
    condition: '新用户完成首次成功 API 调用',
    reward: '双方各 5 积分 + $10 赠送额度',
  },
  {
    source: '邀请首充',
    condition: '新用户首次现金购买月卡套餐',
    reward: '邀请人 12 积分，新用户 5 积分',
  },
  {
    source: '赠送额度兑换',
    condition: '仅可使用赠送额度兑换，付费余额不可兑换',
    reward: '$5 赠送额度 = 1 积分，每月最多 $500',
  },
]

export function PointSourcesTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>来源</TableHead>
          <TableHead>条件</TableHead>
          <TableHead>可获得积分/额度</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pointSources.map((item) => (
          <TableRow key={item.source}>
            <TableCell className='font-medium'>{item.source}</TableCell>
            <TableCell>{item.condition}</TableCell>
            <TableCell>{item.reward}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
