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
import { Tag, Button, Space, Popover, Dropdown } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';
import { renderQuota, timestamp2string } from '../../../helpers';
import {
  REDEMPTION_ACTIONS,
  REDEMPTION_STATUS,
  REDEMPTION_STATUS_MAP,
  REDEMPTION_TYPES,
} from '../../../constants/redemption.constants';

export const isExpired = (record) => {
  return (
    record.status === REDEMPTION_STATUS.UNUSED &&
    record.expired_time !== 0 &&
    record.expired_time < Math.floor(Date.now() / 1000)
  );
};

const renderTimestamp = (timestamp) => {
  return <>{timestamp2string(timestamp)}</>;
};

const renderStatus = (status, record, t) => {
  if (isExpired(record)) {
    return (
      <Tag color='orange' shape='circle'>
        {t('Expired')}
      </Tag>
    );
  }

  const statusConfig = REDEMPTION_STATUS_MAP[status];
  if (statusConfig) {
    return (
      <Tag color={statusConfig.color} shape='circle'>
        {t(statusConfig.text)}
      </Tag>
    );
  }

  return (
    <Tag color='black' shape='circle'>
      {t('Unknown')}
    </Tag>
  );
};

const renderRedeemType = (record, t) => {
  if (record.redeem_type === REDEMPTION_TYPES.SUBSCRIPTION) {
    return (
      <Tag color='blue' shape='circle'>
        {t('Subscription')}
      </Tag>
    );
  }

  return (
    <Tag color='grey' shape='circle'>
      {t('Quota')}
    </Tag>
  );
};

const renderBenefit = (record, t) => {
  if (record.redeem_type === REDEMPTION_TYPES.SUBSCRIPTION) {
    return (
      <div>
        <Tag color='blue' shape='circle'>
          {record.plan_title || `Plan #${record.plan_id || '-'}`}
        </Tag>
      </div>
    );
  }

  return (
    <div>
      <Tag color='grey' shape='circle'>
        {renderQuota(parseInt(record.quota || 0, 10))}
      </Tag>
    </div>
  );
};

export const getRedemptionsColumns = ({
  t,
  manageRedemption,
  copyText,
  setEditingRedemption,
  setShowEdit,
  showDeleteRedemptionModal,
}) => {
  return [
    {
      title: t('ID'),
      dataIndex: 'id',
    },
    {
      title: t('Name'),
      dataIndex: 'name',
    },
    {
      title: t('Type'),
      dataIndex: 'redeem_type',
      render: (_, record) => renderRedeemType(record, t),
    },
    {
      title: t('Benefit'),
      key: 'benefit',
      render: (_, record) => renderBenefit(record, t),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (text, record) => <div>{renderStatus(text, record, t)}</div>,
    },
    {
      title: t('Created At'),
      dataIndex: 'created_time',
      render: (text) => <div>{renderTimestamp(text)}</div>,
    },
    {
      title: t('Expires At'),
      dataIndex: 'expired_time',
      render: (text) => {
        return <div>{text === 0 ? t('Never expires') : renderTimestamp(text)}</div>;
      },
    },
    {
      title: t('Redeemed By'),
      dataIndex: 'used_user_id',
      render: (text) => <div>{text === 0 ? '-' : text}</div>,
    },
    {
      title: '',
      dataIndex: 'operate',
      fixed: 'right',
      width: 205,
      render: (_, record) => {
        const moreMenuItems = [
          {
            node: 'item',
            name: t('Delete'),
            type: 'danger',
            onClick: () => showDeleteRedemptionModal(record),
          },
        ];

        if (record.status === REDEMPTION_STATUS.UNUSED && !isExpired(record)) {
          moreMenuItems.push({
            node: 'item',
            name: t('Disable'),
            type: 'warning',
            onClick: () => {
              manageRedemption(record.id, REDEMPTION_ACTIONS.DISABLE, record);
            },
          });
        } else if (!isExpired(record)) {
          moreMenuItems.push({
            node: 'item',
            name: t('Enable'),
            type: 'secondary',
            onClick: () => {
              manageRedemption(record.id, REDEMPTION_ACTIONS.ENABLE, record);
            },
            disabled: record.status === REDEMPTION_STATUS.USED,
          });
        }

        return (
          <Space>
            <Popover content={record.key} style={{ padding: 20 }} position='top'>
              <Button type='tertiary' size='small'>
                {t('View')}
              </Button>
            </Popover>
            <Button
              size='small'
              onClick={async () => {
                await copyText(record.key);
              }}
            >
              {t('Copy')}
            </Button>
            <Button
              type='tertiary'
              size='small'
              onClick={() => {
                setEditingRedemption(record);
                setShowEdit(true);
              }}
              disabled={record.status !== REDEMPTION_STATUS.UNUSED}
            >
              {t('Edit')}
            </Button>
            <Dropdown trigger='click' position='bottomRight' menu={moreMenuItems}>
              <Button type='tertiary' size='small' icon={<IconMore />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ];
};
