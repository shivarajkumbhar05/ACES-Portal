import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { apiErrorMessage } from '../api/client';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const raw = localStorage.getItem('aces_admin_profile');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aces_admin_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setAdmin(res.data);
        localStorage.setItem('aces_admin_profile', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('aces_admin_token');
        localStorage.removeItem('aces_admin_profile');
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('aces_admin_token', res.data.token);
      localStorage.setItem('aces_admin_profile', JSON.stringify(res.data.admin));
      setAdmin(res.data.admin);
      return { ok: true, role: res.data.admin.role };
    } catch (err) {
      return { ok: false, message: apiErrorMessage(err, 'Invalid username or password') };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aces_admin_token');
    localStorage.removeItem('aces_admin_profile');
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, isSuperAdmin: admin?.role === 'super_admin' }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
