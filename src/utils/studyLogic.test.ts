import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildQuizPool,
  calcReadingProgress,
  clamp,
  collectImageIssues,
  collectQuizIssues,
  collectSpotterIssues,
  collectTopicIssues,
  createRng,
  filterByChapter,
  gradeQuiz,
  gradeSpotter,
  isValidProgressBackup,
  normalizeForSearch,
  percent,
  SEARCH_LIMIT,
  searchCurriculum,
  shuffleArray,
} from './studyLogic.ts';
import {
  chapters,
  glossary,
  hormones,
  images,
  parameters,
  reflexes,
  referenceTables,
  topics,
} from '../data/curriculum.ts';
import { flashcards, quizQuestions, spotters } from '../data/assessments.ts';
import { partALabs, partBLabs } from '../data/labsData.ts';
import type { QuizQuestion, SpotterItem } from '../types/physiology.ts';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..', '..');

export const QUIZ_PER_CHAPTER_MIN = 30;
export const SPOTTER_PER_CHAPTER_MIN = 14;
export const FLASHCARDS_MIN = 72;
export const LABS_MIN = 30;

function makeQuestion(overrides: Partial<QuizQuestion> & { id: number }): QuizQuestion {
  return {
    ch: 'a1',
    qAr: 'سؤال تجريبي؟',
    qEn: 'Sample question?',
    options: [
      { ar: 'خيار ١', en: 'Option 1' },
      { ar: 'خيار ٢', en: 'Option 2' },
      { ar: 'خيار ٣', en: 'Option 3' },
      { ar: 'خيار ٤', en: 'Option 4' },
    ],
    correct: 0,
    explAr: 'تفسير.',
    explEn: 'Explanation.',
    ...overrides,
  };
}

const sampleSpotter: SpotterItem = {
  id: 1,
  ch: 'a1',
  imageId: 1,
  pinX: 50,
  pinY: 50,
  promptAr: 'ما الجزء المشار إليه؟',
  promptEn: 'What is the pinned part?',
  options: [
    { ar: 'أ', en: 'A' },
    { ar: 'ب', en: 'B' },
    { ar: 'ج', en: 'C' },
  ],
  correct: 1,
  explAr: 'تفسير',
  explEn: 'Explanation',
};

test('createRng is deterministic for the same seed', () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = [a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  for (const v of seqA) {
    assert.ok(v >= 0 && v < 1);
  }
});

test('shuffleArray keeps all elements and does not mutate input', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const snapshot = [...input];
  const shuffled = shuffleArray(input, createRng(7));
  assert.deepEqual([...shuffled].sort((x, y) => x - y), snapshot);
  assert.deepEqual(input, snapshot);
});

test('shuffleArray is deterministic with a seeded rng', () => {
  const input = Array.from({ length: 20 }, (_, i) => i);
  assert.deepEqual(shuffleArray(input, createRng(99)), shuffleArray(input, createRng(99)));
});

test('buildQuizPool filters by chapter, limits count, and prioritizes wrong ids', () => {
  const pool = [
    makeQuestion({ id: 1, ch: 'a1' }),
    makeQuestion({ id: 2, ch: 'a1' }),
    makeQuestion({ id: 3, ch: 'a2' }),
    makeQuestion({ id: 4, ch: 'a1' }),
  ];
  const onlyA1 = buildQuizPool({ questions: pool, ch: 'a1' });
  assert.equal(onlyA1.length, 3);
  assert.ok(onlyA1.every((q) => q.ch === 'a1'));

  const limited = buildQuizPool({ questions: pool, count: 2, rng: createRng(1) });
  assert.equal(limited.length, 2);

  assert.equal(buildQuizPool({ questions: pool, count: 0 }).length, 0);
  assert.equal(buildQuizPool({ questions: pool, count: -5 }).length, 0);

  const wrongFirst = buildQuizPool({ questions: pool, wrongIdsFirst: [3, 1] });
  assert.deepEqual(
    wrongFirst.slice(0, 2).map((q) => q.id).sort((a, b) => a - b),
    [1, 3],
  );
});

