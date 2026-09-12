import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, Loader } from '../../components/common/UI';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export default function ControlRoom() {
  const [data, setData] = useState(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get('/admin/control-room').then((res) => setData(res.data)).catch((err) => setError(apiErrorMessage(err, 'Could not load control room.')));
  }, []);

  useEffect(load, [load]);
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], auth: { token: localStorage.getItem('aces_admin_token') } });
    socket.on('connect', () => { setLive(true); socket.emit('admin:subscribe'); });
    socket.on('disconnect', () => setLive(false));
    socket.on('participant:started', load);
    socket.on('attempt:completed', load);
    return () => socket.disconnect();
  }, [load]);

  if (!data) return error ? <ErrorBanner message={error} onRetry={load} /> : <Loader label="Opening live control room…" />;
  const checkedInPercent = data.attendance.total ? Math.round((data.attendance.checkedIn / data.attendance.total) * 100) : 0;

  return <section className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Event operations</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Live control room</h1><p className="mt-1 text-sm text-slate-500">One operational view for MCQ, Prompt Rush, judging, attendance, and event activity.</p></div>
      <div className="flex items-center gap-2"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${live ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />{live ? 'Live updates on' : 'Polling mode'}</span><button onClick={load} className="btn-secondary text-xs">Refresh</button></div>
    </header>
    {error && <ErrorBanner message={error} onRetry={load} />}

    <div className="grid gap-4 md:grid-cols-4"><Metric label="MCQ active" value={data.mcq.active} detail={`${data.mcq.completed} completed`} tone="blue" /><Metric label="Prompt Rush judged" value={data.promptRush.judgedParticipants} detail={`${data.promptRush.totalScores} score entries`} tone="violet" /><Metric label="Attendance" value={`${checkedInPercent}%`} detail={`${data.attendance.checkedIn}/${data.attendance.total} checked in`} tone="emerald" /><Metric label="Disqualified" value={data.mcq.disqualified} detail="MCQ attempts" tone="rose" /></div>

    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-800">Competition command</h2><p className="text-xs text-slate-500">Current schedule, pause state, and allocation coverage.</p></div><span className="badge bg-brand-50 text-brand-700">{data.competitions.length} events</span></div><div className="divide-y divide-slate-100">{data.competitions.map((item) => <div key={item.id} className="px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-800">{item.name}</p><p className="mt-0.5 text-xs uppercase tracking-wide text-brand-600">{item.type} · {item.status}</p></div><span className={`badge ${item.schedule?.isPaused ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.schedule?.isPaused ? 'Paused' : 'Running'}</span></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-3"><span>Allocated <b className="text-slate-800">{item.participantsAllocated}</b></span><span>Points <b className="text-slate-800">{item.scoringRules?.reduce((sum, rule) => sum + rule.maxPoints, 0) || 0}</b></span><span>{item.schedule?.startsAt ? new Date(item.schedule.startsAt).toLocaleString() : 'Schedule not set'}</span></div></div>)}</div></section>
      <section className="card overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-800">Active MCQ attempts</h2><p className="text-xs text-slate-500">Live exam monitoring and violation watch.</p></div>{data.activeAttempts.length ? <div className="divide-y divide-slate-100">{data.activeAttempts.map((item) => <div key={item.rollNumber} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-medium text-slate-800">{item.student}</p><p className="text-xs text-slate-500">{item.rollNumber} · Due {new Date(item.deadlineAt).toLocaleTimeString()}</p></div><span className={`text-xs font-semibold ${item.violationCount ? 'text-rose-600' : 'text-emerald-600'}`}>{item.violationCount ? `${item.violationCount} flags` : 'Clear'}</span></div>)}</div> : <p className="px-5 py-8 text-sm text-slate-500">No active MCQ attempts.</p>}</section>
    </div>

    <div className="grid gap-6 xl:grid-cols-2"><Leaderboard title="MCQ leaderboard" items={data.mcq.topScore} scoreLabel="Score" renderScore={(item) => `${item.score}/${item.maxScore}`} /><Leaderboard title="Prompt Rush leaderboard" items={data.promptRush.leaderboard} scoreLabel="Average score" renderScore={(item) => `${item.score.toFixed(1)}/${data.promptRush.maxScore}`} /></div>

    <section className="card overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-800">Recent activity</h2><p className="text-xs text-slate-500">Administrative actions and event changes.</p></div>{data.activity.length ? <div className="divide-y divide-slate-100">{data.activity.map((item, index) => <div key={`${item.createdAt}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><span className="font-medium text-slate-700">{item.action}</span><span className="text-xs text-slate-500">{item.admin || 'System'} · {new Date(item.createdAt).toLocaleString()}</span></div>)}</div> : <p className="px-5 py-8 text-sm text-slate-500">No activity recorded yet.</p>}</section>
  </section>;
}

function Metric({ label, value, detail, tone }) { const colors = { blue: 'border-sky-200 bg-sky-50 text-sky-700', violet: 'border-violet-200 bg-violet-50 text-violet-700', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700', rose: 'border-rose-200 bg-rose-50 text-rose-700' }; return <div className={`rounded-2xl border p-4 ${colors[tone]}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs opacity-75">{detail}</p></div>; }
function Leaderboard({ title, items, renderScore }) { return <section className="card overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-800">{title}</h2></div>{items.length ? <div className="divide-y divide-slate-100">{items.map((item, index) => <div key={`${item.rollNumber}-${index}`} className="flex items-center gap-3 px-5 py-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{item.rank || index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{item.student}</p><p className="text-xs text-slate-500">{item.rollNumber}{item.judgeCount ? ` · ${item.judgeCount} judges` : ''}</p></div><span className="font-mono text-sm font-semibold text-brand-700">{renderScore(item)}</span></div>)}</div> : <p className="px-5 py-8 text-sm text-slate-500">No scores yet.</p>}</section>; }
