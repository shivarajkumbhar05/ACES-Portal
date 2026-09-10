# ACES Quiz Competition — Backend (MERN: MongoDB + Express + Node)

Backend API for the ACES Quiz Competition Management System (Engineer's Day 2026).
This is the **M-E-N** of MERN — pair it with a React frontend calling these endpoints.

## Stack

- **MongoDB** (Mongoose ODM)
- **Express** + **Node.js**
- JWT auth (separate secrets/scopes for admins vs. students)
- bcrypt password/exam-code hashing
- Socket.io for live-dashboard refresh signals
- Multer + xlsx + csv-parse for question bank uploads
- helmet, express-rate-limit, express-mongo-sanitize for hardening

## 1. Setup

```bash
cd backend
cp .env.example .env      # edit MONGODB_URI, JWT secrets, seed admin credentials
npm install
npm run seed               # creates the 4 departments + bootstrap super admin
npm run dev                # or `npm start`
```

Requires a running MongoDB instance — local (`mongodb://127.0.0.1:27017/aces_quiz`) or
a hosted cluster (MongoDB Atlas connection string).

**Use a unique `SEED_ADMIN_PASSWORD` before running in production, and change it again
via a proper "change password" flow after first login** (not included by default —
add an admin self-service endpoint if you need one).

## 2. Folder structure

```
src/
  config/         db connection, app-wide constants
  models/         Mongoose schemas (Department, Admin, Student, Question,
                   QuizRound, Attempt, Qualification, AuditLog)
  middleware/     auth guards, rate limiters, error handler
  services/       scoring.service.js (server-side grading),
                   qualification.service.js (Top-5-per-department + tie-break)
  utils/          jwt, shuffle, validators, question file parser, seed script
  routes/
    auth.routes.js       admin login
    public.routes.js     departments, round status, institution/committee info
    quiz.routes.js        STUDENT flow: verify/start, session, answer, submit, result
    admin/
      dashboard.routes.js    stats + live leaderboard
      questions.routes.js    question bank CRUD
      upload.routes.js       xlsx/csv bulk upload (validate -> confirm)
      settings.routes.js     per-round quiz configuration + start/end
      results.routes.js      live results table + per-student detail
      qualification.routes.js Round 2 Top-5-per-department + finalize/override
      participants.routes.js registered students + their attempts
      reports.routes.js      CSV exports
  app.js          Express app wiring
  server.js       entrypoint (HTTP + Socket.io)
```

## 3. Core design decisions (why it's built this way)

- **No registration/accounts.** A `Student` document is created transparently
  the moment someone enters the quiz with (name, roll number, department) —
  there is no login/password for students, matching the spec.
- **Exam code is hashed** (bcrypt) on `QuizRound`, exactly like a credential.
  It is never returned to the client (`toSafeJSON()` strips it).
- **One attempt per (student, round)** is enforced by a unique Mongo index on
  `Attempt { student, round }`, not just application logic.
- **Server is authoritative for time and score.** `deadlineAt` is computed at
  attempt-start and stored; `/quiz/answer` and `/quiz/submit` both re-check
  `Date.now()` against it server-side. The final score is always recomputed
  from the `Question.correctAnswer` field on submit — the client never sends
  a score, only which option position it picked.
- **Answer options are shuffled server-side per attempt** and the mapping
  (`optionOrder`) is stored on the attempt, not derivable by the client. The
  correct answer is never included in any student-facing payload.
- **Round 2 gating**: `/quiz/verify` for `roundNumber=2` checks a `Qualification`
  record with `finalized: true, qualified: true` before an attempt is created.
- **Deterministic tie-break** (`qualification.service.js`): highest score →
  lowest time taken → earliest submission timestamp → otherwise flagged
  `tieBreakReason` for manual admin resolution via
  `PUT /api/admin/qualification/round2/:id`.
- **Upload is two-phase**: `POST /upload/validate` parses and validates only
  (nothing hits the DB), returning a `batchToken` + counts + a preview.
  `POST /upload/confirm` is a separate, explicit step that actually inserts —
  nothing is ever silently imported.

## 4. API reference

All admin routes require `Authorization: Bearer <adminToken>` from
`POST /api/auth/login`. All in-quiz student routes require
`Authorization: Bearer <studentToken>` returned by `POST /api/quiz/verify`.

### Public
- `GET  /api/public/departments`
- `GET  /api/public/rounds/status`
- `GET  /api/public/institution`

### Auth
- `POST /api/auth/login` `{ username, password }`
- `GET  /api/auth/me`

### Student quiz flow
- `POST /api/quiz/verify` `{ name, rollNumber, departmentId, examCode, roundNumber }`
  → creates/resumes an attempt, returns `{ token, attempt, questions }`
- `GET  /api/quiz/session` → current question set + `remainingSeconds`
- `POST /api/quiz/answer` `{ questionId, position }` (position `0-3` or `null`)
- `POST /api/quiz/submit` → server-graded result
- `GET  /api/quiz/result` → re-fetch personal result (+ qualification status if Round 1)

### Admin — dashboard
- `GET /api/admin/dashboard/stats?round=1`
- `GET /api/admin/dashboard/leaderboard?round=1&department=<id>`

### Admin — question bank
- `GET    /api/admin/questions?round=&search=&category=&difficulty=&page=&limit=`
- `GET    /api/admin/questions/categories`
- `GET    /api/admin/questions/:id`
- `POST   /api/admin/questions`
- `PUT    /api/admin/questions/:id`
- `DELETE /api/admin/questions/:id`

### Admin — bulk upload
- `GET  /api/admin/upload/template` → downloadable CSV template
- `POST /api/admin/upload/validate` (multipart: `file`, `roundId`) → preview + `batchToken`
- `POST /api/admin/upload/confirm` `{ batchToken }` → actually inserts

### Admin — round settings
- `GET  /api/admin/rounds`
- `GET  /api/admin/rounds/:roundNumber`
- `PUT  /api/admin/rounds/:roundNumber` (create or update settings; `examCode` optional on update)
- `POST /api/admin/rounds/:roundNumber/start`
- `POST /api/admin/rounds/:roundNumber/end`

### Admin — live results
- `GET /api/admin/results?round=&department=&status=&minScore=&from=&to=&page=&limit=`
- `GET /api/admin/results/:attemptId` → question-by-question detail

### Admin — Round 2 qualification
- `GET  /api/admin/qualification/round2` → per-department Top-5 (draft or finalized)
- `POST /api/admin/qualification/round2/finalize` `{ departmentId? }`
- `PUT  /api/admin/qualification/round2/:id` `{ qualified }` (manual tie resolution, pre-finalize only)
- `POST /api/admin/qualification/round2/unlock` `{ departmentId? }` (super admin only)

### Admin — participants
- `GET /api/admin/participants?department=&search=&page=&limit=`

### Admin — reports (CSV)
- `GET /api/admin/reports/participants`
- `GET /api/admin/reports/results/:roundNumber`
- `GET /api/admin/reports/department-results`
- `GET /api/admin/reports/round2-qualifiers`
- `GET /api/admin/reports/final-leaderboard`

## 5. Live updates

The server emits Socket.io events `participant:started` and `attempt:completed`
on the default namespace whenever a student starts/submits. Dashboard socket
connections authenticate with the admin JWT before joining the admin room. The
frontend re-fetches the relevant REST endpoint rather than trusting socket data.

## 6. Production checklist

- Set `NODE_ENV=production`, `CLIENT_ORIGIN`, and `TRUST_PROXY` for the deployment.
- Use long, different random values for `JWT_ADMIN_SECRET` and `JWT_STUDENT_SECRET`.
- Use MongoDB Atlas or another managed MongoDB deployment with network access restricted to the API server.
- Run `npm run seed` once with a unique bootstrap password, then rotate that password after first login.
- Serve the frontend and API over HTTPS and configure the reverse proxy to forward WebSocket upgrades.
- Keep `.env` out of source control; deploy it through the hosting provider's secret/environment settings.

## 7. Typical setup flow

```
POST /api/auth/login                          (get admin token)
PUT  /api/admin/rounds/1                       (configure Round 1 + exam code)
POST /api/admin/upload/validate  -> confirm    (load 100-question bank)
POST /api/admin/rounds/1/start
...students take the quiz via /api/quiz/*...
POST /api/admin/rounds/1/end
GET  /api/admin/qualification/round2           (review Top-5-per-dept draft)
POST /api/admin/qualification/round2/finalize
PUT  /api/admin/rounds/2                       (configure Round 2 + exam code)
POST /api/admin/rounds/2/start
...20 qualified students take Round 2...
POST /api/admin/rounds/2/end
GET  /api/admin/reports/final-leaderboard
```
