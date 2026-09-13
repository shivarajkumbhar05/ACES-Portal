import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { Loader, ErrorBanner, StatusBadge } from '../../components/common/UI';

function emptyFormFor(roundNumber, existing) {
  if (existing) {
    return {
      name: existing.name,
      type: 'quiz',
      questionsPerQuiz: existing.questionsPerQuiz,
      timeLimitMinutes: existing.timeLimitMinutes,
      marksPerQuestion: existing.marksPerQuestion,
      negativeMarking: existing.negativeMarking,
      negativeMarkingValue: existing.negativeMarkingValue,
      randomizeQuestions: existing.randomizeQuestions,
      randomizeOptions: existing.randomizeOptions,
      maxAttempts: existing.maxAttempts,
      examCode: '',
      showCorrectAnswers: existing.showCorrectAnswers,
      showScoreToStudent: existing.showScoreToStudent,
      showLeaderboardToStudents: existing.showLeaderboardToStudents,
      participantLimit: existing.participantLimit ?? ''
    };
  }
  return {
    name: `Round ${roundNumber}`,
    type: 'quiz',
    questionsPerQuiz: 30,
    timeLimitMinutes: 30,
    marksPerQuestion: 1,
    negativeMarking: false,
    negativeMarkingValue: 0,
    randomizeQuestions: true,
    randomizeOptions: true,
    maxAttempts: 1,
    examCode: '',
    showCorrectAnswers: false,
    showScoreToStudent: true,
    showLeaderboardToStudents: false,
    participantLimit: roundNumber === 2 ? 20 : ''
  };
}

