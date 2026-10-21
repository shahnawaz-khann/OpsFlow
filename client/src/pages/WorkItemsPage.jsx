import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Filter, RotateCcw } from 'lucide-react';
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

  const hasActiveFilters = search || status || priority || teamId || assigneeId;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Work Items</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Search, filter, assign, and track operational work items across teams.
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
