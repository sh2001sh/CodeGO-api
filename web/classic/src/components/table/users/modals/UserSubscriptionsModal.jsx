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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Modal,
  Select,
  SideSheet,
  Space,
  Tag,
  Typography,
  Input,
  TextArea,
} from '@douyinfe/semi-ui';
import { IconPlusCircle } from '@douyinfe/semi-icons';
import {
  IllustrationNoResult,
  IllustrationNoResultDark,
} from '@douyinfe/semi-illustrations';
import { API, showError, showSuccess } from '../../../../helpers';
import { convertUSDToCurrency } from '../../../../helpers/render';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import CardTable from '../../../common/ui/CardTable';

const { Text } = Typography;

function formatTs(ts) {
  if (!ts) return '-';
  return new Date(ts * 1000).toLocaleString();
}

function toDateTimeLocal(unixSeconds) {
  if (!unixSeconds) return '';
  const date = new Date(unixSeconds * 1000);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  if (!value) return 0;
  return Math.floor(new Date(value).getTime() / 1000);
}

function renderStatusTag(sub, t) {
  const now = Date.now() / 1000;
  const end = sub?.end_time || 0;
  const status = sub?.status || '';

  const isExpiredByTime = end > 0 && end < now;
  const isActive = status === 'active' && !isExpiredByTime;
  if (isActive) {
    return (
      <Tag color='green' shape='circle' size='small'>
        {t('Active')}
      </Tag>
    );
  }
  if (status === 'cancelled') {
    return (
      <Tag color='grey' shape='circle' size='small'>
        {t('Invalidated')}
      </Tag>
    );
  }
  return (
    <Tag color='grey' shape='circle' size='small'>
      {t('Expired')}
    </Tag>
  );
}

const createEmptyEditValues = () => ({
  start_time: '',
  end_time: '',
  status: 'active',
  amount_total: '0',
  amount_used: '0',
  period_amount: '0',
  period_used: '0',
  model_limits: '',
});

