import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiErrorMessage } from '../../api/client';
import { Loader, ErrorBanner } from '../../components/common/UI';
import { formatSeconds } from '../../utils/format';

export default function QuizResult() {
  const navigate = useNavigate();
  const [result, setResult] = useState(() => {
    const cached = localStorage.getItem('aces_result');
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return { ...parsed, score: null, maxScore: null, percentage: null };
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
        ) : (
          <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-sm font-medium text-brand-800">
            Thank you for participating in the ACES Quiz. Your response has been recorded.
          </div>
        )}

        <Link to="/" className="btn-secondary mt-6 inline-flex">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
