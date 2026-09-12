import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

export default function Publication() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  function load() { api.get('/admin/competitions').then((res) => setItems(res.data)).catch((err) => setError(apiErrorMessage(err))); }
  useEffect(load, []);
  async function publish(item) { try { await api.post(`/admin/competitions/${item._id}/publish-results`); load(); } catch (err) { setError(apiErrorMessage(err)); } }
  if (!items) return <Loader label="Loading publication controls…" />;
  return <section className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Results control</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Publish final results</h1><p className="mt-1 text-sm text-slate-500">Results stay private until the administrator publishes them.</p></header>{error && <ErrorBanner message={error} />}<div className="grid gap-4 md:grid-cols-2">{items.map((item) => <article className="card p-5" key={item._id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-800">{item.name}</h2><p className="mt-1 text-xs uppercase tracking-wide text-brand-600">{item.type}</p></div><span className={`badge ${item.resultsPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.resultsPublished ? 'Published' : 'Private'}</span></div><p className="mt-4 text-sm text-slate-500">{item.resultsPublished ? `Published ${new Date(item.resultsPublishedAt).toLocaleString()}` : 'Judges and admins can review scores before publication.'}</p>{!item.resultsPublished && <button className="btn-primary mt-4" onClick={() => publish(item)}>Publish official results</button>}</article>)}</div></section>;
}