const UserSubscriptionsModal = ({ visible, onCancel, user, t, onSuccess }) => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [subs, setSubs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSub, setEditingSub] = useState(null);
  const [editValues, setEditValues] = useState(createEmptyEditValues());

  const pageSize = 10;

  const planTitleMap = useMemo(() => {
    const map = new Map();
    (plans || []).forEach((p) => {
      const id = p?.plan?.id;
      const title = p?.plan?.title;
      if (id) map.set(id, title || `#${id}`);
    });
    return map;
  }, [plans]);

  const pagedSubs = useMemo(() => {
    const start = Math.max(0, (Number(currentPage || 1) - 1) * pageSize);
    const end = start + pageSize;
    return (subs || []).slice(start, end);
  }, [subs, currentPage]);

  const planOptions = useMemo(() => {
    return (plans || []).map((p) => ({
      label: `${p?.plan?.title || ''} (${convertUSDToCurrency(
        Number(p?.plan?.price_amount || 0),
        2,
      )})`,
      value: p?.plan?.id,
    }));
  }, [plans]);

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await API.get('/api/subscription/admin/plans');
      if (res.data?.success) {
        setPlans(res.data.data || []);
      } else {
        showError(res.data?.message || t('Loading failed'));
      }
    } catch (_error) {
      showError(t('Request failed'));
    } finally {
      setPlansLoading(false);
    }
  };

  const loadUserSubscriptions = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await API.get(
        `/api/subscription/admin/users/${user.id}/subscriptions`,
      );
      if (res.data?.success) {
        setSubs(res.data.data || []);
        setCurrentPage(1);
      } else {
        showError(res.data?.message || t('Loading failed'));
      }
    } catch (_error) {
      showError(t('Request failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setSelectedPlanId(null);
    setCurrentPage(1);
    setEditingSub(null);
    setEditValues(createEmptyEditValues());
    loadPlans();
    loadUserSubscriptions();
  }, [visible]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const createSubscription = async () => {
    if (!user?.id) {
      showError(t('User information is missing'));
      return;
    }
    if (!selectedPlanId) {
      showError(t('Please select a subscription plan'));
      return;
    }
    setCreating(true);
    try {
      const res = await API.post(
        `/api/subscription/admin/users/${user.id}/subscriptions`,
        {
          plan_id: selectedPlanId,
        },
      );
      if (res.data?.success) {
        const msg = res.data?.data?.message;
        showSuccess(msg ? msg : t('Added successfully'));
        setSelectedPlanId(null);
        await loadUserSubscriptions();
        onSuccess?.();
      } else {
        showError(res.data?.message || t('Create failed'));
      }
    } catch (_error) {
      showError(t('Request failed'));
    } finally {
      setCreating(false);
    }
  };

  const invalidateSubscription = (subId) => {
    Modal.confirm({
      title: t('Confirm invalidate'),
      content: t(
        'After invalidating, this subscription will be immediately deactivated. Historical records are not affected. Continue?'
      ),
      centered: true,
      onOk: async () => {
        try {
          const res = await API.post(
            `/api/subscription/admin/user_subscriptions/${subId}/invalidate`,
          );
          if (res.data?.success) {
            const msg = res.data?.data?.message;
            showSuccess(msg ? msg : t('Invalidated'));
            await loadUserSubscriptions();
            onSuccess?.();
          } else {
            showError(res.data?.message || t('Operation failed'));
          }
        } catch (_error) {
          showError(t('Request failed'));
        }
      },
    });
  };

  const deleteSubscription = (subId) => {
    Modal.confirm({
      title: t('Confirm delete'),
      content: t(
        'Deleting will permanently remove this subscription record and its benefit details. Continue?'
      ),
      centered: true,
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await API.delete(
            `/api/subscription/admin/user_subscriptions/${subId}`,
          );
          if (res.data?.success) {
            const msg = res.data?.data?.message;
            showSuccess(msg ? msg : t('Deleted'));
            await loadUserSubscriptions();
            onSuccess?.();
          } else {
            showError(res.data?.message || t('Delete failed'));
          }
        } catch (_error) {
          showError(t('Request failed'));
        }
      },
    });
  };

  const openEdit = (subscription) => {
    setEditingSub(subscription);
    setEditValues({
      start_time: toDateTimeLocal(subscription.start_time),
      end_time: toDateTimeLocal(subscription.end_time),
      status: subscription.status || 'active',
      amount_total: String(Number(subscription.amount_total || 0)),
      amount_used: String(Number(subscription.amount_used || 0)),
      period_amount: String(Number(subscription.period_amount || 0)),
      period_used: String(Number(subscription.period_used || 0)),
      model_limits: subscription.model_limits || '',
    });
  };

  const saveEdit = async () => {
    if (!editingSub) return;
    setSaving(true);
    try {
      const res = await API.put(
        `/api/subscription/admin/user_subscriptions/${editingSub.id}`,
        {
          start_time: fromDateTimeLocal(editValues.start_time),
          end_time: fromDateTimeLocal(editValues.end_time),
          status: editValues.status,
          amount_total: Number(editValues.amount_total || 0),
          amount_used: Number(editValues.amount_used || 0),
          period_amount: Number(editValues.period_amount || 0),
          period_used: Number(editValues.period_used || 0),
          model_limits: editValues.model_limits || '',
        },
      );
      if (res.data?.success) {
        const msg = res.data?.data?.message;
        showSuccess(msg ? msg : t('Updated successfully'));
        setEditingSub(null);
        await loadUserSubscriptions();
        onSuccess?.();
      } else {
        showError(res.data?.message || t('Update failed'));
      }
    } catch (_error) {
      showError(t('Request failed'));
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => {
    return [
      {
        title: 'ID',
        dataIndex: ['subscription', 'id'],
        key: 'id',
        width: 70,
      },
      {
        title: t('Plan'),
        key: 'plan',
        width: 180,
        render: (_, record) => {
          const sub = record?.subscription;
          const planId = sub?.plan_id;
          const title =
            planTitleMap.get(planId) || (planId ? `#${planId}` : '-');
          return (
            <div className='min-w-0'>
              <div className='font-medium truncate'>{title}</div>
              <div className='text-xs text-gray-500'>
                {t('Source')}: {sub?.source || '-'}
              </div>
            </div>
          );
        },
      },
      {
        title: t('Status'),
        key: 'status',
        width: 90,
        render: (_, record) => renderStatusTag(record?.subscription, t),
      },
      {
        title: t('Validity'),
        key: 'validity',
        width: 220,
        render: (_, record) => {
          const sub = record?.subscription;
          return (
            <div className='text-xs text-gray-600'>
              <div>
                {t('Start')}: {formatTs(sub?.start_time)}
              </div>
              <div>
                {t('End')}: {formatTs(sub?.end_time)}
              </div>
            </div>
          );
        },
      },
      {
        title: t('Quota'),
        key: 'total',
        width: 180,
        render: (_, record) => {
          const sub = record?.subscription;
          const total = Number(sub?.amount_total || 0);
          const used = Number(sub?.amount_used || 0);
          const periodAmount = Number(sub?.period_amount || 0);
          const periodUsed = Number(sub?.period_used || 0);
          return (
            <div className='text-xs text-gray-600'>
              <div>
                {t('Total')}: {total > 0 ? `${used}/${total}` : t('Unlimited')}
              </div>
              <div>
                {t('Period')}:{' '}
                {periodAmount > 0 ? `${periodUsed}/${periodAmount}` : t('Disabled')}
              </div>
            </div>
          );
        },
      },
      {
        title: '',
        key: 'operate',
        width: 200,
        fixed: 'right',
        render: (_, record) => {
          const sub = record?.subscription;
          const now = Date.now() / 1000;
          const isExpired =
            (sub?.end_time || 0) > 0 && (sub?.end_time || 0) < now;
          const isActive = sub?.status === 'active' && !isExpired;
          return (
            <Space>
              <Button
                size='small'
                theme='light'
                onClick={() => openEdit(sub)}
              >
                {t('Edit')}
              </Button>
              <Button
                size='small'
                type='warning'
                theme='light'
                disabled={!isActive}
                onClick={() => invalidateSubscription(sub?.id)}
              >
                {t('Invalidate')}
              </Button>
              <Button
                size='small'
                type='danger'
                theme='light'
                onClick={() => deleteSubscription(sub?.id)}
              >
                {t('Delete')}
              </Button>
            </Space>
          );
        },
      },
    ];
  }, [t, planTitleMap]);

  return (
    <>
      <SideSheet
        visible={visible}
        placement='right'
        width={isMobile ? '100%' : 980}
        bodyStyle={{ padding: 0 }}
        onCancel={onCancel}
        title={
          <Space>
            <Tag color='blue' shape='circle'>
              {t('Manage')}
            </Tag>
            <Typography.Title heading={4} className='m-0'>
              {t('User Subscription Management')}
            </Typography.Title>
            <Text type='tertiary' className='ml-2'>
              {user?.username || '-'} (ID: {user?.id || '-'})
            </Text>
          </Space>
        }
      >
        <div className='p-4'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4'>
            <div className='flex gap-2 flex-1'>
              <Select
                placeholder={t('Select subscription plan')}
                optionList={planOptions}
                value={selectedPlanId}
                onChange={setSelectedPlanId}
                loading={plansLoading}
                filter
                style={{ minWidth: isMobile ? undefined : 320, flex: 1 }}
              />
              <Button
                type='primary'
                theme='solid'
                icon={<IconPlusCircle />}
                loading={creating}
                onClick={createSubscription}
              >
                {t('Add subscription')}
              </Button>
            </div>
          </div>

          <CardTable
            columns={columns}
            dataSource={pagedSubs}
            rowKey={(row) => row?.subscription?.id}
            loading={loading}
            scroll={{ x: 'max-content' }}
            hidePagination={false}
            pagination={{
              currentPage,
              pageSize,
              total: subs.length,
              pageSizeOpts: [10, 20, 50],
              showSizeChanger: false,
              onPageChange: handlePageChange,
            }}
            empty={
              <Empty
                image={
                  <IllustrationNoResult style={{ width: 150, height: 150 }} />
                }
                darkModeImage={
                  <IllustrationNoResultDark style={{ width: 150, height: 150 }} />
                }
                title={t('No subscription records')}
                description={t('You can add a subscription plan for this user above.')}
              />
            }
          />
        </div>
      </SideSheet>

      <Modal
        title={t('Edit Subscription')}
        visible={!!editingSub}
        onCancel={() => setEditingSub(null)}
        onOk={saveEdit}
        confirmLoading={saving}
        width={isMobile ? '100%' : 760}
        okText={t('Save changes')}
      >
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <Text strong>{t('Start Time')}</Text>
            <Input
              type='datetime-local'
              value={editValues.start_time}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, start_time: value }))
              }
            />
          </div>
          <div>
            <Text strong>{t('End Time')}</Text>
            <Input
              type='datetime-local'
              value={editValues.end_time}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, end_time: value }))
              }
            />
          </div>
          <div>
            <Text strong>{t('Status')}</Text>
            <Select
              value={editValues.status}
              optionList={[
                { value: 'active', label: t('Active') },
                { value: 'expired', label: t('Expired') },
                { value: 'cancelled', label: t('Invalidated') },
              ]}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, status: value }))
              }
            />
          </div>
          <div>
            <Text strong>{t('Total Quota')}</Text>
            <Input
              type='number'
              value={editValues.amount_total}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, amount_total: value }))
              }
            />
          </div>
          <div>
            <Text strong>{t('Used Quota')}</Text>
            <Input
              type='number'
              value={editValues.amount_used}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, amount_used: value }))
              }
            />
          </div>
          <div>
            <Text strong>{t('Period Quota')}</Text>
            <Input
              type='number'
              value={editValues.period_amount}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, period_amount: value }))
              }
            />
          </div>
          <div>
            <Text strong>{t('Period Used')}</Text>
            <Input
              type='number'
              value={editValues.period_used}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, period_used: value }))
              }
            />
          </div>
          <div className='md:col-span-2'>
            <Text strong>{t('Model Limits JSON')}</Text>
            <Text type='tertiary' className='block mb-2'>
              {t(
                'Model limits reset with the subscription quota cycle. Use a daily-reset subscription when you need a per-user daily cap for specific models.'
              )}
            </Text>
            <TextArea
              rows={6}
              value={editValues.model_limits}
              onChange={(value) =>
                setEditValues((prev) => ({ ...prev, model_limits: value }))
              }
              placeholder='{"gpt-5.4":300,"gpt-5.4-mini":500,"gpt-5.3-codex":200}'
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default UserSubscriptionsModal;
