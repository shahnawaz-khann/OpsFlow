import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen,
  UserCheck,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard.js';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { StatusBadge } from '../components/work-items/StatusBadge.jsx';
import { PriorityBadge } from '../components/work-items/PriorityBadge.jsx';
import { WorkItemFormModal } from '../components/work-items/WorkItemFormModal.jsx';
import { formatRelativeTime } from '../utils/dates.js';
import { useAuth } from '../context/AuthContext.jsx';

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getSummary();
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [user]);

  if (loading) {
    return <LoadingSpinner text="Calculating operational dashboard..." size="lg" />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-rose-200 p-8 text-center max-w-md mx-auto mt-8">
        <p className="text-sm font-semibold text-rose-700">Dashboard Unavailable</p>
        <p className="mt-1 text-xs text-slate-500">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchSummary} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  const { metrics, needsAttention = [], recentlyUpdated = [] } = summary || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">Here's what needs attention today.</p>
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

      {/* 4 Summary Metric Cards (Backed by real database counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Work */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Open Work
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.openWork ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across your permitted teams</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <FolderOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Assigned to Me */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned to Me
            </p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {metrics?.assignedToMe ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active items in your queue</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* High / Urgent Priority */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              High / Urgent Priority
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">
              {metrics?.highPriority ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Unresolved critical items</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approval
            </p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {metrics?.pendingApprovals ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting lead sign-off</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Needs Attention & Recently Updated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs Attention Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-semibold text-slate-900">Needs Attention</h3>
            </div>
            <Link
              to="/work-items?priority=URGENT"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View urgent <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 divide-y divide-slate-100 flex-1">
            {needsAttention.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No urgent or blocked items requiring immediate attention.
              </p>
            ) : (
              needsAttention.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/work-items/${item.id}`}
                        className="text-xs font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {item.reference}
                      </Link>
                      <StatusBadge status={item.status} size="xs" />
                      <PriorityBadge priority={item.priority} size="xs" />
                    </div>
                    <Link
                      to={`/work-items/${item.id}`}
                      className="mt-1 block text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline active:text-blue-900 truncate"
                    >
                      {item.title}
                    </Link>
                    <div className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                      <span>{item.team?.name}</span>
                      <span>•</span>
                      <span>Assignee: {item.assignee?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <Link
                    to={`/work-items/${item.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline shrink-0 pt-1"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recently Updated Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900">Recently Updated</h3>
            </div>
            <Link
              to="/work-items"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              All work items <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 divide-y divide-slate-100 flex-1">
            {recentlyUpdated.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent activity.</p>
            ) : (
              recentlyUpdated.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/work-items/${item.id}`}
                        className="text-xs font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {item.reference}
                      </Link>
                      <StatusBadge status={item.status} size="xs" />
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatRelativeTime(item.updatedAt)}
                      </span>
                    </div>
                    <Link
                      to={`/work-items/${item.id}`}
                      className="mt-1 block text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline active:text-blue-900 truncate"
                    >
                      {item.title}
                    </Link>
                    <div className="mt-1 text-xs text-slate-400">
                      {item.team?.name} • {item.assignee?.name || 'Unassigned'}
                    </div>
                  </div>
                  <Link
                    to={`/work-items/${item.id}`}
                    className="text-xs text-slate-400 hover:text-slate-600 shrink-0 pt-1"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <WorkItemFormModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => fetchSummary()}
      />
    </div>
  );
}
