import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

const emptyForm = { name: '', type: 'mcq', description: '', date: '', venue: '', status: 'draft', startsAt: '', endsAt: '', scoringRules: [{ label: 'Correct answer', maxPoints: 1 }] };

export default function CompetitionsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() { api.get('/admin/competitions').then((res) => setItems(res.data)).catch((err) => setError(apiErrorMessage(err))).finally(() => setLoading(false)); }
  useEffect(load, []);
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/admin/competitions', { ...form, schedule: { startsAt: form.startsAt || undefined, endsAt: form.endsAt || undefined }, scoringRules: form.scoringRules.map((rule) => ({ ...rule, maxPoints: Number(rule.maxPoints) })) });
      setForm(emptyForm);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }
  async function togglePause(item) {
    try { await api.post(`/admin/competitions/${item._id}/pause`, { paused: !item.schedule?.isPaused, reason: item.schedule?.isPaused ? '' : 'Paused by administrator' }); load(); } catch (err) { setError(apiErrorMessage(err)); }
  }
  async function endCompetition(item) {
    if (!window.confirm(`End ${item.name}? Students will no longer be able to participate.`)) return;
    try { await api.post(`/admin/competitions/${item._id}/end`); load(); } catch (err) { setError(apiErrorMessage(err)); }
  }
  async function publish(item) {
    try { await api.post(`/admin/competitions/${item._id}/publish-results`); load(); } catch (err) { setError(apiErrorMessage(err)); }
  }
  async function deleteCompetition(item) {
    if (!window.confirm(`Delete ${item.name}? This cannot be undone.`)) return;
    try { await api.delete(`/admin/competitions/${item._id}`); load(); } catch (err) { setError(apiErrorMessage(err)); }
  }
  /*
    return <section className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Competition setup</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Two competition schedules</h1><p className="mt-1 text-sm text-slate-500">Round 1 is the MCQ quiz. Prompt Rush is managed separately with two judges.</p></header>{error && <ErrorBanner message={error} />}<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
  */
  function updateRule(index, field, value) { setForm((current) => ({ ...current, scoringRules: current.scoringRules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, [field]: value } : rule) })); }
  if (loading) return <Loader label="Loading competitions…" />;
  return <section className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Competition setup</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Two competition schedules</h1><p className="mt-1 text-sm text-slate-500">Create one MCQ competition and one Prompt Rush competition. Set judging points here.</p></header>{error && <ErrorBanner message={error} />}<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.4fr]"><form onSubmit={submit} className="card space-y-4 p-6"><h2 className="font-semibold text-slate-800">Create competition</h2><input className="input" placeholder="Competition name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="mcq">MCQ</option><option value="prompt_rush">Prompt Rush</option></select><textarea className="input min-h-20" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /><input className="input" placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><label><span className="label">Starts</span><input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label><label><span className="label">Ends</span><input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label></div><div><div className="mb-2 flex items-center justify-between"><span className="label">Scoring points</span><button type="button" className="btn-secondary text-xs" onClick={() => setForm({ ...form, scoringRules: [...form.scoringRules, { label: '', maxPoints: 1 }] })}>Add point</button></div>{form.scoringRules.map((rule, index) => <div className="mb-2 flex gap-2" key={index}><input className="input" placeholder="Point name" value={rule.label} onChange={(e) => updateRule(index, 'label', e.target.value)} required /><input className="input w-28" type="number" min="0" value={rule.maxPoints} onChange={(e) => updateRule(index, 'maxPoints', e.target.value)} required /></div>)}</div><button className="btn-primary">Create competition</button></form><div className="space-y-3">{items.map((item) => <article key={item._id} className="card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-800">{item.name}</p><p className="text-xs uppercase tracking-wide text-brand-600">{item.type} · {item.status}</p></div><button className="btn-secondary text-xs" onClick={() => togglePause(item)}>{item.schedule?.isPaused ? 'Resume' : 'Pause'}</button></div><p className="mt-2 text-sm text-slate-500">{item.venue || 'Venue not set'}{item.date ? ` · ${new Date(item.date).toLocaleDateString()}` : ''}</p><p className="mt-2 text-xs text-slate-500">Points: {item.scoringRules?.map((rule) => `${rule.label} (${rule.maxPoints})`).join(', ') || 'Not configured'}</p>{item.schedule?.startsAt && <p className="mt-2 text-xs text-slate-500">Schedule: {new Date(item.schedule.startsAt).toLocaleString()} - {item.schedule.endsAt ? new Date(item.schedule.endsAt).toLocaleString() : 'open'}</p>}</article>)}</div></div></section>;
}
