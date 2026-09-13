import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'judge' });
  const [notice, setNotice] = useState({ message: '', role: 'judge' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    api.get('/staff')
      .then((res) => setStaff(res.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/staff', form);
      setForm({ name: '', username: '', password: '', role: 'judge' });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function sendNotification(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/staff/notifications', { message: notice.message, role: notice.role });
      setNotice({ message: '', role: 'judge' });
      setError('');
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function toggle(item) {
    try {
      await api.patch(`/staff/${item._id}/status`, { isActive: !item.isActive });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function toggleClock(item) {
    try {
      await api.post(`/staff/${item._id}/time-clock`);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  if (loading) return <Loader label="Loading staff…" />;
  return <section className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">People</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Staff accounts</h1><p className="mt-1 text-sm text-slate-500">Create separate credentials for judges and volunteers.</p></header>
    {error && <ErrorBanner message={error} />}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
      <div className="space-y-4">
        <form onSubmit={create} className="card space-y-4 p-6">
          <h2 className="font-semibold text-slate-800">Add staff member</h2>
          <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input className="input" type="password" minLength="8" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="judge">Judge</option><option value="volunteer">Volunteer</option><option value="admin">Admin</option></select>
          <button className="btn-primary">Create account</button>
        </form>

        <form onSubmit={sendNotification} className="card space-y-4 p-6">
          <h2 className="font-semibold text-slate-800">Send notification</h2>
          <textarea className="input" rows="3" placeholder="Notification message" value={notice.message} onChange={(e) => setNotice({ ...notice, message: e.target.value })} required />
          <select className="input" value={notice.role} onChange={(e) => setNotice({ ...notice, role: e.target.value })}>
            <option value="judge">Judges</option>
            <option value="volunteer">Volunteers</option>
            <option value="admin">Admins</option>
          </select>
          <button className="btn-secondary">Send notification</button>
        </form>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-800">Current staff</div>
        <div className="divide-y divide-slate-100">
          {staff.map((item) => (
            <div key={item._id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">@{item.username} · {item.role}</p>
                <p className="mt-1 text-[11px] text-slate-500">{item.timeClock?.state === 'in' ? 'Clocked in' : 'Clocked out'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleClock(item)} className="btn-secondary text-xs">{item.timeClock?.state === 'in' ? 'Clock out' : 'Clock in'}</button>
                <button onClick={() => toggle(item)} className="btn-secondary text-xs">{item.isActive ? 'Disable' : 'Enable'}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>;
}
