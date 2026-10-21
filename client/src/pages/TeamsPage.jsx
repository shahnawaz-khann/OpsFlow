import React, { useState, useEffect } from 'react';
import { Users, Shield, User, Folder } from 'lucide-react';
import { teamsApi } from '../api/teams.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    async function loadTeams() {
      setLoadingTeams(true);
      try {
        const res = await teamsApi.list();
        setTeams(res.teams || []);
        if (res.teams?.length > 0) {
          setSelectedTeam(res.teams[0]);
        }
      } catch (err) {
        console.error('Failed to load teams', err);
      } finally {
        setLoadingTeams(false);
      }
    }
    loadTeams();
  }, [user]);

  useEffect(() => {
    if (!selectedTeam) return;

    async function loadMembers() {
      setLoadingMembers(true);
      try {
        const res = await teamsApi.getMembers(selectedTeam.id);
        setMembers(res.members || []);
      } catch (err) {
        console.error('Failed to load team members', err);
      } finally {
        setLoadingMembers(false);
      }
    }
    loadMembers();
  }, [selectedTeam]);

  if (loadingTeams) {
    return <LoadingSpinner text="Loading teams..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Teams & Directory</h2>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">
          Review your accessible operational teams, assigned roles, and member rosters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Your Teams ({teams.length})
          </h3>
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
                        ? 'bg-rose-50 text-rose-700'
                        : t.myRole === 'LEAD'
                        ? 'bg-purple-50 text-purple-700'
                        : t.myRole === 'MEMBER'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.myRole}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
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
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">{selectedTeam.name}</h3>
                  <span className="text-xs text-slate-500">
                    Your role: <strong className="text-indigo-600 font-bold">{selectedTeam.myRole}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{selectedTeam.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Team Members & Roles
                </h4>
                {loadingMembers ? (
                  <LoadingSpinner text="Fetching members..." size="sm" />
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {m.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{m.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{m.email}</p>
                          </div>
                        </div>

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
                      </div>
                    ))}
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
    </div>
  );
}
