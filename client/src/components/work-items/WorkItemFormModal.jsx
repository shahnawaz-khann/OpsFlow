import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Button } from '../common/Button.jsx';
import { Input } from '../common/Input.jsx';
import { Select } from '../common/Select.jsx';
import { teamsApi } from '../../api/teams.js';
import { workItemsApi } from '../../api/workItems.js';
import { useAuth } from '../../context/AuthContext.jsx';

export function WorkItemFormModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const { user } = useAuth();
  const isEditing = !!initialData;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);

  // Load available teams for current user
  useEffect(() => {
    if (!isOpen) return;

    async function loadTeams() {
      try {
        const res = await teamsApi.list();
        // Filter teams where user is not VIEWER (Viewer cannot create)
        const creatableTeams = isEditing
          ? res.teams
          : res.teams.filter((t) => t.myRole !== 'VIEWER');
        setTeams(creatableTeams);

        if (!isEditing && creatableTeams.length > 0 && !teamId) {
          setTeamId(creatableTeams[0].id);
        }
      } catch (err) {
        console.error('Failed to load teams', err);
      }
    }

    loadTeams();
  }, [isOpen, isEditing]);

  // Sync initialData when editing
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setTeamId(initialData.teamId || '');
      setPriority(initialData.priority || 'MEDIUM');
      setAssigneeId(initialData.assigneeId || '');
      setRequiresApproval(initialData.requiresApproval || false);
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setAssigneeId('');
      setRequiresApproval(false);
    }
    setErrors({});
    setApiError(null);
  }, [initialData, isOpen]);

  // Load team members when teamId changes
  useEffect(() => {
    if (!teamId) {
      setTeamMembers([]);
      return;
    }

    async function loadMembers() {
      setLoadingMembers(true);
      try {
        const res = await teamsApi.getMembers(teamId);
        setTeamMembers(res.members || []);
      } catch (err) {
        console.error('Failed to load team members', err);
      } finally {
        setLoadingMembers(false);
      }
    }

    loadMembers();
  }, [teamId]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!title.trim() || title.length < 5) {
      errs.title = 'Title must be between 5 and 120 characters';
    } else if (title.length > 120) {
      errs.title = 'Title cannot exceed 120 characters';
    }

    if (!description.trim()) {
      errs.description = 'Description is required';
    } else if (description.length > 5000) {
      errs.description = 'Description cannot exceed 5000 characters';
    }

    if (!teamId) {
      errs.teamId = 'Please select an accessible team';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      if (isEditing) {
        // Edit payload with optimistic concurrency version check
        const payload = {
          title: title.trim(),
          description: description.trim(),
          priority,
          version: initialData.version,
        };
        const res = await workItemsApi.update(initialData.id, payload);
        onSuccess(res.data);
      } else {
        // Create payload
        const payload = {
          title: title.trim(),
          description: description.trim(),
          teamId,
          priority,
          assigneeId: assigneeId || null,
          requiresApproval,
        };
        const res = await workItemsApi.create(payload);
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      if (err.code === 'CONFLICT') {
        setApiError(
          'Conflict: This item was updated by someone else. Please refresh to see latest changes.'
        );
      } else if (err.details && Array.isArray(err.details)) {
        const fieldErrors = {};
        err.details.forEach((d) => {
          fieldErrors[d.field] = d.message;
        });
        setErrors(fieldErrors);
        setApiError(err.message);
      } else {
        setApiError(err.message || 'Operation failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-xl w-full p-6 shadow-xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {isEditing ? `Edit Work Item: ${initialData.reference}` : 'Create New Work Item'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? 'Update fields. Concurrency version will be verified.'
                : 'Define operational request and target team.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global error alert */}
        {apiError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-medium text-rose-700">
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            label="Title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Investigate delayed customer payment webhook"
            required
            error={errors.title}
          />

          <Input
            label="Description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide relevant operational context, logs, or reproduction steps..."
            required
            error={errors.description}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Team"
              name="teamId"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={isEditing} // teamId is immutable after creation per spec
              helperText={isEditing ? 'Team cannot be changed after creation' : ''}
              options={teams.map((t) => ({
                value: t.id,
                label: `${t.name} (${t.myRole})`,
              }))}
              required
              error={errors.teamId}
            />

            <Select
              label="Priority"
              name="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
              required
            />
          </div>

          {!isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Assignee (Optional)"
                name="assigneeId"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                placeholder="Unassigned (Can be claimed later)"
                options={teamMembers.map((m) => ({
                  value: m.id,
                  label: `${m.name} (${m.role})`,
                }))}
                helperText={loadingMembers ? 'Loading team members...' : ''}
              />

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Requires Team Lead Approval to Resolve
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              icon={Check}
            >
              {isEditing ? 'Save Changes' : 'Create Work Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
