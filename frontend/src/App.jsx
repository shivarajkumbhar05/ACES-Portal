import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

import Home from './pages/public/Home';
import JoinQuiz from './pages/public/JoinQuiz';
import QuizAttempt from './pages/public/QuizAttempt';
import QuizResult from './pages/public/QuizResult';

import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Questions from './pages/admin/Questions';
import Upload from './pages/admin/Upload';
import Rounds from './pages/admin/Rounds';
import Results from './pages/admin/Results';
import Qualification from './pages/admin/Qualification';
import Participants from './pages/admin/Participants';
import Reports from './pages/admin/Reports';
import Profile from './pages/admin/Profile';
import Staff from './pages/admin/Staff';
import Judging from './pages/staff/Judging';
import Attendance from './pages/staff/Attendance';
import Competitions from './pages/admin/CompetitionsPanel';
import AttendanceAllocation from './pages/admin/AttendanceAllocation';
import Schedules from './pages/admin/Schedules';

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          {/* Public / student routes */}
          <Route path="/" element={<Home />} />
          <Route path="/quiz/join" element={<JoinQuiz />} />
          <Route path="/quiz/attempt" element={<QuizAttempt />} />
          <Route path="/quiz/result" element={<QuizResult />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/staff/login" element={<Login staffMode />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="questions" element={<Questions />} />
            <Route path="upload" element={<Upload />} />
            <Route path="rounds" element={<Rounds />} />
            <Route path="results" element={<Results />} />
            <Route path="qualification" element={<Qualification />} />
            <Route path="participants" element={<Participants />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<Profile />} />
            <Route path="staff" element={<ProtectedRoute requireSuperAdmin><Staff /></ProtectedRoute>} />
            <Route path="competitions" element={<ProtectedRoute requireSuperAdmin><Competitions /></ProtectedRoute>} />
            <Route path="attendance-allocation" element={<ProtectedRoute requireSuperAdmin><AttendanceAllocation /></ProtectedRoute>} />
            <Route path="schedules" element={<ProtectedRoute requireSuperAdmin><Schedules /></ProtectedRoute>} />
            <Route path="judging" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'judge']}><Judging /></ProtectedRoute>} />
            <Route path="attendance" element={<ProtectedRoute allowedRoles={['super_admin', 'admin', 'volunteer']}><Attendance /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
