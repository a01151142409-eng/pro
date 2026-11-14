import type {
  ChapterMeta,
  ImageItem,
  ProgressBackup,
  QuizQuestion,
  SpotterItem,
  TopicContent,
} from '../types/physiology.ts';

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function shuffleArray<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export interface QuizPoolOptions {
  questions: readonly QuizQuestion[];
  ch?: string | null;
  count?: number;
  rng?: Rng;
  wrongIdsFirst?: readonly number[];
}

export function buildQuizPool(options: QuizPoolOptions): QuizQuestion[] {
  const { questions, ch, count, rng = Math.random, wrongIdsFirst = [] } = options;
  const filtered = ch ? questions.filter((q) => q.ch === ch) : [...questions];
  const wrongSet = new Set(wrongIdsFirst);
  const wrong = filtered.filter((q) => wrongSet.has(q.id));
  const rest = filtered.filter((q) => !wrongSet.has(q.id));
  const ordered = [...shuffleArray(wrong, rng), ...shuffleArray(rest, rng)];
  const limit = count === undefined ? ordered.length : Math.max(0, count);
  return ordered.slice(0, limit);
}

export interface QuizResult {
  total: number;
  correct: number;
  percentage: number;
  wrongIds: number[];
}

export function gradeQuiz(
  questions: readonly QuizQuestion[],
  answers: readonly (number | null)[],
): QuizResult {
  let correct = 0;
  const wrongIds: number[] = [];
  questions.forEach((q, i) => {
    const answer = answers[i];
    if (answer !== null && answer !== undefined && answer === q.correct) {
      correct += 1;
    } else {
      wrongIds.push(q.id);
    }
  });
  const total = questions.length;
  const percentage = total === 0 ? 0 : clamp(Math.round((correct / total) * 100), 0, 100);
  return { total, correct, percentage, wrongIds };
}

export function gradeSpotter(item: SpotterItem, selected: number | null): boolean {
  return selected !== null && selected === item.correct;
}

export function calcReadingProgress(
  completedIds: readonly string[],
  totalChapters: number,
): number {
  if (totalChapters <= 0) return 0;
  const unique = new Set(completedIds).size;
  return clamp(Math.round((unique / totalChapters) * 100), 0, 100);
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return clamp(Math.round((part / whole) * 100), 0, 100);
}

export function filterByChapter<T extends { ch: string }>(
  items: readonly T[],
  ch: string | null,
): T[] {
  if (!ch) return [...items];
  return items.filter((item) => item.ch === ch);
}

export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchableText {
  ar: string;
  en: string;
}

export const SEARCH_LIMIT = 40;

