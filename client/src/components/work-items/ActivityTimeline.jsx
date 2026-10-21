import React from 'react';
import {
  Clock,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { formatDate, formatRelativeTime } from '../../utils/dates.js';

const ACTION_ICONS = {
  CREATED: FileText,
  CLAIMED: UserCheck,
  ASSIGNED: UserCheck,
  STATUS_CHANGED: RefreshCw,
  PRIORITY_CHANGED: AlertTriangle,
  UPDATED: FileText,
  APPROVAL_DECIDED: ShieldCheck,
  REOPENED: RefreshCw,
};

const ACTION_COLORS = {
  CREATED: 'bg-blue-100 text-blue-600 border-blue-200',
  CLAIMED: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  ASSIGNED: 'bg-purple-100 text-purple-600 border-purple-200',
  STATUS_CHANGED: 'bg-amber-100 text-amber-600 border-amber-200',
  PRIORITY_CHANGED: 'bg-orange-100 text-orange-600 border-orange-200',
  UPDATED: 'bg-slate-100 text-slate-600 border-slate-200',
  APPROVAL_DECIDED: 'bg-indigo-100 text-indigo-600 border-indigo-200',
  REOPENED: 'bg-rose-100 text-rose-600 border-rose-200',
};

export function ActivityTimeline({ activities = [], loading = false, hasMore = false, onLoadMore }) {
  if (loading && activities.length === 0) {
    return <div className="py-6 text-center text-xs text-slate-400">Loading activity timeline...</div>;
  }

  if (activities.length === 0) {
    return <div className="py-6 text-center text-xs text-slate-400">No activity recorded yet.</div>;
  }

  return (
    <div className="flow-root">
      <ul className="-mb-6">
        {activities.map((activity, idx) => {
          const isComment = activity.field === 'comment';
          const Icon = isComment ? MessageSquare : (ACTION_ICONS[activity.action] || Clock);
          const colorClass = isComment
            ? 'bg-indigo-100 text-indigo-600 border-indigo-200'
            : (ACTION_COLORS[activity.action] || 'bg-slate-100 text-slate-600');
          const isLast = idx === activities.length - 1;

          return (
            <li key={activity.id || idx}>
              <div className="relative pb-6">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  {/* Icon badge */}
                  <div>
                    <div
                      className={`h-8 w-8 rounded-full border flex items-center justify-center ring-4 ring-white ${colorClass}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-slate-800">
                          {activity.actor?.name || 'System'}
                        </p>
                        {isComment && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Team Note
                          </span>
                        )}
                      </div>
                      <time
                        title={formatDate(activity.createdAt)}
                        className="text-xs text-slate-400 font-mono"
                      >
                        {formatRelativeTime(activity.createdAt)}
                      </time>
                    </div>

                    {/* Change details / diff */}
                    {activity.field && activity.field !== 'comment' && (activity.oldValue || activity.newValue) ? (
                      <div className="mt-1 text-xs text-slate-600 flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-slate-700 capitalize">{activity.field}:</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 line-through">
                          {activity.oldValue || 'None'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-medium">
                          {activity.newValue}
                        </span>
                      </div>
                    ) : null}

                    {/* Note / Comment Body */}
                    {activity.note && (
                      <div
                        className={`mt-1.5 text-xs rounded-md p-3 ${
                          isComment
                            ? 'bg-indigo-50/40 border border-indigo-100 text-slate-800 font-normal leading-relaxed'
                            : 'bg-slate-50 border border-slate-100 text-slate-600'
                        }`}
                      >
                        {activity.note}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>


      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            {loading ? 'Loading older entries...' : 'Load older activity'}
          </button>
        </div>
      )}
    </div>
  );
}
