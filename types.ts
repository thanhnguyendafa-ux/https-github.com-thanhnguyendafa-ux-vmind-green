export enum Screen {
  Home,
  Tables,
  Library,
  Vmind,
  Rewards,
  Settings,
  TableDetail,
  StudySession,
  Reading,
  Auth,
  Journal,
  Flashcards, // New screen for flashcard setup
  FlashcardSession, // New screen for active flashcard session
  StudySetup,
}

export type Theme = 'light' | 'dark';

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface Column {
  id: string;
  name: string;
}

export enum StudyMode {
  Flashcards = 'Flashcards',
  MultipleChoice = 'Multiple Choice',
  Typing = 'Typing',
  TrueFalse = 'True/False',
  Scrambled = 'Scrambled',
}

export interface TypographyDesign {
  color: string;
  fontSize: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'bold';
}

export interface CardFaceDesign {
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundValue: string;
  gradientAngle: number;
  typography: Record<string, TypographyDesign>; // Maps columnId to its style
}

export interface RelationDesign {
  front: CardFaceDesign;
  back: CardFaceDesign;
}


export interface Relation {
  id: string;
  name: string;
  questionColumnIds: string[];
  answerColumnIds: string[];
  compatibleModes?: StudyMode[];
  design?: RelationDesign;
  isCustom?: boolean;
}

export interface AIPrompt {
  id: string;
  name: string;
  sourceColumnIds: string[];
  targetColumnId: string;
  prompt: string;
}

export enum FlashcardStatus {
  New = 'New',
  Again = 'Again',
  Hard = 'Hard',
  Good = 'Good',
  Easy = 'Easy',
  Perfect = 'Perfect',
}

export interface VocabRow {
  id: string;
  cols: Record<string, string>; // Maps columnId to value
  stats: {
    correct: number;
    incorrect: number;
    lastStudied: number | null;
    // New fields for Flashcard Mode
    flashcardStatus: FlashcardStatus;
    flashcardEncounters: number;
    isFlashcardReviewed: boolean;
    lastPracticeDate: number | null;
  };
}

export interface Table {
  id:string;
  name: string;
  columns: Column[];
  rows: VocabRow[];
  relations: Relation[];
  imageConfig?: { imageColumnId: string; sourceColumnId: string; } | null;
  audioConfig?: { sourceColumnId: string; language?: string; } | null;
  aiPrompts?: AIPrompt[];
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  tableIds: string[];
}

export type BadgeType = 'xp' | 'time';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BadgeType;
  value: number; // XP amount or seconds of study time
}

export interface UserStats {
  xp: number;
  level: number;
  studyStreak: number;
  lastSessionDate: string | null;
  activity: { [date: string]: number }; // date (YYYY-MM-DD) -> duration in seconds
  totalStudyTimeSeconds: number;
  unlockedBadges: string[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface AppState {
    tables: Table[];
    folders: Folder[];
    stats: UserStats;
    notes: Note[];
    savedFlashcardQueues?: Record<string, string[]>; // key: tableIds|relationIds, value: rowId[]
}

export enum QuestionType {
  MultipleChoice,
  Typing,
}

export interface Question {
  rowId: string;
  questionSourceColumnNames: string[];
  questionText: string;
  correctAnswer: string;
  type: QuestionType;
  options?: string[]; // For MultipleChoice
}

export interface StudySession {
  tableId: string;
  relationId: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: { [questionIndex: number]: { answer: string; isCorrect: boolean } };
  startTime: number;
}

export interface FlashcardSession {
  tableIds: string[];
  relationIds: string[];
  queue: string[]; // array of row IDs
  currentIndex: number;
  sessionEncounters: number;
  startTime: number;
  history: { rowId: string; status: FlashcardStatus; timestamp: number }[];
}