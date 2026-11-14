import { useMemo, useState } from 'react';
import { Check, Eye, EyeOff, RotateCcw, X } from 'lucide-react';
import type { CaseQuestion, Lab, LabKind, LangMode } from '../../types/physiology.ts';
import { shuffleArray } from '../../utils/studyLogic.ts';

const btnBase =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring';
const btnPrimary = `${btnBase} bg-primary text-primary-fg hover:bg-primary-strong`;
const btnGhost = `${btnBase} bg-surface-2 hover:bg-surface`;

const KIND_LABEL: Record<LabKind, { ar: string; en: string }> = {
  explorer: { ar: 'مستكشف', en: 'Explorer' },
  slider: { ar: 'محاكي', en: 'Simulator' },
  builder: { ar: 'ترتيب', en: 'Builder' },
  matcher: { ar: 'توصيل', en: 'Matcher' },
  case: { ar: 'حالة سريرية', en: 'Case' },
  compare: { ar: 'مقارنة', en: 'Compare' },
  flow: { ar: 'مسار', en: 'Flow' },
};

function SelfCheck({ q, lang }: { q: CaseQuestion; lang: LangMode }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked !== null && picked === q.correct;
  return (
    <section className="mt-4 rounded-xl border border-line bg-surface-2 p-4" aria-label="اختبار ذاتي · Self-check">
      <p className="mb-2 text-sm font-bold text-primary">
        {lang === 'en' ? 'Self-check' : lang === 'ar' ? 'اختبار ذاتي' : 'اختبار ذاتي · Self-check'}
      </p>
      <p className="mb-3 text-sm font-semibold">
        {lang === 'en' ? <span className="latin">{q.promptEn}</span> : lang === 'ar' ? q.promptAr : <>{q.promptAr} <span className="latin text-muted">{q.promptEn}</span></>}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const state =
            picked === null
              ? 'border-line bg-surface hover:bg-surface-2'
              : i === q.correct
                ? 'border-success bg-success-soft'
                : i === picked
                  ? 'border-danger bg-danger-soft'
                  : 'border-line bg-surface opacity-60';
          return (
            <button
              key={i}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-colors ${state}`}
            >
              <span className="latin text-xs font-bold text-muted">{String.fromCharCode(65 + i)}</span>
              <span>{lang === 'en' ? <span className="latin">{opt.en}</span> : lang === 'ar' ? opt.ar : <>{opt.ar} <span className="latin text-muted">{opt.en}</span></>}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${correct ? 'border-success bg-success-soft' : 'border-danger bg-danger-soft'}`} role="status">
          <p className="mb-1 flex items-center gap-1 font-bold">
            {correct ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
            {correct ? 'إجابة صحيحة · Correct' : 'إجابة خاطئة · Incorrect'}
          </p>
          <p>
            {lang === 'en' ? <span className="latin">{q.explEn}</span> : lang === 'ar' ? q.explAr : <>{q.explAr}<br /><span className="latin text-muted">{q.explEn}</span></>}
          </p>
        </div>
      )}
    </section>
  );
}

function LabHeader({ lab, lang }: { lab: Lab; lang: LangMode }) {
  const kind = KIND_LABEL[lab.kind];
  return (
    <header className="mb-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
          {lang === 'en' ? <span className="latin">{kind.en}</span> : lang === 'ar' ? kind.ar : <>{kind.ar} · <span className="latin">{kind.en}</span></>}
        </span>
        <span className="latin text-xs text-muted">{lab.id}</span>
      </div>
      <h3 className="text-base font-bold">
        {lang === 'en' ? <span className="latin">{lab.titleEn}</span> : lang === 'ar' ? lab.titleAr : <>{lab.titleAr} <span className="latin text-muted">· {lab.titleEn}</span></>}
      </h3>
      <p className="mt-1 text-sm text-muted">
        {lang === 'en' ? <span className="latin">{lab.goalEn}</span> : lang === 'ar' ? lab.goalAr : <>{lab.goalAr}<br /><span className="latin">{lab.goalEn}</span></>}
      </p>
    </header>
  );
}

