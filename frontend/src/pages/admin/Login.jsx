import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ErrorBanner } from '../../components/common/UI';

export default function Login({ staffMode = false }) {
  const { login, admin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (admin) {
    navigate('/admin', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await login(username, password);
    setSubmitting(false);
    if (result.ok) {
      const target = location.state?.from || (result.role === 'judge' ? '/admin/judging' : result.role === 'volunteer' ? '/admin/attendance' : '/admin');
      navigate(target, { replace: true });
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <BackdropLayer />

      <div className="relative w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl bg-slate-900/70 shadow-2xl shadow-black/50 ring-1 ring-white/10 backdrop-blur-xl">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 px-6 py-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.3),transparent_55%)]" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-white/20" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12l1.75 1.75L14.5 10.5" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  ACES Quiz
                </p>
                <h1 className="text-lg font-bold leading-tight text-white">{staffMode ? 'Judging & Volunteer Portal' : 'Admin Console'}</h1>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm text-slate-400">{staffMode ? 'Sign in to score rounds or record attendance.' : 'Sign in to manage the competition.'}</p>

            {error && (
              <div className="mt-4">
                <ErrorBanner message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <Field label="Username">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="3.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20a7.5 7.5 0 0115 0" />
                    </svg>
                  </span>
                  <input
                    className={`${inputClass} pl-9`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="Enter your username"
                    spellCheck={false}
                  />
                </div>
              </Field>

              <Field label="Password">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 118 0v3" />
                    </svg>
                  </span>
                  <input
                    className={`${inputClass} pl-9 pr-10`}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6M6.7 6.7C4.6 8.1 3.1 10 2 12c2 4 6 7 10 7 1.7 0 3.3-.5 4.7-1.3M9.9 5.2A9.8 9.8 0 0112 5c4 0 8 3 10 7-.6 1.3-1.6 2.6-2.8 3.7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="relative mt-6 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/25">
          ACES Quiz Portal
        </p>
      </div>
    </div>
  );
}

/* ── Shared dark input styling ─────────────────────── */
const inputClass =
  'w-full rounded-xl border border-white/10 bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 transition focus:border-brand-400/60 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

/* ── Dark label wrapper ────────────────────────────── */
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ── Background layer (aurora + grid) ──────────────── */
function BackdropLayer() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#1e1b4b_0%,#0f172a_45%,#020617_100%)]" />
      <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]" />
      <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-[120px]" />
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)'
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  );
}