import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Users, Database, LogOut, Building2, Menu, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agent-intake', icon: ClipboardList, label: 'Agent Intake' },
  { to: '/agent-tracking', icon: Users, label: 'Form Tracking' },
  { to: '/agent-database', icon: Database, label: 'Agent Database' },
  { to: '/crm-team', icon: Building2, label: 'CRM Team' },
];

const breadcrumbMap: Record<string, string> = {
  '/': 'Dashboard',
  '/agent-intake': 'Agent Intake',
  '/agent-tracking': 'Form Tracking',
  '/agent-database': 'Agent Database',
  '/crm-team': 'CRM Team',
};

export const Layout: React.FC = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLabel = breadcrumbMap[location.pathname] || 'Dashboard';

  return (
    <div className="flex h-screen bg-steel-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-navy-900 transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-60'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`flex items-center h-16 px-4 border-b border-navy-700 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white truncate">FYM Financial</h1>
              <p className="text-[10px] text-gold-400 truncate tracking-wide">where transparency & opportunity meet</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-steel-400 hover:text-white hover:bg-navy-700 transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-navy-700 text-white border-l-2 border-gold-400 ml-0 pl-[10px]'
                    : 'text-steel-300 hover:bg-navy-800 hover:text-white'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-navy-700">
          <button
            onClick={logout}
            className={`flex items-center gap-3 w-full px-3 py-2.5 text-steel-400 hover:text-white hover:bg-navy-800 rounded-lg transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-steel-200">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-steel-600 hover:text-navy-600 hover:bg-steel-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-steel-400">FYM</span>
              <span className="text-steel-300">/</span>
              <span className="font-medium text-navy-700">{currentLabel}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
