import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const ADMIN_NAV_ITEMS = [
  { to: '/admin/control-room', label: 'Live Control Room', icon: 'grid' },
  { to: '/admin', label: 'MESA Dashboard', end: true, icon: 'grid' },
  { to: '/admin/questions', label: 'Question Bank', icon: 'list' },
  { to: '/admin/upload', label: 'Bulk Upload', icon: 'upload' },
  { to: '/admin/rounds', label: 'Round Settings', icon: 'settings' },
  { to: '/admin/competitions', label: 'Competitions', icon: 'grid' },
  { to: '/admin/schedules', label: 'Schedules', icon: 'calendar' },
  { to: '/admin/qualification', label: 'Qualification', icon: 'filter' },
  { to: '/admin/participants', label: 'Participants', icon: 'users' },
  { to: '/admin/staff', label: 'Staff Accounts', icon: 'users' },
  { to: '/admin/judging', label: 'Advanced Judging', icon: 'chart' },
  { to: '/admin/judging-review', label: 'Judging Review', icon: 'chart' },
  { to: '/admin/results', label: 'Results', icon: 'chart' },
  { to: '/admin/publication', label: 'Publish Results', icon: 'chart' },
  { to: '/admin/reports', label: 'Reports', icon: 'doc' },
  { to: '/admin/attendance-allocation', label: 'Attendance Allocation', icon: 'users' },
  { to: '/admin/profile', label: 'Profile', icon: 'settings' }
];

const STAFF_NAV_ITEMS = {
  judge: [{ to: '/admin/judging', label: 'Judging Portal', icon: 'chart' }, { to: '/admin/profile', label: 'Profile', icon: 'settings' }],
  volunteer: [{ to: '/admin/attendance', label: 'Attendance', icon: 'users' }, { to: '/admin/profile', label: 'Profile', icon: 'settings' }]
};

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = STAFF_NAV_ITEMS[admin?.role] || ADMIN_NAV_ITEMS;

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-100/70">
      {/* ── Desktop sidebar ───────────────────────────── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-sm font-bold text-white shadow-sm">
            M
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              MESA
            </p>
            <p className="text-sm font-bold text-brand-700">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-900/5">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-xs font-semibold text-white">
              {admin?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-700">{admin?.name}</p>
              <p className="truncate text-[11px] text-slate-400">
                @{admin?.username} · {admin?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary mt-3 w-full">
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main column ───────────────────────────────── */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-xs font-bold text-white">
              M
            </div>
            <p className="text-base font-bold text-brand-700">MESA Admin</p>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 18M6 18L18 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </header>

        {/* Mobile collapsible nav (drawer-style) */}
        {mobileOpen && (
          <div className="border-b border-slate-200 bg-white px-3 py-3 md:hidden">
            <nav className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`
                  }
                >
                  <NavIcon name={item.icon} className="h-4 w-4 flex-none" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-900/5">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-700">{admin?.name}</p>
                <p className="truncate text-[11px] text-slate-400">@{admin?.username}</p>
              </div>
              <button onClick={handleLogout} className="btn-secondary text-xs">
                Log out
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Sidebar link with icon + active accent bar ─────── */
function SidebarLink({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <NavIcon
            name={item.icon}
            className={`h-4 w-4 flex-none transition-colors ${
              isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/* ── Tiny inline icon set (no extra deps) ───────────── */
function NavIcon({ name, className = 'h-4 w-4' }) {
  const common = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 2
  };
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    list: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    ),
    upload: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
      />
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        />
      </>
    ),
    chart: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l3-3 3 3 5-5" />
    ),
    filter: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 20a6.5 6.5 0 0113 0M16 8.5a3 3 0 100 6M17 20a6.5 6.5 0 00-3-5.5" />
      </>
    ),
    doc: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h4"
      />
    )
  };
  return <svg {...common}>{paths[name] ?? paths.grid}</svg>;
}