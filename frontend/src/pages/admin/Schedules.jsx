import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

export default function Schedules() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  useEffect(() => { api.get('/admin/competitions').then((res) => setItems(res.data)).catch((err) => setError(apiErrorMessage(err))); }, []);
  function change(id, field, value) { setItems((current) => current.map((item) => item._id === id ? { ...item, schedule: { ...item.schedule, [field]: value } } : item)); }
  async function save(item) { try { await api.patch(`/admin/competitions/${item._id}`, { schedule: item.schedule }); setSaved(item._id); setTimeout(() => setSaved(''), 1200); } catch (err) { setError(apiErrorMessage(err)); } }
  async function pause(item) { try { await api.post(`/admin/competitions/${item._id}/pause`, { paused: !item.schedule?.isPaused, reason: item.schedule?.isPaused ? '' : 'Paused by administrator' }); setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, schedule: { ...entry.schedule, isPaused: !item.schedule?.isPaused } } : entry)); } catch (err) { setError(apiErrorMessage(err)); } }
  if (!items) return <Loader label="Loading schedules…" />;
  return <section className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Competition control</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Schedules</h1><p className="mt-1 text-sm text-slate-500">Edit start and end times or pause a competition immediately.</p></header>{error && <ErrorBanner message={error} />}<div className="space-y-4">{items.map((item) => <div className="card p-5" key={item._id}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-800">{item.name}</h2><p className="text-xs uppercase tracking-wide text-brand-600">{item.type}</p></div><button className="btn-secondary" onClick={() => pause(item)}>{item.schedule?.isPaused ? 'Resume competition' : 'Pause competition'}</button></div><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className="label">Starts</span><input className="input" type="datetime-local" value={item.schedule?.startsAt?.slice(0, 16) || ''} onChange={(e) => change(item._id, 'startsAt', e.target.value)} /></label><label><span className="label">Ends</span><input className="input" type="datetime-local" value={item.schedule?.endsAt?.slice(0, 16) || ''} onChange={(e) => change(item._id, 'endsAt', e.target.value)} /></label></div><button className="btn-primary mt-4 text-sm" onClick={() => save(item)}>{saved === item._id ? 'Saved' : 'Save schedule'}</button></div>)}</div></section>;
}
