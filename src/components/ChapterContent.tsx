import { Bookmark, BookmarkCheck, CheckCircle2, Circle, ListChecks } from 'lucide-react';
import type { ChapterMeta, ImageItem, LangMode, ReferenceTable, TopicContent } from '../types/physiology.ts';
import { BiText } from './BiText.tsx';
import { TopicBlock } from './TopicBlock.tsx';

interface ChapterContentProps {
  chapter: ChapterMeta;
  topics: TopicContent[];
  images: ImageItem[];
  tables: ReferenceTable[];
  lang: LangMode;
  completed: boolean;
  bookmarked: boolean;
  onToggleCompleted: () => void;
  onToggleBookmark: () => void;
  onChapterQuiz: () => void;
}

export function ChapterContent({
  chapter,
  topics,
  images,
  tables,
  lang,
  completed,
  bookmarked,
  onToggleCompleted,
  onToggleBookmark,
  onChapterQuiz,
}: ChapterContentProps) {
  const chapterTopics = chapter.topicsSummary
    .map((id) => topics.find((t) => t.id === id))
    .filter((t): t is TopicContent => t !== undefined);

  const actionBtn =
    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors sm:text-sm';

  return (
    <article aria-label={`فصل ${chapter.num}`}>
      <header className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <p className="text-xs font-bold text-primary">
          <BiText bi={{ ar: `الفصل ${chapter.num}`, en: `Chapter ${chapter.num}` }} lang={lang} enClassName="latin" />
        </p>
        <h2 className="mt-1 text-xl font-bold sm:text-2xl">
          <BiText bi={{ ar: chapter.ar, en: chapter.en }} lang={lang} enClassName="latin" />
        </h2>
        <p className="mt-1 text-xs text-muted">
          <BiText
            bi={{ ar: `${chapterTopics.length} مواضيع`, en: `${chapterTopics.length} topics` }}
            lang={lang}
            enClassName="latin"
          />
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onChapterQuiz}
            className={`${actionBtn} border-primary bg-primary text-primary-fg hover:bg-primary-strong`}
          >
            <ListChecks size={16} aria-hidden="true" />
            <BiText bi={{ ar: 'اختبار الفصل', en: 'Chapter quiz' }} lang={lang} enClassName="latin" />
          </button>
          <button
            type="button"
            onClick={onToggleCompleted}
            aria-pressed={completed}
            className={`${actionBtn} ${
              completed
                ? 'border-success bg-success-soft text-success'
                : 'border-line bg-surface-2 hover:border-success hover:text-success'
            }`}
          >
            {completed ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
            <BiText bi={{ ar: 'تمت المذاكرة', en: 'Mark studied' }} lang={lang} enClassName="latin" />
          </button>
          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? 'إزالة الحفظ' : 'حفظ الفصل'}
            className={`${actionBtn} ${
              bookmarked
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-surface-2 hover:border-accent hover:text-accent'
            }`}
          >
            {bookmarked ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
            <BiText bi={{ ar: 'حفظ', en: 'Save' }} lang={lang} enClassName="latin" />
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-4">
        {chapterTopics.map((topic, i) => (
          <TopicBlock
            key={topic.id}
            topic={topic}
            topicIndex={i}
            images={images}
            tables={tables}
            lang={lang}
          />
        ))}
      </div>
    </article>
  );
}
