import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Shield, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function Topbar({ onToggleMobileMenu }) {
  const { user, demoUsers, switchUser, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 md:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & workspace brand */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link
          to="/"
          className="flex items-center gap-2.5 group hover:opacity-90 transition-opacity cursor-pointer"
          title="Return to OpsFlow Home"
        >
          <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
            OpsFlow Workspace
          </span>
          <span className="hidden xl:inline-block text-xs text-slate-400 font-normal border-l border-slate-200 pl-2.5 whitespace-nowrap">
            Internal Operations & Work Management
          </span>
        </Link>
      </div>

      {/* Center: Global Quick Search / Shortcut */}
      <div className="hidden lg:flex items-center flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search work items, teams, audits..."
            onClick={() => navigate('/work-items')}
            className="w-full pl-9 pr-12 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/90 focus:bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            readOnly
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs font-mono pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick Demo Persona Switcher & User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Fast Persona Switcher (Clean SaaS design) */}
        {demoUsers?.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 transition-colors">
            <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
              Persona:
            </span>
            <select
              value={user?.id || ''}
              onChange={(e) => switchUser(e.target.value)}
              className="bg-transparent font-medium text-slate-800 text-xs focus:outline-none cursor-pointer max-w-[185px] truncate"
              title="Switch demo persona to test RBAC roles"
            >
              {demoUsers.map((u) => {
                let roleBadge = 'Viewer';
                if (u.memberships?.some((m) => m.role === 'ADMIN')) roleBadge = 'Admin';
                else if (u.memberships?.some((m) => m.role === 'LEAD')) roleBadge = 'Lead';
                else if (u.memberships?.some((m) => m.role === 'MEMBER')) roleBadge = 'Member';

                return (
                  <option key={u.id} value={u.id} className="text-slate-900 bg-white">
                    {u.name} ({roleBadge})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Current user & logout */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs shadow-xs shrink-0">
              {user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

