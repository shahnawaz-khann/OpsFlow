import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle, XCircle, Clock } from 'lucide-react';
import { workItemsApi } from '../api/workItems.js';
import { Button } from '../components/common/Button.jsx';
import { StatusBadge } from '../components/work-items/StatusBadge.jsx';
import { PriorityBadge } from '../components/work-items/PriorityBadge.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { formatRelativeTime } from '../utils/dates.js';
import { useAuth } from '../context/AuthContext.jsx';

export function ApprovalsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch open items
      const res = await workItemsApi.list({ limit: 50 });
      // Filter items that require approval and are not resolved
      const approvalItems = res.data.filter(
        (i) => i.requiresApproval && i.status !== 'RESOLVED'
      );
      setItems(approvalItems);
    } catch (err) {
      setError(err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Approvals</h2>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Work items requiring Team Lead or Admin verification before resolution.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading approval requests..." />
      ) : error ? (
        <div className="bg-white p-6 rounded-lg border border-rose-200 text-center">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-lg border border-slate-200 shadow-xs">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">All clear!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no work items waiting for approval in your accessible teams.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Link
                    to={`/work-items/${item.id}`}
                    className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {item.reference}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={item.status} size="xs" />
                    <PriorityBadge priority={item.priority} size="xs" />
                  </div>
                </div>

                <Link
                  to={`/work-items/${item.id}`}
                  className="block mt-2 font-semibold text-blue-600 hover:text-blue-800 hover:underline active:text-blue-900 text-sm"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>{item.team?.name}</span>
                <Link
                  to={`/work-items/${item.id}`}
                  className="text-blue-600 font-semibold hover:text-blue-800 hover:underline"
                >
                  Review Decision &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
