export default function InstitutionHeader() {
  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-slate-100 bg-slate-950 px-5 py-2.5 text-[11px] text-slate-200 md:px-7">
        <a
          href="https://www.swamipolytechnic.org/"
          target="_blank"
          rel="noreferrer"
          className="font-semibold tracking-wide text-white transition hover:text-brand-200"
        >
          www.swamipolytechnic.org
        </a>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
          <a href="tel:02181221321" className="transition hover:text-white">02181 221321</a>
          <a href="mailto:swamipolytechnic@gmail.com" className="transition hover:text-white">
            swamipolytechnic@gmail.com
          </a>
        </div>
      </div>

      <div className="flex items-start gap-4 px-5 py-5 md:items-center md:px-7 md:py-6">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-brand-600 text-sm font-extrabold tracking-tight text-white shadow-lg shadow-brand-600/20 md:h-14 md:w-14">
          SV
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 md:text-[11px]">
            SVSMD&apos;s
          </p>
          <h1 className="mt-1 text-sm font-extrabold leading-tight text-slate-900 md:text-lg">
            SHRI. VATVRUKSHA SWAMI MAHARAJ DEVASTHAN&apos;S
          </h1>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 md:text-sm">
            Kai. Kalyanrao (Balasaheb) Ingale Polytechnic, Akkalkot
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400 md:text-xs">
            604/2, Near Bhakta Niwas, Gangapur Road, Akkalkot, Dist. Solapur, Maharashtra - 413216
          </p>
        </div>
      </div>
    </header>
  );
}