import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../../api/client';
import { Loader, ErrorBanner, StatCard, EmptyState } from '../../components/common/UI';
import { formatSeconds, formatDateTime } from '../../utils/format';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export default function Dashboard() {
  const [round, setRound] = useState(1);
  const [departments, setDepartments] = useState([]);
  const [department, setDepartment] = useState('');
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);

  useEffect(() => {
    api.get('/public/departments').then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/admin/dashboard/stats', { params: { round } }),
      api.get('/admin/dashboard/leaderboard', { params: { round, department: department || undefined } })
    ])
      .then(([statsRes, lbRes]) => {
        setStats(statsRes.data);
        setLeaderboard(lbRes.data);
      })
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, [round, department]);

  useEffect(() => {
    load();
  }, [load]);

  // Live refresh via socket.io signals (no sensitive data travels over the socket).
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('aces_admin_token') }
    });
    socket.on('connect', () => {
      setLive(true);
      socket.emit('admin:subscribe');
    });
    socket.on('disconnect', () => setLive(false));
    socket.on('participant:started', load);
    socket.on('attempt:completed', load);
    return () => socket.disconnect();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <LivePill live={live} />
          </div>
          <p className="mt-1 text-sm text-slate-500">Live overview of quiz activity</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={round}
            onChange={(e) => setRound(Number(e.target.value))}
            icon="calendar"
          >
            <option value={1}>Round 1</option>
            <option value={2}>Round 2</option>
          </FilterSelect>

          <FilterSelect
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            icon="users"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {loading && !stats ? (
        <Loader />
      ) : (
        <>
          {/* ── Stat grid ────────────────────────────── */}
          {stats && (
            <div className="space-y-4">
              {/* Primary KPIs */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                <StatCard label="Participants" value={stats.totalParticipants} accent="brand" />
                <StatCard label="Completed" value={stats.completed} accent="green" />
                <StatCard label="In Progress" value={stats.inProgress} accent="amber" />
                <StatCard label="Not Started" value={stats.notStarted} accent="slate" />
              </div>

              {/* Secondary metrics */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
                <StatCard
                  label="Question Bank"
                  value={stats.questionBankSize}
                  sub={`${stats.totalQuestions} per attempt`}
                />
                <StatCard
                  label="Top Score"
                  value={`${stats.topScore}/${stats.maxPossibleScore}`}
                />
                <StatCard label="Average Score" value={stats.averageScore} />
              </div>
            </div>
          )}

          {/* ── Leaderboard ──────────────────────────── */}
          <div className="card overflow-hidden ring-1 ring-slate-900/5">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Leaderboard</h2>
                <p className="text-xs text-slate-400">
                  Round {round}
                  {department
                    ? ` · ${departments.find((d) => d._id === department)?.name || ''}`
                    : ' · All departments'}
                </p>
              </div>
              {leaderboard.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                  {leaderboard.length} {leaderboard.length === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </div>

            {leaderboard.length === 0 ? (
              <EmptyState title="No completed attempts yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">#</th>
                      <th className="px-4 py-2.5 font-medium">Student</th>
                      <th className="px-4 py-2.5 font-medium">Department</th>
                      <th className="px-4 py-2.5 font-medium">Score</th>
                      <th className="px-4 py-2.5 font-medium">Correct / Wrong</th>
                      <th className="px-4 py-2.5 font-medium">Time</th>
                      <th className="px-4 py-2.5 font-medium">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row) => (
                      <tr
                        key={`${row.rollNumber}-${row.rank}`}
                        className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3">
                          <RankBadge rank={row.rank} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{row.studentName}</p>
                          <p className="text-xs text-slate-400">{row.rollNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{row.department}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-brand-700">{row.score}</span>
                          <span className="text-slate-400">/{row.maxScore}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                              {row.correct}
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 font-medium text-red-600">
                              {row.wrong}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {formatSeconds(row.timeTakenSeconds)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {formatDateTime(row.submittedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Live status pill ─────────────────────────────── */
function LivePill({ live }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${
        live
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-slate-100 text-slate-500 ring-slate-200'
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {live && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            live ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        />
      </span>
      {live ? 'Live' : 'Offline'}
    </span>
  );
}

/* ── Filter dropdown with icon ────────────────────── */
function FilterSelect({ children, icon, ...props }) {
  const icons = {
    calendar: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 20a6.5 6.5 0 0113 0M16 8.5a3 3 0 100 6M17 20a6.5 6.5 0 00-3-5.5" />
      </>
    )
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          {icons[icon]}
        </svg>
      </span>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </span>
      <select
        {...props}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        {children}
      </select>
    </div>
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
    <span
      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold ring-1 ring-inset ${cls}`}
    >
      {rank}
    </span>
  );
}