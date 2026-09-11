import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../../api/client';
import { Loader, ErrorBanner } from '../../components/common/UI';
import { formatSeconds } from '../../utils/format';

export default function QuizResult() {
  const navigate = useNavigate();
  const [result, setResult] = useState(() => {
    const cached = localStorage.getItem('aces_result');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('aces_student_token');
    if (!token) {
      navigate('/quiz/join', { replace: true });
      return;
    }
    if (result) return;
    api
      .get('/quiz/result')
      .then((res) => setResult(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load your result.')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loader label="Loading your result…" />;
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!result) return null;

  const scoreKnown = result.score !== null && result.score !== undefined;
  const disqualified = result.status === 'disqualified';

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="card p-6 text-center">
        <p className={`text-xs font-semibold uppercase tracking-wide ${disqualified ? 'text-red-600' : 'text-brand-600'}`}>
          {disqualified ? 'Attempt Disqualified' : `Round ${result.roundNumber} Complete`}
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">Thank you, {result.student?.name}!</h1>
        <p className="text-sm text-slate-500">
          {result.student?.rollNumber} · {result.student?.department}
        </p>

        {disqualified ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            This attempt was ended because the exam rules were violated. You cannot start this round again.
          </div>
        ) : scoreKnown ? (
          <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-brand-50 px-8 py-5">
            <p className="text-4xl font-extrabold text-brand-700">
              {result.score}
              <span className="text-lg font-medium text-brand-400">/{result.maxScore}</span>
            </p>
            <p className="mt-1 text-sm text-brand-600">{Number(result.percentage).toFixed(1)}%</p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">Your score will be announced by the committee.</p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-emerald-50 px-3 py-2">
            <p className="font-bold text-emerald-700">{result.correctAnswers}</p>
            <p className="text-xs text-emerald-500">Correct</p>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-2">
            <p className="font-bold text-red-700">{result.wrongAnswers}</p>
            <p className="text-xs text-red-500">Wrong</p>
          </div>
          <div className="rounded-lg bg-slate-100 px-3 py-2">
            <p className="font-bold text-slate-600">{result.unanswered}</p>
            <p className="text-xs text-slate-400">Skipped</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400">Time taken: {formatSeconds(result.timeTakenSeconds)}</p>

        {result.qualification && (
          <div
            className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${
              result.qualification.qualified ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {result.qualification.qualified
              ? `Congratulations! You qualified for Round 2 (Rank #${result.qualification.rank} in your department).`
              : 'You did not qualify for Round 2. Thank you for participating!'}
          </div>
        )}

        <Link to="/" className="btn-secondary mt-6 inline-flex">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
