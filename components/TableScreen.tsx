

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Table, VocabRow, Relation, Column, AIPrompt, StudyMode, RelationDesign, CardFaceDesign, FlashcardStatus, TypographyDesign } from '../types';
import Icon from './Icon';
import Modal from './Modal';
import Toast from './Toast';
import Popover from './Popover';
import WordDetailModal from './WordDetailModal';
import { generateForPrompt, generateSpeech } from '../services/geminiService';

// --- Share Modal ---
const ShareModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    table: Table;
    onShare: (description: string, tags: string) => void;
}> = ({ isOpen, onClose, table, onShare }) => {
    const [description, setDescription] = useState(table.description || '');
    const [tags, setTags] = useState((table.tags || []).join(', '));

    useEffect(() => {
        if (isOpen) {
            setDescription(table.description || '');
            setTags((table.tags || []).join(', '));
        }
    }, [isOpen, table]);

    const handleShareClick = () => {
        onShare(description, tags);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Share "${table.name}"`}>
            <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-gray-300">
                    Add a description and tags to help others discover your vocabulary table in the community library.
                </p>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
                        placeholder="A brief description of this table."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Tags (comma-separated)</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2 text-sm"
                        placeholder="e.g., spanish, verbs, b1"
                    />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                    <button onClick={onClose} className="bg-white dark:bg-gray-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600">
                        Cancel
                    </button>
                    <button onClick={handleShareClick} className="bg-emerald-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-emerald-700">
                        {table.isPublic ? 'Update Sharing Info' : 'Share to Library'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


// --- Types for advanced features ---
type Operator = 'contains' | 'not_contains' | 'is' | 'is_not' | 'gt' | 'lt' | 'eq' | 'is_before' | 'is_after' | 'is_empty' | 'is_not_empty';

interface Filter {
    id: string; // Unique ID for the filter rule
    columnId: string;
    operator: Operator;
    value: any;
}

interface Sort {
    columnId: string;
    direction: 'ascending' | 'descending';
}

// Base64 decoding function from Gemini docs
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Audio decoding function from Gemini docs
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


// --- Sub-Component: Rows Table View ---

// --- Constants for List Virtualization ---
const VIRTUAL_ROW_HEIGHT = 49; // Approximate height of a table row in pixels
const OVERSCAN_COUNT = 10;     // Number of rows to render above and below the visible area

const RowsTableView: React.FC<{ 
    table: Table; 
    onUpdateTable: (updatedTable: Table) => void; 
    onEditRow: (row: VocabRow) => void;
    onConfigureAI: (column: Column) => void;
    onDeleteColumn: (columnId: string) => void;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}> = ({ table, onUpdateTable, onEditRow, onConfigureAI, onDeleteColumn, onShowToast }) => {
  
  // New state for advanced features
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sorts, setSorts] = useState<Sort[]>([]);

  const [lastDeleted, setLastDeleted] = useState<{ rows: VocabRow[]; indices: { [id: string]: number } } | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  
  // Popover states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isColumnOpen, setIsColumnOpen] = useState(false);
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null);
  
  // State for new features
  const [generatingCells, setGeneratingCells] = useState<Set<string>>(new Set()); // "rowId-columnId"
  const [audioState, setAudioState] = useState<{ rowId: string, status: 'loading' | 'playing' | 'error' } | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  
  // State for batch AI generation
  const [isRunAiModalOpen, setIsRunAiModalOpen] = useState(false);
  const [aiColumnsToRun, setAiColumnsToRun] = useState<Set<string>>(new Set());
  const [aiRunProgress, setAiRunProgress] = useState<{ current: number; total: number } | null>(null);
  
  // --- Refs and State for Virtualization ---
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600); // Default height

  useEffect(() => {
    // Initialize AudioContext on client-side only
    if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  }, []);

  // --- Observer for container height for virtualization ---
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
        setContainerHeight(container.clientHeight);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);
  
  const promptsByTarget = useMemo(() => {
    const map = new Map<string, AIPrompt>();
    (table.aiPrompts || []).forEach(p => {
        map.set(p.targetColumnId, p);
    });
    return map;
  }, [table.aiPrompts]);

  const fillableCellCount = useMemo(() => {
    if (!table.aiPrompts || table.aiPrompts.length === 0) return 0;
    let count = 0;
    for (const row of table.rows) {
        for (const prompt of table.aiPrompts) {
            const cellValue = row.cols[prompt.targetColumnId];
            if (!cellValue) {
                count++;
            }
        }
    }
    return count;
  }, [table.rows, table.aiPrompts]);


  const allPossibleColumns = useMemo(() => [
    ...table.columns.map(c => ({ ...c, type: 'string' })),
    // Original stats
    { id: 'stats.correct', name: 'Correct', type: 'number' },
    { id: 'stats.incorrect', name: 'Incorrect', type: 'number' },
    { id: 'stats.lastStudied', name: 'Last Studied', type: 'date' },
    // Calculated stats
    { id: 'stats.encounters', name: 'Encounters', type: 'number' },
    { id: 'stats.successRate', name: 'Success Rate (%)', type: 'number' },
    { id: 'stats.priorityScore', name: 'Priority Score', type: 'number' },
  ], [table.columns]);
  
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => new Set([
      ...table.columns.map(c => c.id),
      'stats.lastStudied',
      'stats.successRate'
  ]));

  const getRowValue = useCallback((row: VocabRow, columnId: string): any => {
    if (columnId.startsWith('stats.')) {
        const key = columnId.split('.')[1];
        const { correct, incorrect, lastStudied } = row.stats;
        switch (key) {
            case 'correct': return correct;
            case 'incorrect': return incorrect;
            case 'lastStudied': return lastStudied;
            case 'encounters': return correct + incorrect;
            case 'successRate': 
                const encounters = correct + incorrect;
                return encounters > 0 ? Math.round((correct / encounters) * 100) : 0;
            case 'priorityScore':
                const timeSinceStudied = lastStudied ? (Date.now() - lastStudied) / (1000 * 3600 * 24) : 999; // days ago
                const recencyBonus = Math.log(timeSinceStudied + 1) * 5;
                const failurePenalty = (incorrect + 1) / (correct + 1);
                if (correct + incorrect === 0) return 1000; // Prioritize new rows
                return Math.round(failurePenalty * (incorrect - correct) + recencyBonus);
            default: return null;
        }
    }
    return row.cols[columnId];
  }, []);

  const displayedRows = useMemo(() => {
    let rows = [...table.rows];

    // Filtering
    if (filters.length > 0) {
      rows = rows.filter(row => {
        return filters.every(filter => {
            const val = getRowValue(row, filter.columnId);
            const filterVal = filter.value;
            switch(filter.operator) {
                case 'is_empty': return val === null || val === undefined || val === '';
                case 'is_not_empty': return val !== null && val !== undefined && val !== '';
                case 'contains': return String(val).toLowerCase().includes(String(filterVal).toLowerCase());
                case 'not_contains': return !String(val).toLowerCase().includes(String(filterVal).toLowerCase());
                case 'is': return String(val).toLowerCase() === String(filterVal).toLowerCase();
                case 'is_not': return String(val).toLowerCase() !== String(filterVal).toLowerCase();
                case 'eq': return Number(val) === Number(filterVal);
                case 'gt': return Number(val) > Number(filterVal);
                case 'lt': return Number(val) < Number(filterVal);
                case 'is_before': return val && filterVal && new Date(val) < new Date(filterVal);
                case 'is_after': return val && filterVal && new Date(val) > new Date(filterVal);
                default: return true;
            }
        });
      });
    }

    // Search
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        rows = rows.filter(row => 
            table.columns.some(col => 
                row.cols[col.id]?.toLowerCase().includes(lowercasedTerm)
            )
        );
    }
    
    // Sorting
    if (sorts.length > 0) {
      rows.sort((a, b) => {
        for (const sort of sorts) {
            const aValue = getRowValue(a, sort.columnId) ?? (sort.direction === 'ascending' ? Infinity : -Infinity);
            const bValue = getRowValue(b, sort.columnId) ?? (sort.direction === 'ascending' ? Infinity : -Infinity);
            if (aValue < bValue) return sort.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sort.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return rows;
  }, [table.rows, searchTerm, filters, sorts, getRowValue, table.columns]);

  // --- Virtualization Calculations ---
  const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - OVERSCAN_COUNT);
  const endIndex = Math.min(
    displayedRows.length,
    Math.ceil((scrollTop + containerHeight) / VIRTUAL_ROW_HEIGHT) + OVERSCAN_COUNT
  );
  const visibleRows = useMemo(() => displayedRows.slice(startIndex, endIndex), [displayedRows, startIndex, endIndex]);
  const topSpacerHeight = startIndex * VIRTUAL_ROW_HEIGHT;
  const bottomSpacerHeight = (displayedRows.length - endIndex) * VIRTUAL_ROW_HEIGHT;
  const colSpan = visibleColumns.size + 2 + (table.audioConfig?.sourceColumnId ? 1 : 0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleSaveRow = (updatedRow: VocabRow) => {
    onUpdateTable({ ...table, rows: table.rows.map(w => w.id === updatedRow.id ? updatedRow : w) });
  };
  
  const handleDelete = (idsToDelete: string[]) => {
    const rowsToDelete: VocabRow[] = [];
    const indices: { [id: string]: number } = {};
    const originalRows = [...table.rows];
    const remainingRows = originalRows.filter((row, index) => {
      if (idsToDelete.includes(row.id)) {
        rowsToDelete.push(row);
        indices[row.id] = index;
        return false;
      }
      return true;
    });
    setLastDeleted({ rows: rowsToDelete, indices });
    onUpdateTable({ ...table, rows: remainingRows });
    setSelectedRowIds(new Set());
    setToastKey(Date.now());
  };
  
  const handleUndoDelete = () => {
    if (!lastDeleted) return;
    let newRows = [...table.rows];
    lastDeleted.rows.forEach(row => {
        const index = lastDeleted.indices[row.id];
        if(index !== undefined) newRows.splice(index, 0, row);
    });
    onUpdateTable({ ...table, rows: newRows });
    setLastDeleted(null);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRowIds(new Set(displayedRows.map(w => w.id)));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleSelectOne = (rowId: string, isChecked: boolean) => {
    const newSet = new Set(selectedRowIds);
    if (isChecked) newSet.add(rowId);
    else newSet.delete(rowId);
    setSelectedRowIds(newSet);
  };
  
    const handleSort = (columnId: string) => {
        setSorts(currentSorts => {
            // This implementation focuses on single-column sorting as per the test case.
            const currentSort = currentSorts.length > 0 ? currentSorts[0] : null;

            if (currentSort && currentSort.columnId === columnId) {
                // If already sorting by this column, reverse the direction.
                return [{ ...currentSort, direction: currentSort.direction === 'ascending' ? 'descending' : 'ascending' }];
            } else {
                // If sorting by a new column, default to ascending.
                return [{ columnId, direction: 'ascending' }];
            }
        });
    };
  
  const handlePlayAudio = async (row: VocabRow) => {
    if (!table.audioConfig?.sourceColumnId || audioState?.status === 'loading') return;
    const textToSpeak = row.cols[table.audioConfig.sourceColumnId];
    if (!textToSpeak) return;

    setAudioState({ rowId: row.id, status: 'loading' });
    try {
        const audioB64 = await generateSpeech(textToSpeak);
        if (!audioB64 || !audioCtx.current) throw new Error("Audio generation failed");
        
        const audioBytes = decode(audioB64);
        const audioBuffer = await decodeAudioData(audioBytes, audioCtx.current, 24000, 1);
        
        const source = audioCtx.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.current.destination);
        source.onended = () => setAudioState(null);
        source.start();
        
        setAudioState({ rowId: row.id, status: 'playing' });
    } catch (error: any) {
        if (error.message === "API_KEY_MISSING") {
            onShowToast("Please set your Gemini API key...", "error");
            setAudioState(null);
        } else {
            console.error("Error playing audio:", error);
            setAudioState({ rowId: row.id, status: 'error' });
            setTimeout(() => setAudioState(null), 2000);
        }
    }
  };

  const handleGenerateForCell = async (row: VocabRow, columnId: string) => {
    const promptConfig = promptsByTarget.get(columnId);
    if (!promptConfig) return;

    const cellKey = `${row.id}-${columnId}`;
    setGeneratingCells(prev => new Set(prev).add(cellKey));

    try {
      const sourceValues = promptConfig.sourceColumnIds.reduce((acc, sourceColId) => {
          const colName = table.columns.find(c => c.id === sourceColId)?.name;
          if (colName) acc[colName] = row.cols[sourceColId] || '';
          return acc;
      }, {} as Record<string, string>);

      const result = await generateForPrompt(promptConfig.prompt, sourceValues);
      const updatedRow = { ...row, cols: { ...row.cols, [columnId]: result } };
      handleSaveRow(updatedRow);
    } catch (error: any) {
        if (error.message === "API_KEY_MISSING") {
            onShowToast("Please set your Gemini API key...", "error");
        } else {
            onShowToast("An unexpected AI error occurred.", "error");
            console.error("Error generating for cell:", error);
        }
    } finally {
        setGeneratingCells(prev => {
            const newSet = new Set(prev);
            newSet.delete(cellKey);
            return newSet;
        });
    }
  };
  
  const handleRunBatchAi = async () => {
    setIsRunAiModalOpen(false);
    const cellsToGenerate: { row: VocabRow; columnId: string }[] = [];
    const promptsToRun = (table.aiPrompts || []).filter(p => aiColumnsToRun.has(p.targetColumnId));

    if (promptsToRun.length === 0) {
        onShowToast("No AI prompts selected.", 'info');
        return;
    }

    // Find all cells that match the criteria
    for (const row of displayedRows) {
        for (const prompt of promptsToRun) {
            const cellValue = row.cols[prompt.targetColumnId];
            if (!cellValue) {
                cellsToGenerate.push({ row, columnId: prompt.targetColumnId });
            }
        }
    }

    if (cellsToGenerate.length === 0) {
        onShowToast("No empty cells to fill for the selected columns.", 'info');
        return;
    }

    setAiRunProgress({ current: 0, total: cellsToGenerate.length });

    // Process cells sequentially to show progress and avoid rate limiting
    for (let i = 0; i < cellsToGenerate.length; i++) {
        const { row, columnId } = cellsToGenerate[i];
        await handleGenerateForCell(row, columnId);
        setAiRunProgress(prev => (prev ? { ...prev, current: i + 1 } : null));
    }
    
    onShowToast(`AI generation complete for ${cellsToGenerate.length} cells.`, 'success');
    // Hide progress bar after a delay
    setTimeout(() => {
        setAiRunProgress(null);
        setAiColumnsToRun(new Set()); // Reset selection
    }, 2500);
};

  const FilterPanel: React.FC = () => {
    const [newFilter, setNewFilter] = useState<Omit<Filter, 'id'>>({ columnId: allPossibleColumns[0].id, operator: 'contains', value: '' });
    
    const operatorsByType: {[key: string]: {op: Operator, label: string}[]} = {
      string: [ {op: 'contains', label: 'contains'}, {op: 'not_contains', label: 'not contains'}, {op: 'is', label: 'is'}, {op: 'is_not', label: 'is not'}, {op: 'is_empty', label: 'is empty'}, {op: 'is_not_empty', label: 'is not empty'} ],
      number: [ {op: 'eq', label: '='}, {op: 'gt', label: '>'}, {op: 'lt', label: '<'} ],
      date: [ {op: 'is_before', label: 'is before'}, {op: 'is_after', label: 'is after'} ],
    };
    
    const selectedColType = allPossibleColumns.find(c => c.id === newFilter.columnId)?.type || 'string';

    const handleAddFilter = () => {
      setFilters(f => [...f, { ...newFilter, id: `filter-${Date.now()}` }]);
      setNewFilter({ columnId: allPossibleColumns[0].id, operator: 'contains', value: '' });
    };

    return <div className="space-y-3">
        {filters.map(f => {
            const colName = allPossibleColumns.find(c => c.id === f.columnId)?.name;
            return <div key={f.id} className="flex items-center justify-between text-xs p-1 bg-slate-100 dark:bg-gray-700 rounded">
                <span>{colName} {f.operator} {f.value}</span>
                <button onClick={() => setFilters(fs => fs.filter(x => x.id !== f.id))}><Icon name="x" className="w-4 h-4 text-slate-400"/></button>
            </div>
        })}
        <div className="flex items-center gap-2">
            <select value={newFilter.columnId} onChange={e => setNewFilter(f => ({...f, columnId: e.target.value}))} className="text-xs p-1 rounded bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600">
                {allPossibleColumns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={newFilter.operator} onChange={e => setNewFilter(f => ({...f, operator: e.target.value as Operator}))} className="text-xs p-1 rounded bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600">
                {operatorsByType[selectedColType].map(op => <option key={op.op} value={op.op}>{op.label}</option>)}
            </select>
        </div>
        <input type={selectedColType === 'date' ? 'date' : 'text'} value={newFilter.value} onChange={e => setNewFilter(f => ({...f, value: e.target.value}))} className="w-full text-xs p-1 rounded bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600"/>
        <button onClick={handleAddFilter} className="w-full text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Add Filter</button>
    </div>;
  };

  const SortPanel: React.FC = () => {
    return <div className="space-y-2">
        {sorts.map((s, i) => (
             <div key={i} className="flex items-center justify-between text-xs p-1 bg-slate-100 dark:bg-gray-700 rounded">
                <span>{allPossibleColumns.find(c => c.id === s.columnId)?.name} ({s.direction})</span>
                <button onClick={() => setSorts(ss => ss.filter((_, idx) => idx !== i))}><Icon name="x" className="w-4 h-4 text-slate-400"/></button>
            </div>
        ))}
        {sorts.length < 3 && <button onClick={() => setSorts(s => [...s, {columnId: allPossibleColumns[0].id, direction: 'ascending'}])} className="w-full text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mt-2">Add Sort</button>}
    </div>;
  };

  const ToolbarButton: React.FC<{onClick: () => void, icon: string, label: string, badge?: number, disabled?: boolean, isRed?: boolean, isActive?: boolean}> = ({onClick, icon, label, badge, disabled, isRed, isActive}) => (
    <button onClick={onClick} disabled={disabled} className={`relative flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isRed ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'bg-white dark:bg-gray-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'} ${isActive ? '!bg-emerald-100 !dark:bg-emerald-900/50 !border-emerald-300 !dark:border-emerald-700' : ''}`}>
        <Icon name={icon} className="w-4 h-4"/>
        <span>{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-white text-[10px] font-bold">
                {badge}
            </span>
        )}
    </button>
  );

  const aiConfiguredColumns = useMemo(() => {
    const columnMap = new Map<string, { name: string; promptName: string }>();
    if (!table.aiPrompts) return [];
    table.aiPrompts.forEach(p => {
        const col = table.columns.find(c => c.id === p.targetColumnId);
        if (col) {
            columnMap.set(col.id, { name: col.name, promptName: p.name });
        }
    });
    return Array.from(columnMap.entries()).map(([id, data]) => ({ id, ...data }));
  }, [table.aiPrompts, table.columns]);

  const handleToggleAiColumn = (columnId: string) => {
    setAiColumnsToRun(prev => {
        const newSet = new Set(prev);
        if (newSet.has(columnId)) {
            newSet.delete(columnId);
        } else {
            newSet.add(columnId);
        }
        return newSet;
    });
  };

  return (
    <div>
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4 bg-slate-50 dark:bg-gray-800/50 p-2 rounded-lg border border-slate-200 dark:border-gray-700">
            <div className="relative flex-grow">
                <input
                    type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder={`Search ${table.rows.length} rows...`}
                    className="w-full sm:w-56 bg-white dark:bg-gray-800 border border-slate-300 dark:border-slate-600 rounded-md pl-3 pr-2 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>
            <div className="flex items-center gap-2">
                <ToolbarButton onClick={() => setIsRunAiModalOpen(true)} icon="sparkles" label="Run AI" badge={fillableCellCount} disabled={fillableCellCount === 0 || !!aiRunProgress} />
                <Popover isOpen={isFilterOpen} setIsOpen={setIsFilterOpen} trigger={ <ToolbarButton onClick={() => setIsFilterOpen(!isFilterOpen)} icon="filter" label="Filter" badge={filters.length} /> }>
                    <FilterPanel />
                </Popover>
                 <Popover isOpen={isSortOpen} setIsOpen={setIsSortOpen} trigger={ <ToolbarButton onClick={() => setIsSortOpen(!isSortOpen)} icon="arrow-up" label="Sort" badge={sorts.length} /> }>
                    <SortPanel />
                </Popover>
                <Popover isOpen={isColumnOpen} setIsOpen={setIsColumnOpen} trigger={ <ToolbarButton onClick={() => setIsColumnOpen(!isColumnOpen)} icon="table-cells" label="Columns" /> }>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        <h4 className="font-semibold text-sm">Data Columns</h4>
                        {table.columns.map(c => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.has(c.id)} onChange={e => { const newSet = new Set(visibleColumns); if(e.target.checked) newSet.add(c.id); else newSet.delete(c.id); setVisibleColumns(newSet); }}/>{c.name}</label>)}
                        <h4 className="font-semibold pt-2 border-t dark:border-gray-700 text-sm">Stat Columns</h4>
                        {allPossibleColumns.filter(c => c.id.startsWith('stats.')).map(c => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.has(c.id)} onChange={e => { const newSet = new Set(visibleColumns); if(e.target.checked) newSet.add(c.id); else newSet.delete(c.id); setVisibleColumns(newSet); }}/>{c.name}</label>)}
                    </div>
                </Popover>
            </div>
            {selectedRowIds.size > 0 && (
                 <ToolbarButton onClick={() => handleDelete(Array.from(selectedRowIds))} icon="trash" label={`Delete (${selectedRowIds.size})`} isRed={true} />
            )}
            {aiRunProgress && (
                <div className="w-full pt-2 basis-full">
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Running AI...</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">{aiRunProgress.current} / {aiRunProgress.total} cells</p>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(aiRunProgress.current / aiRunProgress.total) * 100}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
        <div ref={tableContainerRef} onScroll={handleScroll} style={{ height: '65vh' }} className="overflow-auto bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm">
        <table className="w-full text-sm text-left text-slate-600 dark:text-gray-300" style={{ borderSpacing: 0 }}>
            <thead className="text-xs text-slate-700 dark:text-gray-400 uppercase bg-slate-50 dark:bg-gray-800 sticky top-0 z-10">
            <tr>
                <th scope="col" className="p-2 sm:p-4">
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedRowIds.size > 0 && displayedRows.length > 0 && selectedRowIds.size === displayedRows.length} ref={el => el && (el.indeterminate = selectedRowIds.size > 0 && selectedRowIds.size < displayedRows.length)} className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"/>
                </th>
                 {table.audioConfig?.sourceColumnId && <th scope="col" className="px-2 py-3"></th>}
                {allPossibleColumns.filter(c => visibleColumns.has(c.id)).map(col => {
                    const isSortingThisColumn = sorts.length > 0 && sorts[0].columnId === col.id;
                    const isDataColumn = !col.id.startsWith('stats.');
                    return (
                        <th key={col.id} scope="col" className="px-4 py-2 whitespace-nowrap group">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort(col.id)}>
                                    {col.name}
                                    {promptsByTarget.has(col.id) && <Icon name="sparkles" className="w-3 h-3 text-cyan-400"/>}
                                    {isSortingThisColumn ? (
                                        <Icon name={sorts[0].direction === 'ascending' ? 'arrow-up' : 'arrow-down'} className="w-3 h-3 text-slate-500" />
                                    ) : (
                                        <Icon name="arrow-up" className="w-3 h-3 text-slate-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                                {isDataColumn && (
                                    <Popover 
                                        isOpen={openMenuColumnId === col.id} 
                                        setIsOpen={(isOpen) => setOpenMenuColumnId(isOpen ? col.id : null)}
                                        contentClassName="w-48"
                                        trigger={
                                            <button onClick={(e) => {e.stopPropagation();}} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-gray-600">
                                                <Icon name="chevron-down" className="w-4 h-4 text-slate-500"/>
                                            </button>
                                        }
                                    >
                                        <div className='flex flex-col gap-1'>
                                            <button onClick={() => { onConfigureAI(col); setOpenMenuColumnId(null); }} className="w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                                <Icon name="sparkles" className="w-4 h-4 text-cyan-500" /> Configure AI Prompt
                                            </button>
                                            <div className="my-1 h-px bg-slate-200 dark:bg-gray-700"></div>
                                            <button onClick={() => { onDeleteColumn(col.id); setOpenMenuColumnId(null); }} className="w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-2">
                                                <Icon name="trash" className="w-4 h-4" /> Delete Column
                                            </button>
                                        </div>
                                    </Popover>
                                )}
                            </div>
                        </th>
                    )
                })}
                <th scope="col" className="px-4 py-2 text-right">Actions</th>
            </tr>
            </thead>
            <tbody>
            {topSpacerHeight > 0 && <tr style={{ height: `${topSpacerHeight}px` }}><td colSpan={colSpan}></td></tr>}
            {visibleRows.map(row => (
                <tr key={row.id} className={`border-b border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 ${selectedRowIds.has(row.id) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`} style={{ height: `${VIRTUAL_ROW_HEIGHT}px` }}>
                    <td className="p-2 sm:p-4"><input type="checkbox" checked={selectedRowIds.has(row.id)} onChange={(e) => handleSelectOne(row.id, e.target.checked)} className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500"/></td>
                    {table.audioConfig?.sourceColumnId && (
                        <td className="px-2 py-2">
                           <button onClick={() => handlePlayAudio(row)} disabled={audioState?.status === 'loading'} className="text-slate-400 hover:text-emerald-500 disabled:opacity-50 disabled:cursor-wait">
                                {audioState?.rowId === row.id && audioState.status === 'loading' ? <Icon name="spinner" className="w-5 h-5 animate-spin"/> : <Icon name="play" className="w-5 h-5"/>}
                           </button>
                        </td>
                    )}
                    {allPossibleColumns.filter(c => visibleColumns.has(c.id)).map(col => {
                       const cellValue = getRowValue(row, col.id);
                       const promptForCell = promptsByTarget.get(col.id);
                       const isCellGenerating = generatingCells.has(`${row.id}-${col.id}`);
                       const isAiReady = !cellValue && promptForCell;
                       return (
                        <td key={col.id} className={`px-4 py-2 cursor-pointer group relative ${isAiReady ? 'animate-ai-glow' : ''}`} onClick={() => onEditRow(row)}>
                           <div className="min-h-[36px] flex items-center">
                            { col.id === table.imageConfig?.imageColumnId ? (
                                <div className="w-20 h-10 bg-slate-100 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden">
                                {cellValue ? <img src={cellValue} className="max-w-full max-h-full object-contain"/> : <Icon name="photo" className="w-5 h-5 text-slate-400"/>}
                                </div>
                            ) : (
                                cellValue ? (
                                    <span className="truncate max-w-xs">{col.id === 'stats.lastStudied' && cellValue ? new Date(cellValue).toLocaleDateString() : cellValue}</span>
                                ) : (
                                    isAiReady ? (
                                        <button disabled={isCellGenerating} onClick={(e) => { e.stopPropagation(); handleGenerateForCell(row, col.id); }} className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold text-xs opacity-0 group-hover:opacity-100 disabled:opacity-100 disabled:cursor-wait transition-opacity">
                                          {isCellGenerating ? <Icon name="spinner" className="w-4 h-4 animate-spin"/> : <Icon name="sparkles" className="w-4 h-4"/>}
                                          {isCellGenerating ? 'Generating...' : 'Generate'}
                                        </button>
                                    ) : (
                                        <span className="text-slate-400 dark:text-gray-500">Empty</span>
                                    )
                                )
                            )}
                           </div>
                        </td>
                       )
                    })}
                    <td className="px-4 py-2 text-right"><button onClick={(e) => { e.stopPropagation(); handleDelete([row.id]); }} className="text-slate-400 dark:text-gray-500 hover:text-red-500 transition-colors p-1"><Icon name="trash" className="w-5 h-5"/></button></td>
                </tr>
            ))}
            {bottomSpacerHeight > 0 && <tr style={{ height: `${bottomSpacerHeight}px` }}><td colSpan={colSpan}></td></tr>}
            </tbody>
        </table>
        </div>
        
        {toastKey > 0 && lastDeleted && (
            <Toast
            key={toastKey}
            message={`${lastDeleted.rows.length} row(s) deleted.`}
            actionText="Undo"
            onAction={handleUndoDelete}
            onClose={() => setLastDeleted(null)}
            />
        )}
        <Modal isOpen={isRunAiModalOpen} onClose={() => setIsRunAiModalOpen(false)} title="Run AI on Empty Cells">
            <div className="p-6">
                <p className="text-sm text-slate-600 dark:text-gray-300 mb-4">Select which AI-configured columns you want to fill for all visible empty rows.</p>
                <div className="space-y-2 max-h-60 overflow-y-auto border dark:border-gray-600 rounded-md p-2 mb-4">
                    {aiConfiguredColumns.length > 0 ? aiConfiguredColumns.map(col => (
                        <label key={col.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-gray-700 cursor-pointer">
                            <input type="checkbox" checked={aiColumnsToRun.has(col.id)} onChange={() => handleToggleAiColumn(col.id)} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500" />
                            <div>
                                <span className="font-semibold text-sm">{col.name}</span>
                                <span className="block text-xs text-slate-500 dark:text-gray-400">using '{col.promptName}'</span>
                            </div>
                        </label>
                    )) : (
                      <p className="text-sm text-center text-slate-500 dark:text-gray-400 p-4">No AI prompts configured for any columns in this table.</p>
                    )}
                </div>
                <button
                    onClick={handleRunBatchAi}
                    disabled={aiColumnsToRun.size === 0}
                    className="w-full bg-emerald-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <Icon name="sparkles" className="w-4 h-4"/>
                    Run Generation ({aiColumnsToRun.size} selected)
                </button>
            </div>
        </Modal>
    </div>
  );
};

// --- Sub-Component: Relations View ---

const DEFAULT_TYPOGRAPHY: TypographyDesign = {
  color: '#111827',
  fontSize: '24px',
  fontFamily: 'sans-serif',
  textAlign: 'center',
  fontWeight: 'bold',
};

const DEFAULT_RELATION_DESIGN: RelationDesign = {
  front: { backgroundType: 'solid', backgroundValue: '#FFFFFF', gradientAngle: 135, typography: {} },
  back: { backgroundType: 'solid', backgroundValue: '#F9FAFB', gradientAngle: 135, typography: {} }
};

const studyModeIcons: { [key in StudyMode]: string } = {
    [StudyMode.Flashcards]: 'credit-card',
    [StudyMode.MultipleChoice]: 'list-bullet',
    [StudyMode.Typing]: 'keyboard',
    [StudyMode.TrueFalse]: 'check',
    [StudyMode.Scrambled]: 'arrows-right-left',
};


const RelationPreviewModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    relation: Relation;
    table: Table;
    onSaveDesign: (relation: Relation) => void;
    startInDesignMode: boolean;
}> = ({ isOpen, onClose, relation, table, onSaveDesign, startInDesignMode }) => {
    const [editedRelation, setEditedRelation] = useState(relation);
    const [activeDesignTab, setActiveDesignTab] = useState<'Background' | 'Typography' | 'Layout'>('Background');
    const [selectedElement, setSelectedElement] = useState<{ face: 'front' | 'back', columnId: string } | null>(null);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEditedRelation(relation);
            setIsFlipped(false);
            setSelectedElement(null);
            setActiveDesignTab('Background');
        }
    }, [isOpen, relation]);

    const handleBackgroundChange = (face: 'front' | 'back', field: keyof Omit<CardFaceDesign, 'typography'>, value: any) => {
        setEditedRelation(prev => ({
            ...prev,
            design: { ...prev.design!, [face]: { ...prev.design![face], [field]: value } }
        }));
    };

    const handleTypographyChange = (field: keyof TypographyDesign, value: any) => {
        if (!selectedElement) return;
        const { face, columnId } = selectedElement;
        setEditedRelation(prev => ({
            ...prev,
            design: {
                ...prev.design!,
                [face]: {
                    ...prev.design![face],
                    typography: {
                        ...prev.design![face].typography,
                        [columnId]: { ...prev.design![face].typography[columnId], [field]: value }
                    }
                }
            }
        }));
    };
    
    const handleReorder = (face: 'front' | 'back', newOrder: string[]) => {
        const key = face === 'front' ? 'questionColumnIds' : 'answerColumnIds';
        setEditedRelation(prev => ({ ...prev, [key]: newOrder }));
    };

    const FlashcardPreview: React.FC<{
        face: 'front' | 'back';
    }> = ({ face }) => {
        const [draggedId, setDraggedId] = useState<string | null>(null);
        const columnIds = face === 'front' ? editedRelation.questionColumnIds : editedRelation.answerColumnIds;
        const faceDesign = editedRelation.design![face];

        const getCardStyle = (): React.CSSProperties => {
            let background = faceDesign.backgroundValue;
            if (faceDesign.backgroundType === 'gradient' && faceDesign.backgroundValue.includes(',')) {
                const [color1, color2] = faceDesign.backgroundValue.split(',');
                background = `linear-gradient(${faceDesign.gradientAngle}deg, ${color1 || '#ffffff'}, ${color2 || '#e0e0e0'})`;
            } else if (faceDesign.backgroundType === 'image') {
                background = `url("${faceDesign.backgroundValue}") center/cover no-repeat, #f0f0f0`;
            }
            return { background };
        };

        const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
            if (!startInDesignMode) return;
            setDraggedId(id);
            e.dataTransfer.effectAllowed = 'move';
        };

        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
            if (!startInDesignMode) return;
            e.preventDefault();
        };

        const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
            if (!startInDesignMode || !draggedId || draggedId === targetId) return;
            const newOrder = [...columnIds];
            const draggedIndex = newOrder.indexOf(draggedId);
            const targetIndex = newOrder.indexOf(targetId);
            newOrder.splice(draggedIndex, 1);
            newOrder.splice(targetIndex, 0, draggedId);
            handleReorder(face, newOrder);
            setDraggedId(null);
        };

        return (
            <div className={`absolute w-full h-full rounded-lg shadow-lg border dark:border-gray-700 flex flex-col items-center justify-center p-4 backface-hidden ${face === 'back' ? 'card-back' : 'card-front'}`} style={getCardStyle()}>
                {columnIds.length === 0 && <span className="text-slate-400">No columns selected for this side.</span>}
                <div className="w-full space-y-4">
                    {columnIds.map(id => {
                        const col = table.columns.find(c => c.id === id);
                        const typography = faceDesign.typography[id] || DEFAULT_TYPOGRAPHY;
                        const sampleText = table.rows[0]?.cols[id];
                        const colName = col?.name;

                        return (
                            <div 
                                key={id} draggable={startInDesignMode} onDragStart={(e) => handleDragStart(e, id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, id)}
                                onClick={() => {
                                    if (startInDesignMode) {
                                        setSelectedElement({ face, columnId: id });
                                        setActiveDesignTab('Typography');
                                    }
                                }}
                                className={`w-full p-1 rounded-md transition-all ${startInDesignMode ? 'cursor-pointer' : ''} ${selectedElement?.face === face && selectedElement?.columnId === id ? 'ring-2 ring-emerald-500' : (startInDesignMode ? 'hover:bg-black/10' : '')}`}
                            >
                                <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400" style={{ fontFamily: typography.fontFamily, textAlign: typography.textAlign }}>{colName}</div>
                                <div style={{...typography}} className="mt-1 break-words">
                                    {sampleText || <span className="italic opacity-50">[empty]</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTypographyEditor = () => {
        if (!selectedElement) return <p className="text-xs text-slate-500 dark:text-gray-400">Click a text element in the preview to style it.</p>;
        const design = editedRelation.design![selectedElement.face].typography[selectedElement.columnId];
        if (!design) return null;
        return <div className="space-y-3">
            <div className="flex items-center justify-between"><label className="text-xs">Font Family</label><select value={design.fontFamily} onChange={e => handleTypographyChange('fontFamily', e.target.value)} className="bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-xs rounded p-1"><option value="sans-serif">Sans-serif</option><option value="serif">Serif</option><option value="monospace">Monospace</option></select></div>
            <div className="flex items-center justify-between"><label className="text-xs">Font Size</label><select value={design.fontSize} onChange={e => handleTypographyChange('fontSize', e.target.value)} className="bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-xs rounded p-1"><option>14px</option><option>18px</option><option>24px</option><option>32px</option><option>48px</option></select></div>
            <div className="flex items-center justify-between"><label className="text-xs">Font Weight</label><select value={design.fontWeight} onChange={e => handleTypographyChange('fontWeight', e.target.value as 'normal' | 'bold')} className="bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-xs rounded p-1"><option value="normal">Normal</option><option value="bold">Bold</option></select></div>
            <div className="flex items-center justify-between"><label className="text-xs">Text Color</label><input type="color" value={design.color} onChange={e => handleTypographyChange('color', e.target.value)} className="h-6 w-10 p-0 border-none bg-transparent"/></div>
        </div>;
    };

    const renderBackgroundEditor = () => {
        const face = isFlipped ? 'back' : 'front';
        const design = editedRelation.design![face];
        const [gradColor1, gradColor2] = (design.backgroundValue || ',').split(',');
        return <div className="space-y-3">
            <div className="flex items-center justify-between"><label className="text-xs font-semibold">Card Face: {face.toUpperCase()}</label></div>
            <div className="flex items-center justify-between"><label className="text-xs">Background</label><div className="flex items-center gap-2">{(['solid', 'gradient', 'image'] as const).map(type => <button key={type} onClick={() => handleBackgroundChange(face, 'backgroundType', type)} className={`px-2 py-0.5 text-xs rounded-full ${design.backgroundType === type ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-gray-800'}`}>{type}</button>)}</div></div>
            <div>
                {design.backgroundType === 'solid' && <div className="flex items-center gap-2"><input type="color" value={design.backgroundValue} onChange={e => handleBackgroundChange(face, 'backgroundValue', e.target.value)} className="h-6 w-10 p-0 border-none bg-transparent"/><span className="text-xs">{design.backgroundValue}</span></div>}
                {design.backgroundType === 'gradient' && <div className="space-y-2"><div className="flex items-center gap-2"><input type="color" value={gradColor1 || '#ffffff'} onChange={e => handleBackgroundChange(face, 'backgroundValue', `${e.target.value},${gradColor2 || '#ffffff'}`)} className="h-6 w-10 p-0 border-none bg-transparent"/><input type="color" value={gradColor2 || '#ffffff'} onChange={e => handleBackgroundChange(face, 'backgroundValue', `${gradColor1 || '#ffffff'},${e.target.value}`)} className="h-6 w-10 p-0 border-none bg-transparent"/></div><div className="flex items-center gap-2"><label className="text-xs">Angle</label><input type="range" min="0" max="360" value={design.gradientAngle} onChange={e => handleBackgroundChange(face, 'gradientAngle', parseInt(e.target.value))} className="w-full"/></div></div>}
                {design.backgroundType === 'image' && <input type="text" placeholder="Image URL..." value={design.backgroundValue} onChange={e => handleBackgroundChange(face, 'backgroundValue', e.target.value)} className="w-full bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-xs rounded p-1" />}
            </div>
            <button onClick={() => handleBackgroundChange(face, 'backgroundValue', face === 'front' ? '#FFFFFF' : '#F9FAFB')} className="text-xs text-red-500 hover:underline">Remove Background</button>
        </div>;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={startInDesignMode ? "Design Flashcard" : "Preview Flashcard"} containerClassName="w-full max-w-7xl h-[90vh] md:h-[80vh] m-auto p-0 flex flex-col overflow-hidden">
            <div className={`flex-1 flex flex-col ${startInDesignMode ? 'md:flex-row' : ''} min-h-0`}>
                {/* Preview Pane */}
                <div className="md:flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-100 dark:bg-gray-900/50">
                     <div className="w-full max-w-xl aspect-[1.618] group" onClick={!startInDesignMode ? () => setIsFlipped(!isFlipped) : undefined}>
                        <div className={`card-container w-full h-full perspective-1000 ${isFlipped ? 'flipped' : ''}`}>
                            <div className="card-flip relative w-full h-full transform-style-3d">
                                <FlashcardPreview face="front" />
                                <FlashcardPreview face="back" />
                            </div>
                        </div>
                    </div>
                    {startInDesignMode && (
                        <button onClick={() => setIsFlipped(!isFlipped)} className="mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                            <Icon name="arrows-right-left" className="w-4 h-4"/>
                            Flip to Edit {isFlipped ? 'Front' : 'Back'}
                        </button>
                    )}
                </div>

                {/* Controls Pane */}
                {startInDesignMode && (
                    <div className="w-full md:w-[340px] md:flex-shrink-0 p-4 md:overflow-y-auto border-t md:border-t-0 md:border-l border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="border border-slate-200 dark:border-gray-600 rounded-md">
                            <div className="flex border-b border-slate-200 dark:border-gray-600">{(['Background', 'Typography', 'Layout'] as const).map(tab => <button key={tab} onClick={() => setActiveDesignTab(tab)} className={`flex-1 p-2 text-xs font-semibold ${activeDesignTab === tab ? 'bg-slate-100 dark:bg-gray-700' : 'text-slate-500'}`}>{tab}</button>)}</div>
                            <div className="p-3">
                                {activeDesignTab === 'Background' && renderBackgroundEditor()}
                                {activeDesignTab === 'Typography' && renderTypographyEditor()}
                                {activeDesignTab === 'Layout' && <p className="text-xs text-slate-500 dark:text-gray-400">Drag and drop the text elements in the preview to change their order.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50">
                <button onClick={onClose} className="bg-white dark:bg-gray-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 transition-colors">Close</button>
                {startInDesignMode && <button onClick={() => onSaveDesign(editedRelation)} className="bg-emerald-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-emerald-700 transition-colors">Save Design</button>}
            </div>
        </Modal>
    );
};


const RelationEditorModal: React.FC<{
    relation: Relation,
    columns: Column[],
    onSave: (relation: Relation) => void,
    onClose: () => void,
    onDelete: (relationId: string) => void,
}> = ({ relation, columns, onSave, onClose, onDelete }) => {
    const [editedRelation, setEditedRelation] = useState(relation);
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        const { name, questionColumnIds, answerColumnIds, compatibleModes } = editedRelation;
        const modes = compatibleModes || [];
        const isScramble = modes.includes(StudyMode.Scrambled);

        if (!name.trim()) { setIsValid(false); return; }
        if (questionColumnIds.length === 0) { setIsValid(false); return; }
        if (modes.length === 0) { setIsValid(false); return; }

        if (isScramble) {
            if (questionColumnIds.length !== 1) { setIsValid(false); return; }
        } else {
            if (answerColumnIds.length === 0) { setIsValid(false); return; }
        }
        
        setIsValid(true);
    }, [editedRelation]);

    const handleFieldChange = (field: keyof Relation, value: any) => {
        setEditedRelation(prev => ({ ...prev, [field]: value }));
    };

    const handleColumnToggle = (type: 'question' | 'answer', columnId: string) => {
        const key = type === 'question' ? 'questionColumnIds' : 'answerColumnIds';
        const currentIds = editedRelation[key] || [];
        const newIds = currentIds.includes(columnId) ? currentIds.filter(id => id !== columnId) : [...currentIds, columnId];
        handleFieldChange(key, newIds);
    };
    
    const handleModeToggle = (mode: StudyMode) => {
        const currentModes = editedRelation.compatibleModes || [];
        let newModes;

        if (mode === StudyMode.Scrambled) {
            newModes = currentModes.includes(StudyMode.Scrambled) ? [] : [StudyMode.Scrambled];
        } else {
            let modesWithoutScramble = currentModes.filter(m => m !== StudyMode.Scrambled);
            if (modesWithoutScramble.includes(mode)) {
                newModes = modesWithoutScramble.filter(m => m !== mode);
            } else {
                newModes = [...modesWithoutScramble, mode];
            }
        }
        handleFieldChange('compatibleModes', newModes);
    }
    
    const isScrambleMode = (editedRelation.compatibleModes || []).includes(StudyMode.Scrambled);
    
    useEffect(() => {
        if (isScrambleMode) {
            handleFieldChange('answerColumnIds', []);
        }
    }, [isScrambleMode]);

    return (
        <Modal isOpen={true} onClose={onClose} title={relation.id ? "Edit Relation" : "Create Relation"} containerClassName="w-full max-w-3xl">
            <div className="p-6">

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Relation Name</label>
                    <input type="text" value={editedRelation.name} onChange={e => handleFieldChange('name', e.target.value)} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-slate-800 dark:text-white"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Question Columns</label>
                        <div className="p-2 border rounded-md bg-slate-100 dark:bg-gray-700 border-slate-300 dark:border-gray-600 space-y-1">
                            {columns.map(c => {
                                const isSelected = editedRelation.questionColumnIds.includes(c.id);
                                return <button key={c.id} onClick={() => handleColumnToggle('question', c.id)} className="w-full flex items-center gap-3 p-1 rounded hover:bg-slate-200 dark:hover:bg-gray-600 text-left">
                                    <Icon name={isSelected ? 'check-circle-solid' : 'circle-outline'} className={`w-5 h-5 ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`}/>
                                    <span className="text-sm">{c.name}</span>
                                </button>
                            })}
                        </div>
                    </div>
                    <div className={isScrambleMode ? 'opacity-50' : ''}>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Answer Columns</label>
                        <div className="p-2 border rounded-md bg-slate-100 dark:bg-gray-700 border-slate-300 dark:border-gray-600 space-y-1">
                            {columns.map(c => {
                                const isSelected = editedRelation.answerColumnIds.includes(c.id);
                                return <button key={c.id} onClick={() => !isScrambleMode && handleColumnToggle('answer', c.id)} disabled={isScrambleMode} className="w-full flex items-center gap-3 p-1 rounded hover:bg-slate-200 dark:hover:bg-gray-600 text-left disabled:cursor-not-allowed">
                                    <Icon name={isSelected ? 'check-circle-solid' : 'circle-outline'} className={`w-5 h-5 ${isSelected ? 'text-emerald-500' : 'text-slate-400'}`}/>
                                    <span className="text-sm">{c.name}</span>
                                </button>
                            })}
                        </div>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Compatible Modes</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.values(StudyMode).map(mode => {
                            const isSelected = (editedRelation.compatibleModes || []).includes(mode);
                            return <button key={mode} onClick={() => handleModeToggle(mode)} className={`p-3 border rounded-lg text-left transition-colors ${isSelected ? 'bg-cyan-100 dark:bg-cyan-900/50 border-cyan-500' : 'hover:bg-slate-100 dark:hover:bg-gray-700'}`}>
                                <Icon name={studyModeIcons[mode]} className={`w-5 h-5 mb-1 ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`} />
                                <p className={`font-semibold text-xs ${isSelected ? 'text-cyan-800 dark:text-cyan-300' : ''}`}>{mode}</p>
                            </button>
                        })}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-between items-center">
                <div>
                     {relation.id && relation.isCustom && (
                        <button onClick={() => onDelete(relation.id)} className="text-red-600 dark:text-red-500 font-semibold px-4 py-2 rounded-md hover:bg-red-500/10 text-sm">Delete</button>
                     )}
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="bg-white dark:bg-gray-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600 transition-colors">Cancel</button>
                    <button onClick={() => onSave(editedRelation)} disabled={!isValid} className="bg-emerald-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Save Relation</button>
                </div>
            </div>
            </div>
        </Modal>
    );
};


// Data migration function to update old relation designs to the new structure
const upgradeRelationDesign = (relation: Relation): Relation => {
    const newRelation = JSON.parse(JSON.stringify(relation));
    if (!newRelation.design) {
        newRelation.design = JSON.parse(JSON.stringify(DEFAULT_RELATION_DESIGN));
    }

    for (const face of ['front', 'back'] as const) {
        const faceDesign = newRelation.design[face];
        if (typeof faceDesign.typography !== 'object' || faceDesign.typography === null) {
            const oldTypography: TypographyDesign = {
                color: (faceDesign as any).color || (face === 'front' ? '#111827' : '#111827'),
                fontSize: (faceDesign as any).fontSize || (face === 'front' ? '24px' : '18px'),
                fontFamily: (faceDesign as any).fontFamily || 'sans-serif',
                textAlign: (faceDesign as any).textAlign || 'center',
                fontWeight: (faceDesign as any).fontWeight || (face === 'front' ? 'bold' : 'normal'),
            };

            faceDesign.typography = {};
            const columnIds = face === 'front' ? newRelation.questionColumnIds : newRelation.answerColumnIds;
            for (const colId of columnIds) {
                faceDesign.typography[colId] = { ...oldTypography };
            }
        }
        if (faceDesign.backgroundType === 'gradient' && typeof faceDesign.gradientAngle !== 'number') {
            faceDesign.gradientAngle = 135;
        }
        delete (faceDesign as any).color;
        delete (faceDesign as any).fontSize;
        delete (faceDesign as any).fontFamily;
        delete (faceDesign as any).textAlign;
        delete (faceDesign as any).fontWeight;
    }
    return newRelation;
};


const RelationsView: React.FC<{ table: Table; onUpdateTable: (updatedTable: Table) => void }> = ({ table, onUpdateTable }) => {
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingRelation, setEditingRelation] = useState<Relation | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewRelation, setPreviewRelation] = useState<Relation | null>(null);
    const [isDesignMode, setIsDesignMode] = useState(false);

    const handleOpenNew = () => {
        const newRelationBase: Omit<Relation, 'id'> = {
            name: 'New Relation',
            questionColumnIds: [table.columns[0]?.id].filter((id): id is string => !!id),
            answerColumnIds: [table.columns[1]?.id].filter((id): id is string => !!id),
            compatibleModes: [StudyMode.Flashcards, StudyMode.Typing],
            design: JSON.parse(JSON.stringify(DEFAULT_RELATION_DESIGN)),
            isCustom: true,
        };
        setEditingRelation(upgradeRelationDesign({ ...newRelationBase, id: '' }));
        setIsEditorOpen(true);
    };
  
    const handleOpenEdit = (relation: Relation) => {
        setEditingRelation(upgradeRelationDesign(relation));
        setIsEditorOpen(true);
    };
    
    const handleOpenPreview = (relation: Relation, designMode: boolean) => {
        setPreviewRelation(upgradeRelationDesign(relation));
        setIsDesignMode(designMode);
        setIsPreviewOpen(true);
    };
  
    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingRelation(null);
    };

    const handleSaveRelation = (relationToSave: Relation) => {
        let updatedRelations;
        if (relationToSave.id) { // Existing relation
            updatedRelations = table.relations.map(r => r.id === relationToSave.id ? relationToSave : r);
        } else { // New relation
            const newRelation = { ...relationToSave, id: `rel-${Date.now()}` };
            updatedRelations = [...table.relations, newRelation];
        }
        onUpdateTable({ ...table, relations: updatedRelations });
        handleCloseEditor();
        setIsPreviewOpen(false); // also close preview modal if saving design from there
    };

    const handleDeleteRelation = (relationId: string) => {
        if (window.confirm("Are you sure you want to delete this relation? This cannot be undone.")) {
            onUpdateTable({ ...table, relations: table.relations.filter(r => r.id !== relationId) });
        }
        setIsEditorOpen(false);
        setEditingRelation(null);
    };
    
    return (
        <div className="p-4 bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Study Relations</h2>
                <button onClick={handleOpenNew} className="bg-cyan-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-cyan-700 transition-colors flex items-center gap-2 text-sm"><Icon name="plus" className="w-4 h-4"/><span>Create New Relation</span></button>
            </div>
            <p className="text-slate-500 dark:text-gray-400 text-sm mb-4">Relations define the question and answer pairs for your study sessions.</p>
            <div className="space-y-3">
                {table.relations.length === 0 && <p className="text-slate-500 dark:text-gray-400 text-center py-4 text-sm">No relations yet. Create one to start studying.</p>}
                {table.relations.map(rel => {
                    const qCols = rel.questionColumnIds.map(id => table.columns.find(c => c.id === id)?.name || 'N/A').join(', ');
                    const aCols = rel.answerColumnIds.map(id => table.columns.find(c => c.id === id)?.name || 'N/A').join(', ');
                    return (
                        <div key={rel.id} className="p-3 rounded-md bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 group transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-slate-700 dark:text-gray-200 text-base">{rel.name}</span>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">
                                        Q: {qCols} &rarr; A: {aCols}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button onClick={() => handleOpenPreview(rel, false)} className="text-slate-400 hover:text-emerald-500 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50" title="Preview"><Icon name="eye" className="w-5 h-5"/></button>
                                    {rel.isCustom && (
                                        <>
                                            <button onClick={() => handleOpenPreview(rel, true)} className="text-slate-400 hover:text-cyan-500 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50" title="Design"><Icon name="sparkles" className="w-5 h-5"/></button>
                                            <button onClick={() => handleOpenEdit(rel)} className="text-slate-400 hover:text-blue-500 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50" title="Edit"><Icon name="pencil" className="w-5 h-5"/></button>
                                            <button onClick={() => handleDeleteRelation(rel.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 hover:bg-red-500/10" title="Delete"><Icon name="trash" className="w-5 h-5"/></button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {(rel.compatibleModes || []).map(mode => (
                                    <span key={mode} className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{mode}</span>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
            {isEditorOpen && editingRelation && (
                <RelationEditorModal
                    relation={editingRelation}
                    columns={table.columns}
                    onSave={handleSaveRelation}
                    onClose={handleCloseEditor}
                    onDelete={handleDeleteRelation}
                />
            )}
            {isPreviewOpen && previewRelation && (
                <RelationPreviewModal
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    relation={previewRelation}
                    table={table}
                    onSaveDesign={handleSaveRelation}
                    startInDesignMode={isDesignMode}
                />
            )}
        </div>
    );
};

const AIPromptModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (prompt: AIPrompt) => void;
    columns: Column[]; promptToEdit: AIPrompt | null;
    configuringColumn: Column | null;
    onDelete: (promptId: string) => void;
}> = ({ isOpen, onClose, onSave, columns, promptToEdit, configuringColumn, onDelete }) => {
    const [name, setName] = useState('');
    const [sourceColumnIds, setSourceColumnIds] = useState<string[]>([]);
    const [targetColumnId, setTargetColumnId] = useState('');
    const [prompt, setPrompt] = useState('');

    useEffect(() => {
        if (promptToEdit) {
            setName(promptToEdit.name); setSourceColumnIds(promptToEdit.sourceColumnIds);
            setTargetColumnId(promptToEdit.targetColumnId); setPrompt(promptToEdit.prompt);
        } else {
            setName(''); setSourceColumnIds([]); 
            setTargetColumnId(configuringColumn?.id || ''); 
            setPrompt('');
        }
    }, [promptToEdit, isOpen, configuringColumn]);

    const handleSave = () => {
        if (name && sourceColumnIds.length > 0 && targetColumnId && prompt) {
            onSave({ id: promptToEdit?.id || `prompt-${Date.now()}`, name, sourceColumnIds, targetColumnId, prompt });
            onClose();
        }
    };
    
    const handleDelete = () => {
        if (promptToEdit) {
            onDelete(promptToEdit.id);
        }
        onClose();
    };

    const toggleSourceColumn = (id: string) => {
        setSourceColumnIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }
    
    const modalTitle = configuringColumn 
        ? `Configure AI for "${configuringColumn.name}"` 
        : (promptToEdit ? "Edit AI Prompt" : "Create AI Prompt");

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <div className="p-6">
                <div className="flex flex-col gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Prompt Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., 'Generate Example'" className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2"/></div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Source Column(s)</label>
                        <div className="flex flex-wrap gap-2 p-2 bg-slate-100 dark:bg-gray-700 rounded-md">
                            {columns.map(c => <button key={c.id} onClick={() => toggleSourceColumn(c.id)} className={`px-2 py-1 text-xs rounded-full border ${sourceColumnIds.includes(c.id) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600'}`}>{c.name}</button>)}
                        </div>
                    </div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Target Column</label><select value={targetColumnId} onChange={e => setTargetColumnId(e.target.value)} disabled={!!configuringColumn} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2 disabled:opacity-70"><option value="">Select column</option>{columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Prompt Template</label><textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2" placeholder="e.g., Write an example sentence for the word '{{Word}}'."/>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Use {'{{Column Name}}'} to insert data from source columns.</p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        {promptToEdit ? (
                            <button onClick={handleDelete} className="text-sm font-semibold text-red-600 dark:text-red-500 hover:underline">
                                Remove AI Config
                            </button>
                        ) : <div />}
                        <div className="flex justify-end w-full">
                            <button onClick={handleSave} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">
                                Save Prompt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// --- Sub-Component: Column Editor Modal ---
const ColumnEditorModal: React.FC<{
  isOpen: boolean; onClose: () => void; columns: Column[]; onSave: (newColumns: Column[]) => void;
}> = ({ isOpen, onClose, columns, onSave }) => {
  const [editedColumns, setEditedColumns] = useState<Column[]>([]);

  useEffect(() => { if (isOpen) setEditedColumns([...columns]); }, [isOpen, columns]);

  const handleNameChange = (id: string, newName: string) => setEditedColumns(cols => cols.map(c => c.id === id ? { ...c, name: newName } : c));
  const addColumn = () => setEditedColumns(cols => [...cols, { id: `col-new-${Date.now()}`, name: 'New Column' }]);
  const removeColumn = (id: string) => setEditedColumns(cols => cols.filter(c => c.id !== id));
  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newColumns = [...editedColumns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newColumns.length) return;
    [newColumns[index], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[index]];
    setEditedColumns(newColumns);
  };
  const handleSave = () => onSave(editedColumns.filter(c => c.name.trim() !== ''));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Columns">
        <div className="p-6">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {editedColumns.map((col, index) => (
                <div key={col.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-gray-700 rounded-md">
                    <div className="flex flex-col gap-1">
                        <button onClick={() => moveColumn(index, 'up')} disabled={index === 0} className="disabled:opacity-20 text-slate-500 hover:text-slate-800 dark:hover:text-white"><Icon name="arrow-up" className="w-4 h-4"/></button>
                        <button onClick={() => moveColumn(index, 'down')} disabled={index === editedColumns.length - 1} className="disabled:opacity-20 text-slate-500 hover:text-slate-800 dark:hover:text-white"><Icon name="arrow-down" className="w-4 h-4"/></button>
                    </div>
                    <input type="text" value={col.name} onChange={(e) => handleNameChange(col.id, e.target.value)} className="flex-grow bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                    <button onClick={() => removeColumn(col.id)} className="text-slate-400 hover:text-red-500 p-1"><Icon name="trash" className="w-5 h-5"/></button>
                </div>
                ))}
            </div>
            <button onClick={addColumn} className="mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-2"> <Icon name="plus" className="w-4 h-4"/> Add Column </button>
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={onClose} className="bg-white dark:bg-gray-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-300 dark:border-gray-600">Cancel</button>
                <button onClick={handleSave} className="bg-emerald-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-emerald-700">Save Columns</button>
            </div>
        </div>
    </Modal>
  );
};

// --- Sub-Component: Settings View ---
const SettingsView: React.FC<{ 
    table: Table; 
    onUpdateTable: (updatedTable: Table) => void; 
    isGuest: boolean;
    onConfigureAI: (column: Column) => void;
}> = ({ table, onUpdateTable, isGuest, onConfigureAI }) => {
    const [tableName, setTableName] = useState(table.name);
    const [tableDescription, setTableDescription] = useState(table.description || '');
    const [tableTags, setTableTags] = useState((table.tags || []).join(', '));
    const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
    
    // State for media config
    const [imageConfig, setImageConfig] = useState(table.imageConfig);
    const [audioConfig, setAudioConfig] = useState(table.audioConfig);

    useEffect(() => {
        setImageConfig(table.imageConfig);
        setAudioConfig(table.audioConfig);
    }, [table.imageConfig, table.audioConfig]);

    const handleUpdateField = <K extends keyof Table>(field: K, value: Table[K]) => onUpdateTable({ ...table, [field]: value });
    
    const handleSaveColumns = (newColumns: Column[]) => {
        const originalColumnIds = new Set(table.columns.map(c => c.id));
        const newColumnIds = new Set(newColumns.map(c => c.id));
        const deletedColumnIds: string[] = [...originalColumnIds].filter(id => !newColumnIds.has(id));

        let updatedTable = { ...table, columns: newColumns };
        if (deletedColumnIds.length > 0) {
            if (!window.confirm("Are you sure? Deleting columns will remove their data from all rows and may affect relations or AI prompts. This cannot be undone.")) {
                return;
            }
            deletedColumnIds.forEach(deletedId => {
                updatedTable = {
                    ...updatedTable,
                    rows: updatedTable.rows.map(row => { const d = {...row.cols}; delete d[deletedId]; return {...row, cols: d}; }),
                    relations: updatedTable.relations.map(r => ({
                        ...r,
                        questionColumnIds: r.questionColumnIds.filter(id => id !== deletedId),
                        answerColumnIds: r.answerColumnIds.filter(id => id !== deletedId),
                    })).filter(r => {
                        const isScramble = (r.compatibleModes || []).includes(StudyMode.Scrambled);
                        if (isScramble) {
                            return r.questionColumnIds.length > 0;
                        }
                        return r.questionColumnIds.length > 0 && r.answerColumnIds.length > 0;
                    }),
                    aiPrompts: (updatedTable.aiPrompts || []).filter(p => p.targetColumnId !== deletedId && !p.sourceColumnIds.includes(deletedId)),
                    imageConfig: updatedTable.imageConfig?.imageColumnId === deletedId || updatedTable.imageConfig?.sourceColumnId === deletedId ? null : updatedTable.imageConfig,
                    audioConfig: updatedTable.audioConfig?.sourceColumnId === deletedId ? null : updatedTable.audioConfig,
                };
            });
        }
        onUpdateTable(updatedTable);
        setIsColumnEditorOpen(false);
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div className="p-4 bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-lg"><h2 className="text-lg font-semibold mb-4">General</h2>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Table Name</label><input type="text" value={tableName} onChange={e => setTableName(e.target.value)} onBlur={() => handleUpdateField('name', tableName)} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2"/></div>
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-lg"><h2 className="text-lg font-semibold mb-4">Columns</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">Add, remove, rename, and reorder columns for this table.</p>
                <button onClick={() => setIsColumnEditorOpen(true)} className="bg-cyan-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-cyan-700 transition-colors flex items-center gap-2 text-sm">
                    <Icon name="pencil" className="w-4 h-4"/> Manage Columns
                </button>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-lg"><h2 className="text-lg font-semibold mb-4">AI & Media</h2>
                <div className="space-y-6">
                    <div><h3 className="text-base font-semibold mb-3">Media Columns</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">Image Column</label><select value={imageConfig?.imageColumnId || ''} onChange={e => setImageConfig(prev => ({ ...(prev || {imageColumnId: '', sourceColumnId: ''}), imageColumnId: e.target.value }))} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2"><option value="">None</option>{table.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium mb-1">Image Source</label><select value={imageConfig?.sourceColumnId || ''} onChange={e => setImageConfig(prev => ({...prev!, sourceColumnId: e.target.value}))} disabled={!imageConfig?.imageColumnId} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2 disabled:opacity-50"><option value="">Select source...</option>{table.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                </div>
                                <div className="flex gap-2 justify-end mt-2">
                                    <button onClick={() => {setImageConfig(null); handleUpdateField('imageConfig', null);}} className="text-sm bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-md">Remove</button>
                                    <button onClick={() => handleUpdateField('imageConfig', imageConfig)} className="text-sm bg-cyan-600 text-white px-3 py-1 rounded-md">Save</button>
                                </div>
                            </div>
                             <div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-sm font-medium mb-1">Text-to-Speech Column</label><select value={audioConfig?.sourceColumnId || ''} onChange={e => setAudioConfig(prev => ({ ...(prev || {sourceColumnId: ''}), sourceColumnId: e.target.value }))} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2"><option value="">None</option>{table.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                                    <div><label className="block text-sm font-medium mb-1">Language Code</label><input type="text" value={audioConfig?.language || ''} onChange={e => setAudioConfig(prev => ({...prev!, language: e.target.value}))} disabled={!audioConfig?.sourceColumnId} placeholder="e.g., en-US" className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2 disabled:opacity-50"/></div>
                                </div>
                                <div className="flex gap-2 justify-end mt-2">
                                    <button onClick={() => {setAudioConfig(null); handleUpdateField('audioConfig', null);}} className="text-sm bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-md">Remove</button>
                                    <button onClick={() => handleUpdateField('audioConfig', audioConfig)} className="text-sm bg-cyan-600 text-white px-3 py-1 rounded-md">Save</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div><h3 className="text-base font-semibold mb-3">AI Content Generation</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">Set up prompts to automatically fill in data for a column based on others.</p>
                        <div className="space-y-3">{table.columns.map(col => {
                            const prompt = (table.aiPrompts || []).find(p => p.targetColumnId === col.id);
                            return <div key={col.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-gray-800 rounded-md border border-slate-200 dark:border-gray-700"><div><p className="font-medium text-sm">{col.name}</p>{prompt ? <p className="text-xs text-slate-500 dark:text-gray-400">'{prompt.name}' configured</p> : <p className="text-xs text-slate-500 dark:text-gray-400">No prompt</p>}</div><button onClick={() => onConfigureAI(col)} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">{prompt ? "Edit" : "Configure"}</button></div>
                        })}</div>
                    </div>
                </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-lg"><h2 className="text-lg font-semibold mb-2">Share to Community</h2>
                {isGuest ? <p className="text-sm text-slate-500 dark:text-gray-400">Please log in to share your tables.</p> :
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={tableDescription} onChange={e => setTableDescription(e.target.value)} onBlur={() => handleUpdateField('description', tableDescription)} rows={3} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2" placeholder="A brief description of this table."/></div>
                    {/* FIX: Replaced .filter(t => t) with a more explicit .filter(t => t.length > 0) to prevent potential TypeScript type inference issues. */}
                    <div><label className="block text-sm font-medium mb-1">Tags (comma-separated)</label><input type="text" value={tableTags} onChange={e => setTableTags(e.target.value)} onBlur={() => handleUpdateField('tags', tableTags.split(',').map(t => t.trim()).filter(t => t.length > 0))} className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded px-3 py-2" placeholder="e.g., spanish, verbs, b1"/></div>
                    <div className="flex items-center justify-between pt-2"><p className="text-sm text-slate-600 dark:text-gray-300">{table.isPublic ? "This table is shared with the community." : "Share this table to the public library?"}</p><button onClick={() => handleUpdateField('isPublic', !table.isPublic)} className={`px-4 py-2 rounded-md font-semibold text-white text-sm ${table.isPublic ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{table.isPublic ? "Make Private" : "Share Now"}</button></div>
                </div>}
            </div>
            
            <ColumnEditorModal isOpen={isColumnEditorOpen} onClose={() => setIsColumnEditorOpen(false)} columns={table.columns} onSave={handleSaveColumns} />
        </div>
    );
};

// --- Sub-Component: Card View ---
const CardView: React.FC<{ rows: VocabRow[]; columns: Column[]; imageColumnId?: string | null; onEdit: (row: VocabRow) => void; }> = ({ rows, columns, imageColumnId, onEdit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (rows.length === 0) {
    return <div className="text-center p-10 text-slate-500 dark:text-gray-400">No rows to display.</div>;
  }

  const currentRow = rows[currentIndex];

  const handleNav = (direction: 'prev' | 'next') => {
    let nextIndex;
    if (direction === 'prev') {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : rows.length - 1;
    } else {
      nextIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : 0;
    }
    setCurrentIndex(nextIndex);
  };
  
  return (
    <div className="flex flex-col items-center">
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-lg p-6 relative">
             <div className="absolute top-4 right-4 flex items-center gap-2">
                 <span className="text-sm font-medium text-slate-500 dark:text-gray-400">{currentIndex + 1} / {rows.length}</span>
                <button onClick={() => onEdit(currentRow)} className="text-slate-400 dark:text-gray-500 hover:text-emerald-500 transition-colors p-1"><Icon name="pencil" className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
                {columns.map(col => (
                    <div key={col.id}>
                        <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{col.name}</h3>
                        {col.id === imageColumnId && currentRow.cols[col.id] ? (
                             <div className="mt-2">
                                <img src={currentRow.cols[col.id]} alt="Preview" className="max-h-40 rounded-md object-contain border border-slate-200 dark:border-gray-700"/>
                            </div>
                        ) : (
                             <p className="text-lg text-slate-800 dark:text-white whitespace-pre-wrap">{currentRow.cols[col.id] || <span className="text-slate-400 dark:text-gray-500">Empty</span>}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
        <div className="flex items-center justify-center gap-4 mt-6">
            <button onClick={() => handleNav('prev')} className="p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-gray-700 shadow-md hover:shadow-lg transition"><Icon name="arrowLeft" className="w-6 h-6"/></button>
            <button onClick={() => handleNav('next')} className="p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-gray-700 shadow-md hover:shadow-lg transition"><Icon name="arrowRight" className="w-6 h-6"/></button>
        </div>
    </div>
  );
};

interface TableScreenProps {
  table: Table;
  onBack: () => void;
  onUpdateTable: (updatedTable: Table) => void;
  onStartStudySession: (tableId: string, relationId: string) => void;
  onNavigateToVmind: () => void;
  isGuest: boolean;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

// --- Main Component: TableScreen ---
const TableScreen: React.FC<TableScreenProps> = ({ table, onBack, onUpdateTable, onStartStudySession, onNavigateToVmind, isGuest, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'view' | 'relations' | 'settings'>('view');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [rowForDetail, setRowForDetail] = useState<VocabRow | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // State lifted from SettingsView
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  const [configuringColumn, setConfiguringColumn] = useState<Column | null>(null);
  
  // State for column deletion with undo
  const [lastDeletedColumn, setLastDeletedColumn] = useState<{ originalTable: Table; deletedColumnName: string } | null>(null);
  const [columnToastKey, setColumnToastKey] = useState(0);

  const handleOpenAIPromptModal = (column: Column) => {
    const promptForColumn = (table.aiPrompts || []).find(p => p.targetColumnId === column.id);
    setEditingPrompt(promptForColumn || null);
    setConfiguringColumn(column);
    setIsPromptModalOpen(true);
  };
    
  const handleSavePrompt = (prompt: AIPrompt) => {
    const prompts = [...(table.aiPrompts || [])];
    const index = prompts.findIndex(p => p.id === prompt.id);
    if (index > -1) prompts[index] = prompt;
    else prompts.push(prompt);
    onUpdateTable({ ...table, aiPrompts: prompts });
  };
  
  const handleDeletePrompt = (promptId: string) => {
      onUpdateTable({ ...table, aiPrompts: (table.aiPrompts || []).filter(p => p.id !== promptId) });
  };

  const addRow = () => {
    const newRow: VocabRow = { id: Date.now().toString(), cols: table.columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}), stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }};
    onUpdateTable({ ...table, rows: [newRow, ...table.rows] });
    setRowForDetail(newRow);
  };
  
  const handleSaveRow = (updatedRow: VocabRow) => {
    onUpdateTable({ ...table, rows: table.rows.map(w => w.id === updatedRow.id ? updatedRow : w) });
  };
  
  const handleDeleteRow = (rowId: string) => {
      onUpdateTable({ ...table, rows: table.rows.filter(r => r.id !== rowId) });
  };
  
  const handleShareTable = (description: string, tags: string) => {
    const updatedTable = {
        ...table,
        description,
        // FIX: Replaced .filter(t => t) with a more explicit .filter(t => t.length > 0) to prevent potential TypeScript type inference issues and ensure only non-empty tags are processed.
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        isPublic: true,
    };
    onUpdateTable(updatedTable);
    onShowToast('Table shared successfully!', 'success');
    setIsShareModalOpen(false);
  };

  const handleDeleteColumn = (columnId: string) => {
      const originalTable = JSON.parse(JSON.stringify(table));
      const deletedColumnName = originalTable.columns.find((c: Column) => c.id === columnId)?.name || 'Column';
      
      let updatedTable = { ...table };

      // Filter out the column itself
      updatedTable.columns = updatedTable.columns.filter(c => c.id !== columnId);

      // Remove data from rows
      updatedTable.rows = updatedTable.rows.map(row => {
          const newCols = { ...row.cols };
          delete newCols[columnId];
          return { ...row, cols: newCols };
      });
      
      // Clean up relations
      updatedTable.relations = updatedTable.relations.map(r => ({
          ...r,
          questionColumnIds: r.questionColumnIds.filter(id => id !== columnId),
          answerColumnIds: r.answerColumnIds.filter(id => id !== columnId),
      })).filter(r => { // Filter out relations that are now invalid
          const isScramble = (r.compatibleModes || []).includes(StudyMode.Scrambled);
          if (isScramble) {
              return r.questionColumnIds.length > 0;
          }
          return r.questionColumnIds.length > 0 && r.answerColumnIds.length > 0;
      });

      // Clean up AI prompts
      updatedTable.aiPrompts = (updatedTable.aiPrompts || []).filter(p => 
          p.targetColumnId !== columnId && !p.sourceColumnIds.includes(columnId)
      );

      // Clean up media configs
      if (updatedTable.imageConfig?.imageColumnId === columnId || updatedTable.imageConfig?.sourceColumnId === columnId) {
          updatedTable.imageConfig = null;
      }
      if (updatedTable.audioConfig?.sourceColumnId === columnId) {
          updatedTable.audioConfig = null;
      }
      
      setLastDeletedColumn({ originalTable, deletedColumnName });
      onUpdateTable(updatedTable);
      setColumnToastKey(Date.now());
  };
  
  const handleUndoColumnDelete = () => {
    if (lastDeletedColumn) {
        onUpdateTable(lastDeletedColumn.originalTable);
        setLastDeletedColumn(null);
    }
  };

  const TabButton: React.FC<{ name: string; active: boolean; onClick: () => void }> = ({ name, active, onClick }) => (
    <button onClick={onClick} className={`px-3 py-2.5 font-semibold transition-colors text-sm ${ active ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 border-b-2 border-transparent'}`}>
        {name}
    </button>
  );
  
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fadeIn">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
            <button onClick={onBack} className="text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors p-2 -ml-2 rounded-full"><Icon name="arrowLeft" className="w-6 h-6" /></button>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white ml-2 truncate" title={table.name}>{table.name}</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={addRow} className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-1.5 text-sm"><Icon name="plus" className="w-4 h-4"/><span>Add Word</span></button>
            {!isGuest && (
                <button 
                    onClick={() => setIsShareModalOpen(true)} 
                    title="Share Table"
                    className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-1.5 text-sm">
                    <Icon name="arrow-up-tray" className="w-4 h-4"/>
                    <span className="hidden sm:inline">Share</span>
                </button>
            )}
            <button onClick={onNavigateToVmind} disabled={table.rows.length < 2 || table.columns.length < 2 || table.relations.length === 0} className="bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"><Icon name="brain" className="w-4 h-4"/><span>Study</span></button>
        </div>
      </header>

      <nav className="border-b border-slate-200 dark:border-gray-700 mb-6">
        <div className="-mb-px flex items-center justify-between">
            <div className="flex space-x-1 sm:space-x-2">
                <TabButton name="View" active={activeTab === 'view'} onClick={() => setActiveTab('view')} />
                <TabButton name="Relations" active={activeTab === 'relations'} onClick={() => setActiveTab('relations')} />
                <TabButton name="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </div>
            {activeTab === 'view' && (
                <div className="flex items-center gap-2">
                    <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                        <Icon name="table-cells" className="w-5 h-5"/>
                    </button>
                     <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                        <Icon name="credit-card" className="w-5 h-5"/>
                    </button>
                </div>
            )}
        </div>
      </nav>

      <main>
        {activeTab === 'view' && viewMode === 'table' && <RowsTableView table={table} onUpdateTable={onUpdateTable} onEditRow={setRowForDetail} onConfigureAI={handleOpenAIPromptModal} onDeleteColumn={handleDeleteColumn} onShowToast={onShowToast} />}
        {activeTab === 'view' && viewMode === 'card' && <CardView rows={table.rows} columns={table.columns} imageColumnId={table.imageConfig?.imageColumnId} onEdit={setRowForDetail} />}
        {activeTab === 'relations' && <RelationsView table={table} onUpdateTable={onUpdateTable} />}
        {activeTab === 'settings' && <SettingsView table={table} onUpdateTable={onUpdateTable} isGuest={isGuest} onConfigureAI={handleOpenAIPromptModal} />}
      </main>
      
      <WordDetailModal 
            isOpen={!!rowForDetail} 
            row={rowForDetail}
            columns={table.columns}
            imageColumnId={table.imageConfig?.imageColumnId}
            onClose={() => setRowForDetail(null)}
            onSave={handleSaveRow}
            onDelete={handleDeleteRow}
            onShowToast={onShowToast}
            onConfigureAI={handleOpenAIPromptModal}
        />
      <AIPromptModal 
          isOpen={isPromptModalOpen} 
          onClose={() => { setIsPromptModalOpen(false); setConfiguringColumn(null); }} 
          onSave={handleSavePrompt} 
          onDelete={handleDeletePrompt}
          columns={table.columns} 
          promptToEdit={editingPrompt} 
          configuringColumn={configuringColumn}
      />
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        table={table}
        onShare={handleShareTable}
      />
      {columnToastKey > 0 && lastDeletedColumn && (
        <Toast
            key={columnToastKey}
            message={`'${lastDeletedColumn.deletedColumnName}' column deleted.`}
            actionText="Undo"
            onAction={handleUndoColumnDelete}
            onClose={() => setLastDeletedColumn(null)}
        />
      )}
    </div>
  );
};

export default TableScreen;