test('gradeQuiz computes score, percentage, and wrong ids', () => {
  const qs = [
    makeQuestion({ id: 1, correct: 0 }),
    makeQuestion({ id: 2, correct: 1 }),
    makeQuestion({ id: 3, correct: 2 }),
    makeQuestion({ id: 4, correct: 3 }),
  ];
  const allCorrect = gradeQuiz(qs, [0, 1, 2, 3]);
  assert.equal(allCorrect.correct, 4);
  assert.equal(allCorrect.total, 4);
  assert.equal(allCorrect.percentage, 100);
  assert.deepEqual(allCorrect.wrongIds, []);

  const partial = gradeQuiz(qs, [0, 2, null, 1]);
  assert.equal(partial.correct, 1);
  assert.equal(partial.percentage, 25);
  assert.deepEqual(partial.wrongIds, [2, 3, 4]);

  const empty = gradeQuiz([], []);
  assert.equal(empty.total, 0);
  assert.equal(empty.percentage, 0);
  assert.deepEqual(empty.wrongIds, []);
});

test('gradeSpotter accepts only the exact correct option', () => {
  assert.equal(gradeSpotter(sampleSpotter, 1), true);
  assert.equal(gradeSpotter(sampleSpotter, 0), false);
  assert.equal(gradeSpotter(sampleSpotter, null), false);
});

test('calcReadingProgress clamps between 0 and 100 and dedupes', () => {
  assert.equal(calcReadingProgress([], 10), 0);
  assert.equal(calcReadingProgress(['a1', 'a2', 'a3', 'a4', 'a5'], 10), 50);
  assert.equal(calcReadingProgress(['a1', 'a1', 'a2'], 2), 100);
  assert.equal(calcReadingProgress(['a1', 'a2', 'x', 'y', 'z'], 3), 100);
  assert.equal(calcReadingProgress(['a1'], 0), 0);
  assert.equal(calcReadingProgress(['a1'], -3), 0);
});

test('percent clamps invalid ranges', () => {
  assert.equal(percent(5, 10), 50);
  assert.equal(percent(0, 0), 0);
  assert.equal(percent(15, 10), 100);
  assert.equal(percent(-5, 10), 0);
  assert.equal(percent(5, -10), 0);
});

test('clamp handles NaN and bounds', () => {
  assert.equal(clamp(Number.NaN, 0, 10), 0);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
});

test('filterByChapter filters or returns a copy', () => {
  const items = [
    { ch: 'a1', v: 1 },
    { ch: 'a2', v: 2 },
  ];
  assert.equal(filterByChapter(items, 'a1').length, 1);
  const all = filterByChapter(items, null);
  assert.equal(all.length, 2);
  assert.notEqual(all, items);
});

test('normalizeForSearch strips diacritics and unifies alef/hamza forms', () => {
  assert.equal(normalizeForSearch('الاستتبابُ'), 'الاستتباب');
  assert.equal(normalizeForSearch('أحلام إسلامية آمنة'), 'احلام اسلاميه امنه');
  assert.equal(normalizeForSearch('  Homeostasis  '), 'homeostasis');
});

test('searchCurriculum matches Arabic and English and caps results at the limit', () => {
  const items = [
    { ar: 'الاستتباب', en: 'Homeostasis' },
    { ar: 'الانتشار', en: 'Diffusion' },
    { ar: 'الاسموزية', en: 'Osmosis' },
  ];
  const getText = (i: { ar: string; en: string }) => i;
  assert.equal(searchCurriculum('استتباب', items, getText).length, 1);
  assert.equal(searchCurriculum('osmo', items, getText).length, 1);
  assert.equal(searchCurriculum('', items, getText).length, 0);

  const many = Array.from({ length: 60 }, (_, i) => ({
    ar: `عنصر ${i}`,
    en: `item ${i}`,
  }));
  assert.equal(searchCurriculum('عنصر', many, getText).length, SEARCH_LIMIT);
  assert.equal(searchCurriculum('عنصر', many, getText, 5).length, 5);
});

