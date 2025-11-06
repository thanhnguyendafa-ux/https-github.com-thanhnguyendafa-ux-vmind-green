// This is a test file for a framework like Jest or Vitest.
// A test runner needs to be configured in the project to execute these tests.

// FIX: Add TypeScript declarations for test globals to fix "Cannot find name" errors.
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;

import { generateScrambleSession, generateStudySession } from '../utils/studySessionGenerator';
import { Table, StudyMode, ScrambleSessionSettings, VocabRow, FlashcardStatus, StudySettings } from '../types';

// Mock global functions for environments without a test runner setup.
// FIX: Replace `global` with `globalThis` for universal compatibility.
if (typeof describe === 'undefined') { (globalThis as any).describe = (name: string, fn: () => void) => fn(); }
// FIX: Replace `global` with `globalThis` for universal compatibility.
if (typeof it === 'undefined') { (globalThis as any).it = (name: string, fn: () => void) => fn(); }
if (typeof expect === 'undefined') {
    // FIX: Replace `global` with `globalThis` for universal compatibility.
    (globalThis as any).expect = (actual: any) => ({
        toBe: (expected: any) => {
            if (actual !== expected) throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
        },
        toEqual: (expected: any) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        },
        not: {
            toBe: (expected: any) => {
                if (actual === expected) throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`);
            },
        },
        toBeUndefined: () => {
            if (typeof actual !== 'undefined') throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to be undefined`);
        },
        some: (predicate: (item: any) => boolean) => {
            if (!Array.isArray(actual) || !actual.some(predicate)) throw new Error(`TEST FAILED: Expected some item in array to pass predicate`);
        },
        every: (predicate: (item: any) => boolean) => {
            if (!Array.isArray(actual) || !actual.every(predicate)) throw new Error(`TEST FAILED: Expected every item in array to pass predicate`);
        },
        get length() {
            if (!Array.isArray(actual)) throw new Error('TEST FAILED: Expected an array for .length');
            return actual.length;
        }
    });
}


const mockTable: Table = {
    id: 'scramble-table-1',
    name: 'Sentence Scramble Table',
    columns: [{ id: 'col-1', name: 'Sentence' }],
    rows: [
        { id: 'row-1', cols: { 'col-1': 'The quick brown fox' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } }, // 4 words
        { id: 'row-2', cols: { 'col-1': 'jumps over the lazy dog' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } }, // 5 words
        { id: 'row-3', cols: { 'col-1': 'A short sentence' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } }, // 3 words
    ],
    relations: [
        { id: 'rel-1', name: 'Scramble Relation', questionColumnIds: ['col-1'], answerColumnIds: [], compatibleModes: [StudyMode.Scrambled] }
    ],
    aiPrompts: [],
};

