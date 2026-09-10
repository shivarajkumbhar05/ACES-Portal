import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../api/client';
import { ErrorBanner, EmptyState } from '../../components/common/UI';

export default function Upload() {
  const [rounds, setRounds] = useState([]);
  const [roundId, setRoundId] = useState('');
  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [importedCount, setImportedCount] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    api.get('/admin/rounds').then((res) => {
      setRounds(res.data);
      if (res.data.length) setRoundId(res.data[0]._id);
    });
  }, []);

  function downloadTemplate() {
    api.get('/admin/upload/template', { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'question_upload_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  async function handleValidate(e) {
    e.preventDefault();
    if (!file || !roundId) return;
    setValidating(true);
    setError('');
    setReport(null);
    setImportedCount(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('roundId', roundId);
      const res = await api.post('/admin/upload/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReport(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not validate this file.'));
    } finally {
      setValidating(false);
    }
  }

  async function handleConfirm() {
    if (!report) return;
    setConfirming(true);
    setError('');
    try {
      const res = await api.post('/admin/upload/confirm', { batchToken: report.batchToken });
      setImportedCount(res.data.imported);
      setReport(null);
      setFile(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not import this batch. It may have expired — please re-upload.'));
    } finally {
      setConfirming(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bulk Upload Questions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload a CSV or XLSX file. Nothing is imported until you confirm the previewed batch.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
          </svg>
          Download CSV Template
        </button>
      </div>

      {/* ── Upload card ────────────────────────────── */}
      <div className="card overflow-hidden ring-1 ring-slate-900/5">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-700">Upload file</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Step 1 of 2 · Validate before importing
          </p>
        </div>

        <div className="space-y-4 p-6">
          {error && <ErrorBanner message={error} />}

          {importedCount !== null && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <svg className="mt-0.5 h-4 w-4 flex-none text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Import complete
                </p>
                <p className="mt-0.5 text-xs text-emerald-700/80">
                  Successfully imported {importedCount} question{importedCount === 1 ? '' : 's'}.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleValidate} className="space-y-4">
            {/* Round */}
            <div>
              <label className="label">Target round</label>
              <select
                className="input"
                value={roundId}
                onChange={(e) => setRoundId(e.target.value)}
                required
              >
                {rounds.map((r) => (
                  <option key={r._id} value={r._id}>
                    Round {r.roundNumber} — {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* File drop zone */}
            <div>
              <label className="label">Question file (.csv or .xlsx)</label>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                  dragOver
                    ? 'border-brand-400 bg-brand-50/60'
                    : file
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40'
                }`}
              >
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="sr-only"
                  required
                />

                {file ? (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB · click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 text-white shadow-lg shadow-brand-500/30">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      Drop your file here, or <span className="text-brand-600">browse</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Accepted formats: .csv, .xlsx, .xls
                    </p>
                  </>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={validating || !file}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {validating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Validating…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" />
                  </svg>
                  Validate File
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Report card ────────────────────────────── */}
      {report && (
        <div className="card overflow-hidden ring-1 ring-slate-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Validation report</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Step 2 of 2 · Review and confirm
              </p>
            </div>

            <button
              onClick={handleConfirm}
              disabled={confirming || report.validCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {confirming ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Importing…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Import ({report.validCount})
                </>
              )}
            </button>
          </div>

          <div className="space-y-6 p-6">
            {/* Summary tiles */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryTile label="Total rows" value={report.totalRows} tone="default" />
              <SummaryTile label="Valid" value={report.validCount} tone="success" />
              <SummaryTile label="Invalid" value={report.invalidCount} tone="danger" />
            </div>

            {/* Preview */}
            {report.preview?.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Preview
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    first {report.preview.length}
                  </span>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Question</th>
                        <th className="px-3 py-2 font-medium">Correct</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 font-medium">Difficulty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.preview.map((row, i) => (
                        <tr
                          key={i}
                          className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                        >
                          <td className="max-w-xs px-3 py-2 text-slate-700">
                            <p className="line-clamp-2">{row.questionText}</p>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              {row.correctAnswer}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {row.category}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <DifficultyPill difficulty={row.difficulty} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Invalid rows */}
            {report.invalidRows?.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-red-500">
                    Invalid rows
                  </h3>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-inset ring-red-200">
                    {report.invalidRows.length}
                  </span>
                  <div className="h-px flex-1 bg-red-100" />
                </div>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-red-100">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-red-50 text-left text-[10px] uppercase tracking-wider text-red-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Row</th>
                        <th className="px-3 py-2 font-medium">Reasons</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.invalidRows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-t border-red-100 transition-colors hover:bg-red-50/40"
                        >
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-red-200">
                              #{row.rowNumber}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-red-600">
                            <div className="flex flex-wrap gap-1">
                              {(row.reasons ?? []).map((reason, j) => (
                                <span
                                  key={j}
                                  className="inline-flex items-center rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-inset ring-red-200"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-6 text-center">
                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="mt-2 text-sm font-medium text-emerald-700">No invalid rows</p>
                <p className="mt-0.5 text-xs text-emerald-600/70">
                  All rows are ready to import.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Summary tile ──────────────────────────────────── */
function SummaryTile({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-50 ring-slate-200/70 text-slate-800',
    success: 'bg-emerald-50 ring-emerald-200/70 text-emerald-700',
    danger: 'bg-red-50 ring-red-200/70 text-red-600'
  };
  return (
    <div className={`rounded-xl px-4 py-3 ring-1 ring-inset ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-2xl font-bold leading-none">{value}</p>
    </div>
  );
}

/* ── Difficulty pill ───────────────────────────────── */
function DifficultyPill({ difficulty }) {
  const styles = {
    Easy: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 ring-amber-200',
    Hard: 'bg-red-50 text-red-600 ring-red-200'
  };
  const cls = styles[difficulty] ?? 'bg-slate-100 text-slate-500 ring-slate-200';
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${cls}`}>
      {difficulty}
    </span>
  );
}