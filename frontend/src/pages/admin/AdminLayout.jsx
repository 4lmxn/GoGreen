import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Leaf,
  LayoutDashboard,
  Users,
  Car,
  Map,
  BarChart2,
  FlaskConical,
  Route,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Driver Approvals', to: '/admin/approvals', icon: Users },
  { label: 'Vehicles', to: '/admin/vehicles', icon: Car },
  { label: 'Live Fleet Map', to: '/admin/fleet-map', icon: Map },
  { label: 'Round planner', to: '/admin/rounds', icon: Route },
  { label: 'Sustainability', to: '/admin/sustainability', icon: Leaf },
  { label: 'Evidence & Feedback', to: '/admin/learning', icon: BarChart2 },
  { label: 'Reports', to: '/admin/reports', icon: BarChart2 },
  { label: 'Model lab', to: '/admin/ai', icon: FlaskConical },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7f1] font-sans">
      {/* Collapsible Admin Sidebar */}
      <aside
        className={`relative flex flex-col bg-[#143d31] text-white transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-16 md:w-60'
        } min-h-screen flex-shrink-0 z-20`}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10 overflow-hidden">
          <Leaf className="text-eco w-6 h-6 flex-shrink-0" />
          {!collapsed && (
            <span className="hidden md:inline text-lg font-extrabold tracking-tight truncate">
              GoGreen
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
          {NAV.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              title={label}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0b0f19]/20 text-white shadow-sm font-semibold'
                    : 'text-white/70 hover:bg-[#0b0f19]/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="hidden md:inline truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Footer & Logout */}
        <div className="border-t border-white/10 p-3">
          {!collapsed && (
            <div className="hidden md:block text-xs text-white/60 px-2 mb-2 truncate">
              {user?.name || user?.email || 'System Admin'}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-white/70 hover:bg-[#0b0f19]/10 hover:text-white transition-colors"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="hidden md:inline truncate">Logout</span>}
          </button>
        </div>

        {/* Collapse Toggle Floating Button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute bottom-20 -right-3 w-6 h-6 bg-[#143d31] border border-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors shadow-md z-30"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto relative min-w-0">
        {user?.demo_mode && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="status">Demonstration workspace · Sample history is labeled and stored in a separate database. New journeys use the connected workflow.</div>}
        <Outlet />
      </main>
    </div>
  );
}