export function LabRunner({ lab, lang }: { lab: Lab; lang: LangMode }) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <LabHeader lab={lab} lang={lang} />
      {lab.kind === 'explorer' && <ExplorerView lab={lab} lang={lang} />}
      {lab.kind === 'slider' && <SliderView lab={lab} lang={lang} />}
      {lab.kind === 'builder' && <BuilderView lab={lab} lang={lang} />}
      {lab.kind === 'matcher' && <MatcherView lab={lab} lang={lang} />}
      {lab.kind === 'case' && <CaseView lab={lab} lang={lang} />}
      {lab.kind === 'compare' && <CompareView lab={lab} lang={lang} />}
      {lab.kind === 'flow' && <FlowView lab={lab} lang={lang} />}
      {lab.selfCheck && <SelfCheck q={lab.selfCheck} lang={lang} />}
    </article>
  );
}

function ExplorerView({ lab, lang }: { lab: Extract<Lab, { kind: 'explorer' }>; lang: LangMode }) {
  const [active, setActive] = useState<string | null>(null);
  const pin = lab.pins.find((p) => p.id === active) ?? null;
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
      <div className="relative overflow-hidden rounded-lg border border-line">
        <img src={`assets/images/${lab.image}`} alt={lang === 'en' ? lab.titleEn : lab.titleAr} className="w-full" />
        {lab.pins.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-label={lang === 'en' ? p.labelEn : p.labelAr}
            onClick={() => setActive(p.id === active ? null : p.id)}
            className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring ${
              p.id === active ? 'border-primary bg-primary text-primary-fg' : 'border-primary bg-surface text-primary'
            }`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.id.replace('p', '')}
          </button>
        ))}
      </div>
      <aside className="rounded-lg border border-line bg-surface-2 p-3">
        {pin ? (
          <>
            <p className="mb-1 text-sm font-bold">
              {lang === 'en' ? <span className="latin">{pin.labelEn}</span> : lang === 'ar' ? pin.labelAr : <>{pin.labelAr} <span className="latin text-muted">· {pin.labelEn}</span></>}
            </p>
            <p className="text-sm">
              {lang === 'en' ? <span className="latin">{pin.descEn}</span> : lang === 'ar' ? pin.descAr : <>{pin.descAr}<br /><span className="latin text-muted">{pin.descEn}</span></>}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">
            {lang === 'en' ? 'Tap a numbered pin on the diagram to see its name and description.' : lang === 'ar' ? 'اضغط على أي دبوس مرقّم في الرسم لعرض اسمه ووصفه.' : 'اضغط على أي دبوس مرقّم في الرسم لعرض اسمه ووصفه. · Tap a numbered pin on the diagram.'}
          </p>
        )}
      </aside>
    </div>
  );
}

function SliderView({ lab, lang }: { lab: Extract<Lab, { kind: 'slider' }>; lang: LangMode }) {
  const [value, setValue] = useState(lab.initial);
  const active = lab.outputs.filter((o) => {
    const r = o.at(value);
    return r !== '' && r !== 0;
  });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          {lang === 'en' ? <span className="latin">{lab.variableEn}</span> : lang === 'ar' ? lab.variableAr : <>{lab.variableAr} <span className="latin text-muted">· {lab.variableEn}</span></>}
        </span>
        <span className="latin rounded-lg bg-surface-2 px-3 py-1 font-mono font-bold text-primary">
          {value} {lab.unit}
        </span>
      </div>
      <input
        type="range"
        min={lab.min}
        max={lab.max}
        step={lab.step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label={lang === 'en' ? lab.variableEn : lab.variableAr}
        className="w-full accent-primary"
      />
      <div className="mt-2 flex justify-between text-xs text-muted latin">
        <span>{lab.min} {lab.unit}</span>
        <span>{lab.max} {lab.unit}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {active.map((o, i) => (
          <li key={i} className="rounded-lg border border-success bg-success-soft p-3 text-sm" role="status">
            {lang === 'en' ? <span className="latin">{o.en}</span> : lang === 'ar' ? o.ar : <>{o.ar}<br /><span className="latin text-muted">{o.en}</span></>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BuilderView({ lab, lang }: { lab: Extract<Lab, { kind: 'builder' }>; lang: LangMode }) {
  const shuffled = useMemo(() => shuffleArray(lab.steps), [lab]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const nextExpected = lab.steps[placed.length]?.id;
  const done = placed.length === lab.steps.length;
  const pick = (id: string) => {
    if (id === nextExpected) {
      setPlaced((prev) => [...prev, id]);
      setWrongId(null);
    } else {
      setWrongId(id);
    }
  };
  return (
    <div>
      <ol className="mb-3 space-y-2">
        {lab.steps.map((s, i) => {
          const isPlaced = placed.includes(s.id);
          return (
            <li key={s.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isPlaced ? 'border-success bg-success-soft' : 'border-line bg-surface-2'}`}>
              <span className={`latin flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isPlaced ? 'bg-success text-success-soft' : 'bg-surface text-muted'}`}>
                {isPlaced ? <Check size={14} aria-hidden /> : i + 1}
              </span>
              <span>{lang === 'en' ? <span className="latin">{s.en}</span> : lang === 'ar' ? s.ar : <>{s.ar} <span className="latin text-muted">{s.en}</span></>}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        {shuffled
          .filter((s) => !placed.includes(s.id))
          .map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s.id)}
              className={`${btnGhost} !px-3 !py-1.5 text-start text-xs ${wrongId === s.id ? 'border-danger bg-danger-soft' : ''}`}
            >
              {lang === 'en' ? <span className="latin">{s.en}</span> : lang === 'ar' ? s.ar : <>{s.ar} <span className="latin text-muted">{s.en}</span></>}
            </button>
          ))}
      </div>
      {wrongId && (
        <p className="mt-2 rounded-lg border border-danger bg-danger-soft p-2 text-sm" role="status">
          {lang === 'en' ? 'Not the next step in the sequence — try another one.' : lang === 'ar' ? 'ليست الخطوة التالية في التسلسل — جرّب خطوة أخرى.' : 'ليست الخطوة التالية في التسلسل — جرّب خطوة أخرى. · Not the next step in the sequence.'}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={btnGhost} onClick={() => { setPlaced([]); setWrongId(null); }} aria-label="إعادة · Reset">
          <RotateCcw size={16} aria-hidden />
          {lang === 'en' ? 'Reset' : lang === 'ar' ? 'إعادة' : 'إعادة · Reset'}
        </button>
        {done && (
          <p className="rounded-lg border border-success bg-success-soft px-3 py-2 text-sm font-bold" role="status">
            {lang === 'en' ? 'Correct order completed ✓' : lang === 'ar' ? 'اكتمل الترتيب الصحيح ✓' : 'اكتمل الترتيب الصحيح ✓ · Correct order completed'}
          </p>
        )}
      </div>
    </div>
  );
}

