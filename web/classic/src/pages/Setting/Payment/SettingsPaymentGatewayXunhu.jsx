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

import React, { useEffect, useRef, useState } from 'react';
import { Banner, Button, Form, Row, Col, Spin } from '@douyinfe/semi-ui';
import {
  API,
  removeTrailingSlash,
  showError,
  showSuccess,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

export default function SettingsPaymentGatewayXunhu(props) {
  const { t } = useTranslation();
  const sectionTitle = props.hideSectionTitle
    ? undefined
    : '\u5fae\u4fe1\u652f\u4ed8\u8bbe\u7f6e';
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    XunhuEnabled: false,
    XunhuAppID: '',
    XunhuSecret: '',
    XunhuGateway: 'https://api.xunhupay.com/payment/do.html',
    XunhuMinTopUp: 10,
  });
  const [originInputs, setOriginInputs] = useState({});
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        XunhuEnabled: props.options.XunhuEnabled || false,
        XunhuAppID: props.options.XunhuAppID || '',
        XunhuSecret: props.options.XunhuSecret || '',
        XunhuGateway:
          props.options.XunhuGateway ||
          'https://api.xunhupay.com/payment/do.html',
        XunhuMinTopUp:
          props.options.XunhuMinTopUp !== undefined
            ? parseFloat(props.options.XunhuMinTopUp)
            : 10,
      };
      setInputs(currentInputs);
      setOriginInputs({ ...currentInputs });
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submitXunhuSettings = async () => {
    if (props.options.ServerAddress === '') {
      showError(t('请先填写服务器地址'));
      return;
    }

    setLoading(true);
    try {
      const updates = [];

      if (originInputs['XunhuEnabled'] !== inputs.XunhuEnabled) {
        updates.push({
          key: 'XunhuEnabled',
          value: inputs.XunhuEnabled ? 'true' : 'false',
        });
      }
      if (
        (inputs.XunhuAppID || '').trim() !==
        (originInputs['XunhuAppID'] || '').trim()
      ) {
        updates.push({
          key: 'XunhuAppID',
          value: (inputs.XunhuAppID || '').trim(),
        });
      }
      if ((inputs.XunhuSecret || '').trim() !== '') {
        updates.push({
          key: 'XunhuSecret',
          value: (inputs.XunhuSecret || '').trim(),
        });
      }

      const sanitizedGateway = removeTrailingSlash(inputs.XunhuGateway || '');
      if (
        sanitizedGateway !==
        removeTrailingSlash(originInputs['XunhuGateway'] || '')
      ) {
        updates.push({
          key: 'XunhuGateway',
          value: sanitizedGateway,
        });
      }

      if (
        Number(originInputs['XunhuMinTopUp'] || 0) !==
        Number(inputs.XunhuMinTopUp || 0)
      ) {
        updates.push({
          key: 'XunhuMinTopUp',
          value: String(inputs.XunhuMinTopUp || 0),
        });
      }

      if (updates.length === 0) {
        showSuccess(t('无需更新'));
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        updates.map((item) =>
          API.put('/api/option/', {
            key: item.key,
            value: item.value,
          }),
        ),
      );

      const failed = results.filter((res) => !res.data.success);
      if (failed.length > 0) {
        failed.forEach((res) => showError(res.data.message));
      } else {
        showSuccess(t('更新成功'));
        setOriginInputs({
          ...inputs,
          XunhuGateway: sanitizedGateway,
          XunhuSecret: originInputs['XunhuSecret'] || '',
        });
        props.refresh?.();
      }
    } catch (_error) {
      showError(t('更新失败'));
    }
    setLoading(false);
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={sectionTitle}>
          <Banner
            type='info'
            icon={<Info size={16} />}
            description={
              <>
                {t(
                  'Configure WeChat Pay for wallet top-up and subscription purchase.'
                )}
                <br />
                {t('Top-up notify URL')}: {props.options.ServerAddress || t('网站地址')}
                /api/user/xunhu/notify
                <br />
                {t('Subscription notify URL')}:{' '}
                {props.options.ServerAddress || t('网站地址')}
                /api/subscription/xunhu/notify
              </>
            }
            style={{ marginBottom: 16 }}
          />
          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Switch
                field='XunhuEnabled'
                size='default'
                checkedText='ON'
                uncheckedText='OFF'
                label={t('WeChat Pay')}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuAppID'
                label='App ID'
                placeholder={t('Enter Xunhu app id')}
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.Input
                field='XunhuSecret'
                label={t('API Secret')}
                placeholder={t('Leave blank to keep current secret')}
                type='password'
                extraText={t('Sensitive value will not be shown after saving')}
              />
            </Col>
          </Row>
          <Row
            gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}
            style={{ marginTop: 16 }}
          >
            <Col xs={24} sm={24} md={16} lg={16} xl={16}>
              <Form.Input
                field='XunhuGateway'
                label={t('Gateway URL')}
                placeholder='https://api.xunhupay.com/payment/do.html'
              />
            </Col>
            <Col xs={24} sm={24} md={8} lg={8} xl={8}>
              <Form.InputNumber
                field='XunhuMinTopUp'
                label={t('Minimum WeChat Pay charge (CNY)')}
                min={0}
                precision={0}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
          <Button onClick={submitXunhuSettings} style={{ marginTop: 16 }}>
            {'\u4fdd\u5b58\u5fae\u4fe1\u652f\u4ed8\u8bbe\u7f6e'}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}
