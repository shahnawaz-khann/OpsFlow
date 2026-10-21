import React, { useState, useEffect } from 'react';
import { workItemsApi } from '../api/workItems.js';
import { WorkItemTable } from '../components/work-items/WorkItemTable.jsx';
import { WorkItemFormModal } from '../components/work-items/WorkItemFormModal.jsx';
import { Button } from '../components/common/Button.jsx';
import { Plus, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function MyWorkPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchMyWork = async (page = 1) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await workItemsApi.list({
        assigneeId: user.id,
        page,
        limit: 10,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
      });
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load your assigned items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyWork(1);
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Work</h2>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            All active operational work items assigned to you ({user?.name}).
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={Plus}
          onClick={() => setCreateModalOpen(true)}
        >
          New Work Item
        </Button>
      </div>

      <WorkItemTable
        items={items}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={(p) => fetchMyWork(p)}
        onRetry={() => fetchMyWork(1)}
        onCreateNew={() => setCreateModalOpen(true)}
      />

      <WorkItemFormModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => fetchMyWork(1)}
      />
    </div>
  );
}
