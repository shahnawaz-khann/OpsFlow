import React, { useState, useEffect } from 'react';
import { X, UserCheck } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { Select } from '../common/Select.jsx';
import { Input } from '../common/Input.jsx';
import { teamsApi } from '../../api/teams.js';
import { workItemsApi } from '../../api/workItems.js';

export function AssignModal({ isOpen, onClose, onSuccess, workItem }) {
  const [assigneeId, setAssigneeId] = useState('');
  const [note, setNote] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !workItem) return;

    setAssigneeId(workItem.assigneeId || '');
    setNote('');
    setError(null);

    async function loadMembers() {
      setLoading(true);
      try {
        const res = await teamsApi.getMembers(workItem.teamId);
        setMembers(res.members || []);
      } catch (err) {
        console.error('Failed to load team members', err);
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, [isOpen, workItem]);

  if (!isOpen || !workItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await workItemsApi.assign(workItem.id, {
        assigneeId: assigneeId || null,
        version: workItem.version,
        note: note.trim() || undefined,
      });
      onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">
            Assign Work Item: {workItem.reference}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Select
            label="Assignee"
            name="assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            placeholder="Unassigned"
            options={[
              { value: '', label: 'Unassigned (No Owner)' },
              ...members.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.role})`,
              })),
            ]}
            helperText={loading ? 'Fetching team members...' : ''}
          />

          <Input
            label="Assignment Note (Optional)"
            name="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Taking lead on root-cause analysis"
          />

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" loading={submitting} icon={UserCheck}>
              Save Assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