test('collectQuizIssues detects out-of-range answers, empty text, and duplicates', () => {
  const bad = [
    makeQuestion({ id: 1, correct: 9 }),
    makeQuestion({ id: 2, qAr: '  ', explEn: '' }),
    makeQuestion({
      id: 3,
      options: [
        { ar: 'نفسه', en: 'same' },
        { ar: 'نفسه', en: 'same' },
        { ar: 'ثالث', en: 'third' },
        { ar: 'رابع', en: 'fourth' },
      ],
    }),
  ];
  const issues = collectQuizIssues(bad);
  const joined = issues.map((i) => `${i.ref}: ${i.issue}`).join('\n');
  assert.ok(joined.includes('quiz#1'));
  assert.ok(joined.includes('out of range'));
  assert.ok(joined.includes('quiz#2'));
  assert.ok(joined.includes('empty qAr'));
  assert.ok(joined.includes('quiz#3'));
  assert.ok(joined.includes('duplicate options'));

  assert.deepEqual(collectQuizIssues([makeQuestion({ id: 5 })]), []);
});

test('collectSpotterIssues validates image refs and pin bounds', () => {
  const imageIds = new Set([1]);
  assert.deepEqual(collectSpotterIssues([sampleSpotter], imageIds), []);

  const bad = { ...sampleSpotter, id: 2, imageId: 99, pinX: 120, pinY: -4, correct: 7 };
  const issues = collectSpotterIssues([bad], imageIds);
  const joined = issues.map((i) => i.issue).join('|');
  assert.ok(joined.includes('unknown imageId 99'));
  assert.ok(joined.includes('pinX 120'));
  assert.ok(joined.includes('pinY -4'));
  assert.ok(joined.includes('out of range'));
});

test('collectImageIssues validates chapter and topic references', () => {
  const chapterIds = new Set(['a1']);
  const topicIds = new Set(['a1-t1']);
  const img = { id: 1, file: 'a1/fig1.svg', ar: 'صورة', en: 'Figure', ch: 'a1', topic: 'a1-t1' };
  assert.deepEqual(collectImageIssues([img], chapterIds, topicIds), []);

  const bad = { ...img, id: 2, ch: 'zz', topic: 'nope', file: '' };
  const joined = collectImageIssues([bad], chapterIds, topicIds)
    .map((i) => i.issue)
    .join('|');
  assert.ok(joined.includes('unknown chapter zz'));
  assert.ok(joined.includes('unknown topic nope'));
  assert.ok(joined.includes('empty file path'));
});

test('collectTopicIssues validates bodies and topicsSummary coverage', () => {
  const chs = [
    {
      id: 'a1',
      part: 'A' as const,
      num: '01',
      ar: 'فصل',
      en: 'Chapter',
      topicsSummary: ['a1-t1', 'a1-missing'],
    },
  ];
  const t = {
    id: 'a1-t1',
    ch: 'a1',
    ar: 'موضوع',
    en: 'Topic',
    arBody: ['نص'],
    enBody: ['text'],
    tableIds: [],
    imageIds: [],
  };
  const issues = collectTopicIssues([t], chs);
  assert.equal(issues.length, 1);
  assert.ok(issues[0].issue.includes('a1-missing'));

  const emptyBody = { ...t, id: 'a1-t2', enBody: [] };
  const joined = collectTopicIssues([emptyBody], [{ ...chs[0], topicsSummary: ['a1-t2'] }])
    .map((i) => i.issue)
    .join('|');
  assert.ok(joined.includes('empty enBody'));
});

