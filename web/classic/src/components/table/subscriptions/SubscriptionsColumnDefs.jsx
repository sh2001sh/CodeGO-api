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
  Badge,
  Button,
  Divider,
  Modal,
  Popover,
  Space,
  Tag,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import { renderQuotaAsUSD } from '../../../helpers';
import { convertUSDToCurrency } from '../../../helpers/render';
import {
  formatSubscriptionDuration,
  formatSubscriptionResetPeriod,
} from '../../../helpers/subscriptionFormat';

const { Text } = Typography;

const TEXT = {
  package: '\u5957\u9910',
  price: '\u4ef7\u683c',
  rawQuota: '\u539f\u751f\u989d\u5ea6',
  totalQuota: '\u603b\u989d\u5ea6',
  purchaseLimit: '\u8d2d\u4e70\u4e0a\u9650',
  noUpgrade: '\u4e0d\u5347\u7ea7',
  unlimited: '\u4e0d\u9650',
  validFor: '\u6709\u6548\u671f',
  quotaReset: '\u91cd\u7f6e\u5468\u671f',
  priority: '\u4f18\u5148\u7ea7',
  status: '\u72b6\u6001',
  paymentChannel: '\u652f\u4ed8\u6e20\u9053',
  upgradeGroup: '\u5347\u7ea7\u5206\u7ec4',
  actions: '\u64cd\u4f5c',
  internalPlan: '\u5185\u90e8\u5957\u9910',
  publicPlan: '\u516c\u5f00\u5957\u9910',
  wechatPay: '\u5fae\u4fe1\u652f\u4ed8',
  enabled: '\u5df2\u542f\u7528',
  disabled: '\u5df2\u7981\u7528',
  edit: '\u7f16\u8f91',
  enable: '\u542f\u7528',
  disable: '\u7981\u7528',
  delete: '\u5220\u9664',
  confirmDisable: '\u786e\u8ba4\u7981\u7528',
  confirmEnable: '\u786e\u8ba4\u542f\u7528',
  confirmDelete: '\u786e\u8ba4\u5220\u9664',
  disableDesc:
    '\u7981\u7528\u540e\u7528\u6237\u7aef\u4e0d\u518d\u5c55\u793a\uff0c\u4f46\u5386\u53f2\u8ba2\u5355\u4e0d\u53d7\u5f71\u54cd\u3002\u662f\u5426\u7ee7\u7eed\uff1f',
  enableDesc:
    '\u542f\u7528\u540e\u5957\u9910\u5c06\u5728\u7528\u6237\u7aef\u5c55\u793a\u3002\u662f\u5426\u7ee7\u7eed\uff1f',
  deleteDesc:
    '\u5220\u9664\u540e\u5c06\u6c38\u4e45\u79fb\u9664\u8be5\u5957\u9910\u3002\u5df2\u88ab\u8ba2\u5355\u6216\u7528\u6237\u8ba2\u9605\u5f15\u7528\u7684\u5957\u9910\u4e0d\u53ef\u5220\u9664\u3002',
};

function renderPlanTitle(title, record, t) {
  const plan = record?.plan;
  const subtitle = plan?.subtitle;
  const totalAmount = Number(plan?.total_amount || 0);
  const popoverContent = (
    <div style={{ width: 260 }}>
      <Text strong>{title}</Text>
      {subtitle && (
        <Text type='tertiary' style={{ display: 'block', marginTop: 4 }}>
          {subtitle}
        </Text>
      )}
      <Divider margin={12} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Text type='tertiary'>{TEXT.price}</Text>
        <Text strong style={{ color: 'var(--semi-color-success)' }}>
          {convertUSDToCurrency(Number(plan?.price_amount || 0), 2)}
        </Text>

        <Text type='tertiary'>{TEXT.totalQuota}</Text>
        <Text>{totalAmount > 0 ? renderQuotaAsUSD(totalAmount) : TEXT.unlimited}</Text>

        <Text type='tertiary'>{TEXT.upgradeGroup}</Text>
        <Text>{plan?.upgrade_group || TEXT.noUpgrade}</Text>

        <Text type='tertiary'>{TEXT.purchaseLimit}</Text>
        <Text>
          {Number(plan?.max_purchase_per_user || 0) > 0
            ? plan.max_purchase_per_user
            : TEXT.unlimited}
        </Text>

        <Text type='tertiary'>{TEXT.validFor}</Text>
        <Text>{formatSubscriptionDuration(plan, t)}</Text>

        <Text type='tertiary'>{TEXT.quotaReset}</Text>
        <Text>{formatSubscriptionResetPeriod(plan, t)}</Text>
      </div>
    </div>
  );

  return (
    <Popover content={popoverContent} position='rightTop' showArrow>
      <div style={{ cursor: 'pointer', maxWidth: 180 }}>
        <Space spacing={6} align='center'>
          <Text strong ellipsis={{ showTooltip: false }}>
            {title}
          </Text>
          <Tag
            color={plan?.internal_only ? 'orange' : 'grey'}
            shape='circle'
            size='small'
          >
            {plan?.internal_only ? TEXT.internalPlan : TEXT.publicPlan}
          </Tag>
        </Space>
        {subtitle && (
          <Text
            type='tertiary'
            ellipsis={{ showTooltip: false }}
            style={{ display: 'block' }}
          >
            {subtitle}
          </Text>
        )}
      </div>
    </Popover>
  );
}

function renderPrice(value) {
  return (
    <Text strong style={{ color: 'var(--semi-color-success)' }}>
      {convertUSDToCurrency(Number(value || 0), 2)}
    </Text>
  );
}

