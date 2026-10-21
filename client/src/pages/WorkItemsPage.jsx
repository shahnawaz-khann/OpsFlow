import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Filter, RotateCcw, Download, Sparkles } from 'lucide-react';
import { workItemsApi } from '../api/workItems.js';
import { teamsApi } from '../api/teams.js';
import { WorkItemTable } from '../components/work-items/WorkItemTable.jsx';
import { WorkItemFormModal } from '../components/work-items/WorkItemFormModal.jsx';
import { Button } from '../components/common/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function WorkItemsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters from URL or default
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const teamId = searchParams.get('teamId') || '';
  const assigneeId = searchParams.get('assigneeId') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Search input local state to prevent debounce delay
  const [searchInput, setSearchInput] = useState(search);

  // Load user's accessible teams
  useEffect(() => {
    async function loadTeams() {
      try {
        const res = await teamsApi.list();
        setTeams(res.teams || []);
      } catch (err) {
        console.error('Failed to load teams', err);
      }
    }
    loadTeams();
  }, [user]);

  // Fetch work items
  const fetchWorkItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await workItemsApi.list({
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        teamId: teamId || undefined,
        assigneeId: assigneeId || undefined,
        page,
        limit: 10,
        sortBy,
        sortOrder,
      });
      setItems(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.message || 'Failed to load work items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkItems();
  }, [search, status, priority, teamId, assigneeId, page, sortBy, sortOrder, user]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Reset to page 1 on filter changes
    if (key !== 'page') {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const applyPreset = (preset) => {
    const next = new URLSearchParams();
    if (preset === 'urgent_unassigned') {
      next.set('priority', 'URGENT');
      next.set('assigneeId', 'unassigned');
    } else if (preset === 'my_work') {
      if (user) next.set('assigneeId', user.id);
    } else if (preset === 'blocked') {
      next.set('status', 'BLOCKED');
    } else if (preset === 'resolved') {
      next.set('status', 'RESOLVED');
    }
    setSearchInput('');
    setSearchParams(next);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await workItemsApi.list({
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        teamId: teamId || undefined,
        assigneeId: assigneeId || undefined,
        page: 1,
        limit: 50,
        sortBy,
        sortOrder,
      });
      const dataToExport = res.data || items;
      if (!dataToExport.length) {
        alert('No operational tickets found to export.');
        return;
      }
      const headers = ['Reference', 'Title', 'Status', 'Priority', 'Team', 'Assignee', 'Created By', 'Created At', 'Resolved At'];
      const rows = dataToExport.map((it) => [
        it.reference,
        `"${(it.title || '').replace(/"/g, '""')}"`,
        it.status,
        it.priority,
        `"${(it.team?.name || '').replace(/"/g, '""')}"`,
        `"${(it.assignee?.name || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(it.createdBy?.name || '').replace(/"/g, '""')}"`,
        `"${it.createdAt ? new Date(it.createdAt).toISOString() : ''}"`,
        `"${it.resolvedAt ? new Date(it.resolvedAt).toISOString() : ''}"`,
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `OpsFlow_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters = search || status || priority || teamId || assigneeId;

  // Active preset detection
  const isUrgentUnassigned = priority === 'URGENT' && assigneeId === 'unassigned';
  const isMyWork = assigneeId === user?.id && !status && !priority;
  const isBlocked = status === 'BLOCKED' && !priority && !assigneeId;
  const isResolved = status === 'RESOLVED' && !priority && !assigneeId;
  const isAllWork = !hasActiveFilters;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Work Items</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time operational queue with SLA priorities, transactional ownership, and audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            icon={Download}
            loading={exporting}
            onClick={handleExportCsv}
            title="Download CSV export of active view"
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            New Work Item
          </Button>
        </div>
      </div>

      {/* Quick Preset Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] shrink-0">
          Views:
        </span>
        <button
          type="button"
          onClick={() => handleResetFilters()}
          className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 ${
            isAllWork
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          All Tickets
        </button>
        <button
          type="button"
          onClick={() => applyPreset('urgent_unassigned')}
          className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 ${
            isUrgentUnassigned
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-600'
          }`}
        >
          ⚡ Urgent Unassigned
        </button>
        {user && (
          <button
            type="button"
            onClick={() => applyPreset('my_work')}
            className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 ${
              isMyWork
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
            }`}
          >
            👤 Assigned to Me
          </button>
        )}
        <button
          type="button"
          onClick={() => applyPreset('blocked')}
          className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 ${
            isBlocked
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-600'
          }`}
        >
          ⚠️ Blocked / Escalated
        </button>
        <button
          type="button"
          onClick={() => applyPreset('resolved')}
          className={`px-3 py-1.5 rounded-full font-medium transition-all shrink-0 ${
            isResolved
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600'
          }`}
        >
          ✅ Resolved
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, reference (e.g. OPS-1001)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          {/* Status filter */}
          <div>
            <select
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priority}
              onChange={(e) => updateParam('priority', e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Team filter */}
          <div>
            <select
              value={teamId}
              onChange={(e) => updateParam('teamId', e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Accessible Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick assignment & sort sub-row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Assignment:</span>
            <button
              type="button"
              onClick={() => updateParam('assigneeId', '')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                !assigneeId ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => updateParam('assigneeId', 'unassigned')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                assigneeId === 'unassigned'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Unassigned Only
            </button>
            {user && (
              <button
                type="button"
                onClick={() => updateParam('assigneeId', user.id)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  assigneeId === user.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Assigned to Me
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            )}

            <div className="flex items-center gap-1.5 text-slate-500">
              <span>Sort:</span>
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split(':');
                  const next = new URLSearchParams(searchParams);
                  next.set('sortBy', f);
                  next.set('sortOrder', o);
                  setSearchParams(next);
                }}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="updatedAt:desc">Last Updated (Newest)</option>
                <option value="updatedAt:asc">Last Updated (Oldest)</option>
                <option value="createdAt:desc">Created Date (Newest)</option>
                <option value="priority:desc">Priority (High to Low)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <WorkItemTable
        items={items}
        loading={loading}
        error={error}
        pagination={pagination}
        onPageChange={(nextPage) => updateParam('page', String(nextPage))}
        onRetry={fetchWorkItems}
        onCreateNew={() => setCreateModalOpen(true)}
      />

      {/* Create Modal */}
      <WorkItemFormModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => fetchWorkItems()}
      />
    </div>
  );
}

