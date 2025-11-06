import { Table, Question, VocabRow, StudySettings, StudyMode, Relation, ScrambleSessionSettings, ScrambleQuestion } from '../types';

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// --- Word Scoring & Selection Logic ---

const getPriorityScore = (row: VocabRow): number => {
    const { correct, incorrect, lastStudied } = row.stats;
    const encounters = correct + incorrect;
    if (encounters === 0) return 1000; // Prioritize unseen words

    const timeSinceStudied = lastStudied ? (Date.now() - lastStudied) / (1000 * 3600 * 24) : 999; // days ago
    const recencyBonus = Math.min(Math.log(timeSinceStudied + 1) * 10, 50);
    const failurePenalty = (incorrect + 1) / (correct + 1);
    const successRatio = correct / encounters;

    return Math.round((failurePenalty * 50) + (1 - successRatio) * 30 + recencyBonus);
};

const getSuccessRate = (row: VocabRow): number => {
    const { correct, incorrect } = row.stats;
    const encounters = correct + incorrect;
    return encounters > 0 ? Math.round((correct / encounters) * 100) : 0;
};


// --- Question Generation Logic ---

const createQuestion = (row: VocabRow, relation: Relation, table: Table, allRows: VocabRow[], mode: StudyMode): Question | null => {
    const questionColumnIds = relation.questionColumnIds;
    const answerColumnIds = relation.answerColumnIds;

    const getColumnName = (id: string) => table.columns.find(c => c.id === id)?.name || '';
    const questionSourceColumnNames = questionColumnIds.map(getColumnName);
    
    const questionText = questionColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');
    const actualAnswer = answerColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');

    if (!questionText || (!actualAnswer && mode !== StudyMode.Scrambled)) {
        return null;
    }

    const baseQuestion = {
        rowId: row.id,
        tableId: table.id,
        relationId: relation.id,
        questionSourceColumnNames,
        questionText,
        type: mode,
    };

    switch (mode) {
        case StudyMode.Typing:
        case StudyMode.Scrambled:
            return { ...baseQuestion, correctAnswer: mode === StudyMode.Scrambled ? questionText : actualAnswer };

        case StudyMode.TrueFalse:
            const showCorrect = Math.random() > 0.5;
            if (showCorrect) {
                return { ...baseQuestion, proposedAnswer: actualAnswer, correctAnswer: 'True' };
            } else {
                const distractor = allRows.find(r => r.id !== row.id && answerColumnIds.map(id => r.cols[id]).filter(Boolean).join(' / '));
                const distractorAnswer = distractor ? answerColumnIds.map(id => distractor.cols[id]).filter(Boolean).join(' / ') : `Not ${actualAnswer}`;
                if (!distractorAnswer || distractorAnswer === actualAnswer) return createQuestion(row, relation, table, allRows, StudyMode.Typing); // Fallback
                return { ...baseQuestion, proposedAnswer: distractorAnswer, correctAnswer: 'False' };
            }

        case StudyMode.MultipleChoice:
            const distractors = allRows
                .filter(r => r.id !== row.id)
                .map(r => answerColumnIds.map(id => r.cols[id]).filter(Boolean).join(' / '))
                .filter(d => d && d !== actualAnswer);
            
            let options = shuffleArray(Array.from(new Set(distractors))).slice(0, 3);
            options.push(actualAnswer);
            
            if (options.length < 2) return createQuestion(row, relation, table, allRows, StudyMode.Typing); // Fallback

            return { ...baseQuestion, correctAnswer: actualAnswer, options: shuffleArray(options) };
        
        default:
            return null;
    }
};

export const regenerateQuestionForRow = (
    questionToRegen: Question,
    allRowsFromSources: VocabRow[],
    tables: Table[],
    settings: StudySettings
): Question => {
    const tableForThisRow = tables.find(t => t.id === questionToRegen.tableId);
    if (!tableForThisRow) return questionToRegen;
    
    const row = tableForThisRow.rows.find(r => r.id === questionToRegen.rowId);
    if (!row) return questionToRegen;

    const relation = tableForThisRow.relations.find(r => r.id === questionToRegen.relationId);
    if (!relation) return questionToRegen;
    
    const compatibleModes = relation.compatibleModes?.filter(m => settings.modes.includes(m)) || [];
    if (compatibleModes.length === 0) return questionToRegen;

    let nextMode: StudyMode;
    if (settings.randomizeModes) {
        nextMode = compatibleModes[Math.floor(Math.random() * compatibleModes.length)];
    } else {
        nextMode = compatibleModes[0];
    }


    const newQuestion = createQuestion(row, relation, tableForThisRow, allRowsFromSources, nextMode);
    
    return newQuestion || questionToRegen; // Fallback to original if generation fails
};


// --- Main Generator Function ---