test('isValidProgressBackup accepts a valid backup and rejects malformed data', () => {
  const valid = {
    app: 'physiology-interactive-guide',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    settings: { lang: 'ar', theme: 'dark', fontSize: 16 },
    progress: {
      completedChapters: ['a1'],
      bookmarks: [],
      knownCards: [],
      wrongQuestionIds: [],
      bestScores: {},
      notes: {},
    },
  };
  assert.equal(isValidProgressBackup(valid), true);
  assert.equal(isValidProgressBackup(null), false);
  assert.equal(isValidProgressBackup({}), false);
  assert.equal(
    isValidProgressBackup({ ...valid, settings: { ...valid.settings, fontSize: 99 } }),
    false,
  );
  assert.equal(isValidProgressBackup({ ...valid, app: 'other-app' }), false);
  assert.equal(
    isValidProgressBackup({ ...valid, progress: { ...valid.progress, notes: 'nope' } }),
    false,
  );
});

test('data integrity: quiz questions are well-formed', (t) => {
  if (quizQuestions.length === 0) {
    t.skip('assessments data not authored yet');
    return;
  }
  assert.deepEqual(collectQuizIssues(quizQuestions), []);
  assert.equal(new Set(quizQuestions.map((q) => q.id)).size, quizQuestions.length);
});

test('data integrity: quiz count per chapter meets the declared minimum', (t) => {
  if (quizQuestions.length === 0 || chapters.length === 0) {
    t.skip('assessments data not authored yet');
    return;
  }
  for (const ch of chapters) {
    const count = quizQuestions.filter((q) => q.ch === ch.id).length;
    assert.ok(
      count >= QUIZ_PER_CHAPTER_MIN,
      `chapter ${ch.id} has ${count} MCQs, minimum is ${QUIZ_PER_CHAPTER_MIN}`,
    );
  }
});

test('data integrity: spotters reference existing images and valid pins', (t) => {
  if (spotters.length === 0) {
    t.skip('spotters data not authored yet');
    return;
  }
  const imageIds = new Set(images.map((i) => i.id));
  assert.deepEqual(collectSpotterIssues(spotters, imageIds), []);
  for (const ch of chapters) {
    const count = spotters.filter((s) => s.ch === ch.id).length;
    assert.ok(
      count >= SPOTTER_PER_CHAPTER_MIN,
      `chapter ${ch.id} has ${count} spotters, minimum is ${SPOTTER_PER_CHAPTER_MIN}`,
    );
  }
});

test('data integrity: images reference existing chapters, topics, and files', (t) => {
  if (images.length === 0) {
    t.skip('images data not authored yet');
    return;
  }
  const chapterIds = new Set(chapters.map((c) => c.id));
  const topicIds = new Set(topics.map((tp) => tp.id));
  assert.deepEqual(collectImageIssues(images, chapterIds, topicIds), []);

  const manifestPath = join(projectRoot, 'public', 'assets', 'images', 'manifest.json');
  assert.ok(existsSync(manifestPath), 'manifest.json must exist');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    images: Array<{ id: number; file: string }>;
  };
  const manifestById = new Map(manifest.images.map((m) => [m.id, m.file]));
  for (const img of images) {
    assert.ok(
      manifestById.get(img.id) === img.file,
      `image#${img.id} missing or mismatched in manifest.json`,
    );
    const filePath = join(projectRoot, 'public', 'assets', 'images', img.file);
    assert.ok(existsSync(filePath), `image file missing on disk: ${img.file}`);
  }
});

test('data integrity: every chapter topic has real content', (t) => {
  if (chapters.length === 0) {
    t.skip('curriculum data not authored yet');
    return;
  }
  assert.deepEqual(collectTopicIssues(topics, chapters), []);
  for (const c of chapters) {
    assert.ok(c.topicsSummary.length > 0, `chapter ${c.id} has no topics`);
  }
});

