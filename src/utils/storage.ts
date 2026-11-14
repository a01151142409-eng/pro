import type { AppSettings, ProgressState } from '../types/physiology.ts';

export const STORAGE_PREFIX = 'phys_';

export const DEFAULT_SETTINGS: AppSettings = {
  lang: 'ar',
  theme: 'dark',
  fontSize: 16,
};

export const DEFAULT_PROGRESS: ProgressState = {
  completedChapters: [],
  bookmarks: [],
  knownCards: [],
  wrongQuestionIds: [],
  bestScores: {},
  notes: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isAppSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) return false;
  return (
    (value.lang === 'ar' || value.lang === 'both' || value.lang === 'en') &&
    (value.theme === 'dark' || value.theme === 'light') &&
    typeof value.fontSize === 'number'
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isProgressState(value: unknown): value is ProgressState {
  if (!isRecord(value)) return false;
  return (
    isStringArray(value.completedChapters) &&
    isStringArray(value.bookmarks) &&
    isStringArray(value.knownCards) &&
    Array.isArray(value.wrongQuestionIds) &&
    value.wrongQuestionIds.every((item) => typeof item === 'number') &&
    isRecord(value.bestScores) &&
    isRecord(value.notes)
  );
}

export function loadJson<T>(key: string, fallback: T, validate?: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function exportProgress(settings: AppSettings, progress: ProgressState): void {
  const backup = {
    app: 'physiology-interactive-guide',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    progress,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'physiology-progress.json';
  anchor.click();
  URL.revokeObjectURL(url);
}
