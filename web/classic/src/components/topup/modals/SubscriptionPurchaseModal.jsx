/*
Copyright (C) 2025 QuantumNous

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

import React from 'react';
import {
  Banner,
  Button,
  Card,
  Divider,
  Modal,
  Select,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import { IconCreditCard } from '@douyinfe/semi-icons';
import { CalendarClock, Crown, Package } from 'lucide-react';
import { SiStripe } from 'react-icons/si';
import { renderQuota } from '../../../helpers';
import {
  formatSubscriptionDuration,
  formatSubscriptionResetPeriod,
} from '../../../helpers/subscriptionFormat';

const { Text } = Typography;

const TEXT = {
  buySubscription: '\u8d2d\u4e70\u8ba2\u9605\u5957\u9910',
  planName: '\u5957\u9910\u540d\u79f0',
  subtitle: '\u526f\u6807\u9898',
  validFor: '\u6709\u6548\u671f',
  resetPeriod: '\u91cd\u7f6e\u5468\u671f',
  totalQuota: '\u603b\u989d\u5ea6',
  originalQuota: '\u539f\u59cb\u989d\u5ea6',
  unlimited: '\u4e0d\u9650',
  upgradeGroup: '\u5347\u7ea7\u5206\u7ec4',
  packageDetail: '\u5957\u9910\u8be6\u60c5',
  amountDue: '\u5e94\u4ed8\u91d1\u989d',
  selectPaymentMethod: '\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f',
  pay: '\u652f\u4ed8',
  noPayment:
    '\u7ba1\u7406\u5458\u672a\u5f00\u542f\u5728\u7ebf\u652f\u4ed8\u529f\u80fd\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458\u914d\u7f6e\u3002',
  dayPass: '\u65e5\u5361',
  monthPass: '\u6708\u5361',
  weeklyQuota: '\u6bcf\u5468\u989d\u5ea6',
  cycleQuota: '\u5468\u671f\u989d\u5ea6',
  purchaseLimitReached: '\u5df2\u8fbe\u5230\u8d2d\u4e70\u4e0a\u9650',
};

function formatPlanPrice(priceAmount, currency) {
  const normalized = String(currency || '').toUpperCase();
  const formatted = Number(priceAmount || 0)
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d)0$/, '$1');

  if (normalized === 'CNY') return `${formatted} \u5143`;
  if (normalized === 'EUR') return `EUR ${formatted}`;
  return `$${formatted}`;
}

function getPlanSubtitle(plan) {
  const subtitle = String(plan?.subtitle || '').trim();
  if (subtitle) return subtitle;
  const durationCount = Number(plan?.duration_value || 0);
  const durationUnit = String(plan?.duration_unit || '').toLowerCase();
  if (durationUnit === 'day' && durationCount > 0 && durationCount <= 2) {
    return TEXT.dayPass;
  }
  return TEXT.monthPass;
}

function getPlanDetailsText(plan, totalAmount, periodAmount, t) {
  const periodLabel =
    plan?.quota_reset_period === 'weekly' ? TEXT.weeklyQuota : TEXT.cycleQuota;
  const totalLabel = totalAmount > 0 ? renderQuota(totalAmount) : TEXT.unlimited;
  const parts = [
    `${TEXT.validFor} ${formatSubscriptionDuration(plan, t)}`,
    periodAmount > 0 ? `${periodLabel} ${renderQuota(periodAmount)}` : null,
    `${TEXT.totalQuota} ${totalLabel}`,
  ];
  return parts.filter(Boolean).join('\uFF1B');
}

const SubscriptionPurchaseModal = ({
  t,
  visible,
  onCancel,
  selectedPlan,
  paying,
  selectedEpayMethod,
  setSelectedEpayMethod,
  epayMethods = [],
  enableOnlineTopUp = false,
  enableStripeTopUp = false,
  enableCreemTopUp = false,
  purchaseLimitInfo = null,
  onPayStripe,
  onPayCreem,
  onPayEpay,
}) => {
  const plan = selectedPlan?.plan;
  const totalAmount = Number(plan?.total_amount || 0);
  const periodAmount = Number(plan?.period_amount || 0);
  const displayPrice = formatPlanPrice(
    Number(plan?.price_amount || 0),
    plan?.currency,
  );
  const detailText = getPlanDetailsText(plan, totalAmount, periodAmount, t);
  const resetText = formatSubscriptionResetPeriod(plan, t);
  const hasStripe = enableStripeTopUp && !!plan?.stripe_price_id;
  const hasCreem = enableCreemTopUp && !!plan?.creem_product_id;
  const hasEpay = enableOnlineTopUp && epayMethods.length > 0;
  const hasAnyPayment = hasStripe || hasCreem || hasEpay;
  const purchaseLimit = Number(purchaseLimitInfo?.limit || 0);
  const purchaseCount = Number(purchaseLimitInfo?.count || 0);
  const purchaseLimitReached =
    purchaseLimit > 0 && purchaseCount >= purchaseLimit;

  return (
    <Modal
      title={
        <div className='flex items-center'>
          <Crown className='mr-2' size={18} />
          {TEXT.buySubscription}
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      footer={null}
      size='small'
      centered
    >
      {plan ? (
        <div className='space-y-4 pb-10'>
          <Card className='!rounded-xl !border-0 bg-slate-50 dark:bg-slate-800'>
            <div className='space-y-3'>
              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {TEXT.planName}:
                </Text>
                <Typography.Text
                  ellipsis={{ rows: 1, showTooltip: true }}
                  className='text-slate-900 dark:text-slate-100'
                  style={{ maxWidth: 200 }}
                >
                  {plan.title}
                </Typography.Text>
              </div>

              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {TEXT.subtitle}:
                </Text>
                <Text className='text-slate-900 dark:text-slate-100'>
                  {getPlanSubtitle(plan)}
                </Text>
              </div>

              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {TEXT.validFor}:
                </Text>
                <div className='flex items-center'>
                  <CalendarClock size={14} className='mr-1 text-slate-500' />
                  <Text className='text-slate-900 dark:text-slate-100'>
                    {formatSubscriptionDuration(plan, t)}
                  </Text>
                </div>
              </div>

              {resetText !== '\u4e0d\u91cd\u7f6e' && (
                <div className='flex justify-between items-center'>
                  <Text strong className='text-slate-700 dark:text-slate-200'>
                    {TEXT.resetPeriod}:
                  </Text>
                  <Text className='text-slate-900 dark:text-slate-100'>
                    {resetText}
                  </Text>
                </div>
              )}

              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {TEXT.totalQuota}:
                </Text>
                <div className='flex items-center'>
                  <Package size={14} className='mr-1 text-slate-500' />
                  {totalAmount > 0 ? (
                    <Tooltip content={`${TEXT.originalQuota}: ${totalAmount}`}>
                      <Text className='text-slate-900 dark:text-slate-100'>
                        {renderQuota(totalAmount)}
                      </Text>
                    </Tooltip>
                  ) : (
                    <Text className='text-slate-900 dark:text-slate-100'>
                      {TEXT.unlimited}
                    </Text>
                  )}
                </div>
              </div>

              {plan?.upgrade_group ? (
                <div className='flex justify-between items-center'>
                  <Text strong className='text-slate-700 dark:text-slate-200'>
                    {TEXT.upgradeGroup}:
                  </Text>
                  <Text className='text-slate-900 dark:text-slate-100'>
                    {plan.upgrade_group}
                  </Text>
                </div>
              ) : null}

              <div className='rounded-lg border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/40'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {TEXT.packageDetail}
                </Text>
                <div className='mt-1'>
                  <Text className='text-xs leading-5 text-slate-500 dark:text-slate-300'>
                    {detailText}
                  </Text>
                </div>
              </div>

              <Divider margin={8} />

              <div className='flex justify-between items-center'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  {TEXT.amountDue}:
                </Text>
                <Text strong className='text-xl text-purple-600'>
                  {displayPrice}
                </Text>
              </div>
            </div>
          </Card>

          {purchaseLimitReached && (
            <Banner
              type='warning'
              description={`${TEXT.purchaseLimitReached} (${purchaseCount}/${purchaseLimit})`}
              className='!rounded-xl'
              closeIcon={null}
            />
          )}

          {hasAnyPayment ? (
            <div className='space-y-3'>
              <Text size='small' type='tertiary'>
                {TEXT.selectPaymentMethod}\uff1a
              </Text>

              {(hasStripe || hasCreem) && (
                <div className='flex gap-2'>
                  {hasStripe && (
                    <Button
                      theme='light'
                      className='flex-1'
                      icon={<SiStripe size={14} color='#635BFF' />}
                      onClick={onPayStripe}
                      loading={paying}
                      disabled={purchaseLimitReached}
                    >
                      Stripe
                    </Button>
                  )}
                  {hasCreem && (
                    <Button
                      theme='light'
                      className='flex-1'
                      icon={<IconCreditCard />}
                      onClick={onPayCreem}
                      loading={paying}
                      disabled={purchaseLimitReached}
                    >
                      Creem
                    </Button>
                  )}
                </div>
              )}

              {hasEpay && (
                <div className='flex gap-2'>
                  <Select
                    value={selectedEpayMethod}
                    onChange={setSelectedEpayMethod}
                    style={{ flex: 1 }}
                    size='default'
                    placeholder={TEXT.selectPaymentMethod}
                    optionList={epayMethods.map((method) => ({
                      value: method.type,
                      label: method.name || method.type,
                    }))}
                    disabled={purchaseLimitReached}
                  />
                  <Button
                    theme='solid'
                    type='primary'
                    onClick={onPayEpay}
                    loading={paying}
                    disabled={!selectedEpayMethod || purchaseLimitReached}
                  >
                    {TEXT.pay}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Banner
              type='info'
              description={TEXT.noPayment}
              className='!rounded-xl'
              closeIcon={null}
            />
          )}
        </div>
      ) : null}
    </Modal>
  );
};

export default SubscriptionPurchaseModal;
