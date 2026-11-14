import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronLeft, ChevronRight, Download, RotateCcw, Search, Upload, X } from 'lucide-react';
import type {
  ChapterMeta,
  FlashcardItem,
  GlossaryTerm,
  ImageItem,
  LangMode,
  ReferenceTable,
  SpotterItem,
} from '../../types/physiology.ts';
import { gradeSpotter, searchCurriculum, shuffleArray } from '../../utils/studyLogic.ts';
import { BiText } from '../BiText.tsx';
import { PartALabs } from '../labs/PartALabs.tsx';
import { PartBLabs } from '../labs/PartBLabs.tsx';
import { RefTable } from '../RefTable.tsx';

export function ModalShell({
  titleAr,
  titleEn,
  lang,
  onClose,
  children,
  wide = false,
}: {
  titleAr: string;
  titleEn: string;
  lang: LangMode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={titleAr}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl ${
          wide ? 'sm:max-w-4xl' : 'sm:max-w-2xl'
        }`}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="min-w-0 truncate text-base font-bold">
            {lang === 'en' ? (
              <span className="latin">{titleEn}</span>
            ) : lang === 'ar' ? (
              titleAr
            ) : (
              <>
                {titleAr} <span className="latin text-muted">· {titleEn}</span>
              </>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة · Close dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 hover:bg-surface"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </motion.div>
    </div>
  );
}

export function ChapterFilter({
  chapters,
  value,
  onChange,
  lang,
  label,
}: {
  chapters: readonly ChapterMeta[];
  value: string;
  onChange: (v: string) => void;
  lang: LangMode;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
    >
      <option value="">كل الفصول · All chapters</option>
      {chapters.map((c) => (
        <option key={c.id} value={c.id}>
          {lang === 'en' ? `${c.num}. ${c.en}` : lang === 'ar' ? `${c.num}. ${c.ar}` : `${c.num}. ${c.ar} · ${c.en}`}
        </option>
      ))}
    </select>
  );
}

const btnBase =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring';
const btnPrimary = `${btnBase} bg-primary text-primary-fg hover:bg-primary-strong`;
const btnGhost = `${btnBase} bg-surface-2 hover:bg-surface`;

interface SpottersModalProps {
  spotters: readonly SpotterItem[];
  images: readonly ImageItem[];
  chapters: readonly ChapterMeta[];
  lang: LangMode;
  initialChapter: string | null;
  onFinish: (chKey: string, percentage: number) => void;
  onClose: () => void;
}

export function SpottersModal({
  spotters,
  images,
  chapters,
  lang,
  initialChapter,
  onFinish,
  onClose,
}: SpottersModalProps) {
  const [ch, setCh] = useState(initialChapter ?? '');
  const [phase, setPhase] = useState<'setup' | 'run' | 'done'>('setup');
  const [pool, setPool] = useState<SpotterItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongIds, setWrongIds] = useState<number[]>([]);

  const available = useMemo(
    () => (ch ? spotters.filter((s) => s.ch === ch) : [...spotters]),
    [ch, spotters],
  );

  const start = (list: readonly SpotterItem[]) => {
    setPool([...list]);
    setIdx(0);
    setSelected(null);
    setCorrectCount(0);
    setWrongIds([]);
    setPhase('run');
  };

  const current = pool[idx];
  const image = current ? images.find((i) => i.id === current.imageId) : undefined;

  const answer = (option: number) => {
    if (selected !== null || !current) return;
    setSelected(option);
    if (gradeSpotter(current, option)) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrongIds((w) => [...w, current.id]);
    }
  };

  const next = () => {
    if (idx + 1 >= pool.length) {
      const pct = pool.length === 0 ? 0 : Math.round((correctCount / pool.length) * 100);
      onFinish(`spotters:${ch || 'all'}`, pct);
      setPhase('done');
    } else {
      setIdx((i) => i + 1);
      setSelected(null);
    }
  };

  return (
    <ModalShell titleAr="امتحان السبوتر العملي" titleEn="Spotter Exam" lang={lang} onClose={onClose} wide>
      {phase === 'setup' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            صورة مع نقطة (pin) — اختر ما يشير إليه. · An image with a pin — choose what it points to.
          </p>
          <ChapterFilter chapters={chapters} value={ch} onChange={setCh} lang={lang} label="اختيار الفصل" />
          <p className="mono text-sm text-muted">{available.length} أسئلة متاحة · available</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={available.length === 0} onClick={() => start(available)}>
              ابدأ الامتحان · Start
            </button>
            {available.length > 4 && (
              <button type="button" className={btnGhost} onClick={() => start(shuffleArray(available))}>
                ابدأ بترتيب عشوائي · Shuffle
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'run' && current && image && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="mono text-muted">
              {idx + 1}/{pool.length}
            </span>
            <span className="mono text-muted">✓ {correctCount}</span>
          </div>
          <div className="relative mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface-2">
            <img
              src={`assets/images/${image.file}`}
              alt={lang === 'en' ? image.en : image.ar}
              className="block w-full"
              draggable={false}
            />
            <span
              aria-hidden="true"
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${current.pinX}%`, top: `${current.pinY}%` }}
            >
              <span className="block h-5 w-5 rounded-full border-2 border-white bg-danger shadow-md" />
            </span>
          </div>
          <p className="font-bold">
            <BiText bi={{ ar: current.promptAr, en: current.promptEn }} lang={lang} />
          </p>
          <div className="grid gap-2">
            {current.options.map((opt, i) => {
              const isCorrect = i === current.correct;
              const isPicked = i === selected;
              let cls = `${btnBase} justify-start bg-surface-2 text-start hover:bg-surface`;
              if (selected !== null) {
                if (isCorrect) cls = `${btnBase} justify-start bg-success-soft text-start`;
                else if (isPicked) cls = `${btnBase} justify-start bg-danger-soft text-start`;
              }
              return (
                <button key={i} type="button" className={cls} onClick={() => answer(i)} disabled={selected !== null}>
                  <span className="mono me-2 opacity-70">{'ABCD'[i]}</span>
                  <BiText bi={opt} lang={lang} />
                  {selected !== null && isCorrect && <Check size={16} className="ms-auto shrink-0" />}
                  {selected !== null && isPicked && !isCorrect && <X size={16} className="ms-auto shrink-0" />}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm">
              <p className="mb-1 font-bold">
                {selected === current.correct ? '✓ صحيح · Correct' : '✗ خطأ · Incorrect'}
              </p>
              <BiText bi={{ ar: current.explAr, en: current.explEn }} lang={lang} />
            </div>
          )}
          <div className="flex justify-end">
            <button type="button" className={btnPrimary} onClick={next} disabled={selected === null}>
              {idx + 1 >= pool.length ? 'النتيجة · Finish' : 'التالي · Next'}
              <ChevronLeft size={16} className="rtl:hidden" />
              <ChevronRight size={16} className="hidden rtl:inline" />
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="space-y-4 text-center">
          <p className="text-4xl font-black mono">{pool.length === 0 ? 0 : Math.round((correctCount / pool.length) * 100)}%</p>
          <p className="text-sm">
            {correctCount}/{pool.length} صحيحة · correct
          </p>
          {wrongIds.length > 0 && (
            <p className="text-sm text-muted">أسئلة خاطئة: {wrongIds.length} · wrong answers</p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className={btnPrimary} onClick={() => setPhase('setup')}>
              <RotateCcw size={16} /> جلسة جديدة · New session
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

export function knownCardKey(card: FlashcardItem): string {
  return `${card.ch}:${card.term}`;
}

interface FlashcardsModalProps {
  flashcards: readonly FlashcardItem[];
  chapters: readonly ChapterMeta[];
  lang: LangMode;
  initialChapter: string | null;
  knownCards: readonly string[];
  onToggleKnown: (key: string) => void;
  onClose: () => void;
}

export function FlashcardsModal({
  flashcards,
  chapters,
  lang,
  initialChapter,
  knownCards,
  onToggleKnown,
  onClose,
}: FlashcardsModalProps) {
  const [ch, setCh] = useState(initialChapter ?? '');
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const deck = useMemo(() => {
    const filtered = ch ? flashcards.filter((c) => c.ch === ch) : [...flashcards];
    return shuffleArray(filtered);
  }, [ch, flashcards]);

  const card = deck[idx];
  const knownSet = new Set(knownCards);
  const knownCount = deck.filter((c) => knownSet.has(knownCardKey(c))).length;

  const move = (delta: number) => {
    setFlipped(false);
    setIdx((i) => (deck.length === 0 ? 0 : (i + delta + deck.length) % deck.length));
  };

  const mark = (know: boolean) => {
    if (card) onToggleKnown(knownCardKey(card));
    move(know ? 1 : 1);
  };

  return (
    <ModalShell titleAr="البطاقات التعليمية" titleEn="Flashcards" lang={lang} onClose={onClose}>
      <div className="space-y-4">
        <ChapterFilter
          chapters={chapters}
          value={ch}
          onChange={(v) => {
            setCh(v);
            setIdx(0);
            setFlipped(false);
          }}
          lang={lang}
          label="اختيار الفصل"
        />
        <p className="mono text-sm text-muted">
          {knownCount}/{deck.length} أعرفها · known · بطاقة {deck.length === 0 ? 0 : idx + 1}
        </p>
        {card ? (
          <>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label="قلب البطاقة · Flip card"
              className="flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-primary/40 bg-surface-2 p-6 text-center transition-colors hover:bg-surface"
            >
              {flipped ? (
                <>
                  <p className="text-sm latin">{card.enDef}</p>
                  <p className="text-base">{card.arDef}</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold">{card.arTerm}</p>
                  <p className="latin text-base text-primary">{card.term}</p>
                  <span className="text-xs text-muted">اضغط لقلب البطاقة · Tap to flip</span>
                </>
              )}
            </button>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className={`${btnGhost} text-danger`} onClick={() => mark(false)}>
                <X size={16} /> لا أعرفها · Don't know
              </button>
              <button type="button" className={`${btnGhost}`} onClick={() => move(-1)} aria-label="البطاقة السابقة">
                السابقة · Prev
              </button>
              <button type="button" className={`${btnGhost}`} onClick={() => move(1)} aria-label="البطاقة التالية">
                التالية · Next
              </button>
              <button type="button" className={`${btnPrimary} text-primary-fg`} onClick={() => mark(true)}>
                <Check size={16} /> أعرفها · Know it
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">لا توجد بطاقات لهذا الفصل · No cards for this chapter</p>
        )}
      </div>
    </ModalShell>
  );
}

interface GalleryModalProps {
  images: readonly ImageItem[];
  chapters: readonly ChapterMeta[];
  lang: LangMode;
  onClose: () => void;
}

export function GalleryModal({ images, chapters, lang, onClose }: GalleryModalProps) {
  const [ch, setCh] = useState('');
  const [lightbox, setLightbox] = useState<ImageItem | null>(null);
  const filtered = useMemo(() => (ch ? images.filter((i) => i.ch === ch) : [...images]), [ch, images]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [lightbox]);

  return (
    <ModalShell titleAr="معرض الصور" titleEn="Image Gallery" lang={lang} onClose={onClose} wide>
      <div className="space-y-4">
        <ChapterFilter chapters={chapters} value={ch} onChange={setCh} lang={lang} label="فلترة بالفصل" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setLightbox(img)}
              className="overflow-hidden rounded-xl border border-line bg-surface-2 text-start transition-colors hover:bg-surface focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src={`assets/images/${img.file}`}
                alt={img.ar}
                loading="lazy"
                className="block h-28 w-full object-cover"
              />
              <span className="block p-2">
                <span className="mono block text-[10px] text-muted">Plate #{img.id}</span>
                <span className="block truncate text-xs font-semibold">{lang === 'en' ? img.en : img.ar}</span>
                <span className="latin block truncate text-[10px] text-muted">{img.en}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.ar}
        >
          <img
            src={`assets/images/${lightbox.file}`}
            alt={lightbox.ar}
            className="max-h-[75dvh] max-w-full rounded-xl object-contain"
          />
          <p className="mono text-xs text-white/70">Plate #{lightbox.id}</p>
          <p className="max-w-2xl text-center text-sm text-white">
            {lang === 'en' ? lightbox.en : lightbox.ar}
            {lang !== 'en' && <span className="latin block text-xs text-white/70">{lightbox.en}</span>}
          </p>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="إغلاق العرض المكبر"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </ModalShell>
  );
}

interface GlossaryModalProps {
  glossary: readonly GlossaryTerm[];
  lang: LangMode;
  onClose: () => void;
}

export function GlossaryModal({ glossary, lang, onClose }: GlossaryModalProps) {
  const [query, setQuery] = useState('');
  const results = useMemo(
    () =>
      searchCurriculum(
        query,
        glossary,
        (t) => ({ ar: `${t.arTerm} ${t.defAr}`, en: `${t.term} ${t.defEn}` }),
        200,
      ),
    [query, glossary],
  );
  const shown = query.trim() === '' ? glossary : results;

  return (
    <ModalShell titleAr="قاموس المصطلحات" titleEn="Glossary" lang={lang} onClose={onClose}>
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مصطلح… · Search term…"
            aria-label="بحث في القاموس"
            className="w-full rounded-lg border border-line bg-surface-2 py-2 pe-3 ps-9 text-sm focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <p className="mono text-xs text-muted">{shown.length} مصطلح · terms</p>
        <ul className="space-y-2">
          {shown.map((t) => (
            <li key={t.id} className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="font-bold">
                {t.arTerm} <span className="latin text-sm text-primary">{t.term}</span>
              </p>
              <BiText bi={{ ar: t.defAr, en: t.defEn }} lang={lang} className="text-sm" />
            </li>
          ))}
          {shown.length === 0 && <li className="text-sm text-muted">لا نتائج · No results</li>}
        </ul>
      </div>
    </ModalShell>
  );
}

interface TablesModalProps {
  tables: readonly ReferenceTable[];
  chapters: readonly ChapterMeta[];
  lang: LangMode;
  onClose: () => void;
}

export function TablesModal({ tables, chapters, lang, onClose }: TablesModalProps) {
  const [ch, setCh] = useState('');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    let list = ch ? tables.filter((t) => t.ch === ch) : [...tables];
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.titleAr.toLowerCase().includes(q) || t.titleEn.toLowerCase().includes(q) || t.group.toLowerCase().includes(q),
      );
    }
    return list;
  }, [ch, query, tables]);

  return (
    <ModalShell titleAr="الجداول المرجعية" titleEn="Reference Tables" lang={lang} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <ChapterFilter chapters={chapters} value={ch} onChange={setCh} lang={lang} label="فلترة بالفصل" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بعنوان الجدول… · Search title…"
            aria-label="بحث في الجداول"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <p className="mono text-xs text-muted">{filtered.length} جدول · tables</p>
        {filtered.map((t) => (
          <div key={t.id}>
            <p className="mono mb-1 text-[10px] text-muted">{t.group}</p>
            <RefTable table={t} lang={lang} />
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted">لا نتائج · No results</p>}
      </div>
    </ModalShell>
  );
}

interface NotesModalProps {
  chapters: readonly ChapterMeta[];
  lang: LangMode;
  notes: Record<string, string>;
  onNoteChange: (ch: string, text: string) => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  onClose: () => void;
}

export function NotesModal({ chapters, lang, notes, onNoteChange, onExport, onImportFile, onClose }: NotesModalProps) {
  const [ch, setCh] = useState(chapters[0]?.id ?? '');
  const fileRef = useRef<HTMLInputElement>(null);
  const value = notes[ch] ?? '';

  return (
    <ModalShell titleAr="ملاحظاتي" titleEn="My Notes" lang={lang} onClose={onClose}>
      <div className="space-y-4">
        <ChapterFilter chapters={chapters} value={ch} onChange={setCh} lang={lang} label="اختيار الفصل" />
        <textarea
          value={value}
          onChange={(e) => onNoteChange(ch, e.target.value)}
          rows={10}
          aria-label="ملاحظات الفصل"
          placeholder="اكتب ملاحظاتك هنا… تُحفظ تلقائيًا · Notes are saved automatically"
          className="w-full resize-y rounded-xl border border-line bg-surface-2 p-3 text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted">تُحفظ الملاحظات تلقائيًا في هذا الجهاز · Saved automatically on this device</p>
        <hr className="border-line" />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={onExport}>
            <Download size={16} /> تصدير تقدمي · Export progress
          </button>
          <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> استيراد تقدمي · Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="اختيار ملف التقدم"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>
    </ModalShell>
  );
}

const SHORTCUTS: Array<{ keys: string; ar: string; en: string }> = [
  { keys: '/', ar: 'فتح البحث العام', en: 'Open global search' },
  { keys: 'Q', ar: 'بنك أسئلة MCQ', en: 'MCQ quiz bank' },
  { keys: 'S', ar: 'امتحان السبوتر', en: 'Spotter exam' },
  { keys: 'Escape', ar: 'إغلاق النوافذ/القوائم', en: 'Close dialogs/menus' },
  { keys: '؟', ar: 'عرض هذه النافذة', en: 'Show this dialog' },
];

export function ShortcutsModal({ lang, onClose }: { lang: LangMode; onClose: () => void }) {
  return (
    <ModalShell titleAr="اختصارات لوحة المفاتيح" titleEn="Keyboard Shortcuts" lang={lang} onClose={onClose}>
      <ul className="space-y-2">
        {SHORTCUTS.map((s) => (
          <li key={s.keys} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-sm">
            <kbd className="mono rounded-md border border-line bg-surface px-2 py-1 text-xs font-bold">{s.keys}</kbd>
            <BiText bi={{ ar: s.ar, en: s.en }} lang={lang} />
          </li>
        ))}
      </ul>
    </ModalShell>
  );
}

export function LabsModal({ lang, onClose }: { lang: LangMode; onClose: () => void }) {
  const [tab, setTab] = useState<'A' | 'B'>('A');
  const tabs: Array<{ key: 'A' | 'B'; ar: string; en: string }> = [
    { key: 'A', ar: 'الجزء A', en: 'Part A' },
    { key: 'B', ar: 'الجزء B', en: 'Part B' },
  ];
  return (
    <ModalShell titleAr="المعامل التفاعلية" titleEn="Interactive Labs" lang={lang} onClose={onClose} wide>
      <div className="mb-4 flex gap-2" role="tablist" aria-label="أجزاء المعامل · Lab parts">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? btnPrimary : btnGhost}
          >
            {lang === 'en' ? <span className="latin">{t.en}</span> : lang === 'ar' ? t.ar : <>{t.ar} · <span className="latin">{t.en}</span></>}
          </button>
        ))}
      </div>
      <div className="overflow-y-auto pe-1" role="tabpanel">
        {tab === 'A' ? <PartALabs lang={lang} /> : <PartBLabs lang={lang} />}
      </div>
    </ModalShell>
  );
}
