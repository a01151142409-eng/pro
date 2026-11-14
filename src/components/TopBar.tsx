import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Keyboard, Languages, ListChecks, Layers, Minus, Moon, Plus, Search, Sun, X } from 'lucide-react';
import type { ChapterMeta, GlossaryTerm, LangMode, SubjectMeta, ThemeMode, TopicContent } from '../types/physiology.ts';
import { searchCurriculum } from '../utils/studyLogic.ts';
import { BiText } from './BiText.tsx';

const LANG_LABEL: Record<LangMode, string> = { ar: 'ع', both: 'ع+EN', en: 'EN' };
const MIN_FONT = 13;
const MAX_FONT = 21;

interface TopBarProps {
  meta: SubjectMeta;
  chapters: ChapterMeta[];
  topics: TopicContent[];
  glossary: GlossaryTerm[];
  lang: LangMode;
  theme: ThemeMode;
  fontSize: number;
  onCycleLang: () => void;
  onToggleTheme: () => void;
  onFontSize: (delta: number) => void;
  onOpenQuiz: () => void;
  onOpenFlashcards: () => void;
  onOpenShortcuts: () => void;
  onNavigate: (chapterId: string, topicId?: string) => void;
}

interface Hit {
  kind: 'topic' | 'glossary';
  ch: string;
  titleAr: string;
  titleEn: string;
  detailAr: string;
  detailEn: string;
  topicId?: string;
}

export function TopBar({
  meta,
  chapters,
  topics,
  glossary,
  lang,
  theme,
  fontSize,
  onCycleLang,
  onToggleTheme,
  onFontSize,
  onOpenQuiz,
  onOpenFlashcards,
  onOpenShortcuts,
  onNavigate,
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (e.key === '/' && !typing && !searchOpen) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [searchOpen]);

  const chapterById = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);

  const hits = useMemo<Hit[]>(() => {
    if (!query.trim()) return [];
    const topicHits = searchCurriculum(
      query,
      topics,
      (t) => ({ ar: `${t.ar} ${t.arBody.join(' ')}`, en: `${t.en} ${t.enBody.join(' ')}` }),
      25,
    ).map<Hit>((t) => ({
      kind: 'topic',
      ch: t.ch,
      topicId: t.id,
      titleAr: t.ar,
      titleEn: t.en,
      detailAr: chapterById.get(t.ch)?.ar ?? '',
      detailEn: chapterById.get(t.ch)?.en ?? '',
    }));
    const glossaryHits = searchCurriculum(
      query,
      glossary,
      (g) => ({ ar: `${g.arTerm} ${g.defAr}`, en: `${g.term} ${g.defEn}` }),
      15,
    ).map<Hit>((g) => ({
      kind: 'glossary',
      ch: g.ch,
      titleAr: g.arTerm,
      titleEn: g.term,
      detailAr: g.defAr,
      detailEn: g.defEn,
    }));
    return [...topicHits, ...glossaryHits];
  }, [query, topics, glossary, chapterById]);

  const go = (hit: Hit) => {
    onNavigate(hit.ch, hit.topicId);
    setSearchOpen(false);
  };

  const iconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-fg transition-colors hover:bg-surface-2 hover:text-primary';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-1.5 px-3 sm:gap-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg" aria-hidden="true">
            <Activity size={20} />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold sm:text-base">
              <BiText bi={{ ar: meta.ar, en: meta.en }} lang={lang} enClassName="latin" />
            </p>
            <p className="hidden truncate text-xs text-muted md:block">
              <BiText bi={{ ar: meta.collegeAr, en: meta.collegeEn }} lang={lang} enClassName="latin" />
            </p>
          </div>
        </div>

        <div className="flex-1" />

        <button type="button" className={iconBtn} aria-label="بحث عام — افتح بالضغط على /" onClick={() => setSearchOpen(true)}>
          <Search size={18} />
        </button>
        <button type="button" className={iconBtn} aria-label="تبديل اللغة (عربي / الاتنين / إنجليزي)" onClick={onCycleLang}>
          <span className="flex items-center gap-1">
            <Languages size={16} />
            <span className="mono text-xs font-semibold">{LANG_LABEL[lang]}</span>
          </span>
        </button>
        <button
          type="button"
          className={iconBtn}
          aria-label={theme === 'dark' ? 'تبديل إلى الثيم الفاتح' : 'تبديل إلى الثيم الداكن'}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="hidden items-center gap-1 sm:flex" role="group" aria-label="حجم الخط">
          <button type="button" className={iconBtn} aria-label="تصغير الخط" disabled={fontSize <= MIN_FONT} onClick={() => onFontSize(-1)}>
            <Minus size={16} />
          </button>
          <span className="mono w-10 text-center text-xs text-muted" aria-live="polite">{fontSize}px</span>
          <button type="button" className={iconBtn} aria-label="تكبير الخط" disabled={fontSize >= MAX_FONT} onClick={() => onFontSize(1)}>
            <Plus size={16} />
          </button>
        </div>
        <button type="button" className={iconBtn} aria-label="بنك الأسئلة MCQ (اختصار Q)" onClick={onOpenQuiz}>
          <ListChecks size={18} />
        </button>
        <button type="button" className={iconBtn} aria-label="البطاقات التعليمية" onClick={onOpenFlashcards}>
          <Layers size={18} />
        </button>
        <button type="button" className={`${iconBtn} hidden sm:inline-flex`} aria-label="اختصارات الكيبورد" onClick={onOpenShortcuts}>
          <Keyboard size={18} />
        </button>
      </div>

      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60" role="dialog" aria-modal="true" aria-label="البحث العام" onClick={() => setSearchOpen(false)}>
          <div
            className="mx-auto mt-16 w-[min(92vw,640px)] overflow-hidden rounded-xl border border-line bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <Search size={18} className="text-primary" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في المواضيع والمصطلحات… (Search topics and terms)"
                className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted"
                aria-label="نص البحث"
              />
              <button type="button" className={iconBtn} aria-label="إغلاق البحث" onClick={() => setSearchOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60dvh] overflow-y-auto p-2">
              {query.trim() && hits.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted">لا نتائج مطابقة (No matching results)</p>
              )}
              {!query.trim() && (
                <p className="px-3 py-6 text-center text-sm text-muted">
                  اكتب للبحث في {topics.length} موضوعًا و{glossary.length} مصطلحًا — Type to search
                </p>
              )}
              <ul>
                {hits.map((hit, i) => (
                  <li key={`${hit.kind}-${hit.ch}-${hit.topicId ?? 'g'}-${i}`}>
                    <button
                      type="button"
                      onClick={() => go(hit)}
                      className="w-full rounded-lg px-3 py-2 text-start transition-colors hover:bg-surface-2"
                    >
                      <span className="block text-sm font-semibold">
                        <BiText bi={{ ar: hit.titleAr, en: hit.titleEn }} lang={lang} enClassName="latin" />
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                        <BiText bi={{ ar: hit.detailAr, en: hit.detailEn }} lang={lang} enClassName="latin" />
                      </span>
                      <span className="mt-0.5 inline-block rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        {hit.kind === 'topic' ? 'موضوع' : 'مصطلح'} · {chapterById.get(hit.ch)?.num ?? hit.ch}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
