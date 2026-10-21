import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBadge } from './StatusBadge.jsx';
import { PriorityBadge } from './PriorityBadge.jsx';
import { formatRelativeTime } from '../../utils/dates.js';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { LoadingSpinner } from '../common/LoadingSpinner.jsx';

export function WorkItemTable({
  items = [],
  loading = false,
  error = null,
  pagination = { page: 1, limit: 10, total: 0, totalPages: 1 },
  onPageChange,
  onRetry,
  onCreateNew,
}) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-xs">
        <LoadingSpinner text="Fetching work items..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-rose-200 p-8 text-center shadow-xs">
        <p className="text-sm font-semibold text-rose-700">Failed to load work items</p>
        <p className="mt-1 text-xs text-slate-500">{error}</p>
        {onRetry && (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="No work items match your criteria"
        description="Try adjusting your filters or search terms, or create a new operational work item."
        actionLabel="Create Work Item"
        onAction={onCreateNew}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ref / ID
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Title & Description
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Assignee
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => navigate(`/work-items/${item.id}`)}
                className="hover:bg-blue-50/40 active:bg-blue-50 transition-colors group cursor-pointer"
              >
                {/* Reference */}
                <td className="px-4 py-3 whitespace-nowrap text-xs font-mono font-bold text-blue-600">
                  <Link
                    to={`/work-items/${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:text-blue-800 hover:underline active:text-blue-900 flex items-center gap-1"
                  >
                    {item.reference}
                  </Link>
                </td>

                {/* Title */}
                <td className="px-4 py-3 max-w-xs md:max-w-md">
                  <Link
                    to={`/work-items/${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block group"
                  >
                    <div className="text-sm font-semibold text-blue-600 group-hover:text-blue-800 hover:underline active:text-blue-900 truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {item.description}
                    </div>
                  </Link>
                </td>

                {/* Team */}
                <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-700">
                  {item.team?.name || '—'}
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={item.status} />
                </td>

                {/* Priority */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <PriorityBadge priority={item.priority} />
                </td>

                {/* Assignee */}
                <td className="px-4 py-3 whitespace-nowrap text-xs">
                  {item.assignee ? (
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-semibold">
                        {item.assignee.name.charAt(0)}
                      </div>
                      <span>{item.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Updated time */}
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                  {formatRelativeTime(item.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing{' '}
          <span className="font-semibold text-slate-700">
            {Math.min(
              (pagination.page - 1) * pagination.limit + 1,
              pagination.total
            )}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-slate-700">
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </span>{' '}
          of <span className="font-semibold text-slate-700">{pagination.total}</span> items
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            icon={ChevronLeft}
          >
            Prev
          </Button>
          <span className="font-medium text-slate-700">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
