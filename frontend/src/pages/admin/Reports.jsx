import { useState } from 'react';
import api from '../../api/client';

const REPORTS = [
  { key: 'participants', label: 'All Participants', desc: 'Every registered student across all departments.', url: '/admin/reports/participants', icon: 'users', accent: 'brand' },
  { key: 'round1', label: 'Round 1 Results', desc: 'Full Round 1 scoreboard, ranked by score.', url: '/admin/reports/results/1', icon: 'list', accent: 'indigo' },
  { key: 'round2', label: 'Round 2 Results', desc: 'Full Round 2 scoreboard, ranked by score.', url: '/admin/reports/results/2', icon: 'list', accent: 'indigo' },
  { key: 'department', label: 'Department-wise Results', desc: 'Round 1 results grouped by department.', url: '/admin/reports/department-results', icon: 'building', accent: 'emerald' },
  { key: 'qualifiers', label: 'Round 2 Qualifiers', desc: 'Top-5-per-department qualifiers with tie-break notes.', url: '/admin/reports/round2-qualifiers', icon: 'award', accent: 'amber' },
  { key: 'final', label: 'Final Leaderboard', desc: 'Overall Round 2 leaderboard.', url: '/admin/reports/final-leaderboard', icon: 'trophy', accent: 'rose' }
];

const ACCENTS = {
  brand: 'from-brand-500 to-indigo-500 shadow-brand-500/30',
  indigo: 'from-indigo-500 to-violet-500 shadow-indigo-500/30',
  emerald: 'from-emerald-500 to-teal-500 shadow-emerald-500/30',
  amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
  rose: 'from-rose-500 to-pink-500 shadow-rose-500/30'
};

export default function Reports() {
  const [downloading, setDownloading] = useState(null);

  async function download(report) {
    setDownloading(report.key);
    try {
      const res = await api.get(report.url, { responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `${report.key}.csv`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not download this report.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Export CSV reports for records, printing, or sharing with the committee.
        </p>
      </div>

      {/* ── Report grid ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r) => (
          <ReportCard
            key={r.key}
            report={r}
            busy={downloading === r.key}
            anyBusy={downloading !== null}
            onDownload={() => download(r)}
          />
        ))}
      </div>

      {/* ── Footer note ────────────────────────────── */}
      <p className="text-center text-[11px] text-slate-400">
        Reports are generated on demand and download instantly as <span className="font-medium text-slate-500">.csv</span> files.
      </p>
    </div>
  );
}

/* ── Report card ───────────────────────────────────── */
function ReportCard({ report, busy, anyBusy, onDownload }) {
  const accent = ACCENTS[report.accent] ?? ACCENTS.brand;
  const dimmed = anyBusy && !busy;

  return (
    <div
      className={`group card relative flex flex-col justify-between overflow-hidden p-5 ring-1 ring-slate-900/5 transition-all duration-200 ${
        dimmed ? 'opacity-60' : 'hover:-translate-y-0.5 hover:shadow-lg'
      }`}
    >
      {/* Top accent glow on hover */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${accent} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20`}
      />

      <div className="relative">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${accent}`}
          >
            <ReportIcon name={report.icon} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800">{report.label}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{report.desc}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onDownload}
        disabled={busy || anyBusy}
        className={`relative mt-5 inline-flex items-center justify-center gap-2 self-start rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
          busy
            ? 'border-slate-200 bg-slate-50 text-slate-500'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-60'
        }`}
      >
        {busy ? (
          <>
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Downloading…
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
            </svg>
            Download CSV
          </>
        )}
      </button>
    </div>
  );
}

/* ── Report icons ──────────────────────────────────── */
function ReportIcon({ name, className = 'h-5 w-5' }) {
  const common = {
    className,
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 2
  };
  const paths = {
    users: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 20a6.5 6.5 0 0113 0M16 8.5a3 3 0 100 6M17 20a6.5 6.5 0 00-3-5.5" />
      </>
    ),
    list: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    ),
    building: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
    ),
    award: (
      <>
        <circle cx="12" cy="9" r="5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5" />
      </>
    ),
    trophy: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 4h8v4a4 4 0 11-8 0V4zM6 6H4a2 2 0 000 4h2M18 6h2a2 2 0 010 4h-2M9 17h6M10 21h4M12 14v3"
      />
    )
  };
  return <svg {...common}>{paths[name] ?? paths.list}</svg>;
}