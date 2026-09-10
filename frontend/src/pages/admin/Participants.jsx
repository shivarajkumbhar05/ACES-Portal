import { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { Loader, ErrorBanner, EmptyState, Pagination, StatusBadge } from '../../components/common/UI';

export default function Participants() {
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/public/departments').then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/admin/participants', { params: { department: department || undefined, search: search || undefined, page, limit: 25 } })
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load participants.'))
      .finally(() => setLoading(false));
  }, [department, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = Boolean(department || search);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Participants</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{data.total}</span> registered{' '}
            {data.total === 1 ? 'student' : 'students'}
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────── */}
      <div className="card flex flex-wrap items-center gap-3 p-3 shadow-sm ring-1 ring-slate-900/5">
        {/* Department */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
          </span>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </span>
          <select
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm transition hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Search name or roll number…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setDepartment(''); setSearch(''); setPage(1); }}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* ── Results ────────────────────────────────── */}
      {loading ? (
        <Loader />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No participants match your filters' : 'No participants found'}
        />
      ) : (
        <div className="card overflow-hidden ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Roll Number</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-[11px] font-semibold text-white">
                          {initials(s.name)}
                        </div>
                        <p className="font-medium text-slate-800">{s.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                        {s.rollNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.department}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {s.attempts.length === 0 && (
                          <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 ring-1 ring-inset ring-slate-200">
                            No attempts
                          </span>
                        )}
                        {s.attempts.map((a) => (
                          <span
                            key={a.roundNumber}
                            className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
                          >
                            <span className="font-semibold text-slate-500">R{a.roundNumber}</span>
                            <StatusBadge status={a.status} />
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

/* ── Initials helper ───────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}