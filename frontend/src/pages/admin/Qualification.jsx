import { useEffect, useState, useCallback } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { Loader, ErrorBanner, EmptyState } from '../../components/common/UI';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { formatSeconds } from '../../utils/format';

export default function Qualification() {
  const { isSuperAdmin } = useAdminAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyDept, setBusyDept] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/admin/qualification/round2')
      .then((res) => setGroups(res.data))
      .catch(() => setError('Could not load qualification data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function finalize(departmentId) {
    if (!window.confirm(departmentId ? 'Finalize Round 2 qualifiers for this department?' : 'Finalize Round 2 qualifiers for ALL departments?')) return;
    setBusyDept(departmentId || 'all');
    setError('');
    try {
      await api.post('/admin/qualification/round2/finalize', { departmentId: departmentId || undefined });
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not finalize qualification.'));
    } finally {
      setBusyDept(null);
    }
  }

  async function unlock(departmentId) {
    if (!window.confirm('Unlock this finalized department so it can be re-resolved? (Super admin action)')) return;
    setBusyDept(departmentId || 'all');
    setError('');
    try {
      await api.post('/admin/qualification/round2/unlock', { departmentId: departmentId || undefined });
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not unlock qualification.'));
    } finally {
      setBusyDept(null);
    }
  }

  const finalizedCount = groups.filter((g) => g.finalized).length;
  const pendingTieBreaks = groups.reduce(
    (n, g) => n + (g.finalized ? 0 : g.qualifiers.filter((q) => q.tieBreakReason).length),
    0
  );

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Round 2 Qualification</h1>
          <p className="mt-1 text-sm text-slate-500">
            Top 5 per department from Round 1 results, with tie-break resolution.
          </p>
        </div>

        <button
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
          disabled={busyDept === 'all'}
          onClick={() => finalize(null)}
        >
          {busyDept === 'all' ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Finalizing…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Finalize All Departments
            </>
          )}
        </button>
      </div>

      {/* ── Summary strip ──────────────────────────── */}
      {!loading && groups.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryStat label="Departments" value={groups.length} />
          <SummaryStat
            label="Finalized"
            value={`${finalizedCount}/${groups.length}`}
            tone={finalizedCount === groups.length ? 'success' : 'default'}
          />
          <SummaryStat
            label="Pending tie-breaks"
            value={pendingTieBreaks}
            tone={pendingTieBreaks > 0 ? 'warn' : 'default'}
          />
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* ── Content ────────────────────────────────── */}
      {loading ? (
        <Loader />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No Round 1 results yet"
          subtitle="Qualification can be computed once students have completed Round 1."
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <QualificationCard
              key={g.department.id}
              group={g}
              busy={busyDept === g.department.id}
              isSuperAdmin={isSuperAdmin}
              onFinalize={() => finalize(g.department.id)}
              onUnlock={() => unlock(g.department.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QualificationCard({ group, busy, isSuperAdmin, onFinalize, onUnlock }) {
  const hasTieBreaks = group.qualifiers.some((q) => q.tieBreakReason);
  const qualifiedCount = group.qualifiers.filter((q) => q.qualified).length;

  return (
    <div className="card overflow-hidden ring-1 ring-slate-900/5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-xs font-semibold text-white shadow-sm shadow-brand-500/20">
            {initials(group.department.name)}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {group.department.name}
            </h2>
            <p className="text-xs text-slate-400">
              {qualifiedCount} of {group.qualifiers.length} qualified
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill finalized={group.finalized} />

          {!group.finalized && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={onFinalize}
            >
              {busy ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Finalizing…
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Finalize
                </>
              )}
            </button>
          )}

          {group.finalized && isSuperAdmin && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={onUnlock}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 017.46-2" />
              </svg>
              Unlock
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Rank</th>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Score</th>
              <th className="px-4 py-2.5 font-medium">Time</th>
              <th className="px-4 py-2.5 font-medium">Qualified</th>
              <th className="px-4 py-2.5 font-medium">Tie-break</th>
            </tr>
          </thead>
          <tbody>
            {group.qualifiers.map((q) => (
              <tr
                key={q.rollNumber}
                className={`border-t border-slate-100 transition-colors hover:bg-slate-50/70 ${
                  q.tieBreakReason ? 'bg-amber-50/30' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={q.rank} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{q.studentName}</p>
                  <p className="font-mono text-xs text-slate-400">{q.rollNumber}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-brand-700">{q.score}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {formatSeconds(q.timeTakenSeconds)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                      q.qualified
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                    }`}
                  >
                    {q.qualified ? (
                      <>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Yes
                      </>
                    ) : (
                      'No'
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {q.tieBreakReason ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      {q.tieBreakReason}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tie-break notice */}
      {hasTieBreaks && !group.finalized && (
        <div className="flex items-start gap-2.5 border-t border-amber-100 bg-amber-50/60 px-5 py-3">
          <svg className="mt-0.5 h-4 w-4 flex-none text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-xs text-amber-700">
            Some entries need manual tie-break resolution. Use the{' '}
            <span className="font-semibold">Results</span> page to review individual attempts before finalizing.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Summary stat tile ─────────────────────────────── */
function SummaryStat({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-white ring-slate-900/5 text-slate-900',
    success: 'bg-emerald-50 ring-emerald-200/60 text-emerald-700',
    warn: 'bg-amber-50 ring-amber-200/60 text-amber-700'
  };
  return (
    <div className={`rounded-xl px-4 py-3 ring-1 ring-inset shadow-sm ${tones[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-xl font-bold">{value}</p>
    </div>
  );
}

/* ── Status pill ───────────────────────────────────── */
function StatusPill({ finalized }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${
        finalized
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-amber-50 text-amber-700 ring-amber-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${finalized ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {finalized ? 'Finalized' : 'Draft'}
    </span>
  );
}

/* ── Rank badge (gold / silver / bronze aware) ─────── */
function RankBadge({ rank }) {
  const styles = {
    1: 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm shadow-amber-500/30 ring-amber-300/50',
    2: 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm shadow-slate-400/30 ring-slate-300/50',
    3: 'bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-sm shadow-orange-500/30 ring-orange-300/50'
  };
  const cls = styles[rank] ?? 'bg-slate-100 text-slate-500 ring-slate-200';
  return (
    <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {rank}
    </span>
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