export function searchCurriculum<T>(
  query: string,
  items: readonly T[],
  getText: (item: T) => SearchableText,
  limit: number = SEARCH_LIMIT,
): T[] {
  const q = normalizeForSearch(query);
  if (!q) return [];
  const results: T[] = [];
  for (const item of items) {
    const { ar, en } = getText(item);
    if (normalizeForSearch(ar).includes(q) || normalizeForSearch(en).includes(q)) {
      results.push(item);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export interface DataIssue {
  ref: string;
  issue: string;
}

function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

function duplicateOptionIndexes(options: ReadonlyArray<{ ar: string; en: string }>): number[] {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];
  options.forEach((opt, i) => {
    const key = `${opt.ar.trim()}||${opt.en.trim()}`;
    if (seen.has(key)) duplicates.push(i);
    else seen.set(key, i);
  });
  return duplicates;
}

export function collectQuizIssues(questions: readonly QuizQuestion[]): DataIssue[] {
  const issues: DataIssue[] = [];
  const seenIds = new Set<number>();
  for (const q of questions) {
    const ref = `quiz#${q.id}`;
    if (seenIds.has(q.id)) issues.push({ ref, issue: 'duplicate id' });
    seenIds.add(q.id);
    if (q.correct < 0 || q.correct >= q.options.length) {
      issues.push({ ref, issue: `correct index ${q.correct} out of range (${q.options.length} options)` });
    }
    if (isBlank(q.qAr)) issues.push({ ref, issue: 'empty qAr' });
    if (isBlank(q.qEn)) issues.push({ ref, issue: 'empty qEn' });
    if (isBlank(q.explAr)) issues.push({ ref, issue: 'empty explAr' });
    if (isBlank(q.explEn)) issues.push({ ref, issue: 'empty explEn' });
    if (q.options.length < 4 || q.options.length > 5) {
      issues.push({ ref, issue: `expected 4-5 options, found ${q.options.length}` });
    }
    q.options.forEach((opt, i) => {
      if (isBlank(opt.ar) || isBlank(opt.en)) {
        issues.push({ ref, issue: `empty option text at index ${i}` });
      }
    });
    if (duplicateOptionIndexes(q.options).length > 0) {
      issues.push({ ref, issue: 'duplicate options' });
    }
  }
  return issues;
}

export function collectSpotterIssues(
  spotters: readonly SpotterItem[],
  imageIds: ReadonlySet<number>,
): DataIssue[] {
  const issues: DataIssue[] = [];
  const seenIds = new Set<number>();
  for (const s of spotters) {
    const ref = `spotter#${s.id}`;
    if (seenIds.has(s.id)) issues.push({ ref, issue: 'duplicate id' });
    seenIds.add(s.id);
    if (!imageIds.has(s.imageId)) issues.push({ ref, issue: `unknown imageId ${s.imageId}` });
    if (s.pinX < 0 || s.pinX > 100) issues.push({ ref, issue: `pinX ${s.pinX} out of 0-100` });
    if (s.pinY < 0 || s.pinY > 100) issues.push({ ref, issue: `pinY ${s.pinY} out of 0-100` });
    if (s.correct < 0 || s.correct >= s.options.length) {
      issues.push({ ref, issue: `correct index ${s.correct} out of range` });
    }
    if (isBlank(s.promptAr)) issues.push({ ref, issue: 'empty promptAr' });
    if (isBlank(s.promptEn)) issues.push({ ref, issue: 'empty promptEn' });
    if (isBlank(s.explAr)) issues.push({ ref, issue: 'empty explAr' });
    if (isBlank(s.explEn)) issues.push({ ref, issue: 'empty explEn' });
    if (s.options.length < 3) issues.push({ ref, issue: 'fewer than 3 options' });
    if (duplicateOptionIndexes(s.options).length > 0) {
      issues.push({ ref, issue: 'duplicate options' });
    }
  }
  return issues;
}

export function collectImageIssues(
  images: readonly ImageItem[],
  chapterIds: ReadonlySet<string>,
  topicIds: ReadonlySet<string>,
): DataIssue[] {
  const issues: DataIssue[] = [];
  const seenIds = new Set<number>();
  for (const img of images) {
    const ref = `image#${img.id}`;
    if (seenIds.has(img.id)) issues.push({ ref, issue: 'duplicate id' });
    seenIds.add(img.id);
    if (!chapterIds.has(img.ch)) issues.push({ ref, issue: `unknown chapter ${img.ch}` });
    if (!topicIds.has(img.topic)) issues.push({ ref, issue: `unknown topic ${img.topic}` });
    if (isBlank(img.file)) issues.push({ ref, issue: 'empty file path' });
    if (isBlank(img.ar)) issues.push({ ref, issue: 'empty ar title' });
    if (isBlank(img.en)) issues.push({ ref, issue: 'empty en title' });
  }
  return issues;
}

export function collectTopicIssues(
  topics: readonly TopicContent[],
  chapters: readonly ChapterMeta[],
): DataIssue[] {
  const issues: DataIssue[] = [];
  const chapterIds = new Set(chapters.map((c) => c.id));
  const contentIds = new Set(topics.map((t) => t.id));
  const seenIds = new Set<string>();
  for (const t of topics) {
    const ref = `topic#${t.id}`;
    if (seenIds.has(t.id)) issues.push({ ref, issue: 'duplicate id' });
    seenIds.add(t.id);
    if (!chapterIds.has(t.ch)) issues.push({ ref, issue: `unknown chapter ${t.ch}` });
    if (t.arBody.length === 0 || t.arBody.every(isBlank)) {
      issues.push({ ref, issue: 'empty arBody' });
    }
    if (t.enBody.length === 0 || t.enBody.every(isBlank)) {
      issues.push({ ref, issue: 'empty enBody' });
    }
  }
  for (const c of chapters) {
    for (const topicId of c.topicsSummary) {
      if (!contentIds.has(topicId)) {
        issues.push({ ref: `chapter#${c.id}`, issue: `topicsSummary references missing topic ${topicId}` });
      }
    }
  }
  return issues;
}

export function isValidProgressBackup(value: unknown): value is ProgressBackup {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.app !== 'physiology-interactive-guide') return false;
  if (typeof obj.version !== 'number') return false;
  if (typeof obj.exportedAt !== 'string') return false;
  const settings = obj.settings;
  const progress = obj.progress;
  if (typeof settings !== 'object' || settings === null) return false;
  if (typeof progress !== 'object' || progress === null) return false;
  const s = settings as Record<string, unknown>;
  if (s.lang !== 'ar' && s.lang !== 'both' && s.lang !== 'en') return false;
  if (s.theme !== 'dark' && s.theme !== 'light') return false;
  if (typeof s.fontSize !== 'number' || s.fontSize < 13 || s.fontSize > 21) return false;
  const p = progress as Record<string, unknown>;
  const listKeys = ['completedChapters', 'bookmarks', 'knownCards', 'wrongQuestionIds'] as const;
  for (const key of listKeys) {
    if (!Array.isArray(p[key])) return false;
  }
  if (typeof p.bestScores !== 'object' || p.bestScores === null) return false;
  if (typeof p.notes !== 'object' || p.notes === null) return false;
  return true;
}
