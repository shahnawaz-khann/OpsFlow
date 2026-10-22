import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, User, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function Topbar({ onToggleMobileMenu }) {
  const { user, demoUsers, switchUser, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link
          to="/"
          className="hover:opacity-85 transition-opacity group cursor-pointer"
          title="Return to OpsFlow Home"
        >
          <h1 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
            OpsFlow Workspace
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            Internal Operations & Work Management
          </p>
        </Link>
      </div>


      {/* Right: Quick Demo Persona Switcher & User Profile */}
      <div className="flex items-center gap-4">
        {/* Fast Role Switcher */}
        {demoUsers?.length > 0 && (
          <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200/80 rounded-md px-2.5 py-1 text-xs">
            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="font-semibold text-indigo-900 hidden sm:inline">Role Switcher:</span>
            <select
              value={user?.id || ''}
              onChange={(e) => switchUser(e.target.value)}
              className="bg-transparent font-medium text-indigo-900 focus:outline-none cursor-pointer"
            >
              {demoUsers.map((u) => {
                // Short summary of roles
                const rolesSummary = u.memberships
                  ?.map((m) => `${m.teamName}: ${m.role}`)
                  .join(' | ');
                return (
                  <option key={u.id} value={u.id} className="text-slate-900 bg-white">
                    {u.name} ({rolesSummary || 'User'})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Current user & logout */}
        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-900">{user.name}</div>
              <div className="text-[11px] text-slate-500">{user.email}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
