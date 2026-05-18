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

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Empty,
  Progress,
  Skeleton,
  Space,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import { RefreshCw } from 'lucide-react';
import { API, renderQuotaAsUSD, showError } from '../../helpers';

const { Text } = Typography;

const TEXT = {
  title: '\u5957\u9910\u4f7f\u7528\u60c5\u51b5',
  empty: '\u5f53\u524d\u6ca1\u6709\u751f\u6548\u4e2d\u7684\u5957\u9910\u8ba2\u9605',
  refresh: '\u5237\u65b0',
  subscription: '\u8ba2\u9605',
  active: '\u751f\u6548\u4e2d',
  unlimited: '\u4e0d\u9650',
  totalQuota: '\u603b\u989d\u5ea6',
  periodQuota: '\u5468\u671f\u989d\u5ea6',
  used: '\u5df2\u7528',
  remaining: '\u5269\u4f59',
  nextReset: '\u4e0b\u6b21\u91cd\u7f6e',
  until: '\u5230\u671f\u65f6\u95f4',
  day: '\u5929',
  loadFailed: '\u52a0\u8f7d\u8ba2\u9605\u4fe1\u606f\u5931\u8d25',
};

const clampPercent = (used, total) => {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return '--';
  return new Date(timestamp * 1000).toLocaleString();
};

const getRemainingDays = (endTime) => {
  if (!endTime) return 0;
  const now = Date.now() / 1000;
  return Math.max(0, Math.ceil((endTime - now) / 86400));
};

const SubscriptionUsagePanel = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [planTitleMap, setPlanTitleMap] = useState(new Map());

  const loadData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const [plansRes, selfRes] = await Promise.all([
        API.get('/api/subscription/plans'),
        API.get('/api/subscription/self'),
      ]);

      if (plansRes.data?.success) {
        const nextPlanMap = new Map();
        (plansRes.data.data || []).forEach((item) => {
          const plan = item?.plan;
          if (plan?.id) {
            nextPlanMap.set(plan.id, plan.title || '');
          }
        });
        setPlanTitleMap(nextPlanMap);
      }

      if (selfRes.data?.success) {
        setSubscriptions(selfRes.data.data?.subscriptions || []);
      } else if (selfRes.data?.message) {
        showError(selfRes.data.message);
      }
    } catch (error) {
      showError(error?.message || TEXT.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleSubscriptionChanged = () => {
      loadData(true);
    };

    window.addEventListener('subscription:changed', handleSubscriptionChanged);
    return () => {
      window.removeEventListener(
        'subscription:changed',
        handleSubscriptionChanged,
      );
    };
  }, [loadData]);

  if (loading) {
    return (
      <Card className='!rounded-2xl shadow-sm border-0' bodyStyle={{ padding: 16 }}>
        <Skeleton.Title active style={{ width: 160, height: 22 }} />
        <Skeleton.Paragraph active rows={3} style={{ marginTop: 16 }} />
      </Card>
    );
  }

  return (
    <Card className='!rounded-2xl shadow-sm border-0' bodyStyle={{ padding: 16 }}>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <Text strong>{TEXT.title}</Text>
        <Button
          theme='light'
          type='tertiary'
          size='small'
          icon={<RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />}
          onClick={() => {
            setRefreshing(true);
            loadData(true);
          }}
        >
          {TEXT.refresh}
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <Empty description={TEXT.empty} image={null} />
      ) : (
        <Space vertical spacing={12} style={{ width: '100%' }}>
          {subscriptions.map((record) => {
            const subscription = record?.subscription || {};
            const totalAmount = Number(subscription.amount_total || 0);
            const usedAmount = Number(subscription.amount_used || 0);
            const periodAmount = Number(subscription.period_amount || 0);
            const periodUsed = Number(subscription.period_used || 0);
            const totalRemain =
              totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0;
            const periodRemain =
              periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0;
            const totalPercent = clampPercent(usedAmount, totalAmount);
            const periodPercent = clampPercent(periodUsed, periodAmount);
            const remainDays = getRemainingDays(subscription.end_time);
            const planTitle =
              planTitleMap.get(subscription.plan_id) ||
              `${TEXT.subscription} #${subscription.id}`;

            return (
              <div
                key={subscription.id}
                className='rounded-xl border border-gray-200 bg-white p-4'
              >
                <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex items-center gap-2'>
                    <Text strong>{planTitle}</Text>
                    <Tag color='green' shape='circle' size='small'>
                      {TEXT.active}
                    </Tag>
                  </div>
                  <Text type='tertiary' size='small'>
                    {TEXT.remaining} {remainDays} {TEXT.day}
                  </Text>
                </div>

                {periodAmount > 0 && (
                  <div className='mb-3'>
                    <div className='mb-1 flex items-center justify-between text-xs text-gray-500'>
                      <span>{TEXT.periodQuota}</span>
                      <span>
                        {renderQuotaAsUSD(periodUsed)}/{renderQuotaAsUSD(periodAmount)} | {TEXT.used}{' '}
                        {periodPercent}% | {TEXT.remaining} {renderQuotaAsUSD(periodRemain)}
                      </span>
                    </div>
                    <Progress
                      percent={periodPercent}
                      showInfo={false}
                      stroke='#16a34a'
                      aria-label={TEXT.periodQuota}
                    />
                  </div>
                )}

                <div className='mb-3'>
                  <div className='mb-1 flex items-center justify-between text-xs text-gray-500'>
                    <span>{TEXT.totalQuota}</span>
                    <span>
                      {totalAmount > 0
                        ? `${renderQuotaAsUSD(usedAmount)}/${renderQuotaAsUSD(totalAmount)} | ${TEXT.used} ${totalPercent}% | ${TEXT.remaining} ${renderQuotaAsUSD(totalRemain)}`
                        : TEXT.unlimited}
                    </span>
                  </div>
                  {totalAmount > 0 ? (
                    <Progress
                      percent={totalPercent}
                      showInfo={false}
                      stroke='#2563eb'
                      aria-label={TEXT.totalQuota}
                    />
                  ) : (
                    <div className='h-2 rounded-full bg-gray-100' />
                  )}
                </div>

                <div className='grid grid-cols-1 gap-2 text-xs text-gray-500 md:grid-cols-2'>
                  <div>
                    <span className='font-medium text-gray-700'>{TEXT.nextReset}:</span>{' '}
                    {subscription.next_reset_time > 0
                      ? formatDateTime(subscription.next_reset_time)
                      : '--'}
                  </div>
                  <div>
                    <span className='font-medium text-gray-700'>{TEXT.until}:</span>{' '}
                    {formatDateTime(subscription.end_time)}
                  </div>
                </div>
              </div>
            );
          })}
        </Space>
      )}
    </Card>
  );
};

export default SubscriptionUsagePanel;
