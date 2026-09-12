import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

export default function JudgingReview() {
  const [scores, setScores] = useState(null);
  const [error, setError] = useState('');
  function load() { api.get('/judging/review').then((res) => setScores(res.data)).catch((err) => setError(apiErrorMessage(err))); }
  useEffect(load, []);
  async function decide(id, decision) { try { await api.post(`/judging/review/${id}/${decision}`); load(); } catch (err) { setError(apiErrorMessage(err)); } }
  if (!scores) return error ? <ErrorBanner message={error} /> : <Loader label="Loading score review…" />;
  return <section className="space-y-5"><header><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Admin approval</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Judging review</h1><p className="mt-1 text-sm text-slate-500">Approve locked Prompt Rush scores before they enter the final leaderboard.</p></header>{error && <ErrorBanner message={error} />}<div className="card overflow-hidden"><div className="divide-y divide-slate-100">{scores.map((item) => <div key={item._id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.3fr_1fr_120px_1fr_180px] md:items-center"><div><p className="font-medium text-slate-800">{item.student?.name}</p><p className="text-xs text-slate-500">{item.student?.rollNumber}</p></div><div><p className="text-sm text-slate-700">{item.judge?.name}</p><p className="text-xs text-slate-500">{item.competition?.name}</p></div><div><p className="text-xl font-bold text-brand-700">{item.score}</p><span className="badge bg-slate-100 text-slate-600">{item.status}</span></div><div className="text-xs text-slate-500">{item.rubricScores?.map((rule) => `${rule.label}: ${rule.score}`).join(' · ')}</div><div className="flex gap-2">{item.status === 'locked' || item.status === 'submitted' ? <><button className="btn-primary text-xs" onClick={() => decide(item._id, 'approve')}>Approve</button><button className="btn-secondary text-xs" onClick={() => decide(item._id, 'reject')}>Reject</button></> : <span className="text-xs text-slate-400">No action needed</span>}</div></div>)}</div>{scores.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No judging scores submitted.</p>}</div></section>;
}
