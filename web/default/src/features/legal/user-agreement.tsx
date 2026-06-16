/*
Copyright (C) 2023-2026 QuantumNous

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
import { useTranslation } from 'react-i18next'
import { getUserAgreement } from './api'
import { LegalDocument } from './legal-document'

export function UserAgreement() {
  const { t } = useTranslation()
  return (
    <LegalDocument
      title={t('User Agreement')}
      queryKey='user-agreement'
      fetchDocument={getUserAgreement}
      emptyMessage={t(
        'The administrator has not configured a user agreement yet.'
      )}
      fallbackContent={t(`# Code Go 用户协议

欢迎使用 Code Go。Code Go 的核心理念是：让 AI Coding 的每一步，都算数。为了让长期积累、额度使用、成就成长和模型调用都保持稳定，请你在使用前阅读本协议。

## 服务定位

Code Go 提供账号体系、模型调用入口、额度结算、套餐订阅、活动玩法与相关开发者工具能力。你使用本服务时，应保证用途合法、合规并符合平台规则。

## 账号与安全

- 你应对自己的账号、密钥、兑换码和登录设备负责。
- 不得共享、倒卖、滥用账号或利用系统漏洞获利。
- 若发现异常登录、盗刷或密钥泄露，应及时修改或停用。

## 使用规则

- 不得将平台用于违法违规、侵权、攻击、绕过权限、批量滥刷、欺诈或危害公共利益的行为。
- 不得利用脚本、接口或自动化方式恶意消耗资源、规避风控或破坏计费逻辑。
- 不同模型、套餐、盲盒、积分和活动功能可能存在独立规则，以页面说明为准。

## 额度、套餐与活动

- 钱包余额、套餐额度、盲盒额度、兑换码和积分均按平台当时展示规则生效。
- 套餐、订阅、盲盒、宠物和成长机制可能会随着运营策略进行调整。
- 因价格、上游模型、支付渠道或风控策略变化，平台保留调整额度、折扣、活动与入口的权利。

## 中断与变更

平台可能因维护、升级、上游供应商波动、网络故障或合规要求暂停部分服务。Code Go 会尽量保持连续性，但不承诺所有模型或功能永久可用。

## 合规与责任

你应自行判断模型输出及其使用后果，并承担由此产生的责任。对于因违反法律法规、平台规则或第三方权利导致的损失，由使用者自行承担。

## 协议更新

Code Go 可根据产品、运营、合规与安全需要更新本协议。继续使用服务即视为接受更新后的内容。`)}
    />
  )
}
