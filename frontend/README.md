# ACES Quiz Competition — Frontend (React + Vite + Tailwind)

React frontend for the ACES Quiz Competition Management System, built to pair with the
`aces-quiz-backend-mern` Express/MongoDB API.

## 1. Setup

```bash
cd frontend
cp .env.example .env      # set VITE_API_URL / VITE_SOCKET_URL to point at your backend
npm install
npm run dev                # http://localhost:5173
```

Make sure the backend is running (see the backend's own README) and that
`CLIENT_ORIGIN` in the backend's `.env` matches this app's origin (e.g.
`http://localhost:5173`) so CORS allows requests through.

## 2. Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build locally
```

## 3. Structure

```
src/
  api/client.js            axios instance; auto-attaches admin or student
                            bearer token depending on the route
  context/AdminAuthContext.jsx   admin session state (login/logout/me)
  components/
    common/UI.jsx           shared building blocks (Loader, Modal, StatCard, ...)
    layout/AdminLayout.jsx  admin sidebar/nav shell
  routes/ProtectedRoute.jsx  redirects to /admin/login if not authenticated
  pages/
    public/
      Home.jsx              landing page: event info + round status
      JoinQuiz.jsx          student entry form -> POST /api/quiz/verify
      QuizAttempt.jsx       timed quiz UI, autosaves answers, auto-submits
      QuizResult.jsx        post-submit result + Round 2 qualification status
    admin/
      Login.jsx             admin login -> POST /api/auth/login
      Dashboard.jsx         live stats + leaderboard (Socket.io refresh signals)
      Questions.jsx         question bank CRUD
      Upload.jsx            two-phase CSV/XLSX bulk upload (validate -> confirm)
      Rounds.jsx            per-round settings, create/update, start/end
      Results.jsx           filterable results table + per-attempt detail view
      Qualification.jsx     Round 2 Top-5-per-department review + finalize/unlock
      Participants.jsx      registered students + their attempt statuses
      Reports.jsx           CSV export buttons for all report endpoints
```

## 4. Notes on how it matches the backend

- **No student accounts.** `JoinQuiz` collects name/roll number/department/exam
  code and hits `/api/quiz/verify` directly; the returned per-attempt JWT is
  stored in `localStorage` under `aces_student_token` and used for all
  subsequent `/api/quiz/*` calls.
- **Server-authoritative timer.** The countdown in `QuizAttempt` is seeded
  from `remainingSeconds` returned by the server and auto-submits at zero,
  but the server independently re-checks `deadlineAt` on every `/answer` and
  `/submit` call — the client timer is just UX, not the source of truth.
- **Answers autosave** on selection via `POST /api/quiz/answer`; nothing is
  scored client-side.
- **Admin auth** uses a separate token (`aces_admin_token`) and role
  (`admin` vs `super_admin`) — the "Unlock" action on the Qualification page
  only renders for super admins, matching the backend's `requireSuperAdmin`.
- **Bulk upload** mirrors the two-step API exactly: `validate` returns a
  `batchToken` + preview and writes nothing; `confirm` performs the insert.
- **Live dashboard** connects to Socket.io and listens for
  `participant:started` / `attempt:completed` broadcast events to know when
  to re-fetch stats/leaderboard — no sensitive data is ever read from the
  socket itself, only used as a "something changed, refetch" signal.

## 5. Environment variables

| Variable          | Description                                   | Default                     |
|-------------------|------------------------------------------------|------------------------------|
| `VITE_API_URL`    | Base URL of the backend REST API              | `http://localhost:4000/api` |
| `VITE_SOCKET_URL` | Base URL for the Socket.io connection         | `http://localhost:4000`     |
