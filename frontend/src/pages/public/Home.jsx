import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Loader, ErrorBanner, StatusBadge } from '../../components/common/UI';

export default function Home() {
  const [info, setInfo] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    setError('');
    Promise.all([api.get('/public/institution'), api.get('/public/rounds/status')])
      .then(([instRes, roundsRes]) => {
        setInfo(instRes.data);
        setRounds(roundsRes.data);
      })
      .catch(() => setError('Could not load competition details. Please check your connection and try again.'))
      .finally(() => setLoading(false));
  }

  if (loading) return <Loader label="Loading competition details…" />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Ambient background accents */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 py-10 md:py-14">
        {error && <ErrorBanner message={error} onRetry={load} />}

        {info && (
          <div className="card overflow-hidden p-0 shadow-lg ring-1 ring-slate-900/5 transition-shadow hover:shadow-xl">
            {/* Hero banner */}
            <div className="relative bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 px-6 py-8 md:px-8 md:py-10">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_55%)]" />
              <div className="relative">
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white ring-1 ring-inset ring-white/25 backdrop-blur">
                  {info.association}
                </span>
                <h1 className="mt-3 text-2xl font-bold leading-tight text-white md:text-3xl">
                  {info.event}
                </h1>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10z" />
                    <circle cx="12" cy="11" r="2.5" />
                  </svg>
                  {info.institution}
                </p>
              </div>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-4 px-6 py-6 text-sm md:grid-cols-4 md:px-8">
              <MetaItem label="Date" value={info.date} icon="calendar" />
              <MetaItem label="Time" value={info.time} icon="clock" />
              <div className="col-span-2">
                <MetaItem label="Venue" value={info.venue} icon="pin" />
              </div>
            </div>

            {/* Committee */}
            {info.committee && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-5 md:px-8">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Organising Committee
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Object.values(info.committee).map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-900/5 transition hover:ring-brand-300"
                    >
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-xs font-semibold text-white">
                        {c.name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs text-slate-400">{c.title}</p>
                        <p className="truncate font-medium text-slate-700">{c.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Round status */}
        <div className="mt-6 card p-6 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Round status</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
              {rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {rounds.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <p className="text-sm text-slate-400">Rounds have not been configured yet.</p>
              </div>
            )}

            {rounds.map((r) => (
              <div
                key={r.roundNumber}
                className="group flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 transition group-hover:bg-brand-100 group-hover:text-brand-700">
                    {r.roundNumber}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{r.name}</p>
                    <p className="text-xs text-slate-400">Round {r.roundNumber}</p>
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/quiz/join"
            className="btn-primary group inline-flex items-center gap-2 px-8 py-3 text-base shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/30"
          >
            Enter the Quiz
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          <Link to="/admin/login" className="btn-secondary px-6 py-3 text-base">
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}

/* Small local helper for the meta items */
function MetaItem({ label, value, icon }) {
  const icons = {
    calendar: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    clock: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    pin: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-4.35-6-10a6 6 0 1112 0c0 5.65-6 10-6 10z" />
        <circle cx="12" cy="11" r="2.5" />
      </>
    ),
  };

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          {icons[icon]}
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}