test('data integrity: flashcards meet the declared minimum and have complete fields', (t) => {
  if (flashcards.length === 0) {
    t.skip('flashcards data not authored yet');
    return;
  }
  assert.ok(flashcards.length >= FLASHCARDS_MIN, `flashcards: ${flashcards.length} < ${FLASHCARDS_MIN}`);
  for (const card of flashcards) {
    assert.ok(card.term.trim().length > 0);
    assert.ok(card.arTerm.trim().length > 0);
    assert.ok(card.enDef.trim().length > 0);
    assert.ok(card.arDef.trim().length > 0);
    assert.ok(chapters.some((c) => c.id === card.ch), `unknown chapter ${card.ch}`);
  }
});

test('data integrity: reference tables, glossary, parameters, reflexes, and hormones are valid', (t) => {
  if (chapters.length === 0) {
    t.skip('curriculum data not authored yet');
    return;
  }
  const chapterIds = new Set(chapters.map((c) => c.id));
  for (const table of referenceTables) {
    assert.ok(chapterIds.has(table.ch), `table ${table.id}: unknown chapter`);
    assert.ok(table.headers.length > 0 && table.rows.length > 0, `table ${table.id} is empty`);
  }
  for (const term of glossary) {
    assert.ok(chapterIds.has(term.ch), `glossary term ${term.id}: unknown chapter`);
    assert.ok(term.term.trim().length > 0 && term.arTerm.trim().length > 0);
  }
  for (const p of parameters) {
    assert.ok(chapterIds.has(p.ch), `parameter ${p.id}: unknown chapter`);
    assert.ok(p.normalRange.trim().length > 0);
  }
  for (const r of reflexes) {
    assert.ok(chapterIds.has(r.ch), `reflex ${r.id}: unknown chapter`);
  }
  for (const h of hormones) {
    assert.ok(chapterIds.has(h.ch), `hormone ${h.id}: unknown chapter`);
  }
});

test('data integrity: labs meet the declared minimum and have goals and valid self-checks', (t) => {
  const labs = [...partALabs, ...partBLabs];
  if (labs.length === 0) {
    t.skip('labs data not authored yet');
    return;
  }
  assert.ok(labs.length >= LABS_MIN, `labs: ${labs.length} < ${LABS_MIN}`);
  const chapterIds = new Set(chapters.map((c) => c.id));
  for (const lab of labs) {
    assert.ok(chapterIds.has(lab.ch), `lab ${lab.id}: unknown chapter`);
    assert.ok(lab.goalAr.trim().length > 0 && lab.goalEn.trim().length > 0, `lab ${lab.id}: missing goal`);
    if (lab.kind === 'case') {
      for (const q of lab.questions) {
        assert.ok(q.correct >= 0 && q.correct < q.options.length, `lab ${lab.id}: bad correct index`);
      }
    }
    if (lab.kind === 'builder') {
      assert.ok(lab.steps.length >= 3, `lab ${lab.id}: builder needs at least 3 steps`);
    }
    if (lab.kind === 'matcher') {
      assert.ok(lab.pairs.length >= 3, `lab ${lab.id}: matcher needs at least 3 pairs`);
    }
    if (lab.kind === 'explorer') {
      assert.ok(lab.pins.length >= 3, `lab ${lab.id}: explorer needs at least 3 pins`);
      for (const pin of lab.pins) {
        assert.ok(pin.x >= 0 && pin.x <= 100 && pin.y >= 0 && pin.y <= 100, `lab ${lab.id}: pin out of bounds`);
      }
    }
    if (lab.kind === 'flow') {
      assert.ok(lab.steps.length >= 3, `lab ${lab.id}: flow needs at least 3 steps`);
    }
    if (lab.kind === 'compare') {
      assert.ok(lab.rows.length >= 3, `lab ${lab.id}: compare needs at least 3 rows`);
    }
  }
});
