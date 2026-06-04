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
import { useTranslation } from 'react-i18next';
import {
  API,
  downloadTextAsFile,
  showError,
  showSuccess,
  renderQuota,
  getCurrencyConfig,
} from '../../../../helpers';
import {
  quotaToDisplayAmount,
  displayAmountToQuota,
} from '../../../../helpers/quota';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import {
  Button,
  Modal,
  SideSheet,
  Space,
  Spin,
  Typography,
  Card,
  Tag,
  Form,
  Avatar,
  Row,
  Col,
  Select,
} from '@douyinfe/semi-ui';
import {
  IconCreditCard,
  IconSave,
  IconClose,
  IconGift,
} from '@douyinfe/semi-icons';
import {
  REDEMPTION_TYPES,
  REDEMPTION_WALLET_TYPES,
} from '../../../../constants/redemption.constants';

const { Text, Title } = Typography;

const DEFAULT_QUOTA = 100000;

const EditRedemptionModal = (props) => {
  const { t } = useTranslation();
  const isEdit = props.editingRedemption.id !== undefined;
  const [loading, setLoading] = useState(isEdit);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [showQuotaInput, setShowQuotaInput] = useState(false);
  const isMobile = useIsMobile();
  const formApiRef = useRef(null);

  const getInitValues = () => ({
    name: '',
    redeem_type: REDEMPTION_TYPES.QUOTA,
    wallet_type: REDEMPTION_WALLET_TYPES.DEFAULT,
    plan_id: '',
    quota: DEFAULT_QUOTA,
    amount: Number(quotaToDisplayAmount(DEFAULT_QUOTA).toFixed(6)),
    count: 1,
    expired_time: null,
  });

  const planOptions = useMemo(() => {
    return (plans || []).map((record) => ({
      label: `${record?.plan?.title || `Plan #${record?.plan?.id || '-'}`} (${getCurrencyConfig().symbol}${Number(record?.plan?.price_amount || 0).toFixed(2)})`,
      value: String(record?.plan?.id || ''),
    }));
  }, [plans]);

  const planTitleMap = useMemo(() => {
    const map = new Map();
    (plans || []).forEach((record) => {
      if (record?.plan?.id) {
        map.set(record.plan.id, record.plan.title || `Plan #${record.plan.id}`);
      }
    });
    return map;
  }, [plans]);

  const handleCancel = () => {
    props.handleClose();
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const res = await API.get('/api/subscription/admin/plans');
      if (res.data?.success) {
        setPlans(res.data.data || []);
      }
    } finally {
      setPlansLoading(false);
    }
  };

  const loadRedemption = async () => {
    setLoading(true);
    let res = await API.get(`/api/redemption/${props.editingRedemption.id}`);
    const { success, message, data } = res.data;
    if (success) {
      const values = {
        ...getInitValues(),
        ...data,
        redeem_type: data.redeem_type || REDEMPTION_TYPES.QUOTA,
        wallet_type:
          data.wallet_type === REDEMPTION_WALLET_TYPES.CLAUDE
            ? REDEMPTION_WALLET_TYPES.CLAUDE
            : REDEMPTION_WALLET_TYPES.DEFAULT,
        plan_id: data.plan_id > 0 ? String(data.plan_id) : '',
        expired_time:
          data.expired_time === 0 ? null : new Date(data.expired_time * 1000),
        amount: Number(quotaToDisplayAmount(data.quota || 0).toFixed(6)),
      };
      formApiRef.current?.setValues(values);
    } else {
      showError(message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!props.visiable) {
      return;
    }
    loadPlans();
  }, [props.visiable]);

  useEffect(() => {
    if (!formApiRef.current) {
      return;
    }
    if (isEdit) {
      loadRedemption();
    } else {
      formApiRef.current.setValues(getInitValues());
      setLoading(false);
    }
  }, [props.editingRedemption.id]);

  const submit = async (values) => {
    setLoading(true);
    try {
      const redeemType = values.redeem_type || REDEMPTION_TYPES.QUOTA;
      const planId = redeemType === REDEMPTION_TYPES.SUBSCRIPTION
        ? parseInt(values.plan_id, 10) || 0
        : 0;
      const quota =
        redeemType === REDEMPTION_TYPES.SUBSCRIPTION
          ? 0
          : Number(values.quota) > 0
            ? Number(values.quota)
            : displayAmountToQuota(values.amount);

      if (redeemType === REDEMPTION_TYPES.QUOTA && quota <= 0) {
        showError(t('Please enter a valid quota or amount'));
        setLoading(false);
        return;
      }

      if (redeemType === REDEMPTION_TYPES.SUBSCRIPTION && planId <= 0) {
        showError(t('Please select a subscription plan'));
        setLoading(false);
        return;
      }

      const payload = {
        name:
          values.name ||
          (redeemType === REDEMPTION_TYPES.SUBSCRIPTION
            ? planTitleMap.get(planId) || t('Subscription')
            : values.wallet_type === REDEMPTION_WALLET_TYPES.CLAUDE
              ? `Claude ${renderQuota(quota)}`
              : renderQuota(quota)),
        redeem_type: redeemType,
        quota,
        wallet_type:
          redeemType === REDEMPTION_TYPES.QUOTA
            ? values.wallet_type || REDEMPTION_WALLET_TYPES.DEFAULT
            : REDEMPTION_WALLET_TYPES.DEFAULT,
        plan_id: planId,
        count: parseInt(values.count, 10) || 1,
        expired_time: values.expired_time
          ? Math.floor(values.expired_time.getTime() / 1000)
          : 0,
      };

      let res;
      if (isEdit) {
        res = await API.put('/api/redemption/', {
          ...payload,
          id: parseInt(props.editingRedemption.id, 10),
        });
      } else {
        res = await API.post('/api/redemption/', payload);
      }

      const { success, message, data } = res.data;
      if (!success) {
        showError(message);
        setLoading(false);
        return;
      }

      showSuccess(isEdit ? t('Updated successfully') : t('Created successfully'));
      props.refresh();
      props.handleClose();

      if (!isEdit && data && Array.isArray(data) && data.length > 0) {
        const text = data.join('\n') + '\n';
        Modal.confirm({
          title: t('Redemption codes created'),
          content: (
            <div>
              <p>{t('Do you want to download the generated redemption codes?')}</p>
              <p>{t('The file will be saved as a plain text file using the redemption name.')}</p>
            </div>
          ),
          onOk: () => {
            downloadTextAsFile(text, `${payload.name}.txt`);
          },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SideSheet
      placement={isEdit ? 'right' : 'left'}
      title={
        <Space>
          {isEdit ? (
            <Tag color='blue' shape='circle'>
              {t('Edit')}
            </Tag>
          ) : (
            <Tag color='green' shape='circle'>
              {t('Create')}
            </Tag>
          )}
          <Title heading={4} className='m-0'>
            {isEdit ? t('Update Redemption Code') : t('Create Redemption Code')}
          </Title>
        </Space>
      }
      bodyStyle={{ padding: 0 }}
      visible={props.visiable}
      width={isMobile ? '100%' : 640}
      footer={
        <div className='flex justify-end bg-white'>
          <Space>
            <Button
              theme='solid'
              onClick={() => formApiRef.current?.submitForm()}
              icon={<IconSave />}
              loading={loading}
            >
              {t('Submit')}
            </Button>
            <Button
              theme='light'
              type='primary'
              onClick={handleCancel}
              icon={<IconClose />}
            >
              {t('Cancel')}
            </Button>
          </Space>
        </div>
      }
      closeIcon={null}
      onCancel={handleCancel}
    >
      <Spin spinning={loading}>
        <Form
          initValues={getInitValues()}
          getFormApi={(api) => (formApiRef.current = api)}
          onSubmit={submit}
        >
          {({ values }) => {
            const redeemType = values.redeem_type || REDEMPTION_TYPES.QUOTA;
            return (
              <div className='p-2'>
                <Card className='!rounded-2xl shadow-sm border-0 mb-6'>
                  <div className='flex items-center mb-2'>
                    <Avatar size='small' color='blue' className='mr-2 shadow-md'>
                      <IconGift size={16} />
                    </Avatar>
                    <div>
                      <Text className='text-lg font-medium'>{t('Basic Info')}</Text>
                      <div className='text-xs text-gray-600'>
                        {t('Configure the code name, type, and expiration.')}
                      </div>
                    </div>
                  </div>

                  <Row gutter={12}>
                    <Col span={24}>
                      <Form.Input
                        field='name'
                        label={t('Name')}
                        placeholder={t('Leave empty to auto-generate')}
                        style={{ width: '100%' }}
                        showClear
                      />
                    </Col>
                    <Col span={24}>
                      <Form.Select
                        field='redeem_type'
                        label={t('Code Type')}
                        style={{ width: '100%' }}
                        onChange={(value) => {
                          if (value !== REDEMPTION_TYPES.QUOTA) {
                            formApiRef.current?.setValue(
                              'wallet_type',
                              REDEMPTION_WALLET_TYPES.DEFAULT,
                            );
                          }
                        }}
                      >
                        <Select.Option value={REDEMPTION_TYPES.QUOTA}>
                          {t('Quota')}
                        </Select.Option>
                        <Select.Option value={REDEMPTION_TYPES.SUBSCRIPTION}>
                          {t('Subscription')}
                        </Select.Option>
                      </Form.Select>
                    </Col>
                    <Col span={24}>
                      <Form.DatePicker
                        field='expired_time'
                        label={t('Expiration Time')}
                        type='dateTime'
                        placeholder={t('Leave empty for never expires')}
                        style={{ width: '100%' }}
                        showClear
                      />
                    </Col>
                  </Row>
                </Card>

                <Card className='!rounded-2xl shadow-sm border-0'>
                  <div className='flex items-center mb-2'>
                    <Avatar
                      size='small'
                      color='green'
                      className='mr-2 shadow-md'
                    >
                      <IconCreditCard size={16} />
                    </Avatar>
                    <div>
                      <Text className='text-lg font-medium'>{t('Benefit')}</Text>
                      <div className='text-xs text-gray-600'>
                        {t('Set the quota amount or the subscription plan to be granted.')}
                      </div>
                    </div>
                  </div>

                  <Row gutter={12}>
                    {redeemType === REDEMPTION_TYPES.SUBSCRIPTION ? (
                      <Col span={24}>
                        <Form.Select
                          field='plan_id'
                          label={t('Subscription Plan')}
                          placeholder={t('Select subscription plan')}
                          loading={plansLoading}
                          style={{ width: '100%' }}
                          showClear
                        >
                          {planOptions.map((option) => (
                            <Select.Option key={option.value} value={option.value}>
                              {option.label}
                            </Select.Option>
                          ))}
                        </Form.Select>
                      </Col>
                    ) : (
                      <>
                        <Col span={24}>
                          <Form.Select
                            field='wallet_type'
                            label={t('Balance Pool')}
                            style={{ width: '100%' }}
                          >
                            <Select.Option
                              value={REDEMPTION_WALLET_TYPES.DEFAULT}
                            >
                              {t('Default Balance')}
                            </Select.Option>
                            <Select.Option
                              value={REDEMPTION_WALLET_TYPES.CLAUDE}
                            >
                              {t('Claude Quota')}
                            </Select.Option>
                          </Form.Select>
                        </Col>
                        <Col span={24}>
                          <Form.InputNumber
                            field='amount'
                            label={
                              values.wallet_type ===
                              REDEMPTION_WALLET_TYPES.CLAUDE
                                ? t('Claude Quota Amount')
                                : t('Amount')
                            }
                          prefix={getCurrencyConfig().symbol}
                          precision={6}
                          min={0}
                          step={0.000001}
                          style={{ width: '100%' }}
                          onChange={(val) => {
                            const amount = val === '' || val == null ? 0 : val;
                            formApiRef.current?.setValue('amount', amount);
                            formApiRef.current?.setValue(
                              'quota',
                              displayAmountToQuota(amount),
                            );
                          }}
                          showClear
                        />
                        <div
                          className='text-xs cursor-pointer mt-1'
                          style={{ color: 'var(--semi-color-text-2)' }}
                          onClick={() => setShowQuotaInput((v) => !v)}
                        >
                          {showQuotaInput
                            ? t('Hide raw quota input')
                            : t('Use raw quota input')}
                        </div>
                        <div
                          style={{ display: showQuotaInput ? 'block' : 'none' }}
                          className='mt-2'
                        >
                          <Form.InputNumber
                            field='quota'
                            label={t('Quota')}
                            min={0}
                            style={{ width: '100%' }}
                            onChange={(val) => {
                              const quota = val === '' || val == null ? 0 : val;
                              formApiRef.current?.setValue('quota', quota);
                              formApiRef.current?.setValue(
                                'amount',
                                Number(quotaToDisplayAmount(quota).toFixed(6)),
                              );
                            }}
                            showClear
                          />
                        </div>
                        </Col>
                      </>
                    )}
                    {!isEdit && (
                      <Col span={12}>
                        <Form.InputNumber
                          field='count'
                          label={t('Quantity')}
                          min={1}
                          max={100}
                          style={{ width: '100%' }}
                          showClear
                        />
                      </Col>
                    )}
                  </Row>
                </Card>
              </div>
            );
          }}
        </Form>
      </Spin>
    </SideSheet>
  );
};

export default EditRedemptionModal;
