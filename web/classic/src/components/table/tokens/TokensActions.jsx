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

import React, { useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { showError } from '../../../helpers';
import CopyTokensModal from './modals/CopyTokensModal';
import DeleteTokensModal from './modals/DeleteTokensModal';

const TEXT = {
  selectTokensFirst: '\u8bf7\u5148\u9009\u62e9\u4ee4\u724c',
  createToken: '\u65b0\u589e\u4ee4\u724c',
  copySelectedTokens: '\u590d\u5236\u6240\u9009\u4ee4\u724c',
  deleteSelectedTokens: '\u5220\u9664\u6240\u9009\u4ee4\u724c',
};

const TokensActions = ({
  selectedKeys,
  setEditingToken,
  setShowEdit,
  batchCopyTokens,
  batchDeleteTokens,
  t,
}) => {
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleCopySelectedTokens = () => {
    if (selectedKeys.length === 0) {
      showError(t(TEXT.selectTokensFirst));
      return;
    }
    setShowCopyModal(true);
  };

  const handleDeleteSelectedTokens = () => {
    if (selectedKeys.length === 0) {
      showError(t(TEXT.selectTokensFirst));
      return;
    }
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    batchDeleteTokens();
    setShowDeleteModal(false);
  };

  return (
    <>
      <div className='flex flex-wrap gap-2 w-full md:w-auto order-2 md:order-1'>
        <Button
          type='primary'
          className='flex-1 md:flex-initial'
          onClick={() => {
            setEditingToken({
              id: undefined,
            });
            setShowEdit(true);
          }}
          size='small'
        >
          {t(TEXT.createToken)}
        </Button>

        <Button
          type='tertiary'
          className='flex-1 md:flex-initial'
          onClick={handleCopySelectedTokens}
          size='small'
        >
          {t(TEXT.copySelectedTokens)}
        </Button>

        <Button
          type='danger'
          className='w-full md:w-auto'
          onClick={handleDeleteSelectedTokens}
          size='small'
        >
          {t(TEXT.deleteSelectedTokens)}
        </Button>
      </div>

      <CopyTokensModal
        visible={showCopyModal}
        onCancel={() => setShowCopyModal(false)}
        batchCopyTokens={batchCopyTokens}
        t={t}
      />

      <DeleteTokensModal
        visible={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        selectedKeys={selectedKeys}
        t={t}
      />
    </>
  );
};

export default TokensActions;