function MatcherView({ lab, lang }: { lab: Extract<Lab, { kind: 'matcher' }>; lang: LangMode }) {
  const rights = useMemo(() => shuffleArray(lab.pairs.map((_, i) => i)), [lab]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrongRight, setWrongRight] = useState<number | null>(null);
  const done = matched.length === lab.pairs.length;
  const pickRight = (ri: number) => {
    if (selectedLeft === null) return;
    if (ri === selectedLeft) {
      setMatched((prev) => [...prev, ri]);
      setSelectedLeft(null);
      setWrongRight(null);
    } else {
      setWrongRight(ri);
    }
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <ul className="space-y-2">
          {lab.pairs.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={matched.includes(i)}
                onClick={() => { setSelectedLeft(i); setWrongRight(null); }}
                className={`w-full rounded-lg border px-3 py-2 text-start text-sm transition-colors ${
                  matched.includes(i)
                    ? 'border-success bg-success-soft'
                    : selectedLeft === i
                      ? 'border-primary bg-primary-soft'
                      : 'border-line bg-surface-2 hover:bg-surface'
                }`}
              >
                {lang === 'en' ? <span className="latin">{p.leftEn}</span> : lang === 'ar' ? p.leftAr : <>{p.leftAr} <span className="latin text-muted">{p.leftEn}</span></>}
              </button>
            </li>
          ))}
        </ul>
        <ul className="space-y-2">
          {rights.map((ri) => {
            const p = lab.pairs[ri];
            return (
              <li key={ri}>
                <button
                  type="button"
                  disabled={matched.includes(ri) || selectedLeft === null}
                  onClick={() => pickRight(ri)}
                  className={`w-full rounded-lg border px-3 py-2 text-start text-sm transition-colors disabled:cursor-default ${
                    matched.includes(ri)
                      ? 'border-success bg-success-soft'
                      : wrongRight === ri
                        ? 'border-danger bg-danger-soft'
                        : 'border-line bg-surface-2 enabled:hover:bg-surface'
                  }`}
                >
                  {lang === 'en' ? <span className="latin">{p.rightEn}</span> : lang === 'ar' ? p.rightAr : <>{p.rightAr} <span className="latin text-muted">{p.rightEn}</span></>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {selectedLeft !== null && (
        <p className="mt-2 text-sm text-muted">
          {lang === 'en' ? 'Now tap the matching card on the other side.' : lang === 'ar' ? 'اختر الآن البطاقة المطابقة في العمود الآخر.' : 'اختر الآن البطاقة المطابقة في العمود الآخر. · Now tap the matching card on the other side.'}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={btnGhost} onClick={() => { setMatched([]); setSelectedLeft(null); setWrongRight(null); }} aria-label="إعادة · Reset">
          <RotateCcw size={16} aria-hidden />
          {lang === 'en' ? 'Reset' : lang === 'ar' ? 'إعادة' : 'إعادة · Reset'}
        </button>
        {done && (
          <p className="rounded-lg border border-success bg-success-soft px-3 py-2 text-sm font-bold" role="status">
            {lang === 'en' ? 'All pairs matched ✓' : lang === 'ar' ? 'تمت مطابقة جميع الأزواج ✓' : 'تمت مطابقة جميع الأزواج ✓ · All pairs matched'}
          </p>
        )}
      </div>
    </div>
  );
}

function CaseView({ lab, lang }: { lab: Extract<Lab, { kind: 'case' }>; lang: LangMode }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = lab.questions[idx];
  const correct = picked !== null && picked === q.correct;
  return (
    <div>
      <div className="mb-3 rounded-lg border border-line bg-surface-2 p-3 text-sm">
        {lang === 'en' ? <span className="latin">{lab.vignetteEn}</span> : lang === 'ar' ? lab.vignetteAr : <>{lab.vignetteAr}<br /><span className="latin text-muted">{lab.vignetteEn}</span></>}
      </div>
      <p className="mb-2 text-xs font-bold text-muted latin">{idx + 1} / {lab.questions.length}</p>
      <p className="mb-3 text-sm font-semibold">
        {lang === 'en' ? <span className="latin">{q.promptEn}</span> : lang === 'ar' ? q.promptAr : <>{q.promptAr} <span className="latin text-muted">{q.promptEn}</span></>}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((opt, i) => {
          const state =
            picked === null
              ? 'border-line bg-surface hover:bg-surface-2'
              : i === q.correct
                ? 'border-success bg-success-soft'
                : i === picked
                  ? 'border-danger bg-danger-soft'
                  : 'border-line bg-surface opacity-60';
          return (
            <button
              key={i}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-start text-sm transition-colors ${state}`}
            >
              <span className="latin text-xs font-bold text-muted">{String.fromCharCode(65 + i)}</span>
              <span>{lang === 'en' ? <span className="latin">{opt.en}</span> : lang === 'ar' ? opt.ar : <>{opt.ar} <span className="latin text-muted">{opt.en}</span></>}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${correct ? 'border-success bg-success-soft' : 'border-danger bg-danger-soft'}`} role="status">
          <p className="mb-1 flex items-center gap-1 font-bold">
            {correct ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
            {correct ? 'إجابة صحيحة · Correct' : 'إجابة خاطئة · Incorrect'}
          </p>
          <p>
            {lang === 'en' ? <span className="latin">{q.explEn}</span> : lang === 'ar' ? q.explAr : <>{q.explAr}<br /><span className="latin text-muted">{q.explEn}</span></>}
          </p>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={btnGhost}
          disabled={picked === null}
          onClick={() => { setIdx((i) => Math.min(i + 1, lab.questions.length - 1)); setPicked(null); }}
        >
          {lang === 'en' ? 'Next question' : lang === 'ar' ? 'السؤال التالي' : 'السؤال التالي · Next'}
        </button>
        <button type="button" className={btnGhost} onClick={() => { setIdx(0); setPicked(null); }} aria-label="إعادة · Restart case">
          <RotateCcw size={16} aria-hidden />
          {lang === 'en' ? 'Restart' : lang === 'ar' ? 'إعادة الحالة' : 'إعادة الحالة · Restart'}
        </button>
      </div>
    </div>
  );
}

function CompareView({ lab, lang }: { lab: Extract<Lab, { kind: 'compare' }>; lang: LangMode }) {
  const [revealed, setRevealed] = useState<number[]>([]);
  const allShown = revealed.length === lab.rows.length;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className="border border-line bg-surface-2 px-3 py-2 text-start"></th>
            <th scope="col" className="border border-line bg-surface-2 px-3 py-2 text-start font-bold">
              <BiCell bi={lab.leftTitle} lang={lang} />
            </th>
            <th scope="col" className="border border-line bg-surface-2 px-3 py-2 text-start font-bold">
              <BiCell bi={lab.rightTitle} lang={lang} />
            </th>
          </tr>
        </thead>
        <tbody>
          {lab.rows.map((row, i) => (
            <tr key={i}>
              <th scope="row" className="border border-line px-3 py-2 text-start font-semibold">
                <BiCell bi={row.aspect} lang={lang} />
              </th>
              <td className="border border-line px-3 py-2">
                <BiCell bi={row.left} lang={lang} />
              </td>
              <td className="border border-line px-3 py-2">
                {revealed.includes(i) ? (
                  <BiCell bi={row.right} lang={lang} />
                ) : (
                  <button type="button" onClick={() => setRevealed((prev) => [...prev, i])} className={`${btnGhost} !px-2 !py-1 text-xs`}>
                    <Eye size={14} aria-hidden />
                    {lang === 'en' ? 'Reveal' : lang === 'ar' ? 'اكشف' : 'اكشف · Reveal'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!allShown && (
        <button type="button" className={`${btnGhost} mt-3`} onClick={() => setRevealed(lab.rows.map((_, i) => i))}>
          <Eye size={16} aria-hidden />
          {lang === 'en' ? 'Reveal all' : lang === 'ar' ? 'اكشف الكل' : 'اكشف الكل · Reveal all'}
        </button>
      )}
      {allShown && (
        <button type="button" className={`${btnGhost} mt-3`} onClick={() => setRevealed([])} aria-label="إخفاء الكل · Hide all">
          <EyeOff size={16} aria-hidden />
          {lang === 'en' ? 'Hide all' : lang === 'ar' ? 'أخفِ الكل' : 'أخفِ الكل · Hide all'}
        </button>
      )}
    </div>
  );
}

function BiCell({ bi, lang }: { bi: { ar: string; en: string }; lang: LangMode }) {
  if (lang === 'en') return <span className="latin">{bi.en}</span>;
  if (lang === 'ar') return <span>{bi.ar}</span>;
  return (
    <span>
      {bi.ar} <span className="latin text-muted">{bi.en}</span>
    </span>
  );
}

function FlowView({ lab, lang }: { lab: Extract<Lab, { kind: 'flow' }>; lang: LangMode }) {
  const [shown, setShown] = useState(1);
  const allShown = shown >= lab.steps.length;
  return (
    <div>
      <ol className="space-y-2">
        {lab.steps.map((s, i) => {
          const visible = i < shown;
          return (
            <li
              key={i}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                visible ? 'border-primary bg-primary-soft' : 'border-line bg-surface-2'
              }`}
            >
              <p className="font-bold">
                <span className="latin me-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-fg">{i + 1}</span>
                <BiCell bi={s.title} lang={lang} />
              </p>
              {visible && (
                <p className="mt-1 ps-7">
                  <BiCell bi={s.detail} lang={lang} />
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex gap-2">
        <button type="button" className={btnPrimary} disabled={allShown} onClick={() => setShown((n) => n + 1)}>
          {lang === 'en' ? 'Reveal next step' : lang === 'ar' ? 'اكشف الخطوة التالية' : 'اكشف الخطوة التالية · Next step'}
        </button>
        {!allShown && (
          <button type="button" className={btnGhost} onClick={() => setShown(lab.steps.length)}>
            {lang === 'en' ? 'Reveal all' : lang === 'ar' ? 'اكشف الكل' : 'اكشف الكل · Reveal all'}
          </button>
        )}
        <button type="button" className={btnGhost} onClick={() => setShown(1)} aria-label="إعادة · Restart flow">
          <RotateCcw size={16} aria-hidden />
          {lang === 'en' ? 'Restart' : lang === 'ar' ? 'إعادة' : 'إعادة · Restart'}
        </button>
      </div>
    </div>
  );
}
