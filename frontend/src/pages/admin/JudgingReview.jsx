import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

export default function JudgingReview() {
  const [scores, setScores] = useState(null);
  const [error, setError] = useState('');
  function load() { api.get('/judging/review/comparison').then((res) => setScores(res.data)).catch((err) => setError(apiErrorMessage(err))); }
  useEffect(load, []);
  async function decide(id, decision) { try { await api.post(`/judging/review/${id}/${decision}`); load(); } catch (err) { setError(apiErrorMessage(err)); } }
  if (!scores) return error ? <ErrorBanner message={error} /> : <Loader label="Loading score review…" />;
  return <section className="space-y-5"><header><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Two-judge comparison</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Judging review</h1><p className="mt-1 text-sm text-slate-500">Compare both scores for each allocated Prompt Rush student. Final results use the average of two approved scores.</p></header>{error && <ErrorBanner message={error} />}<div className="space-y-4">{scores.map((item) => <ComparisonCard key={`${item.competition?._id}-${item.student?._id}`} item={item} decide={decide} />)}{scores.length === 0 && <div className="card p-8 text-center text-sm text-slate-500">No judging scores submitted.</div>}</div></section>;
}

function ComparisonCard({ item, decide }) {
  return <article className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-800">{item.student?.name}</h2><p className="text-xs text-slate-500">{item.student?.rollNumber} · {item.competition?.name}</p></div><div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Final average</p><p className="text-2xl font-bold text-brand-700">{item.average === null ? 'Pending' : item.average.toFixed(1)}</p><p className="text-xs text-slate-500">{item.approvedCount}/2 approved</p></div></div><div className="grid gap-3 p-5 md:grid-cols-2">{item.scores.map((score) => <div key={score._id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-700">{score.judge?.name || 'Judge'}</p><p className="text-xs text-slate-400">{score.judge?.username}</p></div><div className="text-right"><p className="text-xl font-bold text-brand-700">{score.score}</p><span className="badge bg-slate-100 text-slate-600">{score.status}</span></div></div><p className="mt-3 text-xs leading-5 text-slate-500">{score.rubricScores?.map((rule) => `${rule.label}: ${rule.score}`).join(' · ') || 'No rubric breakdown'}</p>{score.notes && <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">{score.notes}</p>}<div className="mt-3 flex gap-2">{['locked', 'submitted'].includes(score.status) ? <><button className="btn-primary text-xs" onClick={() => decide(score._id, 'approve')}>Approve</button><button className="btn-secondary text-xs" onClick={() => decide(score._id, 'reject')}>Reject</button></> : <span className="text-xs text-slate-400">No action needed</span>}</div></div>)}</div></article>;
}
