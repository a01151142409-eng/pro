import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import type { ChapterMeta, LangMode, QuizQuestion } from '../../types/physiology.ts';
import { buildQuizPool, gradeQuiz, shuffleArray } from '../../utils/studyLogic.ts';
import { BiText } from '../BiText.tsx';
import { ChapterFilter, ModalShell } from './StudyModals.tsx';

const COUNT_OPTIONS = [10, 20, 30] as const;

const btnBase =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring';
const btnPrimary = `${btnBase} bg-primary text-primary-fg hover:bg-primary-strong`;
const btnGhost = `${btnBase} bg-surface-2 hover:bg-surface`;

interface QuizModalProps {
  questions: readonly QuizQuestion[];
  chapters: readonly ChapterMeta[];
  lang: LangMode;
  initialChapter: string | null;
  wrongIds: readonly number[];
  onFinish: (chKey: string, percentage: number, wrongIds: number[]) => void;
  onClose: () => void;
}

export function QuizModal({
  questions,
  chapters,
  lang,
  initialChapter,
  wrongIds,
  onFinish,
  onClose,
}: QuizModalProps) {
  const [ch, setCh] = useState(initialChapter ?? '');
  const [count, setCount] = useState<number | null>(10);
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [phase, setPhase] = useState<'setup' | 'run' | 'done'>('setup');
  const [pool, setPool] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);

  const available = useMemo(() => {
    let list = ch ? questions.filter((q) => q.ch === ch) : [...questions];
    if (onlyWrong) list = list.filter((q) => wrongIds.includes(q.id));
    return list;
  }, [ch, questions, onlyWrong, wrongIds]);

  const start = (source: readonly QuizQuestion[], shuffled: boolean) => {
    const limited = count === null ? [...source] : source.slice(0, count);
    const built = shuffled
      ? buildQuizPool({ questions: limited, rng: Math.random })
      : [...limited];
    setPool(built);
    setAnswers(built.map(() => null));
    setIdx(0);
    setPhase('run');
  };

  const current = pool[idx];
  const result = useMemo(() => gradeQuiz(pool, answers), [pool, answers]);
  const answeredAll = answers.length > 0 && answers.every((a) => a !== null);
  const revealed = answers[idx] !== null && answers[idx] !== undefined;

  const pick = (option: number) => {
    if (revealed || !current) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = option;
      return next;
    });
  };

  const next = () => {
    if (idx + 1 >= pool.length) {
      onFinish(`quiz:${ch || 'all'}`, result.percentage, result.wrongIds);
      setPhase('done');
    } else {
      setIdx((i) => i + 1);
    }
  };

  return (
    <ModalShell titleAr="بنك الأسئلة MCQ" titleEn="MCQ Quiz Bank" lang={lang} onClose={onClose}>
      {phase === 'setup' && (
        <div className="space-y-4">
          <ChapterFilter chapters={chapters} value={ch} onChange={setCh} lang={lang} label="اختيار الفصل" />
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold">عدد الأسئلة · Number of questions</legend>
            <div className="flex flex-wrap gap-2">
              {COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  aria-pressed={count === n}
                  className={`${btnBase} ${count === n ? 'bg-primary text-primary-fg' : 'bg-surface-2 hover:bg-surface'}`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCount(null)}
                aria-pressed={count === null}
                className={`${btnBase} ${count === null ? 'bg-primary text-primary-fg' : 'bg-surface-2 hover:bg-surface'}`}
              >
                الكل · All
              </button>
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyWrong}
              onChange={(e) => setOnlyWrong(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            إعادة الأسئلة الخاطئة فقط · Retry wrong answers only ({wrongIds.length})
          </label>
          <p className="mono text-sm text-muted">{available.length} سؤال متاح · available</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={available.length === 0}
              onClick={() => start(available, true)}
            >
              ابدأ (عشوائي) · Start shuffled
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={available.length === 0}
              onClick={() => start(available, false)}
            >
              ابدأ (بالترتيب) · Start ordered
            </button>
          </div>
        </div>
      )}

      {phase === 'run' && current && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="mono text-muted">
              {idx + 1}/{pool.length}
            </span>
            <span className="mono text-muted">
              ✓ {result.correct} · ✗ {result.total - result.correct - answers.slice(idx).filter((a) => a === null).length}
            </span>
          </div>
          <p className="font-bold leading-relaxed">
            <BiText bi={{ ar: current.qAr, en: current.qEn }} lang={lang} />
          </p>
          <div className="grid gap-2">
            {current.options.map((opt, i) => {
              const isCorrect = i === current.correct;
              const isPicked = i === answers[idx];
              let cls = `${btnBase} justify-start bg-surface-2 text-start hover:bg-surface`;
              if (revealed) {
                if (isCorrect) cls = `${btnBase} justify-start bg-success-soft text-start`;
                else if (isPicked) cls = `${btnBase} justify-start bg-danger-soft text-start`;
              }
              return (
                <button key={i} type="button" className={cls} onClick={() => pick(i)} disabled={revealed}>
                  <span className="mono me-2 opacity-70">{'ABCD'[i]}</span>
                  <BiText bi={opt} lang={lang} />
                  {revealed && isCorrect && <Check size={16} className="ms-auto shrink-0" />}
                  {revealed && isPicked && !isCorrect && <X size={16} className="ms-auto shrink-0" />}
                </button>
              );
            })}
          </div>
          {revealed && (
            <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
              <p className="mb-1 font-bold">
                {answers[idx] === current.correct ? '✓ صحيح · Correct' : '✗ خطأ · Incorrect'}
              </p>
              <BiText bi={{ ar: current.explAr, en: current.explEn }} lang={lang} />
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className={btnGhost}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
            >
              <ChevronRight size={16} className="rtl:hidden" />
              <ChevronLeft size={16} className="hidden rtl:inline" />
              السابق · Prev
            </button>
            <button type="button" className={btnPrimary} onClick={next} disabled={!revealed}>
              {idx + 1 >= pool.length ? 'النتيجة · Finish' : 'التالي · Next'}
              <ChevronLeft size={16} className="rtl:hidden" />
              <ChevronRight size={16} className="hidden rtl:inline" />
            </button>
          </div>
          {answeredAll && idx + 1 < pool.length && (
            <p className="text-center text-xs text-muted">أجبت على كل الأسئلة — يمكنك إنهاء الاختبار من أي سؤال · All answered</p>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4 text-center">
          <p className="text-5xl font-black mono">{result.percentage}%</p>
          <p className="text-sm">
            {result.correct}/{result.total} صحيحة · correct
          </p>
          {result.wrongIds.length > 0 ? (
            <p className="text-sm text-danger">أسئلة خاطئة: {result.wrongIds.length} — يمكنك إعادة اختبارها من الإعداد</p>
          ) : (
            <p className="text-sm text-success">لا أسئلة خاطئة — أحسنت! · All correct!</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {result.wrongIds.length > 0 && (
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setOnlyWrong(true);
                  setCh('');
                  setCount(null);
                  const wrongPool = questions.filter((q) => result.wrongIds.includes(q.id));
                  start(shuffleArray(wrongPool), false);
                }}
              >
                <RotateCcw size={16} /> إعادة الخاطئة فقط · Retry wrong
              </button>
            )}
            <button type="button" className={btnGhost} onClick={() => setPhase('setup')}>
              جلسة جديدة · New session
            </button>
            <button type="button" className={btnGhost} onClick={onClose}>
              إغلاق · Close
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}
