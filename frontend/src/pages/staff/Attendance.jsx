import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

export default function Attendance() {
  const [round, setRound] = useState(1);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  function load() { setLoading(true); api.get(`/attendance?round=${round}`).then((res) => setParticipants(res.data)).catch((err) => setError(apiErrorMessage(err))).finally(() => setLoading(false)); }
  useEffect(load, [round]);
  async function save(item) { try { await api.put('/attendance', { studentId: item.id, roundNumber: round, phoneNumber: item.phoneNumber, present: item.present }); setSaved(item.id); setTimeout(() => setSaved(''), 1200); } catch (err) { setError(apiErrorMessage(err)); } }
  if (loading) return <Loader label="Loading attendance sheet…" />;
  return <section className="space-y-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Volunteer workspace</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Attendance & contacts</h1><p className="mt-1 text-sm text-slate-500">Check in participants and keep a phone number for event coordination.</p></div><select className="input w-auto" value={round} onChange={(e) => setRound(Number(e.target.value))}><option value="1">Round 1</option><option value="2">Round 2 · Rapid Fire</option><option value="3">Round 3 · Questioning</option></select></header>{error && <ErrorBanner message={error} />}<div className="card overflow-hidden p-0"><div className="divide-y divide-slate-100">{participants.map((item) => <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.4fr_1fr_180px_100px] md:items-center"><div><p className="font-medium text-slate-800">{item.name}</p><p className="text-xs text-slate-500">{item.rollNumber} · {item.department}</p></div><input className="input" type="tel" placeholder="Phone number" value={item.phoneNumber} onChange={(e) => setParticipants(participants.map((p) => p.id === item.id ? { ...p, phoneNumber: e.target.value } : p))} /><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={item.present} onChange={(e) => setParticipants(participants.map((p) => p.id === item.id ? { ...p, present: e.target.checked } : p))} /> Present</label><button className="btn-primary text-xs" onClick={() => save(item)}>{saved === item.id ? 'Saved' : 'Save'}</button></div>)}</div></div></section>;
}
