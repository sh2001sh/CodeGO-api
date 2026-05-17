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

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';
import { useTableCompactMode } from '../common/useTableCompactMode';

export const useSubscriptionsData = () => {
  const { t } = useTranslation();
  const [compactMode, setCompactMode] = useTableCompactMode('subscriptions');
  const [allPlans, setAllPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showEdit, setShowEdit] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [sheetPlacement, setSheetPlacement] = useState('left');

  const syncPlans = (nextPlans) => {
    setAllPlans(nextPlans);
    const totalPages = Math.max(1, Math.ceil(nextPlans.length / pageSize));
    setActivePage((page) => Math.min(page || 1, totalPages));
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/subscription/admin/plans');
      if (res.data?.success) {
        syncPlans(res.data.data || []);
      } else {
        showError(res.data?.message || '\u52a0\u8f7d\u5931\u8d25');
      }
    } catch (error) {
      showError(error?.message || '\u8bf7\u6c42\u5931\u8d25');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadPlans();
  };

  const handlePageChange = (page) => {
    setActivePage(page);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setActivePage(1);
  };

  const setPlanEnabled = async (planRecordOrId, enabled) => {
    const planId =
      typeof planRecordOrId === 'number'
        ? planRecordOrId
        : planRecordOrId?.plan?.id;
    if (!planId) return false;

    setLoading(true);
    try {
      const res = await API.patch(`/api/subscription/admin/plans/${planId}`, {
        enabled: !!enabled,
      });
      if (res.data?.success) {
        showSuccess(enabled ? '\u5df2\u542f\u7528' : '\u5df2\u7981\u7528');
        await loadPlans();
        return true;
      }
      showError(res.data?.message || '\u64cd\u4f5c\u5931\u8d25');
      return false;
    } catch (error) {
      showError(error?.message || '\u8bf7\u6c42\u5931\u8d25');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (planRecordOrId) => {
    const planId =
      typeof planRecordOrId === 'number'
        ? planRecordOrId
        : planRecordOrId?.plan?.id;
    if (!planId) return false;

    setLoading(true);
    try {
      const res = await API.delete(`/api/subscription/admin/plans/${planId}`);
      if (res.data?.success) {
        showSuccess('\u5220\u9664\u6210\u529f');
        await loadPlans();
        return true;
      }
      showError(res.data?.message || '\u64cd\u4f5c\u5931\u8d25');
      return false;
    } catch (error) {
      showError(
        error?.response?.data?.message ||
          error?.message ||
          '\u8bf7\u6c42\u5931\u8d25',
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditingPlan(null);
  };

  const openCreate = () => {
    setSheetPlacement('left');
    setEditingPlan(null);
    setShowEdit(true);
  };

  const openEdit = (planRecord) => {
    setSheetPlacement('right');
    setEditingPlan(planRecord);
    setShowEdit(true);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const planCount = allPlans.length;
  const plans = allPlans.slice(
    Math.max(0, (activePage - 1) * pageSize),
    Math.max(0, (activePage - 1) * pageSize) + pageSize,
  );

  return {
    plans,
    planCount,
    loading,
    showEdit,
    editingPlan,
    sheetPlacement,
    setShowEdit,
    setEditingPlan,
    compactMode,
    setCompactMode,
    activePage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    loadPlans,
    setPlanEnabled,
    deletePlan,
    refresh,
    closeEdit,
    openCreate,
    openEdit,
    t,
  };
};
