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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Divider,
  Select,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import { RefreshCw, Sparkles } from 'lucide-react';
import { API, renderQuota, showError, showSuccess } from '../../helpers';
import {
  formatSubscriptionDuration,
  formatSubscriptionResetPeriod,
} from '../../helpers/subscriptionFormat';
import SubscriptionPurchaseModal from './modals/SubscriptionPurchaseModal';

const { Text } = Typography;

const TEXT = {
  mySubscriptions: '\u6211\u7684\u8ba2\u9605',
  activeCountSuffix: '\u4e2a\u751f\u6548\u4e2d',
  noActive: '\u65e0\u751f\u6548',
  expiredCountSuffix: '\u4e2a\u5df2\u8fc7\u671f',
  subscriptionFirst: '\u4f18\u5148\u8ba2\u9605',
  walletFirst: '\u4f18\u5148\u94b1\u5305',
  subscriptionOnly: '\u4ec5\u7528\u8ba2\u9605',
  walletOnly: '\u4ec5\u7528\u94b1\u5305',
  preferenceSaved: '\u5df2\u4fdd\u5b58\u504f\u597d\u4e3a',
  preferenceFallback:
    '\uff0c\u5f53\u524d\u65e0\u751f\u6548\u8ba2\u9605\uff0c\u5c06\u81ea\u52a8\u4f7f\u7528\u94b1\u5305',
  subscriptionLabel: '\u8ba2\u9605',
  active: '\u751f\u6548',
  cancelled: '\u5df2\u4f5c\u5e9f',
  expired: '\u5df2\u8fc7\u671f',
  remaining: '\u5269\u4f59',
  day: '\u5929',
  until: '\u81f3',
  cancelledAt: '\u4f5c\u5e9f\u4e8e',
  expiredAt: '\u8fc7\u671f\u4e8e',
  periodQuota: '\u5468\u671f\u989d\u5ea6',
  nextReset: '\u4e0b\u4e00\u6b21\u91cd\u7f6e',
  totalQuota: '\u603b\u989d\u5ea6',
  originalQuota: '\u539f\u59cb\u989d\u5ea6',
  unlimited: '\u4e0d\u9650',
  used: '\u5df2\u7528',
  noSubscriptionHint:
    '\u8d2d\u4e70\u5957\u9910\u540e\u5373\u53ef\u4eab\u53d7\u6a21\u578b\u6743\u76ca',
  recommended: '\u63a8\u8350',
  packageDetail: '\u5957\u9910\u8be6\u60c5',
  purchaseLimitReached: '\u5df2\u8fbe\u5230\u8d2d\u4e70\u4e0a\u9650',
  limitReached: '\u5df2\u8fbe\u4e0a\u9650',
  subscribeNow: '\u7acb\u5373\u8ba2\u9605',
  noPlans: '\u6682\u65e0\u53ef\u8d2d\u4e70\u5957\u9910',
  dayPass: '\u65e5\u5361',
  monthPass: '\u6708\u5361',
  weeklyQuota: '\u6bcf\u5468\u989d\u5ea6',
  cycleQuota: '\u5468\u671f\u989d\u5ea6',
  validFor: '\u6709\u6548\u671f',
  payPageOpened: '\u5df2\u6253\u5f00\u652f\u4ed8\u9875\u9762',
  payStarted: '\u5df2\u53d1\u8d77\u652f\u4ed8',
  payFailed: '\u652f\u4ed8\u5931\u8d25',
  payRequestFailed: '\u652f\u4ed8\u8bf7\u6c42\u5931\u8d25',
  selectPaymentMethod: '\u8bf7\u9009\u62e9\u652f\u4ed8\u65b9\u5f0f',
  stripeNotReady: '\u8be5\u5957\u9910\u672a\u914d\u7f6e Stripe',
  creemNotReady: '\u8be5\u5957\u9910\u672a\u914d\u7f6e Creem',
  waitingPayment: '\u7b49\u5f85\u652f\u4ed8\u7ed3\u679c',
  paySuccess: '\u652f\u4ed8\u6210\u529f',
  waitCancelled: '\u5df2\u53d6\u6d88\u7b49\u5f85',
  openPayPage: '\u6253\u5f00\u652f\u4ed8\u9875',
  cancelPayWait: '\u53d6\u6d88\u652f\u4ed8',
  wechatPay: '\u5fae\u4fe1\u652f\u4ed8',
};

