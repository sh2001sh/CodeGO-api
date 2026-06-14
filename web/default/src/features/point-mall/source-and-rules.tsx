import { Coins } from 'lucide-react'
import { PointSourcesTable } from './point-sources-table'

export function SourceAndRules() {
  return (
    <section className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
      <div className='bg-card rounded-lg border p-5'>
        <div className='mb-4'>
          <div className='flex items-center gap-2'>
            <Coins className='size-4' aria-hidden='true' />
            <h2 className='text-lg font-semibold'>积分获取来源</h2>
          </div>
          <p className='text-muted-foreground text-sm'>
            现金购买套餐可获得积分，邀请新用户注册可让对方获得少量积分。积分可在下方兑换券、卡密与权益。
          </p>
        </div>
        <div className='overflow-auto'>
          <PointSourcesTable />
        </div>
      </div>
      <div className='bg-card rounded-lg border p-5'>
        <h2 className='text-lg font-semibold'>兑换规则</h2>
        <div className='mt-4 space-y-3 text-sm'>
          <div>
            <div className='font-medium'>京东 E 卡</div>
            <p className='text-muted-foreground mt-1'>
              兑换成功后在兑换记录中查看卡密；10 元 E 卡由两张 5 元卡密组成，20 元 E 卡对应一条卡密。
            </p>
          </div>
          <div>
            <div className='font-medium'>盲盒券</div>
            <p className='text-muted-foreground mt-1'>
              兑换后立即到账，开出的临时额度会写入兑换记录。
            </p>
          </div>
          <div>
            <div className='font-medium'>月卡兑换</div>
            <p className='text-muted-foreground mt-1'>
              兑换后立即生效或自动排队续接，记录中展示起止时间。
            </p>
          </div>
          <div>
            <div className='font-medium'>邀请奖励说明</div>
            <p className='text-muted-foreground mt-1'>
              新用户通过你的链接注册可获得少量积分。当被邀请人首次购买月卡成功，你会获得 1 次订阅额度刷新机会。
            </p>
          </div>
          <div>
            <div className='font-medium'>积分返还</div>
            <p className='text-muted-foreground mt-1'>
              使用积分兑换的月卡，不再额外返还套餐购买积分。
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
