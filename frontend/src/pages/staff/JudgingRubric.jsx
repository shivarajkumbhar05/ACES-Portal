import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

export default function JudgingRubric() {
  const [competitions, setCompetitions] = useState([]);
  const [competition, setCompetition] = useState('');
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/public/competitions').then((res) => { const items = res.data.filter((item) => item.type === 'prompt_rush'); setCompetitions(items); setCompetition(items[0]?._id || ''); }).catch((err) => setError(apiErrorMessage(err))); }, []);
  useEffect(() => { if (!competition) return; setLoading(true); api.get(`/judging/participants?competition=${competition}`).then((res) => setParticipants(res.data)).catch((err) => setError(apiErrorMessage(err))).finally(() => setLoading(false)); }, [competition]);
  function update(id, changes) { setParticipants((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item)); }
  async function save(item, submit = false) { try { const res = await api.put('/judging/scores', { studentId: item.id, competitionId: competition, rubricScores: item.rubricScores, notes: item.notes, submit }); update(item.id, { score: res.data.score, rubricScores: res.data.rubricScores, scoreStatus: res.data.status, scoreId: res.data._id }); setMessage(submit ? 'Score submitted. Lock it when final.' : 'Draft score saved.'); } catch (err) { setError(apiErrorMessage(err)); } }
  async function lock(item) { try { await api.post(`/judging/scores/${item.scoreId}/lock`); update(item.id, { scoreStatus: 'locked' }); setMessage('Score locked for admin approval.'); } catch (err) { setError(apiErrorMessage(err)); } }
  if (loading && !participants.length) return <Loader label="Loading judging sheet…" />;
  return <section className="space-y-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Judge workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Prompt Rush judging</h1><p className="mt-1 text-sm text-slate-500">Score each criterion, submit the score, then lock it.</p></div><select className="input w-auto" value={competition} onChange={(e) => setCompetition(e.target.value)}>{competitions.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></header>{error && <ErrorBanner message={error} />}{message && <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}{!participants.length ? <div className="card p-8 text-center text-sm text-slate-500">No participants have been allocated yet.</div> : <div className="space-y-4">{participants.map((item) => <ScoreCard key={item.id} item={item} update={update} save={save} lock={lock} />)}</div>}</section>;
}

function ScoreCard({ item, update, save, lock }) {
  const locked = ['locked', 'approved'].includes(item.scoreStatus);
  const total = item.rubricScores?.reduce((sum, score) => sum + Number(score.score || 0), 0) || 0;
  function changeRule(rule, value) { const rubricScores = (item.scoringRules || []).map((entry) => entry._id === rule._id ? { ruleId: entry._id, label: entry.label, score: value } : item.rubricScores?.find((score) => score.ruleId === entry._id) || { ruleId: entry._id, label: entry.label, score: 0 }); update(item.id, { rubricScores, score: total }); }
  return <article className="card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-800">{item.name}</h2><p className="text-xs text-slate-500">{item.rollNumber} · {item.department} · {item.phoneNumber || 'No phone'}</p></div><div className="text-right"><p className="text-2xl font-bold text-brand-700">{total}<span className="text-sm font-medium text-slate-400"> / {item.maxScore}</span></p><span className="badge bg-slate-100 text-slate-600">{item.scoreStatus}</span></div></div><div className="grid gap-3 p-5 sm:grid-cols-2">{item.scoringRules?.map((rule) => { const current = item.rubricScores?.find((score) => score.ruleId === rule._id)?.score || 0; return <label key={rule._id} className="rounded-lg border border-slate-200 p-3"><span className="flex justify-between text-xs font-semibold text-slate-600"><span>{rule.label}</span><span>0-{rule.maxPoints}</span></span><input className="input mt-2" type="number" min="0" max={rule.maxPoints} value={current} disabled={locked} onChange={(e) => changeRule(rule, Number(e.target.value))} /></label>; })}</div><div className="px-5 pb-5"><textarea className="input min-h-20" disabled={locked} placeholder="Judge notes" value={item.notes} onChange={(e) => update(item.id, { notes: e.target.value })} /><div className="mt-3 flex flex-wrap gap-2"><button className="btn-secondary text-xs" disabled={locked} onClick={() => save(item, false)}>Save draft</button><button className="btn-primary text-xs" disabled={locked} onClick={() => save(item, true)}>Submit score</button><button className="btn-secondary text-xs" disabled={item.scoreStatus !== 'submitted'} onClick={() => lock(item)}>Lock score</button></div></div></article>;
}
