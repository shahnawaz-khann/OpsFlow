import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  UserCheck,
  ShieldAlert,
  Users,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function Sidebar({ mobileOpen, onCloseMobile }) {
  const { user } = useAuth();

  const navigation = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Work Items', href: '/work-items', icon: CheckSquare },
    { name: 'My Work', href: '/my-work', icon: UserCheck },
    { name: 'Approvals', href: '/approvals', icon: ShieldAlert },
    { name: 'Teams', href: '/teams', icon: Users },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand logo & title - clickable to return to Home */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
        <Link
          to="/"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-90 cursor-pointer"
          title="Return to OpsFlow Home"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
              OpsFlow
            </span>
            <span className="ml-1 text-[10px] font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded">
              Internal
            </span>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Management
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User memberships footer */}
      {user && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            My Team Roles
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {user.memberships?.map((m) => (
              <div
                key={m.teamId}
                className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-200/60"
              >
                <span className="font-medium text-slate-700 truncate max-w-[120px]">
                  {m.teamName}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    m.role === 'ADMIN'
                      ? 'bg-rose-50 text-rose-700'
                      : m.role === 'LEAD'
                      ? 'bg-purple-50 text-purple-700'
                      : m.role === 'MEMBER'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
