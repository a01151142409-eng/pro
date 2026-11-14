export type LangMode = 'ar' | 'both' | 'en';
export type ThemeMode = 'dark' | 'light';
export type Part = 'A' | 'B';

export interface Bi {
  ar: string;
  en: string;
}

export interface SubjectMeta {
  ar: string;
  en: string;
  collegeAr: string;
  collegeEn: string;
  storagePrefix: string;
  codes: string[];
  sourceRef: string;
}

export interface ChapterMeta {
  id: string;
  part: Part;
  num: string;
  ar: string;
  en: string;
  topicsSummary: string[];
}

export interface TopicContent {
  id: string;
  ch: string;
  ar: string;
  en: string;
  arBody: string[];
  enBody: string[];
  tableIds: string[];
  imageIds: number[];
}

export interface ImageItem {
  id: number;
  file: string;
  ar: string;
  en: string;
  ch: string;
  topic: string;
}

export interface QuizOption {
  ar: string;
  en: string;
}

export interface QuizQuestion {
  id: number;
  ch: string;
  qAr: string;
  qEn: string;
  options: QuizOption[];
  correct: number;
  explAr: string;
  explEn: string;
}

export interface SpotterItem {
  id: number;
  ch: string;
  imageId: number;
  pinX: number;
  pinY: number;
  promptAr: string;
  promptEn: string;
  options: QuizOption[];
  correct: number;
  explAr: string;
  explEn: string;
}

export interface FlashcardItem {
  ch: string;
  term: string;
  arTerm: string;
  enDef: string;
  arDef: string;
}

export interface GlossaryTerm {
  id: number;
  term: string;
  arTerm: string;
  defEn: string;
  defAr: string;
  ch: string;
}

export interface ReferenceTable {
  id: string;
  ch: string;
  group: string;
  titleAr: string;
  titleEn: string;
  headers: Bi[];
  rows: Bi[][];
}

export type ParameterGroup =
  | 'fluids'
  | 'energy'
  | 'thermal'
  | 'neural'
  | 'membrane'
  | 'general';

export interface Parameter {
  id: string;
  ch: string;
  nameAr: string;
  nameEn: string;
  group: ParameterGroup;
  normalRange: string;
  units: string;
  regulatorsAr: string;
  regulatorsEn: string;
  notesAr: string;
  notesEn: string;
}

export type ReflexType =
  | 'negative-feedback'
  | 'positive-feedback'
  | 'feedforward'
  | 'spinal'
  | 'autonomic';

export interface Reflex {
  id: string;
  ch: string;
  nameAr: string;
  nameEn: string;
  type: ReflexType;
  stimulusAr: string;
  stimulusEn: string;
  arcAr: string;
  arcEn: string;
  responseAr: string;
  responseEn: string;
}

export interface Hormone {
  id: string;
  ch: string;
  nameAr: string;
  nameEn: string;
  sourceAr: string;
  sourceEn: string;
  targetsAr: string;
  targetsEn: string;
  effectsAr: string;
  effectsEn: string;
}

export type LabKind =
  | 'explorer'
  | 'slider'
  | 'builder'
  | 'matcher'
  | 'case'
  | 'compare'
  | 'flow';

export interface LabBase {
  id: string;
  ch: string;
  kind: LabKind;
  titleAr: string;
  titleEn: string;
  goalAr: string;
  goalEn: string;
  selfCheck?: CaseQuestion;
}

export interface ExplorerPin {
  id: string;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  x: number;
  y: number;
}

export interface ExplorerLab extends LabBase {
  kind: 'explorer';
  image: string;
  pins: ExplorerPin[];
}

export interface SliderOutput {
  ar: string;
  en: string;
  at: (value: number) => string | number;
}

export interface SliderLab extends LabBase {
  kind: 'slider';
  min: number;
  max: number;
  step: number;
  initial: number;
  unit: string;
  variableAr: string;
  variableEn: string;
  outputs: SliderOutput[];
}

export interface BuilderStep {
  id: string;
  ar: string;
  en: string;
}

export interface BuilderLab extends LabBase {
  kind: 'builder';
  steps: BuilderStep[];
}

export interface MatcherPair {
  leftAr: string;
  leftEn: string;
  rightAr: string;
  rightEn: string;
}

export interface MatcherLab extends LabBase {
  kind: 'matcher';
  pairs: MatcherPair[];
}

export interface CaseQuestion {
  promptAr: string;
  promptEn: string;
  options: QuizOption[];
  correct: number;
  explAr: string;
  explEn: string;
}

export interface CaseLab extends LabBase {
  kind: 'case';
  vignetteAr: string;
  vignetteEn: string;
  questions: CaseQuestion[];
}

export interface CompareRow {
  aspect: Bi;
  left: Bi;
  right: Bi;
}

export interface CompareLab extends LabBase {
  kind: 'compare';
  leftTitle: Bi;
  rightTitle: Bi;
  rows: CompareRow[];
}

export interface FlowStep {
  title: Bi;
  detail: Bi;
}

export interface FlowLab extends LabBase {
  kind: 'flow';
  steps: FlowStep[];
}

export type Lab =
  | ExplorerLab
  | SliderLab
  | BuilderLab
  | MatcherLab
  | CaseLab
  | CompareLab
  | FlowLab;

export interface AppSettings {
  lang: LangMode;
  theme: ThemeMode;
  fontSize: number;
}

export interface ProgressState {
  completedChapters: string[];
  bookmarks: string[];
  knownCards: string[];
  wrongQuestionIds: number[];
  bestScores: Record<string, number>;
  notes: Record<string, string>;
}

export interface ProgressBackup {
  app: string;
  version: number;
  exportedAt: string;
  settings: AppSettings;
  progress: ProgressState;
}

export type ToolId = 'quiz' | 'spotters' | 'flashcards' | 'labs' | 'gallery' | 'glossary' | 'tables' | 'notes';