function RoundCard({ roundNumber, initial, onSaved }) {
  const [form, setForm] = useState(() => emptyFormFor(roundNumber, initial));
  const [round, setRound] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const payload = { ...form };
      if (!payload.examCode) delete payload.examCode;
      if (payload.participantLimit === '') payload.participantLimit = null;
      const res = await api.put(`/admin/rounds/${roundNumber}`, payload);
      setRound(res.data);
      setMsg('Saved.');
      onSaved?.(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save round settings.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleStartEnd(action) {
    if (!window.confirm(`${action === 'start' ? 'Start' : 'End'} Round ${roundNumber}?`)) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post(`/admin/rounds/${roundNumber}/${action}`);
      setRound(res.data);
      onSaved?.(res.data);
      if (action === 'start') setMsg('Round started.');
      if (action === 'end') setMsg('Round ended.');
    } catch (err) {
      setError(apiErrorMessage(err, `Could not ${action} the round.`));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRound() {
    if (!round || !window.confirm(`Delete Round ${roundNumber}? This requires the round to be empty.`)) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api.delete(`/admin/rounds/${roundNumber}`);
      setRound(null);
      setForm(emptyFormFor(roundNumber, null));
      setMsg('Round deleted. You can create a new round from this form.');
      onSaved?.(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not delete the round.'));
    } finally {
      setBusy(false);
    }
  }

  const isActive = round?.status === 'active';

  return (
    <div className="card overflow-hidden ring-1 ring-slate-900/5">
      {/* ── Card header ───────────────────────────── */}
      <div className="relative border-b border-slate-100 px-6 py-5">
        {isActive && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500" />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl text-sm font-bold text-white shadow-lg ${
                isActive
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30'
                  : 'bg-gradient-to-br from-brand-500 to-indigo-500 shadow-brand-500/30'
              }`}
            >
              R{roundNumber}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {form.name || `Round ${roundNumber}`}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {round ? 'Configured — update settings below' : 'Not yet created'}
              </p>
            </div>
          </div>
          {round && <StatusBadge status={round.status} />}
        </div>
      </div>

      {/* ── Alerts ────────────────────────────────── */}
      {(error || msg) && (
        <div className="space-y-2 border-b border-slate-100 px-6 py-4">
          {error && <ErrorBanner message={error} />}
          {msg && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700">
              <svg className="h-4 w-4 flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {msg}
            </div>
          )}
        </div>
      )}

      {/* ── Round controls ────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-6 py-3">
        <button
          onClick={() => handleStartEnd('start')}
          disabled={busy || isActive}
          className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700"
        >
          {busy ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
          Start Round
        </button>
        <button
          onClick={() => handleStartEnd('end')}
          disabled={busy || !isActive}
          className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          End Round
        </button>
        <button
          onClick={handleDeleteRound}
          disabled={busy || !round}
          className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V4h6v3m-8 4l1 7h8l1-7" />
          </svg>
          Delete Round
        </button>

        {isActive && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Round in progress
          </span>
        )}
      </div>

      {/* ── Form ──────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-6 p-6">
        {/* Group: Basic */}
        <FormSection title="Basic settings">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Name">
              <input
                className="input"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </FormField>

            <FormField
              label="Exam code"
              hint={round ? 'Leave blank to keep current' : 'Required'}
            >
              <input
                className="input font-mono tracking-wide"
                value={form.examCode}
                onChange={(e) => update('examCode', e.target.value)}
                required={!round}
                placeholder={round ? '••••••••' : 'Set an exam code'}
              />
            </FormField>
            <FormField label="Round format">
              <select className="input" value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option value="quiz">Quiz</option>
                <option value="rapid_fire">Rapid Fire</option>
                <option value="questioning">Questioning</option>
                <option value="prompt_rush">Prompt Rush</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        {/* Group: Quiz rules */}
        <FormSection title="Quiz rules">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormField label="Questions">
              <input
                type="number"
                min={1}
                className="input"
                value={form.questionsPerQuiz}
                onChange={(e) => update('questionsPerQuiz', e.target.value)}
              />
            </FormField>
            <FormField label="Time (min)">
              <input
                type="number"
                min={1}
                className="input"
                value={form.timeLimitMinutes}
                onChange={(e) => update('timeLimitMinutes', e.target.value)}
              />
            </FormField>
            <FormField label="Marks / Q">
              <input
                type="number"
                min={0}
                step="0.5"
                className="input"
                value={form.marksPerQuestion}
                onChange={(e) => update('marksPerQuestion', e.target.value)}
              />
            </FormField>
            <FormField label="Attempts allowed" hint="One attempt per participant">
              <input
                type="number"
                min={1}
                max={1}
                disabled
                className="input"
                value={1}
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField
              label="Participant limit"
              hint={`Optional participant limit for round ${roundNumber}.`}
            >
              <input
                type="number"
                min={0}
                className="input max-w-[180px]"
                value={form.participantLimit}
                onChange={(e) => update('participantLimit', e.target.value)}
                placeholder="Unlimited"
              />
            </FormField>
          </div>
        </FormSection>

        {/* Group: Behaviours */}
        <FormSection title="Behaviours">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ToggleRow
              checked={form.negativeMarking}
              onChange={(v) => update('negativeMarking', v)}
              label="Negative marking"
              desc="Deduct marks for incorrect answers"
            />
            {form.negativeMarking && (
              <FormField label="Penalty per wrong answer">
                <input
                  type="number"
                  min={0}
                  step="0.25"
                  className="input max-w-[140px]"
                  value={form.negativeMarkingValue}
                  onChange={(e) => update('negativeMarkingValue', e.target.value)}
                />
              </FormField>
            )}
            <ToggleRow
              checked={form.randomizeQuestions}
              onChange={(v) => update('randomizeQuestions', v)}
              label="Randomize questions"
              desc="Shuffle order per attempt"
            />
            <ToggleRow
              checked={form.randomizeOptions}
              onChange={(v) => update('randomizeOptions', v)}
              label="Randomize options"
              desc="Shuffle A/B/C/D per attempt"
            />
          </div>
        </FormSection>

        {/* Group: Visibility to students */}
        <FormSection title="Visibility to students">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ToggleRow
              checked={form.showScoreToStudent}
              onChange={(v) => update('showScoreToStudent', v)}
              label="Show score"
              desc="Reveal score immediately after submission"
            />
            <ToggleRow
              checked={form.showCorrectAnswers}
              onChange={(v) => update('showCorrectAnswers', v)}
              label="Show correct answers"
              desc="Let students review the answer key"
            />
            <ToggleRow
              checked={form.showLeaderboardToStudents}
              onChange={(v) => update('showLeaderboardToStudents', v)}
              label="Show leaderboard"
              desc="Display rankings publicly"
            />
          </div>
        </FormSection>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="text-xs text-slate-400">
            {round ? `Last updated ${new Date(round.updatedAt ?? Date.now()).toLocaleDateString()}` : 'This round has not been created yet.'}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {round ? 'Update Round' : 'Create Round'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Form section wrapper ──────────────────────────── */
function FormSection({ title, children }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      {children}
    </div>
  );
}

/* ── Form field with label + hint ──────────────────── */
function FormField({ label, hint, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label className="label mb-0">{label}</label>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ── Toggle row for boolean settings ───────────────── */
function ToggleRow({ checked, onChange, label, desc }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
        checked
          ? 'border-brand-200 bg-brand-50/40'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {desc && <p className="mt-0.5 text-xs leading-snug text-slate-500">{desc}</p>}
      </div>
    </label>
  );
}

/* ── Parent screen ─────────────────────────────────── */
export default function Rounds() {
  const [rounds, setRounds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    api
      .get('/admin/rounds')
      .then((res) => setRounds(res.data))
      .catch(() => setError('Could not load round settings.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <Loader />;
  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const round1 = rounds?.find((r) => r.roundNumber === 1) || null;

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Round Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure quiz rules, scoring, and visibility for each round.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RoundCard roundNumber={1} initial={round1} onSaved={load} />
      </div>
    </div>
  );
}