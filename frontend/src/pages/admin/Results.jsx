import { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { Loader, ErrorBanner, EmptyState, Pagination, StatusBadge, Modal } from '../../components/common/UI';
import { formatSeconds, formatDateTime } from '../../utils/format';

const ROUND_OPTIONS = [
  { value: 1, label: 'Round 1' },
  { value: 2, label: 'Round 2' }
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' }
];

export default function Results() {
  const [departments, setDepartments] = useState([]);
  const [round, setRound] = useState(1);
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.get('/public/departments').then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    api
      .get('/admin/results', {
        params: { round, department: department || undefined, status: status || undefined, page, limit: 25 }
      })
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load results.'))
      .finally(() => setLoading(false));
  }, [round, department, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  function openDetail(attemptId) {
    setDetailLoading(true);
    setDetail({});
    api
      .get(`/admin/results/${attemptId}`)
      .then((res) => setDetail(res.data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }

  const hasFilters = Boolean(department || status);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Results</h1>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{data.total}</span>{' '}
          {data.total === 1 ? 'attempt' : 'attempts'}
        </p>
      </div>

      {/* ── Filters ────────────────────────────────── */}
      <div className="card flex flex-wrap items-center gap-3 p-3 shadow-sm ring-1 ring-slate-900/5">
        <FilterSelect
          icon="hash"
          value={round}
          onChange={(e) => { setRound(Number(e.target.value)); setPage(1); }}
        >
          {ROUND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          icon="building"
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </FilterSelect>

        <FilterSelect
          icon="circle"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FilterSelect>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setDepartment(''); setStatus(''); setPage(1); }}
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
          title={hasFilters ? 'No results match your filters' : 'No results found'}
          subtitle={hasFilters ? 'Try adjusting or clearing your filters.' : undefined}
        />
      ) : (
        <div className="card overflow-hidden ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Submitted</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr
                    key={row.attemptId}
                    className="group border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-[11px] font-semibold text-white">
                          {initials(row.student)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800">{row.student}</p>
                          <p className="font-mono text-xs text-slate-400">{row.rollNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.department}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-brand-700">{row.score}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {formatSeconds(row.timeTakenSeconds)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDateTime(row.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(row.attemptId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-500 opacity-60 transition group-hover:opacity-100 hover:border-slate-200 hover:bg-white hover:text-slate-800"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} onChange={setPage} />
        </div>
      )}

      {/* ── Detail modal ───────────────────────────── */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title="Attempt Detail" wide>
        {detailLoading || !detail || Object.keys(detail).length === 0 ? (
          <Loader />
        ) : (
          <div className="space-y-5">
            {/* Summary tiles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DetailTile
                label="Student"
                primary={detail.student?.name}
                secondary={detail.student?.rollNumber}
                avatar={initials(detail.student?.name)}
              />
              <DetailTile label="Department" primary={detail.department} />
              <DetailTile
                label="Score"
                primary={
                  <span className="text-brand-700">
                    {detail.score}
                    <span className="text-slate-400">/{detail.maxScore}</span>
                  </span>
                }
                secondary={`${Number(detail.percentage).toFixed(1)}%`}
                tone="brand"
              />
              <DetailTile
                label="Time taken"
                primary={formatSeconds(detail.timeTakenSeconds)}
              />
            </div>

            {/* Question review */}
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {detail.questions?.map((q, i) => (
                <QuestionReview key={i} index={i} question={q} />
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Filter select with icon + chevron ─────────────── */
function FilterSelect({ icon, children, ...props }) {
  const icons = {
    hash: <path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />,
    building: <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />,
    circle: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
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

/* ── Detail summary tile ──────────────────────────── */
function DetailTile({ label, primary, secondary, avatar, tone = 'default' }) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        tone === 'brand'
          ? 'border-brand-100 bg-brand-50/40'
          : 'border-slate-100 bg-slate-50/60'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {avatar && (
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-[10px] font-semibold text-white">
            {avatar}
          </span>
        )}
        <p className="truncate text-sm font-semibold text-slate-800">{primary}</p>
      </div>
      {secondary && <p className="mt-0.5 truncate text-xs text-slate-400">{secondary}</p>}
    </div>
  );
}

/* ── Question review card ──────────────────────────── */
function QuestionReview({ index, question: q }) {
  const correct = q.isCorrect;

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        correct
          ? 'border-emerald-100 bg-emerald-50/30'
          : 'border-red-100 bg-red-50/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium leading-relaxed text-slate-800">
          <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
            {index + 1}
          </span>
          {q.questionText}
        </p>
        <span
          className={`inline-flex flex-none items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
            correct
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-red-50 text-red-600 ring-red-200'
          }`}
        >
          {correct ? (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Correct
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              </svg>
              Incorrect
            </>
          )}
        </span>
      </div>

      {/* Options */}
      <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {['A', 'B', 'C', 'D'].map((k) => {
          const isCorrect = k === q.correctAnswer;
          const isSelected = k === q.selectedAnswer;
          const isWrongPick = isSelected && !isCorrect;
          return (
            <div
              key={k}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                isCorrect
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                  : isWrongPick
                  ? 'border-red-200 bg-red-50/70 text-red-700'
                  : 'border-slate-100 bg-white text-slate-500'
              }`}
            >
              <span
                className={`flex h-5 w-5 flex-none items-center justify-center rounded-md text-[10px] font-bold ${
                  isCorrect
                    ? 'bg-emerald-500 text-white'
                    : isWrongPick
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {k}
              </span>
              <span className="min-w-0 flex-1 truncate">{q.options?.[k]}</span>
              {isSelected && (
                <span className="flex-none text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  Picked
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Meta row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span>
          Selected:{' '}
          <span className={`font-semibold ${q.selectedAnswer ? 'text-slate-700' : 'text-slate-400'}`}>
            {q.selectedAnswer ?? '—'}
          </span>
        </span>
        <span className="text-slate-300">•</span>
        <span>
          Correct: <span className="font-semibold text-emerald-700">{q.correctAnswer}</span>
        </span>
      </div>
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