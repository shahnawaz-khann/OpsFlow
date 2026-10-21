import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  UserCheck,
  Edit3,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  AlertCircle,
  Lock,
  Trash2,
  Send,
  MessageSquare,
} from 'lucide-react';
import { workItemsApi } from '../api/workItems.js';
import { Button } from '../components/common/Button.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { StatusBadge } from '../components/work-items/StatusBadge.jsx';
import { PriorityBadge } from '../components/work-items/PriorityBadge.jsx';
import { ActivityTimeline } from '../components/work-items/ActivityTimeline.jsx';
import { WorkItemFormModal } from '../components/work-items/WorkItemFormModal.jsx';
import { AssignModal } from '../components/work-items/AssignModal.jsx';
import { TransitionModal } from '../components/work-items/TransitionModal.jsx';
import { ConflictModal } from '../components/work-items/ConflictModal.jsx';
import { formatDate } from '../utils/dates.js';
import { useAuth } from '../context/AuthContext.jsx';

export function WorkItemDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityPagination, setActivityPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');

  // Comment & Delete state
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Action loaders & messages
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  const fetchItemAndActivity = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemRes, actRes] = await Promise.all([
        workItemsApi.get(id),
        workItemsApi.getActivity(id, { page: 1, limit: 20 }),
      ]);
      setItem(itemRes.data);
      setActivities(actRes.data || []);
      setActivityPagination(actRes.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load work item details');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreActivities = async () => {
    if (activityPagination.page >= activityPagination.totalPages) return;
    setLoadingActivities(true);
    try {
      const nextPage = activityPagination.page + 1;
      const actRes = await workItemsApi.getActivity(id, { page: nextPage, limit: 20 });
      setActivities((prev) => [...prev, ...actRes.data]);
      setActivityPagination(actRes.pagination);
    } catch (err) {
      console.error('Failed to load more activities', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchItemAndActivity();
  }, [id, user]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    setCommentError('');
    try {
      await workItemsApi.addComment(id, commentText.trim());
      setCommentText('');
      setActionSuccessMsg('Internal note posted to timeline');
      const actRes = await workItemsApi.getActivity(id, { page: 1, limit: 20 });
      setActivities(actRes.data || []);
      setActivityPagination(actRes.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setCommentError(err.message || 'Failed to post note');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete ticket ${item.reference}? This action cannot be undone.`
      )
    ) {
      return;
    }
    setDeleteLoading(true);
    try {
      await workItemsApi.delete(id);
      navigate('/work-items');
    } catch (err) {
      alert(err.message || 'Failed to delete ticket');
      setDeleteLoading(false);
    }
  };

  const handleClaim = async () => {
    setActionLoading(true);
    setActionSuccessMsg(null);
    try {
      const res = await workItemsApi.claim(id);
      setItem((prev) => ({ ...prev, ...res.data }));
      setActionSuccessMsg('Successfully claimed item!');
      // Refresh activities
      const actRes = await workItemsApi.getActivity(id, { page: 1, limit: 20 });
      setActivities(actRes.data);
    } catch (err) {
      if (err.code === 'CONFLICT') {
        setConflictMessage(err.message);
        setConflictModalOpen(true);
      } else {
        alert(err.message || 'Claim failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovalDecision = async (decision) => {
    setActionLoading(true);
    setActionSuccessMsg(null);
    try {
      await workItemsApi.decideApproval(id, { decision });
      setActionSuccessMsg(`Approval request ${decision.toLowerCase()} successfully.`);
      fetchItemAndActivity();
    } catch (err) {
      if (err.code === 'CONFLICT') {
        setConflictMessage(err.message);
        setConflictModalOpen(true);
      } else {
        alert(err.message || 'Approval decision failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading work item details..." size="lg" />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-rose-200 p-8 text-center max-w-md mx-auto mt-8">
        <p className="text-sm font-semibold text-rose-700">Unable to view work item</p>
        <p className="mt-1 text-xs text-slate-500">{error}</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/work-items')}>
            Back to List
          </Button>
          <Button variant="primary" size="sm" onClick={fetchItemAndActivity}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const permissions = item.permissions || {};
  const pendingApproval = item.approvals?.find((a) => a.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Top back navigation & quick breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/work-items"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Work Items
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Concurrency Guard:</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
            v{item.version}
          </span>
        </div>
      </div>

      {/* Success banner */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{actionSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Title bar */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {item.reference}
                </span>
                <StatusBadge status={item.status} size="sm" />
                <PriorityBadge priority={item.priority} size="sm" />
                {item.requiresApproval && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    Approval Required
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 mt-2">{item.title}</h1>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Claim button */}
              {permissions.canClaim && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={UserCheck}
                  loading={actionLoading}
                  onClick={handleClaim}
                >
                  Claim Item
                </Button>
              )}

              {/* Status Transition */}
              {permissions.role !== 'VIEWER' && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => setTransitionModalOpen(true)}
                >
                  Change Status
                </Button>
              )}

              {/* Assign / Reassign */}
              {permissions.canAssign && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={UserCheck}
                  onClick={() => setAssignModalOpen(true)}
                >
                  Assign
                </Button>
              )}

              {/* Edit */}
              {permissions.canEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Edit3}
                  onClick={() => setEditModalOpen(true)}
                >
                  Edit
                </Button>
              )}

              {/* Delete / Cancel Ticket (Leads & Admins) */}
              {(permissions.role === 'ADMIN' || permissions.role === 'LEAD') && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  loading={deleteLoading}
                  onClick={handleDeleteTicket}
                  title="Permanently remove ticket"
                >
                  Delete Ticket
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Pending Approval Callout Banner (if applicable) */}
        {pendingApproval && (
          <div className="p-4 bg-purple-50 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-purple-900">
                  Approval Decision Pending
                </p>
                <p className="text-xs text-purple-700 mt-0.5">
                  Requested by {pendingApproval.requestedBy?.name || 'requester'}. This item cannot be resolved until approved by a Team Lead.
                </p>
              </div>
            </div>

            {permissions.canApprove ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={XCircle}
                  loading={actionLoading}
                  onClick={() => handleApprovalDecision('REJECTED')}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle}
                  loading={actionLoading}
                  onClick={() => handleApprovalDecision('APPROVED')}
                >
                  Approve
                </Button>
              </div>
            ) : (
              <span className="text-xs text-purple-600 font-medium italic">
                Awaiting Lead or Admin sign-off
              </span>
            )}
          </div>
        )}

        {/* Content Body & Metadata Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Main Description */}
          <div className="p-6 lg:col-span-2 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </h4>
              <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-md border border-slate-100">
                {item.description}
              </div>
            </div>
          </div>

          {/* Sidebar Metadata */}
          <div className="p-6 space-y-4 bg-slate-50/30">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Work Item Attributes
              </h4>
              <dl className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <dt className="text-slate-500 font-medium">Team</dt>
                  <dd className="font-semibold text-slate-800">{item.team?.name}</dd>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <dt className="text-slate-500 font-medium">Assignee</dt>
                  <dd className="font-semibold text-slate-800">
                    {item.assignee ? (
                      <span className="text-indigo-600">{item.assignee.name}</span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </dd>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <dt className="text-slate-500 font-medium">Created By</dt>
                  <dd className="font-medium text-slate-700">{item.createdBy?.name || '—'}</dd>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <dt className="text-slate-500 font-medium">Created At</dt>
                  <dd className="text-slate-600 font-mono">{formatDate(item.createdAt)}</dd>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <dt className="text-slate-500 font-medium">Last Updated</dt>
                  <dd className="text-slate-600 font-mono">{formatDate(item.updatedAt)}</dd>
                </div>

                {item.resolvedAt && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100">
                    <dt className="text-emerald-600 font-medium">Resolved At</dt>
                    <dd className="text-emerald-700 font-mono">{formatDate(item.resolvedAt)}</dd>
                  </div>
                )}

                <div className="flex justify-between items-center py-1">
                  <dt className="text-slate-500 font-medium">Your Role in Team</dt>
                  <dd className="font-bold text-slate-800">{permissions.role || 'No membership'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline & Internal Notes */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">Activity & Discussion Timeline</h3>
          </div>
          <span className="text-xs text-slate-400">
            {activities.length} recorded events
          </span>
        </div>

        {/* Operational Comment Input */}
        {permissions.role && permissions.role !== 'VIEWER' && (
          <form onSubmit={handlePostComment} className="mb-6 p-4 bg-slate-50/70 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-800">
                Post Internal Note or Handover Remark
              </span>
            </div>
            {commentError && (
              <div className="mb-2 p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {commentError}
              </div>
            )}
            <textarea
              rows={2}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a note visible to your team members..."
              className="w-full text-xs p-2.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                loading={commentLoading}
                disabled={!commentText.trim()}
                icon={Send}
              >
                Post Note
              </Button>
            </div>
          </form>
        )}

        <ActivityTimeline
          activities={activities}
          loading={loadingActivities}
          hasMore={activityPagination.page < activityPagination.totalPages}
          onLoadMore={loadMoreActivities}
        />
      </div>


      {/* Edit Form Modal */}
      <WorkItemFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        initialData={item}
        onSuccess={(updated) => {
          setItem((prev) => ({ ...prev, ...updated }));
          setActionSuccessMsg('Work item updated successfully');
          fetchItemAndActivity();
        }}
      />

      {/* Assign Modal */}
      <AssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        workItem={item}
        onSuccess={(updated) => {
          setItem((prev) => ({ ...prev, ...updated }));
          setActionSuccessMsg('Assignment updated');
          fetchItemAndActivity();
        }}
      />

      {/* Status Transition Modal */}
      <TransitionModal
        isOpen={transitionModalOpen}
        onClose={() => setTransitionModalOpen(false)}
        workItem={item}
        userRole={permissions.role}
        onSuccess={(updated) => {
          setItem((prev) => ({ ...prev, ...updated }));
          setActionSuccessMsg('Status updated');
          fetchItemAndActivity();
        }}
      />

      {/* 409 Conflict Modal */}
      <ConflictModal
        isOpen={conflictModalOpen}
        message={conflictMessage}
        onClose={() => setConflictModalOpen(false)}
        onRefresh={() => {
          setConflictModalOpen(false);
          fetchItemAndActivity();
        }}
      />
    </div>
  );
}
