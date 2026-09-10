import { useEffect, useState, useCallback } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { Loader, ErrorBanner, EmptyState, Pagination, Modal } from '../../components/common/UI';

const EMPTY_FORM = {
  round: '',
  questionText: '',
  options: { A: '', B: '', C: '', D: '' },
  correctAnswer: 'A',
  category: 'General',
  difficulty: 'Medium',
  marks: 1,
  isActive: true
};

const DIFFICULTY_STYLES = {
  Easy: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  Hard: 'bg-red-50 text-red-600 ring-red-200'
};

export default function Questions() {
  const [rounds, setRounds] = useState([]);
  const [round, setRound] = useState('');
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/rounds').then((res) => {
      setRounds(res.data);
      if (res.data.length) setRound((r) => r || res.data[0]._id);
    });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/admin/questions', { params: { round: round || undefined, search: search || undefined, difficulty: difficulty || undefined, page, limit: 15 } })
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load questions.'))
      .finally(() => setLoading(false));
  }, [round, search, difficulty, page]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, round: round || (rounds[0]?._id ?? '') });
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(q) {
    setEditingId(q._id);
    setForm({
      round: q.round,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      category: q.category,
      difficulty: q.difficulty,
      marks: q.marks,
      isActive: q.isActive
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await api.put(`/admin/questions/${editingId}`, form);
      } else {
        await api.post('/admin/questions', form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save this question.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this question permanently?')) return;
    try {
      await api.delete(`/admin/questions/${id}`);
      load();
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not delete this question.'));
    }
  }

  const hasFilters = Boolean(search || difficulty);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Question Bank</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{data.total}</span>{' '}
            {data.total === 1 ? 'question' : 'questions'}
          </p>
        </div>

        <button
          onClick={openCreate}
          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Add Question
        </button>
      </div>

      {/* ── Filters ────────────────────────────────── */}
      <div className="card flex flex-wrap items-center gap-3 p-3 shadow-sm ring-1 ring-slate-900/5">
        {/* Round */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h6" />
            </svg>
          </span>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </span>
          <select
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            value={round}
            onChange={(e) => { setRound(e.target.value); setPage(1); }}
          >
            {rounds.map((r) => (
              <option key={r._id} value={r._id}>
                Round {r.roundNumber} — {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </span>
          <select
            className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
          >
            <option value="">All difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
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
            placeholder="Search question text…"
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

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setDifficulty(''); setPage(1); }}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* ── Table / Empty ──────────────────────────── */}
      {loading ? (
        <Loader />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No questions match your filters' : 'No questions found'}
          subtitle={hasFilters ? 'Try adjusting or clearing your filters.' : 'Add a question to get started.'}
        />
      ) : (
        <div className="card overflow-hidden ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Question</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Difficulty</th>
                  <th className="px-4 py-2.5 font-medium">Marks</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((q) => (
                  <tr
                    key={q._id}
                    className="group border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                  >
                    <td className="max-w-sm px-4 py-3">
                      <div className="flex items-start gap-3">
                        <CorrectAnswerChip letter={q.correctAnswer} />
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-medium text-slate-800">
                            {q.questionText}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {q.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyPill difficulty={q.difficulty} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {q.marks}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ActivePill active={q.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                        <IconButton
                          label="Edit"
                          onClick={() => openEdit(q)}
                          icon={
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          }
                        />
                        <IconButton
                          label="Delete"
                          danger
                          onClick={() => handleDelete(q._id)}
                          icon={
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14M10 11v6M14 11v6" />
                          }
                        />
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

      {/* ── Modal ──────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Question' : 'Add Question'} wide>
        <form onSubmit={handleSave} className="space-y-5">
          {formError && <ErrorBanner message={formError} />}

          {/* Round */}
          {!editingId && (
            <FormField label="Round">
              <select
                className="input"
                value={form.round}
                onChange={(e) => setForm({ ...form, round: e.target.value })}
                required
              >
                {rounds.map((r) => (
                  <option key={r._id} value={r._id}>
                    Round {r.roundNumber} — {r.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          {/* Question text */}
          <FormField label="Question text">
            <textarea
              className="input resize-none"
              rows={3}
              value={form.questionText}
              onChange={(e) => setForm({ ...form, questionText: e.target.value })}
              placeholder="Type the question here…"
              required
            />
          </FormField>

          {/* Options */}
          <div>
            <p className="label mb-2">Answer options</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {['A', 'B', 'C', 'D'].map((key) => {
                const isCorrect = form.correctAnswer === key;
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 transition ${
                      isCorrect
                        ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Option {key}</span>
                      {isCorrect && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Correct
                        </span>
                      )}
                    </div>
                    <input
                      className="input"
                      value={form.options[key]}
                      onChange={(e) =>
                        setForm({ ...form, options: { ...form.options, [key]: e.target.value } })
                      }
                      required
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormField label="Correct answer">
              <select
                className="input"
                value={form.correctAnswer}
                onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
              >
                {['A', 'B', 'C', 'D'].map((k) => (
                  <option key={k} value={k}>
                    Option {k}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Category">
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </FormField>
            <FormField label="Difficulty">
              <select
                className="input"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </FormField>
            <FormField label="Marks">
              <input
                type="number"
                min={0}
                step="0.5"
                className="input"
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: e.target.value })}
              />
            </FormField>
          </div>

          {/* Active toggle */}
          {editingId && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-700">Active</p>
                <p className="text-xs text-slate-500">Included when building attempts</p>
              </div>
            </label>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
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
                  {editingId ? 'Update Question' : 'Save Question'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ── Small local helpers ───────────────────────────── */

function FormField({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function DifficultyPill({ difficulty }) {
  const cls = DIFFICULTY_STYLES[difficulty] ?? 'bg-slate-100 text-slate-500 ring-slate-200';
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}>
      {difficulty}
    </span>
  );
}

function ActivePill({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
        active
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-slate-100 text-slate-500 ring-slate-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function CorrectAnswerChip({ letter }) {
  return (
    <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-indigo-500 text-[10px] font-bold text-white shadow-sm shadow-brand-500/20">
      {letter}
    </span>
  );
}

function IconButton({ label, icon, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
        danger
          ? 'border-transparent text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
          : 'border-transparent text-slate-400 hover:border-slate-200 hover:bg-white hover:text-slate-700'
      }`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        {icon}
      </svg>
    </button>
  );
}