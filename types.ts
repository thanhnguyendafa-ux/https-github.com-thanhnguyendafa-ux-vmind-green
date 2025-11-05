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
    wasQuit?: boolean; // For QuitQueue logic
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
  lastLogin?: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface AppSettings {
  journalMode: 'manual' | 'automatic';
  // Future settings can be added here
}

export interface AppState {
    tables: Table[];
    folders: Folder[];
    stats: UserStats;
    notes: Note[];
    settings: AppSettings;
    savedFlashcardQueues?: Record<string, string[]>; // key: tableIds|relationIds, value: rowId[]
}

export interface Question {
  rowId: string;
  tableId: string;
  relationId: string;
  questionSourceColumnNames: string[];
  questionText: string;
  proposedAnswer?: string; // For True/False
  correctAnswer: string;
  type: StudyMode;
  options?: string[];
}

export interface StudySessionData {
  questions: Question[];
  startTime: number;
  settings: StudySettings;
}

export enum SessionItemState {
  Unseen = 'unseen',
  Fail = 'fail',
  Pass1 = 'pass1',
  Pass2 = 'pass2',
}

export interface SessionWordResult {
  rowId: string;
  isCorrect: boolean;
  timestamp: number;
  hintUsed?: boolean;
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


// --- New: Advanced Study Settings ---
export type StudySource = {
    tableId: string;
    relationId: string;
};

export type TableModeComposition = {
    strategy: 'balanced' | 'percentage';
    percentages: { [tableId: string]: number };
};

export type CriteriaSort = {
    field: 'priorityScore' | 'successRate' | 'lastStudied' | 'random';
    direction: 'asc' | 'desc';
};

export interface StudySettings {
    type: 'table' | 'criteria';
    sources: StudySource[];
    modes: StudyMode[];
    randomizeModes?: boolean;

    // Word selection
    wordSelectionMode: 'auto' | 'manual';
    wordCount?: number; // Used in 'auto' mode
    manualWordIds?: string[]; // Used in 'manual' mode
    
    // Criteria Mode specific
    criteriaSorts?: CriteriaSort[];
}