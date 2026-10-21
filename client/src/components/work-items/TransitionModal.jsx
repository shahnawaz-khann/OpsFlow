import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { Select } from '../common/Select.jsx';
import { Input } from '../common/Input.jsx';
import { workItemsApi } from '../../api/workItems.js';
import { StatusBadge } from './StatusBadge.jsx';

const TRANSITION_MAP = {
  OPEN: [
    { value: 'IN_PROGRESS', label: 'In Progress (Start work)' },
    { value: 'RESOLVED', label: 'Resolved (Complete item)' },
  ],
  IN_PROGRESS: [
    { value: 'BLOCKED', label: 'Blocked (Impediment encountered)' },
    { value: 'RESOLVED', label: 'Resolved (Complete item)' },
  ],
  BLOCKED: [
    { value: 'IN_PROGRESS', label: 'In Progress (Unblock and resume)' },
  ],
  RESOLVED: [
    { value: 'OPEN', label: 'Open (Reopen item - Lead/Admin only)' },
  ],
};

export function TransitionModal({ isOpen, onClose, onSuccess, workItem, userRole }) {
  if (!isOpen || !workItem) return null;

  const currentStatus = workItem.status;
  const isLeadOrAdmin = userRole === 'LEAD' || userRole === 'ADMIN';

  // Filter allowed options according to workflow rules and roles
  let allowedOptions = TRANSITION_MAP[currentStatus] || [];
  if (currentStatus === 'RESOLVED' && !isLeadOrAdmin) {
    allowedOptions = []; // Viewers and Members cannot reopen
  }

  const [selectedStatus, setSelectedStatus] = useState(
    allowedOptions.length > 0 ? allowedOptions[0].value : ''
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await workItemsApi.transition(workItem.id, {
        status: selectedStatus,
        version: workItem.version,
        note: note.trim() || undefined,
      });
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Status transition rejected');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Change Status</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-md">
          <span className="text-xs text-slate-500 font-medium">Current Status:</span>
          <StatusBadge status={currentStatus} />
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-medium text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {allowedOptions.length === 0 ? (
          <div className="mt-4 p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-md">
            No permitted transitions from {currentStatus} for your role ({userRole}).
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <Select
              label="New Status"
              name="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={allowedOptions}
              required
            />

            <Input
              label="Reason or Transition Note (Optional)"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Investigation completed, all tests passing"
            />

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
              <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                icon={RefreshCw}
              >
                Apply Transition
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