const EMPTY_PAYMENT_TRACKER = {
  stage: 'idle',
  orderId: '',
  externalUrl: '',
  qrCodeUrl: '',
  amountDue: 0,
  methodLabel: '',
  actionLabel: '',
  message: '',
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

function getPlanIntroText(plan, totalAmount, periodAmount) {
  const parts = [getPlanSubtitle(plan)];
  if (periodAmount > 0) {
    parts.push(`${TEXT.weeklyQuota} ${renderQuota(periodAmount)}`);
  }
  parts.push(
    totalAmount > 0
      ? `${TEXT.totalQuota} ${renderQuota(totalAmount)}`
      : `${TEXT.totalQuota} ${TEXT.unlimited}`,
  );
  return parts.join(' | ');
}

function getPlanActionLabel(action) {
  switch (action) {
    case 'renew':
      return '\u7eed\u8d39';
    case 'upgrade':
      return '\u5347\u7ea7';
    case 'disabled':
      return '\u4e0d\u53ef\u8ba2\u9605';
    default:
      return TEXT.subscribeNow;
  }
}

function getEpayMethods(payMethods = []) {
  return (payMethods || []).filter(
    (method) => method?.type && method.type !== 'stripe' && method.type !== 'creem',
  );
}

function normalizePaymentMethod(method) {
  if (!method?.type) return method;
  if (method.type === 'xunhu' || method.type === 'wxpay') {
    return {
      ...method,
      name: TEXT.wechatPay,
    };
  }
  return method;
}

function submitEpayForm({ url, params }) {
  const form = document.createElement('form');
  form.action = url;
  form.method = 'POST';
  const isSafari =
    navigator.userAgent.indexOf('Safari') > -1 &&
    navigator.userAgent.indexOf('Chrome') < 1;
  if (!isSafari) form.target = '_blank';

  Object.keys(params || {}).forEach((key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = params[key];
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

const SubscriptionPlansCard = ({
  t,
  loading = false,
  plans = [],
  payMethods = [],
  enableOnlineTopUp = false,
  enableStripeTopUp = false,
  enableCreemTopUp = false,
  billingPreference,
  onChangeBillingPreference,
  activeSubscriptions = [],
  allSubscriptions = [],
  reloadSubscriptionSelf,
  withCard = true,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paying, setPaying] = useState(false);
  const [selectedEpayMethod, setSelectedEpayMethod] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [paymentTracker, setPaymentTracker] = useState(EMPTY_PAYMENT_TRACKER);
  const successTriggeredRef = useRef(false);

  const epayMethods = useMemo(
    () => getEpayMethods(payMethods).map(normalizePaymentMethod),
    [payMethods],
  );

  const hasActiveSubscription = activeSubscriptions.length > 0;
  const hasAnySubscription = allSubscriptions.length > 0;
  const disableSubscriptionPreference = !hasActiveSubscription;
  const isSubscriptionPreference =
    billingPreference === 'subscription_first' ||
    billingPreference === 'subscription_only';
  const displayBillingPreference =
    disableSubscriptionPreference && isSubscriptionPreference
      ? 'wallet_first'
      : billingPreference;
  const subscriptionPreferenceLabel =
    billingPreference === 'subscription_only'
      ? TEXT.subscriptionOnly
      : TEXT.subscriptionFirst;

  const planPurchaseCountMap = useMemo(() => {
    const map = new Map();
    (allSubscriptions || []).forEach((sub) => {
      const planId = sub?.subscription?.plan_id;
      if (!planId) return;
      map.set(planId, (map.get(planId) || 0) + 1);
    });
    return map;
  }, [allSubscriptions]);

  const planTitleMap = useMemo(() => {
    const map = new Map();
    (plans || []).forEach((item) => {
      const plan = item?.plan;
      if (!plan?.id) return;
      map.set(plan.id, plan.title || '');
    });
    return map;
  }, [plans]);

  const getPlanPurchaseCount = (planId) => planPurchaseCountMap.get(planId) || 0;

  const openBuy = (planRecord) => {
    setSelectedPlan(planRecord);
    setSelectedEpayMethod(epayMethods?.[0]?.type || '');
    setPaymentTracker(EMPTY_PAYMENT_TRACKER);
    successTriggeredRef.current = false;
    setOpen(true);
  };

  const closeBuy = () => {
    setOpen(false);
    setSelectedPlan(null);
    setPaying(false);
    setSelectedEpayMethod('');
    setPaymentTracker(EMPTY_PAYMENT_TRACKER);
    successTriggeredRef.current = false;
  };

  useEffect(() => {
    if (!open) return;
    if (!selectedEpayMethod && epayMethods.length > 0) {
      setSelectedEpayMethod(epayMethods[0].type || '');
    }
  }, [epayMethods, open, selectedEpayMethod]);

  useEffect(() => {
    if (!open || paymentTracker.stage !== 'pending' || !paymentTracker.orderId) {
      return undefined;
    }

    let active = true;
    const poll = async () => {
      try {
        const res = await API.get(`/api/subscription/orders/${paymentTracker.orderId}`);
        const order = res.data?.data;
        if (!active || res.data?.success !== true || !order) return;
        if (order.status === 'success') {
          setPaymentTracker((prev) => ({
            ...prev,
            stage: 'success',
            message: '\u652f\u4ed8\u6210\u529f\uff0c\u5957\u9910\u5df2\u751f\u6548\u3002',
          }));
          if (!successTriggeredRef.current) {
            successTriggeredRef.current = true;
            window.dispatchEvent(new Event('subscription:changed'));
            reloadSubscriptionSelf?.();
          }
          return;
        }
        if (order.status === 'expired') {
          setPaymentTracker((prev) => ({
            ...prev,
            stage: 'failed',
            message:
              '\u652f\u4ed8\u672a\u5b8c\u6210\u6216\u5df2\u5173\u95ed\uff0c\u8ba2\u5355\u5df2\u5931\u6548\u3002',
          }));
        }
      } catch {
        // Ignore transient polling errors.
      }
    };

    poll();
    const timer = window.setInterval(poll, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open, paymentTracker.orderId, paymentTracker.stage, reloadSubscriptionSelf]);

  const getSelectedEpayMethodLabel = () =>
    epayMethods.find((method) => method.type === selectedEpayMethod)?.name ||
    selectedEpayMethod ||
    TEXT.selectPaymentMethod;

  const startPendingPayment = (resData, methodLabel, externalUrl = '', qrCodeUrl = '') => {
    setPaymentTracker({
      stage: 'pending',
      orderId: String(resData?.order_id || ''),
      externalUrl,
      qrCodeUrl,
      amountDue: Number(
        resData?.amount_due ??
          selectedPlan?.amount_due ??
          selectedPlan?.plan?.price_amount ??
          0,
      ),
      methodLabel,
      actionLabel: getPlanActionLabel(selectedPlan?.action),
      message:
        qrCodeUrl
          ? '\u8bf7\u4f7f\u7528\u5fae\u4fe1\u626b\u7801\u5b8c\u6210\u652f\u4ed8\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u7b49\u5f85\u56de\u4f20\u3002'
          : '\u6b63\u5728\u7b49\u5f85\u652f\u4ed8\u56de\u4f20\uff0c\u8bf7\u5728\u65b0\u7a97\u53e3\u5b8c\u6210\u652f\u4ed8\u3002',
    });
    showSuccess(TEXT.payStarted);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reloadSubscriptionSelf?.();
    } finally {
      setRefreshing(false);
    }
  };

  const payStripe = async () => {
    if (!selectedPlan?.plan?.stripe_price_id) {
      showError(TEXT.stripeNotReady);
      return;
    }
    setPaying(true);
    try {
      const res = await API.post('/api/subscription/stripe/pay', {
        plan_id: selectedPlan.plan.id,
      });
      if (res.data?.message === 'success') {
        const payLink = res.data?.data?.pay_link || '';
        if (payLink) {
          window.open(payLink, '_blank');
        }
        showSuccess(TEXT.payPageOpened);
        startPendingPayment(res.data?.data, 'Stripe', payLink);
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || TEXT.payFailed;
        showError(errorMsg);
      }
    } catch {
      showError(TEXT.payRequestFailed);
    } finally {
      setPaying(false);
    }
  };

  const payCreem = async () => {
    if (!selectedPlan?.plan?.creem_product_id) {
      showError(TEXT.creemNotReady);
      return;
    }
    setPaying(true);
    try {
      const res = await API.post('/api/subscription/creem/pay', {
        plan_id: selectedPlan.plan.id,
      });
      if (res.data?.message === 'success') {
        const checkoutUrl = res.data?.data?.checkout_url || '';
        if (checkoutUrl) {
          window.open(checkoutUrl, '_blank');
        }
        showSuccess(TEXT.payPageOpened);
        startPendingPayment(res.data?.data, 'Creem', checkoutUrl);
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || TEXT.payFailed;
        showError(errorMsg);
      }
    } catch {
      showError(TEXT.payRequestFailed);
    } finally {
      setPaying(false);
    }
  };

  const payEpay = async () => {
    if (!selectedEpayMethod) {
      showError(TEXT.selectPaymentMethod);
      return;
    }
    setPaying(true);
    try {
      const isXunhu = selectedEpayMethod === 'xunhu';
      const res = isXunhu
        ? await API.post('/api/subscription/xunhu/pay', {
            plan_id: selectedPlan.plan.id,
          })
        : await API.post('/api/subscription/epay/pay', {
            plan_id: selectedPlan.plan.id,
            payment_method: selectedEpayMethod,
          });
      if (res.data?.message === 'success') {
        if (isXunhu) {
          const payUrl = res.data?.data?.pay_url || '';
          const qrCodeUrl = res.data?.data?.qrcode_url || '';
          if (!payUrl && !qrCodeUrl) {
            showError(TEXT.payFailed);
            return;
          }
          startPendingPayment(
            res.data?.data,
            TEXT.wechatPay,
            payUrl,
            qrCodeUrl,
          );
        } else {
          if (!res.data.url) {
            showError(TEXT.payFailed);
            return;
          }
          submitEpayForm({
            url: res.data.url,
            params: res.data?.data?.form || res.data.data,
          });
          startPendingPayment(
            res.data?.data,
            getSelectedEpayMethodLabel(),
            res.data.url,
          );
        }
      } else {
        const errorMsg =
          typeof res.data?.data === 'string'
            ? res.data.data
            : res.data?.message || TEXT.payFailed;
        showError(errorMsg);
      }
    } catch {
      showError(TEXT.payRequestFailed);
    } finally {
      setPaying(false);
    }
  };

  const getRemainingDays = (sub) => {
    if (!sub?.subscription?.end_time) return 0;
    const now = Date.now() / 1000;
    const remaining = sub.subscription.end_time - now;
    return Math.max(0, Math.ceil(remaining / 86400));
  };

  const getUsagePercent = (sub) => {
    const total = Number(sub?.subscription?.amount_total || 0);
    const used = Number(sub?.subscription?.amount_used || 0);
    if (total <= 0) return 0;
    return Math.round((used / total) * 100);
  };

  const cardContent = loading ? (
    <div className='space-y-4'>
      <Card className='!rounded-xl w-full' bodyStyle={{ padding: '12px' }}>
        <div className='flex items-center justify-between mb-3'>
          <Skeleton.Title active style={{ width: 100, height: 20 }} />
          <Skeleton.Button active style={{ width: 24, height: 24 }} />
        </div>
        <Skeleton.Paragraph active rows={2} />
      </Card>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 w-full px-1'>
        {[1, 2, 3].map((item) => (
          <Card
            key={item}
            className='!rounded-xl w-full h-full'
            bodyStyle={{ padding: 16 }}
          >
            <Skeleton.Title
              active
              style={{ width: '60%', height: 24, marginBottom: 8 }}
            />
            <Skeleton.Paragraph active rows={1} style={{ marginBottom: 12 }} />
            <div className='text-center py-4'>
              <Skeleton.Title
                active
                style={{ width: '40%', height: 32, margin: '0 auto' }}
              />
            </div>
            <Skeleton.Paragraph active rows={3} style={{ marginTop: 12 }} />
            <Skeleton.Button active block style={{ marginTop: 16, height: 32 }} />
          </Card>
        ))}
      </div>
    </div>
  ) : (
    <Space vertical style={{ width: '100%' }} spacing={8}>
      <Card className='!rounded-xl w-full' bodyStyle={{ padding: '12px' }}>
        <div className='flex items-center justify-between mb-2 gap-3'>
          <div className='flex items-center gap-2 flex-1 min-w-0'>
            <Text strong>{TEXT.mySubscriptions}</Text>
            {hasActiveSubscription ? (
              <Tag
                color='white'
                size='small'
                shape='circle'
                prefixIcon={<Badge dot type='success' />}
              >
                {activeSubscriptions.length} {TEXT.activeCountSuffix}
              </Tag>
            ) : (
              <Tag color='white' size='small' shape='circle'>
                {TEXT.noActive}
              </Tag>
            )}
            {allSubscriptions.length > activeSubscriptions.length && (
              <Tag color='white' size='small' shape='circle'>
                {allSubscriptions.length - activeSubscriptions.length}{' '}
                {TEXT.expiredCountSuffix}
              </Tag>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Select
              value={displayBillingPreference}
              onChange={onChangeBillingPreference}
              size='small'
              optionList={[
                {
                  value: 'subscription_first',
                  label: disableSubscriptionPreference
                    ? `${TEXT.subscriptionFirst} (${TEXT.noActive})`
                    : TEXT.subscriptionFirst,
                  disabled: disableSubscriptionPreference,
                },
                { value: 'wallet_first', label: TEXT.walletFirst },
                {
                  value: 'subscription_only',
                  label: disableSubscriptionPreference
                    ? `${TEXT.subscriptionOnly} (${TEXT.noActive})`
                    : TEXT.subscriptionOnly,
                  disabled: disableSubscriptionPreference,
                },
                { value: 'wallet_only', label: TEXT.walletOnly },
              ]}
            />
            <Button
              size='small'
              theme='light'
              type='tertiary'
              icon={
                <RefreshCw
                  size={12}
                  className={refreshing ? 'animate-spin' : ''}
                />
              }
              onClick={handleRefresh}
              loading={refreshing}
            />
          </div>
        </div>

        {disableSubscriptionPreference && isSubscriptionPreference && (
          <Text type='tertiary' size='small'>
            {TEXT.preferenceSaved}
            {subscriptionPreferenceLabel}
            {TEXT.preferenceFallback}
          </Text>
        )}

        {hasAnySubscription ? (
          <>
            <Divider margin={8} />
            <div className='max-h-64 overflow-y-auto pr-1 semi-table-body'>
              {allSubscriptions.map((sub, subIndex) => {
                const isLast = subIndex === allSubscriptions.length - 1;
                const subscription = sub.subscription;
                const totalAmount = Number(subscription?.amount_total || 0);
                const usedAmount = Number(subscription?.amount_used || 0);
                const periodAmount = Number(subscription?.period_amount || 0);
                const periodUsed = Number(subscription?.period_used || 0);
                const remainAmount =
                  totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0;
                const remainPeriodAmount =
                  periodAmount > 0 ? Math.max(0, periodAmount - periodUsed) : 0;
                const planTitle = planTitleMap.get(subscription?.plan_id) || '';
                const remainDays = getRemainingDays(sub);
                const usagePercent = getUsagePercent(sub);
                const now = Date.now() / 1000;
                const isExpired = (subscription?.end_time || 0) < now;
                const isCancelled = subscription?.status === 'cancelled';
                const isActive = subscription?.status === 'active' && !isExpired;

                return (
                  <div key={subscription?.id || subIndex}>
                    <div className='flex items-center justify-between text-xs mb-2'>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>
                          {planTitle
                            ? `${planTitle} | ${TEXT.subscriptionLabel} #${subscription?.id}`
                            : `${TEXT.subscriptionLabel} #${subscription?.id}`}
                        </span>
                        {isActive ? (
                          <Tag
                            color='white'
                            size='small'
                            shape='circle'
                            prefixIcon={<Badge dot type='success' />}
                          >
                            {TEXT.active}
                          </Tag>
                        ) : isCancelled ? (
                          <Tag color='white' size='small' shape='circle'>
                            {TEXT.cancelled}
                          </Tag>
                        ) : (
                          <Tag color='white' size='small' shape='circle'>
                            {TEXT.expired}
                          </Tag>
                        )}
                      </div>
                      {isActive && (
                        <span className='text-gray-500'>
                          {TEXT.remaining} {remainDays} {TEXT.day}
                        </span>
                      )}
                    </div>

                    <div className='text-xs text-gray-500 mb-2'>
                      {isActive
                        ? TEXT.until
                        : isCancelled
                          ? TEXT.cancelledAt
                          : TEXT.expiredAt}{' '}
                      {new Date((subscription?.end_time || 0) * 1000).toLocaleString()}
                    </div>

                    {periodAmount > 0 && (
                      <div className='text-xs text-gray-500 mb-2'>
                        {TEXT.periodQuota}:{' '}
                        <Tooltip
                          content={`${TEXT.originalQuota}: ${periodUsed}/${periodAmount} | ${TEXT.remaining} ${remainPeriodAmount}`}
                        >
                          <span>
                            {renderQuota(periodUsed)}/{renderQuota(periodAmount)} |{' '}
                            {TEXT.remaining} {renderQuota(remainPeriodAmount)}
                          </span>
                        </Tooltip>
                      </div>
                    )}

                    {isActive && subscription?.next_reset_time > 0 && (
                      <div className='text-xs text-gray-500 mb-2'>
                        {TEXT.nextReset}:{' '}
                        {new Date(subscription.next_reset_time * 1000).toLocaleString()}
                      </div>
                    )}

                    <div className='text-xs text-gray-500 mb-2'>
                      {TEXT.totalQuota}:{' '}
                      {totalAmount > 0 ? (
                        <Tooltip
                          content={`${TEXT.originalQuota}: ${usedAmount}/${totalAmount} | ${TEXT.remaining} ${remainAmount}`}
                        >
                          <span>
                            {renderQuota(usedAmount)}/{renderQuota(totalAmount)} |{' '}
                            {TEXT.remaining} {renderQuota(remainAmount)}
                          </span>
                        </Tooltip>
                      ) : (
                        TEXT.unlimited
                      )}
                      {totalAmount > 0 && (
                        <span className='ml-2'>
                          {TEXT.used} {usagePercent}%
                        </span>
                      )}
                    </div>

                    {!isLast && <Divider margin={12} />}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className='text-xs text-gray-500'>{TEXT.noSubscriptionHint}</div>
        )}
      </Card>

      {plans.length > 0 ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 w-full px-1'>
          {plans.map((planRecord, index) => {
            const plan = planRecord?.plan;
            const totalAmount = Number(plan?.total_amount || 0);
            const periodAmount = Number(plan?.period_amount || 0);
            const priceAmount = Number(plan?.price_amount || 0);
            const effectiveAmount = Number(planRecord?.amount_due ?? priceAmount ?? 0);
            const displayPrice = formatPlanPrice(
              effectiveAmount,
              plan?.currency,
            );
            const isPopular = index === 0 && plans.length > 1;
            const limit = Number(plan?.max_purchase_per_user || 0);
            const count = getPlanPurchaseCount(plan?.id);
            const reached = limit > 0 && count >= limit;
            const blockedByRule = planRecord?.action === 'disabled';
            const actionLabel = getPlanActionLabel(planRecord?.action);
            const detailText = getPlanDetailsText(plan, totalAmount, periodAmount, t);
            const introText = getPlanIntroText(plan, totalAmount, periodAmount);
            const resetText = formatSubscriptionResetPeriod(plan, t);
            const planBenefits = [
              `${TEXT.validFor}: ${formatSubscriptionDuration(plan, t)}`,
              resetText === '\u4e0d\u91cd\u7f6e'
                ? null
                : `\u989d\u5ea6\u91cd\u7f6e: ${resetText}`,
              totalAmount > 0
                ? `${TEXT.totalQuota}: ${renderQuota(totalAmount)}`
                : `${TEXT.totalQuota}: ${TEXT.unlimited}`,
              limit > 0 ? `\u9650\u8d2d ${limit}` : null,
              plan?.upgrade_group
                ? `\u5347\u7ea7\u5206\u7ec4: ${plan.upgrade_group}`
                : null,
            ].filter(Boolean);

            return (
              <Card
                key={plan?.id}
                className={`!rounded-xl transition-all hover:shadow-lg w-full h-full ${
                  isPopular ? 'ring-2 ring-purple-500' : ''
                }`}
                bodyStyle={{ padding: 0 }}
              >
                <div className='p-4 h-full flex flex-col'>
                  {isPopular && (
                    <div className='mb-2'>
                      <Tag color='purple' shape='circle' size='small'>
                        <Sparkles size={10} className='mr-1' />
                        {TEXT.recommended}
                      </Tag>
                    </div>
                  )}

                  <div className='mb-3'>
                    <Typography.Title
                      heading={5}
                      ellipsis={{ rows: 1, showTooltip: true }}
                      style={{ margin: 0 }}
                    >
                      {plan?.title || '\u8ba2\u9605\u5957\u9910'}
                    </Typography.Title>
                    <Text
                      type='tertiary'
                      size='small'
                      ellipsis={{ rows: 1, showTooltip: true }}
                      style={{ display: 'block' }}
                    >
                      {getPlanSubtitle(plan)}
                    </Text>
                    {planRecord?.action && planRecord.action !== 'subscribe' && (
                      <Text
                        type='primary'
                        size='small'
                        style={{ display: 'block', marginTop: 4, fontWeight: 600 }}
                      >
                        {actionLabel}
                      </Text>
                    )}
                    <Text
                      type='secondary'
                      size='small'
                      ellipsis={{ rows: 2, showTooltip: true }}
                      style={{ display: 'block', marginTop: 4 }}
                    >
                      {introText}
                    </Text>
                  </div>

                  <div className='py-2'>
                    <div className='flex items-baseline justify-start'>
                      <span className='text-3xl font-bold text-purple-600'>
                        {displayPrice}
                      </span>
                    </div>
                    {effectiveAmount !== priceAmount && (
                      <Text type='tertiary' size='small'>
                        {`\u539f\u4ef7 ${formatPlanPrice(priceAmount, plan?.currency)}`}
                      </Text>
                    )}
                  </div>

                  <div className='flex flex-col items-start gap-1 pb-2'>
                    {planBenefits.map((label) => (
                      <div
                        key={label}
                        className='w-full flex items-center gap-2 text-xs text-gray-500'
                      >
                        <Badge dot type='tertiary' />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className='mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 p-3'>
                    <div className='text-xs font-semibold text-gray-800'>
                      {TEXT.packageDetail}
                    </div>
                    <div className='mt-1 text-xs leading-5 text-gray-500'>
                      {detailText}
                    </div>
                  </div>

                  <div className='mt-auto'>
                    <Divider margin={12} />
                    {reached || blockedByRule ? (
                      <Tooltip
                        content={
                          reached
                            ? `${TEXT.purchaseLimitReached} (${count}/${limit})`
                            : planRecord?.disabled_reason ||
                              '\u5f53\u524d\u5df2\u6709\u751f\u6548\u5957\u9910\uff0c\u4e0d\u652f\u6301\u964d\u7ea7\u8ba2\u8d2d\u3002'
                        }
                        position='top'
                      >
                        <Button theme='outline' type='primary' block disabled>
                          {reached ? TEXT.limitReached : actionLabel}
                        </Button>
                      </Tooltip>
                    ) : (
                      <Button
                        theme='outline'
                        type='primary'
                        block
                        onClick={() => openBuy(planRecord)}
                      >
                        {actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className='text-center text-gray-400 text-sm py-4'>{TEXT.noPlans}</div>
      )}
    </Space>
  );

  return (
    <>
      {withCard ? (
        <Card className='!rounded-2xl shadow-sm border-0'>{cardContent}</Card>
      ) : (
        <div className='space-y-3'>{cardContent}</div>
      )}

      <SubscriptionPurchaseModal
        t={t}
        visible={open}
        onCancel={closeBuy}
        selectedPlan={selectedPlan}
        paying={paying}
        selectedEpayMethod={selectedEpayMethod}
        setSelectedEpayMethod={setSelectedEpayMethod}
        epayMethods={epayMethods}
        paymentTracker={paymentTracker}
        setPaymentTracker={setPaymentTracker}
        enableOnlineTopUp={enableOnlineTopUp}
        enableStripeTopUp={enableStripeTopUp}
        enableCreemTopUp={enableCreemTopUp}
        purchaseLimitInfo={
          selectedPlan?.plan?.id
            ? {
                limit: Number(selectedPlan?.plan?.max_purchase_per_user || 0),
                count: getPlanPurchaseCount(selectedPlan?.plan?.id),
              }
            : null
        }
        onPayStripe={payStripe}
        onPayCreem={payCreem}
        onPayEpay={payEpay}
      />
    </>
  );
};

export default SubscriptionPlansCard;
