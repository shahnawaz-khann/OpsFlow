import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  User,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Settings,
  UserPlus,
} from 'lucide-react';
import { teamsApi } from '../api/teams.js';
import { authApi } from '../api/auth.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { Button } from '../components/common/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modals & State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const showNotification = (msg, type = 'success') => {
    setFeedbackMsg({ msg, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  async function loadTeams() {
    setLoadingTeams(true);
    try {
      const res = await teamsApi.list();
      const loaded = res.teams || [];
      setTeams(loaded);
      if (loaded.length > 0) {
        // Keep current selected if still present, or select first
        setSelectedTeam((curr) => {
          const match = loaded.find((t) => t.id === curr?.id);
          return match || loaded[0];
        });
      }
    } catch (err) {
      console.error('Failed to load teams', err);
    } finally {
      setLoadingTeams(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, [user]);

  async function loadMembers(teamId) {
    if (!teamId) return;
    setLoadingMembers(true);
    try {
      const res = await teamsApi.getMembers(teamId);
      setMembers(res.members || []);
    } catch (err) {
      console.error('Failed to load team members', err);
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    if (selectedTeam) {
      loadMembers(selectedTeam.id);
    }
  }, [selectedTeam?.id]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await authApi.getUsers();
        setAllUsers(res.users || []);
      } catch (err) {
        // Fallback to demo users
        try {
          const demoRes = await authApi.getDemoUsers();
          setAllUsers(demoRes.users || []);
        } catch {
          // ignore
        }
      }
    }
    fetchUsers();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      setCreateError('Team name is required');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await teamsApi.create({
        name: newTeamName.trim(),
        description: newTeamDesc.trim() || undefined,
      });
      setShowCreateModal(false);
      setNewTeamName('');
      setNewTeamDesc('');
      showNotification(`Team "${res.team.name}" created successfully`);
      await loadTeams();
      setSelectedTeam(res.team);
    } catch (err) {
      setCreateError(err.message || 'Failed to create team');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      setAddMemberError('Please select a team member');
      return;
    }
    setAddMemberLoading(true);
    setAddMemberError('');
    try {
      await teamsApi.addMember(selectedTeam.id, {
        userId: selectedUserId,
        role: selectedRole,
      });
      setShowAddMemberModal(false);
      setSelectedUserId('');
      setSelectedRole('MEMBER');
      showNotification('Member added to team');
      loadMembers(selectedTeam.id);
      loadTeams();
    } catch (err) {
      setAddMemberError(err.message || 'Failed to add member');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await teamsApi.updateMemberRole(selectedTeam.id, memberId, newRole);
      showNotification(`Role updated to ${newRole}`);
      loadMembers(selectedTeam.id);
      loadTeams();
    } catch (err) {
      showNotification(err.message || 'Failed to update role', 'error');
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.name} from ${selectedTeam.name}?`)) {
      return;
    }
    try {
      await teamsApi.removeMember(selectedTeam.id, member.id);
      showNotification(`${member.name} removed from team`);
      loadMembers(selectedTeam.id);
      loadTeams();
    } catch (err) {
      showNotification(err.message || 'Failed to remove member', 'error');
    }
  };

  const isTeamAdmin = selectedTeam?.myRole === 'ADMIN';
  const isTeamLeadOrAdmin = isTeamAdmin || selectedTeam?.myRole === 'LEAD';

  // Users available to add to this team
  const availableUsers = allUsers.filter(
    (u) => !members.some((m) => m.id === u.id)
  );

  if (loadingTeams) {
    return <LoadingSpinner text="Loading teams..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between border ${
            feedbackMsg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
            <span>{feedbackMsg.msg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Teams & Directory</h2>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage operational departments, assign granular roles, and configure team member rosters.
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateError('');
            setShowCreateModal(true);
          }}
          icon={Plus}
        >
          New Team
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your Teams ({teams.length})
            </h3>
          </div>
          <div className="space-y-2">
            {teams.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTeam(t)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedTeam?.id === t.id
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/10 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-900">{t.name}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      t.myRole === 'ADMIN'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : t.myRole === 'LEAD'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : t.myRole === 'MEMBER'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {t.myRole}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description || 'No description provided'}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span>{t.workItemsCount} work items</span>
                  <span>•</span>
                  <span>{t.membersCount} members</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Team Details & Members */}
        <div className="md:col-span-2">
          {selectedTeam ? (
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900">{selectedTeam.name}</h3>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        selectedTeam.myRole === 'ADMIN'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : selectedTeam.myRole === 'LEAD'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {selectedTeam.myRole}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{selectedTeam.description || 'Operational Team Workspace'}</p>
                </div>

                {isTeamLeadOrAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={UserPlus}
                    onClick={() => {
                      setAddMemberError('');
                      setSelectedUserId(availableUsers[0]?.id || '');
                      setSelectedRole('MEMBER');
                      setShowAddMemberModal(true);
                    }}
                  >
                    Add Member
                  </Button>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Team Members & Roles ({members.length})
                  </h4>
                  {isTeamAdmin && (
                    <span className="text-[11px] text-slate-400">
                      As Admin, you can promote, demote, or remove members.
                    </span>
                  )}
                </div>

                {loadingMembers ? (
                  <LoadingSpinner text="Fetching roster..." size="sm" />
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                    {members.map((m) => {
                      const isSelf = m.id === user.id;
                      return (
                        <div
                          key={m.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-slate-900">{m.name}</p>
                                {isSelf && (
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono">{m.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {isTeamAdmin ? (
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                className="text-xs font-semibold rounded border border-slate-200 bg-white py-1 px-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="LEAD">LEAD</option>
                                <option value="MEMBER">MEMBER</option>
                                <option value="VIEWER">VIEWER</option>
                              </select>
                            ) : (
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  m.role === 'ADMIN'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : m.role === 'LEAD'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : m.role === 'MEMBER'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {m.role}
                              </span>
                            )}

                            {isTeamAdmin && (
                              <button
                                type="button"
                                title="Remove member"
                                onClick={() => handleRemoveMember(m)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
              Select a team on the left to view member roster.
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">Create Operational Team</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-4 space-y-4">
              {createError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., DevOps & Cloud Infrastructure"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Describe the department's operational mandate..."
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={createLoading}>
                  Create Team
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">
                Add Colleague to {selectedTeam?.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="p-4 space-y-4">
              {addMemberError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addMemberError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select User <span className="text-rose-500">*</span>
                </label>
                {availableUsers.length > 0 ? (
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Choose an employee...</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded">
                    All company employees are already members of this team.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MEMBER">MEMBER (Can claim, update, transition work items)</option>
                  <option value="LEAD">LEAD (Can assign items, approve transitions, reopen tickets)</option>
                  <option value="ADMIN">ADMIN (Full management: team settings & roster)</option>
                  <option value="VIEWER">VIEWER (Read-only observation access)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddMemberModal(false)}
                  disabled={addMemberLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={addMemberLoading}
                  disabled={availableUsers.length === 0}
                >
                  Add Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

