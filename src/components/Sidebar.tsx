import {
  BookOpen,
  CheckCircle2,
  Circle,
  FlaskConical,
  Images,
  Layers,
  ListChecks,
  NotebookPen,
  ScanSearch,
  Table2,
  X,
} from 'lucide-react';
import type { ChapterMeta, LangMode, ToolId } from '../types/physiology.ts';
import { percent } from '../utils/studyLogic.ts';
import { BiText } from './BiText.tsx';

interface SidebarProps {
  chapters: ChapterMeta[];
  currentChapter: string;
  completed: string[];
  lang: LangMode;
  open: boolean;
  onClose: () => void;
  onSelectChapter: (id: string) => void;
  onOpenTool: (tool: ToolId) => void;
}

const TOOLS: Array<{ id: ToolId; ar: string; en: string; icon: typeof ListChecks }> = [
  { id: 'quiz', ar: 'بنك الأسئلة MCQ', en: 'MCQ Bank', icon: ListChecks },
  { id: 'spotters', ar: 'امتحان السبوتر', en: 'Spotter Exam', icon: ScanSearch },
  { id: 'flashcards', ar: 'البطاقات التعليمية', en: 'Flashcards', icon: Layers },
  { id: 'labs', ar: 'المعامل التفاعلية', en: 'Interactive Labs', icon: FlaskConical },
  { id: 'gallery', ar: 'معرض الصور', en: 'Image Gallery', icon: Images },
  { id: 'glossary', ar: 'قاموس المصطلحات', en: 'Glossary', icon: BookOpen },
  { id: 'tables', ar: 'الجداول المرجعية', en: 'Reference Tables', icon: Table2 },
  { id: 'notes', ar: 'ملاحظاتي', en: 'My Notes', icon: NotebookPen },
];

export function Sidebar({
  chapters,
  currentChapter,
  completed,
  lang,
  open,
  onClose,
  onSelectChapter,
  onOpenTool,
}: SidebarProps) {
  const done = chapters.filter((c) => completed.includes(c.id)).length;
  const pct = percent(done, chapters.length);
  const parts: Array<'A' | 'B'> = ['A', 'B'];
  const partLabel = { A: { ar: 'الجزء A — أساسيات', en: 'Part A — Foundations' }, B: { ar: 'الجزء B — الأيض والتوازن', en: 'Part B — Metabolism & Balance' } };

  const nav = (id: string) => {
    onSelectChapter(id);
    onClose();
  };

  const list = (
    <nav aria-label="قائمة الفصول" className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <p className="text-xs font-semibold text-muted">
          <BiText bi={{ ar: 'تقدم المذاكرة', en: 'Study progress' }} lang={lang} enClassName="latin" />
        </p>
        <p className="mt-1 text-sm font-bold">
          {done}/{chapters.length} · <span className="mono">{pct}%</span>
        </p>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="نسبة تقدم المذاكرة"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {parts.map((part) => (
        <div key={part}>
          <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-primary">
            <BiText bi={partLabel[part]} lang={lang} enClassName="latin" />
          </h3>
          <ul className="flex flex-col gap-1">
            {chapters
              .filter((c) => c.part === part)
              .map((c) => {
                const isDone = completed.includes(c.id);
                const isCurrent = c.id === currentChapter;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => nav(c.id)}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm transition-colors ${
                        isCurrent ? 'bg-primary-soft font-bold text-primary' : 'hover:bg-surface-2'
                      }`}
                    >
                      <span className="mono w-7 shrink-0 text-xs text-muted">{c.num}</span>
                      <span className="min-w-0 flex-1">
                        <BiText bi={{ ar: c.ar, en: c.en }} lang={lang} enClassName="latin" />
                      </span>
                      {isDone ? (
                        <CheckCircle2 size={16} className="shrink-0 text-success" aria-label="فصل مكتمل" />
                      ) : (
                        <Circle size={16} className="shrink-0 text-line" aria-label="غير مكتمل" />
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}

      <div>
        <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-primary">
          <BiText bi={{ ar: 'الأدوات', en: 'Tools' }} lang={lang} enClassName="latin" />
        </h3>
        <ul className="flex flex-col gap-1">
          {TOOLS.map((tool) => (
            <li key={tool.id}>
              <button
                type="button"
                onClick={() => {
                  onOpenTool(tool.id);
                  onClose();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm transition-colors hover:bg-surface-2"
              >
                <tool.icon size={16} className="shrink-0 text-accent" aria-hidden="true" />
                <BiText bi={{ ar: tool.ar, en: tool.en }} lang={lang} enClassName="latin" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] w-72 shrink-0 border-e border-line bg-surface lg:block">
        {list}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" aria-hidden="true" onClick={onClose} />
          <div
            className="absolute inset-y-0 start-0 w-80 max-w-[85vw] border-e border-line bg-surface shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="فهرس الفصول والأدوات"
          >
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <p className="text-sm font-bold">
                <BiText bi={{ ar: 'الفهرس', en: 'Index' }} lang={lang} enClassName="latin" />
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق القائمة"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-surface-2"
              >
                <X size={18} />
              </button>
            </div>
            {list}
          </div>
        </div>
      )}
    </>
  );
}