export function generateStudySession(tables: Table[], settings: StudySettings): Question[] {
    let candidateRows: VocabRow[] = [];
    let allRowsFromSources: VocabRow[] = [];
    
    const tablesById = new Map(tables.map(t => [t.id, t]));

    // First, populate allRowsFromSources for context (like MCQ distractors) and for selection pools.
    const allRowsMap = new Map<string, VocabRow>();
    for (const source of settings.sources) {
        const table = tablesById.get(source.tableId);
        if (table) {
            table.rows.forEach(row => {
                if (!allRowsMap.has(row.id)) {
                    allRowsMap.set(row.id, row);
                }
            });
        }
    }
    allRowsFromSources = Array.from(allRowsMap.values());
    
    let selectedRows: VocabRow[] = [];

    if (settings.wordSelectionMode === 'manual' && settings.manualWordIds) {
        // Manual mode: directly use the selected word IDs.
        selectedRows = settings.manualWordIds.map(id => allRowsMap.get(id)).filter((row): row is VocabRow => !!row);

    } else { // 'auto' mode
        if (settings.type === 'table') {
            // Group rows from allRowsFromSources by their original table
            const rowsByTable = new Map<string, VocabRow[]>();
            for (const row of allRowsFromSources) {
                const table = tables.find(t => t.rows.some(r => r.id === row.id));
                // Only consider tables that were actually selected in the sources
                if (table && settings.sources.some(s => s.tableId === table.id)) {
                    if (!rowsByTable.has(table.id)) {
                        rowsByTable.set(table.id, []);
                    }
                    rowsByTable.get(table.id)!.push(row);
                }
            }

            // Sort rows within each table group by priority (higher score is harder)
            for (const rows of rowsByTable.values()) {
                rows.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
            }

            // Balanced composition strategy (round-robin)
            const composedRows: VocabRow[] = [];
            const wordCountGoal = settings.wordCount || 0;
            const numTablesWithRows = [...rowsByTable.values()].filter(rows => rows.length > 0).length;

            if (numTablesWithRows > 0) {
                const tableCursors = new Map([...rowsByTable.keys()].map(id => [id, 0]));
                const tableIdsCycle = [...rowsByTable.keys()];
                
                while (composedRows.length < wordCountGoal) {
                    let oneWordAddedInCycle = false;
                    for (const tableId of tableIdsCycle) {
                        if (composedRows.length >= wordCountGoal) break;

                        const cursor = tableCursors.get(tableId)!;
                        const rowsOfTable = rowsByTable.get(tableId)!;
                        
                        if (cursor < rowsOfTable.length) {
                            const rowToAdd = rowsOfTable[cursor];
                            composedRows.push(rowToAdd);
                            tableCursors.set(tableId, cursor + 1);
                            oneWordAddedInCycle = true;
                        }
                    }
                    // If a full cycle adds no words, all sources are exhausted.
                    if (!oneWordAddedInCycle) break;
                }
            }
            candidateRows = composedRows;

        } else { // 'criteria'
            candidateRows = [...allRowsFromSources]; // Use a copy for sorting
            const { criteriaSorts } = settings;
            
            if (criteriaSorts && criteriaSorts.length > 0) {
              candidateRows.sort((a, b) => {
                for (const sort of criteriaSorts) {
                    let valA, valB;
                    let result = 0;
                    switch(sort.field) {
                        case 'priorityScore':
                            valA = getPriorityScore(a);
                            valB = getPriorityScore(b);
                            result = valB - valA; // Higher score is better (desc)
                            break;
                        case 'successRate':
                            valA = getSuccessRate(a);
                            valB = getSuccessRate(b);
                            result = valA - valB; // Lower rate is better (asc)
                            break;
                        case 'lastStudied':
                            valA = a.stats.lastStudied || 0;
                            valB = b.stats.lastStudied || 0;
                            result = valA - valB; // Older date is better (asc)
                            break;
                        case 'random':
                            result = Math.random() - 0.5;
                            break;
                    }
                    if (result !== 0) return result;
                }
                return 0; // All criteria are equal
              });
            }
        }
        selectedRows = candidateRows.slice(0, settings.wordCount);
    }


    const questions: Question[] = [];
    for (const row of selectedRows) {
        // Find a source that contains this row to get a relation
        const source = settings.sources.find(s => tablesById.get(s.tableId)?.rows.some(r => r.id === row.id));
        if (!source) continue;

        const table = tablesById.get(source.tableId);
        const relation = table?.relations.find(r => r.id === source.relationId);
        if (!table || !relation) continue;
        
        const compatibleModes = relation.compatibleModes?.filter(m => settings.modes.includes(m)) || [];
        if (compatibleModes.length === 0) continue;
        
        let mode: StudyMode;
        if (settings.randomizeModes) {
            mode = compatibleModes[Math.floor(Math.random() * compatibleModes.length)];
        } else {
            mode = compatibleModes[0];
        }

        const question = createQuestion(row, relation, table, allRowsFromSources, mode);
        if (question) {
            questions.push(question);
        }
    }
    
    return shuffleArray(questions);
}

// --- New: Scramble Session Generator ---

export function generateScrambleSession(tables: Table[], settings: ScrambleSessionSettings): ScrambleQuestion[] {
    const questions: ScrambleQuestion[] = [];
    const tablesById = new Map(tables.map(t => [t.id, t]));

    const candidateRows = new Map<string, VocabRow>();
    for (const source of settings.sources) {
        const table = tablesById.get(source.tableId);
        if (table) {
            table.rows.forEach(row => {
                if (!candidateRows.has(row.id)) {
                    candidateRows.set(row.id, row);
                }
            });
        }
    }
    
    for (const row of Array.from(candidateRows.values())) {
        for (const source of settings.sources) {
            const table = tablesById.get(source.tableId);
            const relation = table?.relations.find(r => r.id === source.relationId);

            if (table && relation && table.rows.some(r => r.id === row.id)) {
                const originalSentence = relation.questionColumnIds
                    .map(id => row.cols[id])
                    .filter(Boolean)
                    .join(' / ');

                // Split by space, handling various punctuation attached to words
                const words = originalSentence.split(/\s+/).filter(Boolean);
                
                if (words.length >= settings.splitCount) {
                    questions.push({
                        rowId: row.id,
                        tableId: table.id,
                        relationId: relation.id,
                        originalSentence,
                        scrambledParts: shuffleArray(words),
                    });
                    // Only add one question per row from the first matching relation
                    break;
                }
            }
        }
    }

    return shuffleArray(questions);
}