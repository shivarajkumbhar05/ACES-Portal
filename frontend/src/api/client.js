import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL
});

// Attaches the right bearer token depending on which "space" of the app is
// making the request: admin routes use the admin token, student quiz routes
// use the per-attempt student token. Both are kept in localStorage.
api.interceptors.request.use((config) => {
  const isAdminRoute = config.url?.startsWith('/admin') || config.url?.startsWith('/auth');
  const token = isAdminRoute
    ? localStorage.getItem('aces_admin_token')
    : localStorage.getItem('aces_student_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const isAdminRoute = err.config?.url?.startsWith('/admin') || err.config?.url?.startsWith('/auth');
    if (status === 401 && isAdminRoute) {
      localStorage.removeItem('aces_admin_token');
      localStorage.removeItem('aces_admin_profile');
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

/** Extracts a human-readable error message from an axios error. */
export function apiErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.response?.data?.message || err?.response?.data?.error || fallback;
}

export default api;