const mockStudyTable: Table = {
    id: 'study-table-1',
    name: 'Study Table',
    columns: [{ id: 'col-word', name: 'Word' }, { id: 'col-def', name: 'Definition' }],
    rows: [
        { id: 's-row-1', cols: { 'col-word': 'Apple', 'col-def': 'A fruit' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        { id: 's-row-2', cols: { 'col-word': 'Banana', 'col-def': 'Another fruit' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
        { id: 's-row-3', cols: { 'col-word': 'Carrot', 'col-def': 'A vegetable' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } },
    ],
    relations: [
        { id: 'rel-word-def', name: 'Word to Def', questionColumnIds: ['col-word'], answerColumnIds: ['col-def'], compatibleModes: [StudyMode.MultipleChoice, StudyMode.Typing] },
        { id: 'rel-def-word', name: 'Def to Word', questionColumnIds: ['col-def'], answerColumnIds: ['col-word'], compatibleModes: [StudyMode.Typing] }
    ]
};


describe('studySessionGenerator', () => {
  describe('generateScrambleSession', () => {
    it('should return an empty array if no compatible relations are provided', () => {
      const settings: ScrambleSessionSettings = {
        sources: [{ tableId: 'scramble-table-1', relationId: 'non-existent-rel' }],
        splitCount: 4,
        interactionMode: 'click',
      };
      const result = generateScrambleSession([mockTable], settings);
      expect(result.length).toBe(0);
    });

    it('should only include sentences with enough words to meet the splitCount', () => {
      const settings: ScrambleSessionSettings = {
        sources: [{ tableId: 'scramble-table-1', relationId: 'rel-1' }],
        splitCount: 4, // "A short sentence" (3 words) should be excluded
        interactionMode: 'click',
      };
      const result = generateScrambleSession([mockTable], settings);
      expect(result.length).toBe(2);
      expect(result.some(q => q.originalSentence === 'A short sentence')).toBe(false);
    });

    it('should generate scrambled parts that are different from the original word order', () => {
      const settings: ScrambleSessionSettings = {
        sources: [{ tableId: 'scramble-table-1', relationId: 'rel-1' }],
        splitCount: 4,
        interactionMode: 'click',
      };
      const result = generateScrambleSession([mockTable], settings);
      const question = result.find(q => q.originalSentence === 'The quick brown fox');
      
      if (!question) {
          throw new Error("Test setup failed: question not found");
      }

      // It's technically possible for shuffle to return the same order, but highly unlikely.
      // A more robust test checks if the set of words is the same but the order is likely different.
      expect(question.scrambledParts.join(' ')).not.toBe('The quick brown fox');
      expect(question.scrambledParts.sort()).toEqual(['The', 'brown', 'fox', 'quick'].sort());
    });

    it('should return an empty array if splitCount is higher than any sentence length', () => {
        const settings: ScrambleSessionSettings = {
            sources: [{ tableId: 'scramble-table-1', relationId: 'rel-1' }],
            splitCount: 6,
            interactionMode: 'click',
        };
        const result = generateScrambleSession([mockTable], settings);
        expect(result.length).toBe(0);
    });
  });

  describe('generateStudySession', () => {
    const baseSettings: StudySettings = {
        type: 'table',
        sources: [{ tableId: 'study-table-1', relationId: 'rel-word-def' }],
        modes: [StudyMode.MultipleChoice, StudyMode.Typing],
        randomizeModes: true,
        wordSelectionMode: 'auto',
        wordCount: 2
    };

    it('should generate the correct number of questions based on wordCount', () => {
        const result = generateStudySession([mockStudyTable], baseSettings);
        expect(result.length).toBe(2);
    });

    it('should respect manual word selection', () => {
        const manualSettings: StudySettings = {
            ...baseSettings,
            wordSelectionMode: 'manual',
            manualWordIds: ['s-row-1', 's-row-3']
        };
        const result = generateStudySession([mockStudyTable], manualSettings);
        expect(result.length).toBe(2);
        expect(result.some(q => q.rowId === 's-row-1')).toBe(true);
        expect(result.some(q => q.rowId === 's-row-3')).toBe(true);
        expect(result.some(q => q.rowId === 's-row-2')).toBe(false);
    });

    it('should only use selected modes compatible with the relation', () => {
        const settings: StudySettings = {
            ...baseSettings,
            sources: [{ tableId: 'study-table-1', relationId: 'rel-def-word' }], // Only compatible with Typing
            modes: [StudyMode.MultipleChoice, StudyMode.Typing] // User selects both
        };
        const result = generateStudySession([mockStudyTable], settings);
        // All questions should be Typing, as MultipleChoice is not compatible with rel-def-word
        expect(result.every(q => q.type === StudyMode.Typing)).toBe(true);
    });
    
     it('should return an empty array if no sources are selected', () => {
        const settings: StudySettings = { ...baseSettings, sources: [] };
        const result = generateStudySession([mockStudyTable], settings);
        expect(result.length).toBe(0);
    });
    
    it('should generate MultipleChoice questions with options', () => {
        const settings: StudySettings = { ...baseSettings, modes: [StudyMode.MultipleChoice], wordCount: 1 };
        const result = generateStudySession([mockStudyTable], settings);
        expect(result[0].type).toBe(StudyMode.MultipleChoice);
        expect(result[0].options?.length).toBe(3); // one correct, two distractors from other rows
        expect(result[0].options?.includes(result[0].correctAnswer)).toBe(true);
    });

    it('should fall back to Typing if not enough distractors for MultipleChoice', () => {
        const smallTable = { ...mockStudyTable, rows: [mockStudyTable.rows[0]] }; // only one row
        const settings: StudySettings = { ...baseSettings, modes: [StudyMode.MultipleChoice], wordCount: 1 };
        const result = generateStudySession([smallTable], settings);
        // Should fall back to Typing because it can't create 3 other options for MCQ
        expect(result[0].type).toBe(StudyMode.Typing);
    });
  });
});