function renderPurchaseLimit(record) {
  const limit = Number(record?.plan?.max_purchase_per_user || 0);
  return <Text type={limit > 0 ? 'secondary' : 'tertiary'}>{limit || TEXT.unlimited}</Text>;
}

function renderStatus(enabled) {
  return enabled ? (
    <Tag
      color='white'
      shape='circle'
      type='light'
      prefixIcon={<Badge dot type='success' />}
    >
      {TEXT.enabled}
    </Tag>
  ) : (
    <Tag
      color='white'
      shape='circle'
      type='light'
      prefixIcon={<Badge dot type='danger' />}
    >
      {TEXT.disabled}
    </Tag>
  );
}

function renderTotalAmount(record) {
  const total = Number(record?.plan?.total_amount || 0);
  return (
    <Text type={total > 0 ? 'secondary' : 'tertiary'}>
      {total > 0 ? (
        <Tooltip content={`${TEXT.rawQuota}：${total}`}>
          <span>{renderQuotaAsUSD(total)}</span>
        </Tooltip>
      ) : (
        TEXT.unlimited
      )}
    </Text>
  );
}

function renderUpgradeGroup(record) {
  const group = record?.plan?.upgrade_group || '';
  return <Text type={group ? 'secondary' : 'tertiary'}>{group || TEXT.noUpgrade}</Text>;
}

function renderPaymentConfig(record, enableEpay) {
  const hasStripe = !!record?.plan?.stripe_price_id;
  const hasCreem = !!record?.plan?.creem_product_id;
  const hasWechat = !!enableEpay;

  return (
    <Space spacing={4}>
      {hasStripe && (
        <Tag color='violet' shape='circle'>
          Stripe
        </Tag>
      )}
      {hasCreem && (
        <Tag color='cyan' shape='circle'>
          Creem
        </Tag>
      )}
      {hasWechat && (
        <Tag color='light-green' shape='circle'>
          {TEXT.wechatPay}
        </Tag>
      )}
    </Space>
  );
}

function renderOperations(record, handlers) {
  const { openEdit, setPlanEnabled, deletePlan, complianceConfirmed } = handlers;
  const isEnabled = record?.plan?.enabled;

  const handleToggle = () => {
    Modal.confirm({
      title: isEnabled ? TEXT.confirmDisable : TEXT.confirmEnable,
      content: isEnabled ? TEXT.disableDesc : TEXT.enableDesc,
      centered: true,
      onOk: () => setPlanEnabled(record, !isEnabled),
    });
  };

  const handleDelete = () => {
    Modal.confirm({
      title: TEXT.confirmDelete,
      content: TEXT.deleteDesc,
      centered: true,
      onOk: () => deletePlan(record),
    });
  };

  return (
    <Space spacing={8}>
      <Button
        theme='light'
        type='tertiary'
        size='small'
        onClick={() => openEdit(record)}
        disabled={!complianceConfirmed}
      >
        {TEXT.edit}
      </Button>
      <Button
        theme='light'
        type={isEnabled ? 'danger' : 'primary'}
        size='small'
        onClick={handleToggle}
        disabled={!complianceConfirmed}
      >
        {isEnabled ? TEXT.disable : TEXT.enable}
      </Button>
      <Button
        theme='light'
        type='danger'
        size='small'
        onClick={handleDelete}
        disabled={!complianceConfirmed}
      >
        {TEXT.delete}
      </Button>
    </Space>
  );
}

export const getSubscriptionsColumns = ({
  t,
  openEdit,
  setPlanEnabled,
  deletePlan,
  enableEpay,
  complianceConfirmed = true,
}) => [
  {
    title: 'ID',
    dataIndex: ['plan', 'id'],
    width: 60,
    render: (text) => <Text type='tertiary'>#{text}</Text>,
  },
  {
    title: TEXT.package,
    dataIndex: ['plan', 'title'],
    width: 200,
    render: (text, record) => renderPlanTitle(text, record, t),
  },
  {
    title: TEXT.price,
    dataIndex: ['plan', 'price_amount'],
    width: 100,
    render: (text) => renderPrice(text),
  },
  {
    title: TEXT.purchaseLimit,
    width: 90,
    render: (_, record) => renderPurchaseLimit(record),
  },
  {
    title: TEXT.priority,
    dataIndex: ['plan', 'sort_order'],
    width: 80,
    render: (text) => <Text type='tertiary'>{Number(text || 0)}</Text>,
  },
  {
    title: TEXT.validFor,
    width: 100,
    render: (_, record) => (
      <Text type='secondary'>{formatSubscriptionDuration(record?.plan, t)}</Text>
    ),
  },
  {
    title: TEXT.quotaReset,
    width: 100,
    render: (_, record) => (
      <Text
        type={
          formatSubscriptionResetPeriod(record?.plan, t) === '\u4e0d\u91cd\u7f6e'
            ? 'tertiary'
            : 'secondary'
        }
      >
        {formatSubscriptionResetPeriod(record?.plan, t)}
      </Text>
    ),
  },
  {
    title: TEXT.status,
    dataIndex: ['plan', 'enabled'],
    width: 90,
    render: (text) => renderStatus(text),
  },
  {
    title: TEXT.paymentChannel,
    width: 180,
    render: (_, record) => renderPaymentConfig(record, enableEpay),
  },
  {
    title: TEXT.totalQuota,
    width: 100,
    render: (_, record) => renderTotalAmount(record),
  },
  {
    title: TEXT.upgradeGroup,
    width: 110,
    render: (_, record) => renderUpgradeGroup(record),
  },
  {
    title: TEXT.actions,
    dataIndex: 'operate',
    fixed: 'right',
    width: 220,
    render: (_, record) =>
      renderOperations(record, {
        openEdit,
        setPlanEnabled,
        deletePlan,
        complianceConfirmed,
      }),
  },
];
