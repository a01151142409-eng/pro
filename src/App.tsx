import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Menu } from 'lucide-react';
import { chapters, glossary, images, referenceTables, subjectMeta, topics } from './data/curriculum.ts';
import { flashcards, quizQuestions, spotters } from './data/assessments.ts';
import type { AppSettings, LangMode, ProgressState, ToolId } from './types/physiology.ts';
import { clamp, isValidProgressBackup, percent } from './utils/studyLogic.ts';
import { DEFAULT_PROGRESS, DEFAULT_SETTINGS, exportProgress, isAppSettings, isProgressState, loadJson, saveJson } from './utils/storage.ts';
import { ChapterContent } from './components/ChapterContent.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { QuizModal } from './components/modals/QuizModal.tsx';
import { LabsModal } from './components/modals/StudyModals.tsx';
import {
  FlashcardsModal,
  GalleryModal,
  GlossaryModal,
  NotesModal,
  ShortcutsModal,
  SpottersModal,
  TablesModal,
} from './components/modals/StudyModals.tsx';

const LANG_CYCLE: LangMode[] = ['ar', 'both', 'en'];
const MIN_FONT = 13;
const MAX_FONT = 21;

interface ToastItem {
  id: number;
  msg: string;
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadJson('settings', DEFAULT_SETTINGS, isAppSettings),
  );
  const [progress, setProgress] = useState<ProgressState>(() =>
    loadJson('progress', DEFAULT_PROGRESS, isProgressState),
  );
  const [currentChapter, setCurrentChapter] = useState('a1');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [showTop, setShowTop] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [quizChapter, setQuizChapter] = useState<string | null>(null);
  const toastId = useRef(0);

  const pushToast = useCallback((msg: string) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((prev) => [...prev, { id, msg }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.style.setProperty('--app-font-size', `${clamp(settings.fontSize, MIN_FONT, MAX_FONT)}px`);
    root.setAttribute('dir', settings.lang === 'en' ? 'ltr' : 'rtl');
    root.setAttribute('lang', settings.lang === 'en' ? 'en' : 'ar');
    saveJson('settings', settings);
  }, [settings]);

  useEffect(() => {
    saveJson('progress', progress);
  }, [progress]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (typing) return;
      if (e.key === 'q' || e.key === 'Q') {
        setQuizChapter(null);
        setActiveTool('quiz');
      }
      if (e.key === 's' || e.key === 'S') {
        setQuizChapter(null);
        setActiveTool('spotters');
      }
      if (e.key === 'Escape') {
        if (activeTool) setActiveTool(null);
        else setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTool]);

  const cycleLang = useCallback(() => {
    setSettings((prev) => {
      const next = LANG_CYCLE[(LANG_CYCLE.indexOf(prev.lang) + 1) % LANG_CYCLE.length];
      return { ...prev, lang: next };
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  }, []);

  const changeFont = useCallback((delta: number) => {
    setSettings((prev) => ({ ...prev, fontSize: clamp(prev.fontSize + delta, MIN_FONT, MAX_FONT) }));
  }, []);

  const navigate = useCallback((chapterId: string, topicId?: string) => {
    setCurrentChapter(chapterId);
    setSidebarOpen(false);
    window.setTimeout(() => {
      if (topicId) {
        document.getElementById(topicId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  }, []);

  const toggleCompleted = useCallback((chapterId: string) => {
    setProgress((prev) => {
      const has = prev.completedChapters.includes(chapterId);
      return {
        ...prev,
        completedChapters: has
          ? prev.completedChapters.filter((id) => id !== chapterId)
          : [...prev.completedChapters, chapterId],
      };
    });
  }, []);

  const toggleBookmark = useCallback((chapterId: string) => {
    setProgress((prev) => {
      const has = prev.bookmarks.includes(chapterId);
      return {
        ...prev,
        bookmarks: has ? prev.bookmarks.filter((id) => id !== chapterId) : [...prev.bookmarks, chapterId],
      };
    });
  }, []);

  const openTool = useCallback(
    (tool: ToolId) => {
      setQuizChapter(null);
      setActiveTool(tool);
    },
    [],
  );

  const finishQuiz = useCallback(
    (chKey: string, percentage: number, wrong: number[]) => {
      setProgress((prev) => ({
        ...prev,
        wrongQuestionIds: wrong,
        bestScores: { ...prev.bestScores, [chKey]: Math.max(prev.bestScores[chKey] ?? 0, percentage) },
      }));
      pushToast(`نتيجتك ${percentage}% — حُفظت أفضل نتيجة`);
    },
    [pushToast],
  );

  const toggleKnown = useCallback((key: string) => {
    setProgress((prev) => ({
      ...prev,
      knownCards: prev.knownCards.includes(key)
        ? prev.knownCards.filter((k) => k !== key)
        : [...prev.knownCards, key],
    }));
  }, []);

  const changeNote = useCallback((chId: string, text: string) => {
    setProgress((prev) => ({ ...prev, notes: { ...prev.notes, [chId]: text } }));
  }, []);

  const importBackup = useCallback(
    (file: File) => {
      file.text().then((text) => {
        try {
          const parsed: unknown = JSON.parse(text);
          if (isValidProgressBackup(parsed)) {
            setSettings(parsed.settings);
            setProgress(parsed.progress);
            pushToast('تم استيراد التقدم بنجاح ✓');
          } else {
            pushToast('ملف غير صالح — لم يتم الاستيراد');
          }
        } catch {
          pushToast('ملف غير صالح — لم يتم الاستيراد');
        }
      });
    },
    [pushToast],
  );

  const chapter = useMemo(
    () => chapters.find((c) => c.id === currentChapter) ?? chapters[0],
    [currentChapter],
  );
  const doneCount = progress.completedChapters.length;
  const pct = percent(doneCount, chapters.length);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <TopBar
        meta={subjectMeta}
        chapters={chapters}
        topics={topics}
        glossary={glossary}
        lang={settings.lang}
        theme={settings.theme}
        fontSize={settings.fontSize}
        onCycleLang={cycleLang}
        onToggleTheme={toggleTheme}
        onFontSize={changeFont}
        onOpenQuiz={() => {
          setQuizChapter(null);
          setActiveTool('quiz');
        }}
        onOpenFlashcards={() => setActiveTool('flashcards')}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onNavigate={navigate}
      />

      <div className="mx-auto flex w-full max-w-7xl">
        <Sidebar
          chapters={chapters}
          currentChapter={chapter.id}
          completed={progress.completedChapters}
          lang={settings.lang}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectChapter={navigate}
          onOpenTool={openTool}
        />

        <main className="min-w-0 flex-1 px-3 pb-28 pt-4 sm:px-5">
          <div className="mb-3 flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="فتح فهرس الفصول"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface hover:bg-surface-2"
            >
              <Menu size={20} />
            </button>
            <p className="min-w-0 truncate text-sm font-bold">
              {doneCount}/{chapters.length} · <span className="mono">{pct}%</span>
            </p>
          </div>

          <ChapterContent
            chapter={chapter}
            topics={topics}
            images={images}
            tables={referenceTables}
            lang={settings.lang}
            completed={progress.completedChapters.includes(chapter.id)}
            bookmarked={progress.bookmarks.includes(chapter.id)}
            onToggleCompleted={() => {
              toggleCompleted(chapter.id);
              pushToast(
                progress.completedChapters.includes(chapter.id)
                  ? 'أُزيل الفصل من المكتمل'
                  : `أُكمل فصل ${chapter.num} ✓`,
              );
            }}
            onToggleBookmark={() => toggleBookmark(chapter.id)}
            onChapterQuiz={() => {
              setQuizChapter(chapter.id);
              setActiveTool('quiz');
            }}
          />
        </main>
      </div>

      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="العودة إلى الأعلى"
            className="fixed bottom-5 end-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-primary text-primary-fg shadow-lg transition-colors hover:bg-primary-strong"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTool === 'quiz' && (
          <QuizModal
            key="quiz"
            questions={quizQuestions}
            chapters={chapters}
            lang={settings.lang}
            initialChapter={quizChapter}
            wrongIds={progress.wrongQuestionIds}
            onFinish={finishQuiz}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'spotters' && (
          <SpottersModal
            key="spotters"
            spotters={spotters}
            images={images}
            chapters={chapters}
            lang={settings.lang}
            initialChapter={quizChapter}
            onFinish={(chKey, pct) => {
              setProgress((prev) => ({
                ...prev,
                bestScores: { ...prev.bestScores, [chKey]: Math.max(prev.bestScores[chKey] ?? 0, pct) },
              }));
            }}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'flashcards' && (
          <FlashcardsModal
            key="flashcards"
            flashcards={flashcards}
            chapters={chapters}
            lang={settings.lang}
            initialChapter={quizChapter}
            knownCards={progress.knownCards}
            onToggleKnown={toggleKnown}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'gallery' && (
          <GalleryModal
            key="gallery"
            images={images}
            chapters={chapters}
            lang={settings.lang}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'glossary' && (
          <GlossaryModal
            key="glossary"
            glossary={glossary}
            lang={settings.lang}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'tables' && (
          <TablesModal
            key="tables"
            tables={referenceTables}
            chapters={chapters}
            lang={settings.lang}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'notes' && (
          <NotesModal
            key="notes"
            chapters={chapters}
            lang={settings.lang}
            notes={progress.notes}
            onNoteChange={changeNote}
            onExport={() => exportProgress(settings, progress)}
            onImportFile={importBackup}
            onClose={() => setActiveTool(null)}
          />
        )}
        {activeTool === 'labs' && (
          <LabsModal key="labs" lang={settings.lang} onClose={() => setActiveTool(null)} />
        )}
        {showShortcuts && (
          <ShortcutsModal key="shortcuts" lang={settings.lang} onClose={() => setShowShortcuts(false)} />
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed bottom-5 start-1/2 z-50 flex w-max max-w-[92vw] -translate-x-1/2 flex-col items-center gap-2 rtl:translate-x-1/2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.p
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-sm shadow-lg"
            >
              {toast.msg}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
