import { useEffect, useState } from 'react';
import { Volume2, X, ZoomIn } from 'lucide-react';
import type { ImageItem, LangMode, ReferenceTable, TopicContent } from '../types/physiology.ts';
import { BiText } from './BiText.tsx';
import { RefTable } from './RefTable.tsx';

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speakText(text: string, langCode: string): void {
  if (!speechSupported()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function Lightbox({ image, lang, onClose }: { image: ImageItem; lang: LangMode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="عرض الصورة بالحجم الكامل"
      onClick={onClose}
    >
      <figure className="max-h-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={`assets/images/${image.file}`}
          alt={image.en}
          className="max-h-[78dvh] w-auto max-w-full rounded-lg bg-surface object-contain"
        />
        <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
          <span>
            <span className="mono me-2 rounded bg-primary-soft px-1.5 py-0.5 text-xs font-semibold text-primary">
              Plate #{image.id}
            </span>
            <BiText bi={{ ar: image.ar, en: image.en }} lang={lang} enClassName="latin" />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق العرض"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-surface-2"
          >
            <X size={18} />
          </button>
        </figcaption>
      </figure>
    </div>
  );
}

interface TopicBlockProps {
  topic: TopicContent;
  topicIndex: number;
  images: ImageItem[];
  tables: ReferenceTable[];
  lang: LangMode;
}

export function TopicBlock({ topic, topicIndex, images, tables, lang }: TopicBlockProps) {
  const [zoomed, setZoomed] = useState<ImageItem | null>(null);
  const topicImages = topic.imageIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img): img is ImageItem => img !== undefined);
  const topicTables = tables.filter((t) => topic.tableIds.includes(t.id));
  const canSpeak = speechSupported();

  const speak = () => {
    if (lang === 'en') {
      speakText(`${topic.en}. ${topic.enBody.join(' ')}`, 'en-US');
    } else {
      speakText(`${topic.ar}. ${topic.arBody.join(' ')}`, 'ar-SA');
    }
  };

  return (
    <article id={topic.id} className="scroll-mt-20 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <h3 className="flex flex-wrap items-baseline gap-2 text-lg font-bold">
        <span className="mono rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
          {topicIndex + 1}
        </span>
        <BiText bi={{ ar: topic.ar, en: topic.en }} lang={lang} enClassName="latin" />
        {canSpeak && (
          <button
            type="button"
            onClick={speak}
            aria-label="نطق محتوى الموضوع"
            title="نطق (Speak)"
            className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface-2 hover:text-primary"
          >
            <Volume2 size={16} />
          </button>
        )}
      </h3>

      {lang !== 'en' && (
        <div className="mt-3 space-y-2 text-sm leading-loose">
          {topic.arBody.map((para, i) => (
            <p key={`ar-${i}`}>{para}</p>
          ))}
        </div>
      )}
      {lang !== 'ar' && (
        <div className={`mt-3 space-y-2 text-sm leading-relaxed text-muted ${lang === 'en' ? '' : 'border-t border-line pt-3'}`}>
          {topic.enBody.map((para, i) => (
            <p key={`en-${i}`} className="latin text-start">
              {para}
            </p>
          ))}
        </div>
      )}

      {topicImages.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {topicImages.map((img) => (
            <figure key={img.id} className="overflow-hidden rounded-xl border border-line bg-surface-2">
              <div className="relative">
                <img
                  src={`assets/images/${img.file}`}
                  alt={img.en}
                  loading="lazy"
                  className="max-h-72 w-full bg-white object-contain"
                />
                <span className="mono absolute start-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Plate #{img.id}
                </span>
                <button
                  type="button"
                  onClick={() => setZoomed(img)}
                  aria-label={`تكبير الصورة: ${img.ar}`}
                  className="absolute end-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white transition-colors hover:bg-primary hover:text-primary-fg"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <BiText bi={{ ar: img.ar, en: img.en }} lang={lang} enClassName="latin" />
                {canSpeak && (
                  <button
                    type="button"
                    onClick={() => (lang === 'en' ? speakText(img.en, 'en-US') : speakText(`${img.ar}. ${img.en}`, 'ar-SA'))}
                    aria-label={`نطق وصف الصورة: ${img.ar}`}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted hover:text-primary"
                  >
                    <Volume2 size={14} />
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {topicTables.map((table) => (
        <RefTable key={table.id} table={table} lang={lang} />
      ))}

      {zoomed && <Lightbox image={zoomed} lang={lang} onClose={() => setZoomed(null)} />}
    </article>
  );
}
