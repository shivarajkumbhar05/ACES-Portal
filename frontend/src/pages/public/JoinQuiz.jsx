import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../../api/client';
import { Loader, ErrorBanner } from '../../components/common/UI';

export default function JoinQuiz() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    rollNumber: '',
    departmentId: '',
    examCode: '',
    roundNumber: 1
  });

  useEffect(() => {
    api
      .get('/public/departments')
      .then((res) => setDepartments(res.data))
      .catch(() => setError('Could not load departments. Please refresh the page.'))
      .finally(() => setLoadingDepts(false));
  }, []);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post('/quiz/verify', form);
      localStorage.setItem('aces_student_token', res.data.token);
      localStorage.setItem('aces_attempt_meta', JSON.stringify(res.data.attempt));
      navigate('/quiz/attempt');
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not start the quiz. Please check your details.');
      if (err.response?.status === 429 || err.response?.status === 503) {
        setError('The quiz entry is under heavy load. Please wait a moment and try again.');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDepts) return <Loader label="Loading…" />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Ambient background accents */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-md px-4 py-10 md:py-14">
        <div className="card overflow-hidden p-0 shadow-lg ring-1 ring-slate-900/5">
          {/* Header strip */}
          <div className="relative bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-600 px-6 py-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_55%)]" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25 backdrop-blur">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-white">Enter the Quiz</h1>
                <p className="mt-0.5 text-xs text-white/80">
                  Verify your details to begin the attempt
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <p className="text-sm text-slate-500">
              Fill in your details and the exam code provided by your coordinator.
            </p>

            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">One attempt only</p>
              <p className="mt-1 text-xs leading-5">
                Each student can access this round only once. After starting, submitting, or leaving the quiz, you cannot
                start it again.
              </p>
            </div>

            {error && (
              <div className="mt-4">
                <ErrorBanner message={error} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="label">Full name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                  maxLength={120}
                  placeholder="e.g. Priya Sharma"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="label">Roll number</label>
                <input
                  className="input font-mono tracking-wide"
                  value={form.rollNumber}
                  onChange={(e) => updateField('rollNumber', e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. CE2301"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="label">Department</label>
                <select
                  className="input"
                  value={form.departmentId}
                  onChange={(e) => updateField('departmentId', e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select your department
                  </option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Round</label>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                  {[1, 2].map((r) => {
                    const active = form.roundNumber === r;
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => updateField('roundNumber', r)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                          active
                            ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-900/5'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Round {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Exam code</label>
                <input
                  className="input font-mono tracking-[0.2em]"
                  value={form.examCode}
                  onChange={(e) => updateField('examCode', e.target.value)}
                  required
                  type="password"
                  placeholder="Provided by the committee"
                  autoComplete="off"
                />
              </div>

              <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>I understand this is my only attempt and that leaving the quiz screen will disqualify my attempt.</span>
              </label>

              <button
                type="submit"
                disabled={submitting || !confirmed}
                className="btn-primary group mt-2 inline-flex w-full items-center justify-center gap-2 py-2.5 shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/30 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Starting…
                  </>
                ) : (
                  <>
                    Start Quiz
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </>
                )}
              </button>

              <p className="pt-1 text-center text-[11px] text-slate-400">
                By starting, you agree to attempt the quiz fairly without external help.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}