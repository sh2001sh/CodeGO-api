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
    condition: '新用户通过邀请链接注册，等待完成首调后释放',
    reward: '双方各冻结 2 积分，首调后释放',
  },
  {
    source: '邀请首调',
    condition: '新用户完成首次成功调用',
    reward: '双方各得 5 积分',
  },
  {
    source: '邀请首充',
    condition: '新用户首次现金消费成功',
    reward: '邀请人 12 积分，新用户 5 积分',
  },
  {
    source: '拉新首单盲盒',
    condition: '新用户首次真实消费为购买盲盒',
    reward: '邀请人获得 $2 奖励额度',
  },
  {
    source: '拉新首单日卡',
    condition: '新用户首次真实消费为购买日卡',
    reward: '邀请人获得 $5 奖励额度',
  },
  {
    source: '拉新首单月卡',
    condition: '新用户首次真实消费为购买月卡',
    reward: '邀请人获得 $10 奖励额度',
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
          <TableHead>可获得积分 / 额度</TableHead>
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
