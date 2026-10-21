import React from 'react';
import { ArrowDown, ArrowRight, ArrowUp, AlertCircle } from 'lucide-react';

const PRIORITY_CONFIG = {
  LOW: {
    label: 'Low',
    icon: ArrowDown,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    iconClass: 'text-slate-500',
  },
  MEDIUM: {
    label: 'Medium',
    icon: ArrowRight,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconClass: 'text-blue-500',
  },
  HIGH: {
    label: 'High',
    icon: ArrowUp,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    iconClass: 'text-amber-600',
  },
  URGENT: {
    label: 'Urgent',
    icon: AlertCircle,
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    iconClass: 'text-rose-600',
  },
};

export function PriorityBadge({ priority, size = 'sm', className = '' }) {
  const config = PRIORITY_CONFIG[priority] || {
    label: priority || 'Medium',
    icon: ArrowRight,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    iconClass: 'text-slate-400',
  };

  const Icon = config.icon;
  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${sizeClasses} ${config.badgeClass} ${className}`}
    >
      <Icon className={`w-3 h-3 ${config.iconClass}`} />
      <span>{config.label}</span>
    </span>
  );
}
