import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../../api/client';
import { Loader, ErrorBanner } from '../../components/common/UI';
import { formatSeconds } from '../../utils/format';

export default function QuizAttempt() {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [timeNotice, setTimeNotice] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const savingRef = useRef(new Set());
  const violationRef = useRef(false);
  const fullscreenEnteredRef = useRef(false);

  const token = localStorage.getItem('aces_student_token');

  useEffect(() => {
    if (!token) {
      navigate('/quiz/join', { replace: true });
      return;
    }
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadSession() {
    setLoading(true);
    setError('');
    api
      .get('/quiz/session')
      .then((res) => {
        setAttempt(res.data.attempt);
        setQuestions(res.data.questions);
        setRemaining(res.data.attempt.remainingSeconds);
      })
      .catch((err) => {
        const code = err.response?.data?.error;
        if (code === 'time_expired') {
          handleSubmit(true);
        } else if (err.response?.status === 409) {
          navigate('/quiz/result', { replace: true });
        } else {
          setError(apiErrorMessage(err, 'Could not load your quiz session.'));
        }
      })
      .finally(() => setLoading(false));
  }

  // Countdown timer.
  useEffect(() => {
    if (!attempt || submitting) return;
    if (remaining <= 0) {
      handleSubmit(true);
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          handleSubmit(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, submitting]);

  useEffect(() => {
    if (remaining === 300) setTimeNotice('Five minutes remaining. Please review your answers.');
    if (remaining === 60) setTimeNotice('One minute remaining. Submit your quiz soon.');
  }, [remaining]);

  useEffect(() => {
    if (!attempt || submitting) return;

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden' && !violationRef.current) {
        violationRef.current = true;
        handleSubmit(true, 'tab_switch');
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, submitting]);

  useEffect(() => {
    function handleFullscreenChange() {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (fullscreenEnteredRef.current && !active && !violationRef.current) {
        violationRef.current = true;
        handleSubmit(true, 'fullscreen_exit');
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting]);

  const saveAnswer = useCallback(async (questionId, position) => {
    if (savingRef.current.has(questionId)) return;
    savingRef.current.add(questionId);
    try {
      await api.post('/quiz/answer', { questionId, position });
    } catch {
      // Non-fatal: the answer stays in local state; submit will still send
      // the latest selection since the option UI is optimistic below.
    } finally {
      savingRef.current.delete(questionId);
    }
  }, []);

  function selectOption(qIndex, position) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex], selectedPosition: position, answered: true };
      next[qIndex] = q;
      saveAnswer(q.questionId, position);
      return next;
    });
  }

  function toggleFlag(qIndex) {
    const question = questions[qIndex];
    const flagged = !question.flagged;
    setQuestions((prev) => prev.map((item, index) => (index === qIndex ? { ...item, flagged } : item)));
    api.post('/quiz/flag', { questionId: question.questionId, flagged }).catch(() => {});
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      fullscreenEnteredRef.current = true;
    } catch {
      setError('Fullscreen mode could not be enabled. Please allow it before continuing.');
    }
  }

  async function handleSubmit(auto = false, reason = '') {
    if (submitting) return;
    if (!auto && !window.confirm('Submit your quiz now? You cannot change answers after submitting.')) return;
    setSubmitting(true);
    setError(reason);
    try {
      const res = await api.post('/quiz/submit');
      localStorage.setItem('aces_result', JSON.stringify(res.data));
      navigate('/quiz/result', { replace: true });
    } catch (err) {
      if (err.response?.status === 409) {
        navigate('/quiz/result', { replace: true });
        return;
      }
      setError(apiErrorMessage(err, 'Could not submit your quiz. Please try again.'));
      setSubmitting(false);
    }
  }

  if (loading) return <Loader label="Loading your quiz…" />;
  if (error && !attempt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <ErrorBanner message={error} onRetry={loadSession} />
      </div>
    );
  }
  if (!attempt || questions.length === 0) return null;

  const q = questions[current];
  const answeredCount = questions.filter((x) => x.answered).length;
  const isLast = current === questions.length - 1;
  const urgent = remaining <= 60;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
        <div>
          <p className="text-xs text-slate-400">Round {attempt.roundNumber}</p>
          <p className="text-sm font-semibold text-slate-700">
            {answeredCount}/{questions.length} answered
          </p>
        </div>
        <div className={`rounded-lg px-3 py-1.5 text-lg font-bold tabular-nums ${urgent ? 'bg-red-100 text-red-600' : 'bg-brand-50 text-brand-700'}`}>
          {formatSeconds(remaining)}
        </div>
        {!isFullscreen && (
          <button type="button" onClick={enterFullscreen} className="btn-secondary px-3 py-1.5 text-xs">
            Enter fullscreen
          </button>
        )}
      </div>

      {timeNotice && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {timeNotice}
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
          Question {current + 1} of {questions.length} · {q.marks} mark{q.marks === 1 ? '' : 's'}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">{q.questionText}</h2>

        <button
          type="button"
          onClick={() => toggleFlag(current)}
          className={`mt-3 text-xs font-medium ${q.flagged ? 'text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {q.flagged ? 'Flagged for review' : 'Flag question for review'}
        </button>

        <div className="mt-5 space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectOption(current, i)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                q.selectedPosition === i
                  ? 'border-brand-500 bg-brand-50 font-medium text-brand-800'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="mr-2 font-semibold text-slate-400">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          ))}
        </div>

        {q.selectedPosition !== null && q.selectedPosition !== undefined && (
          <button
            onClick={() => selectOption(current, null)}
            className="mt-3 text-xs font-medium text-slate-400 underline underline-offset-2 hover:text-slate-600"
          >
            Clear selection
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button className="btn-secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          ← Previous
        </button>

        {!isLast ? (
          <button className="btn-primary" onClick={() => setCurrent((c) => c + 1)}>
            Next →
          </button>
        ) : (
          <button className="btn-primary" disabled={submitting} onClick={() => handleSubmit(false)}>
            {submitting ? 'Submitting…' : 'Submit Quiz'}
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-8 gap-2 sm:grid-cols-10">
        {questions.map((qq, i) => (
          <button
            key={qq.questionId}
            onClick={() => setCurrent(i)}
            className={`aspect-square rounded-md text-xs font-semibold ${
              i === current
                ? 'bg-brand-600 text-white'
                : qq.answered
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {qq.flagged ? `${i + 1} *` : i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
