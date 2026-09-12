import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

export default function Judging() {
  const [competitions, setCompetitions] = useState([]);
  const [competition, setCompetition] = useState('');
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/public/competitions').then((res) => { const promptRush = res.data.filter((item) => item.type === 'prompt_rush'); setCompetitions(promptRush); setCompetition(promptRush[0]?._id || ''); }).catch((err) => setError(apiErrorMessage(err))); }, []);
  function load() { if (!competition) return; setLoading(true); api.get(`/judging/participants?competition=${competition}`).then((res) => setParticipants(res.data)).catch((err) => setError(apiErrorMessage(err))).finally(() => setLoading(false)); }
  useEffect(load, [competition]);
  async function save(item) { try { await api.put('/judging/scores', { studentId: item.id, competitionId: competition, score: item.score, notes: item.notes }); setSaved(item.id); setTimeout(() => setSaved(''), 1200); } catch (err) { setError(apiErrorMessage(err)); } }

  if (loading) return <Loader label="Loading judging sheet…" />;
  return <section className="space-y-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Judge workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Prompt Rush judging</h1><p className="mt-1 text-sm text-slate-500">Only allocated participants are shown. Admin scoring limit is applied.</p></div><select className="input w-auto" value={competition} onChange={(e) => setCompetition(e.target.value)}>{competitions.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></header>{error && <ErrorBanner message={error} />}<div className="card overflow-hidden p-0"><div className="hidden grid-cols-[1.4fr_1fr_140px_1.5fr_90px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"><span>Participant</span><span>Contact</span><span>Marks</span><span>Notes</span><span /></div>{participants.map((item) => <div key={item.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 md:grid-cols-[1.4fr_1fr_140px_1.5fr_90px] md:items-center"><div><p className="font-medium text-slate-800">{item.name}</p><p className="text-xs text-slate-500">{item.rollNumber} · {item.department}</p></div><p className="text-sm text-slate-600">{item.phoneNumber || 'No phone recorded'}</p><input className="input" type="number" min="0" max={item.maxScore || 1000} value={item.score ?? ''} placeholder={`0 / ${item.maxScore || 0}`} onChange={(e) => setParticipants(participants.map((p) => p.id === item.id ? { ...p, score: e.target.value } : p))} /><input className="input" value={item.notes} placeholder="Optional note" onChange={(e) => setParticipants(participants.map((p) => p.id === item.id ? { ...p, notes: e.target.value } : p))} /><button className="btn-primary text-xs" onClick={() => save(item)}>{saved === item.id ? 'Saved' : 'Save score'}</button></div>)}</div></section>;
}
