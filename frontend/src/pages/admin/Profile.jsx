import { useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ErrorBanner } from '../../components/common/UI';

export default function Profile() {
  const { admin } = useAdminAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match.');
    setSaving(true);
    try {
      await api.post('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return <section className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Account</p><h1 className="mt-1 text-2xl font-bold text-slate-900">Profile</h1><p className="mt-1 text-sm text-slate-500">{admin?.name} · @{admin?.username} · {admin?.role}</p></header>
    <div className="card max-w-xl p-6">
      <h2 className="text-base font-semibold text-slate-800">Change password</h2>
      {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
      {message && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
      <form onSubmit={submit} className="mt-5 space-y-4">
        <PasswordField label="Current password" value={form.currentPassword} onChange={(value) => setForm({ ...form, currentPassword: value })} />
        <PasswordField label="New password" value={form.newPassword} onChange={(value) => setForm({ ...form, newPassword: value })} />
        <PasswordField label="Confirm new password" value={form.confirmPassword} onChange={(value) => setForm({ ...form, confirmPassword: value })} />
        <button disabled={saving} className="btn-primary">{saving ? 'Updating…' : 'Update password'}</button>
      </form>
    </div>
  </section>;
}

function PasswordField({ label, value, onChange }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span><input className="input" type="password" minLength="8" value={value} onChange={(event) => onChange(event.target.value)} required /></label>;
}
