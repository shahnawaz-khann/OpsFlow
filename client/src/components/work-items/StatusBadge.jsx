import React from 'react';

const STATUS_CONFIG = {
  OPEN: {
    label: 'Open',
    dotColor: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    dotColor: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  BLOCKED: {
    label: 'Blocked',
    dotColor: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  RESOLVED: {
    label: 'Resolved',
    dotColor: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export function StatusBadge({ status, size = 'sm', className = '' }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    dotColor: 'bg-slate-400',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      <span>{config.label}</span>
    </span>
  );
}
