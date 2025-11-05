import React, { useState, useMemo, useEffect } from 'react';
import { Table, Relation, StudyMode, StudySettings, CriteriaSort, StudySource, VocabRow } from '../types';
import Icon from './Icon';

interface StudySetupScreenProps {
  tables: Table[];
  onStartSession: (settings: StudySettings) => void;
  onBack: () => void;
}

const quizModes = [StudyMode.MultipleChoice, StudyMode.Typing, StudyMode.TrueFalse, StudyMode.Scrambled];
const criteriaFields: { id: CriteriaSort['field']; name: string }[] = [
    { id: 'priorityScore', name: 'Priority Score (Hardest First)' },
    { id: 'successRate', name: 'Success Rate (Lowest First)' },
    { id: 'lastStudied', name: 'Least Recent' },
    { id: 'random', name: 'Random' },
];

const studyModeIcons: { [key in StudyMode]: string } = {
    [StudyMode.Flashcards]: 'credit-card',
    [StudyMode.MultipleChoice]: 'list-bullet',
    [StudyMode.Typing]: 'keyboard',
    [StudyMode.TrueFalse]: 'check',
    [StudyMode.Scrambled]: 'arrows-right-left',
};

const StudySetupScreen: React.FC<StudySetupScreenProps> = ({ tables, onStartSession, onBack }) => {
  const [setupType, setSetupType] = useState<'table' | 'criteria'>('table');
  const [selectedSources, setSelectedSources] = useState<StudySource[]>([]);
  const [wordCount, setWordCount] = useState<number>(20);
  const [selectedModes, setSelectedModes] = useState<Set<StudyMode>>(new Set(quizModes));
  const [criteriaSorts, setCriteriaSorts] = useState<CriteriaSort[]>([{ field: 'priorityScore', direction: 'desc' }]);
  const [randomizeModes, setRandomizeModes] = useState(true);

  // New state for manual word selection
  const [wordSelectionMode, setWordSelectionMode] = useState<'auto' | 'manual'>('auto');
  const [manualWordIds, setManualWordIds] = useState<Set<string>>(new Set());

  const availableRelations = useMemo(() => {
    return tables.flatMap(table => 
        table.relations.map(rel => ({
            ...rel,
            tableId: table.id,
            tableName: table.name,
        }))
    );
  }, [tables]);
  
  const wordsForManualSelection = useMemo(() => {
    const rowMap = new Map<string, VocabRow & { sourceDisplay: string }>();
    selectedSources.forEach(source => {
        const table = tables.find(t => t.id === source.tableId);
        const relation = table?.relations.find(r => r.id === source.relationId);
        if (table && relation) {
            const questionColName = table.columns.find(c => c.id === relation.questionColumnIds[0])?.name || '...';
            table.rows.forEach(row => {
                if (!rowMap.has(row.id)) {
                    rowMap.set(row.id, { ...row, sourceDisplay: row.cols[relation.questionColumnIds[0]] || `[Empty ${questionColName}]` });
                }
            });
        }
    });
    return Array.from(rowMap.values());
  }, [selectedSources, tables]);

  const maxWords = wordsForManualSelection.length;
  
  useEffect(() => {
      if (wordCount > maxWords) {
          setWordCount(maxWords > 0 ? maxWords : 1);
      }
      // Uncheck words that are no longer available
      setManualWordIds(prev => {
          const availableIds = new Set(wordsForManualSelection.map(w => w.id));
          const newSet = new Set<string>();
          prev.forEach(id => {
              if (availableIds.has(id)) newSet.add(id);
          });
          return newSet;
      });
  }, [maxWords, wordCount, wordsForManualSelection]);

  const handleToggleSource = (tableId: string, relationId: string) => {
    setSelectedSources(prev => {
        const exists = prev.some(s => s.tableId === tableId && s.relationId === relationId);
        if (exists) {
            return prev.filter(s => !(s.tableId === tableId && s.relationId === relationId));
        } else {
            return [...prev, { tableId, relationId }];
        }
    });
  };

  const handleToggleMode = (mode: StudyMode) => {
    setSelectedModes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(mode)) newSet.delete(mode);
        else newSet.add(mode);
        return newSet;
    });
  };
  
  const handleCriteriaChange = (index: number, field: keyof CriteriaSort, value: string) => {
      setCriteriaSorts(prev => {
          const newSorts = [...prev];
          newSorts[index] = { ...newSorts[index], [field]: value };
          return newSorts;
      });
  };
  
  const addCriteria = () => {
      if (criteriaSorts.length < 3) {
          setCriteriaSorts(prev => [...prev, { field: 'priorityScore', direction: 'desc' }]);
      }
  };
  
  const removeCriteria = (index: number) => {
      setCriteriaSorts(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleManualWord = (rowId: string) => {
    setManualWordIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(rowId)) newSet.delete(rowId);
        else newSet.add(rowId);
        return newSet;
    })
  };

  const handleStart = () => {
    const settings: StudySettings = {
        type: setupType,
        sources: selectedSources,
        modes: Array.from(selectedModes),
        randomizeModes,
        wordSelectionMode,
        wordCount: wordSelectionMode === 'auto' ? Math.min(wordCount, maxWords) : undefined,
        manualWordIds: wordSelectionMode === 'manual' ? Array.from(manualWordIds) : undefined,
        criteriaSorts: setupType === 'criteria' ? criteriaSorts : undefined,
    };
    onStartSession(settings);
  };
  
  const currentWordCount = wordSelectionMode === 'auto' ? wordCount : manualWordIds.size;
  const isReady = selectedSources.length > 0 && selectedModes.size > 0 && currentWordCount > 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fadeIn">
        <header className="flex items-center gap-3 mb-6">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                <Icon name="arrowLeft" className="w-6 h-6"/>
            </button>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Setup Study Session</h1>
                <p className="text-sm text-slate-500 dark:text-gray-400">Configure your quiz session.</p>
            </div>
        </header>

        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-6 shadow-md">
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                <button onClick={() => setSetupType('table')} className={`px-4 py-2 text-sm font-semibold ${setupType === 'table' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-500'}`}>Table Mode</button>
                <button onClick={() => setSetupType('criteria')} className={`px-4 py-2 text-sm font-semibold ${setupType === 'criteria' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-500'}`}>Criteria Mode</button>
            </div>
            
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">1. Select Content</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{setupType === 'table' ? 'Select specific relations from any table.' : 'Select all relations from tables you want to draw from.'}</p>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {availableRelations.map(rel => {
                      const isSelected = selectedSources.some(s => s.tableId === rel.tableId && s.relationId === rel.id);
                      return (
                         <div key={`${rel.tableId}-${rel.id}`} onClick={() => handleToggleSource(rel.tableId, rel.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">{rel.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">from "{rel.tableName}"</p>
                                </div>
                               <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                 {isSelected && <Icon name="check" className="w-3 h-3 text-white"/>}
                               </div>
                            </div>
                         </div>
                      )
                  })}
                </div>
            </div>
            
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">2. Configure Session</h2>
                 <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold mb-4 w-fit">
                    <button onClick={() => setWordSelectionMode('auto')} className={`px-4 py-1.5 rounded-full ${wordSelectionMode === 'auto' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Automatic</button>
                    <button onClick={() => setWordSelectionMode('manual')} className={`px-4 py-1.5 rounded-full ${wordSelectionMode === 'manual' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Manual</button>
                </div>
                
                {wordSelectionMode === 'auto' ? (
                    <div className="animate-fadeIn">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Number of Words ({maxWords} available)</label>
                            <input type="range" min="1" max={maxWords > 0 ? maxWords : 1} value={wordCount} onChange={e => setWordCount(Number(e.target.value))} disabled={maxWords === 0} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"/>
                            <p className="text-center font-bold text-emerald-600 dark:text-emerald-400">{wordCount}</p>
                        </div>
                         {setupType === 'criteria' && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sort By</label>
                                {criteriaSorts.map((sort, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{index + 1}.</span>
                                        <select value={sort.field} onChange={e => handleCriteriaChange(index, 'field', e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm">
                                            {criteriaFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                        <button onClick={() => removeCriteria(index)} className="text-slate-400 hover:text-red-500 p-1" disabled={criteriaSorts.length <= 1}>
                                            <Icon name="trash" className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ))}
                                {criteriaSorts.length < 3 && (
                                    <button onClick={addCriteria} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                                        <Icon name="plus" className="w-4 h-4"/> Add Sort Criterion
                                    </button>
                                )}
                            </div>
                         )}
                    </div>
                ) : (
                    <div className="animate-fadeIn">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Words ({manualWordIds.size} / {maxWords} selected)</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 border rounded-md p-2 bg-slate-50 dark:bg-slate-800/50">
                            {wordsForManualSelection.length > 0 ? wordsForManualSelection.map(word => {
                                const isSelected = manualWordIds.has(word.id);
                                return <div key={word.id} onClick={() => handleToggleManualWord(word.id)} className={`p-2 rounded-md cursor-pointer flex items-center gap-3 text-sm ${isSelected ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                      {isSelected && <Icon name="check" className="w-3 h-3 text-white"/>}
                                    </div>
                                    <span className="truncate">{word.sourceDisplay}</span>
                                </div>
                            }) : <p className="text-xs text-center text-slate-500 p-4">Select relations above to see available words.</p>}
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">3. Select Question Types</h2>
                    {selectedModes.size > 1 && (
                        <div className="flex items-center gap-2">
                             <label htmlFor="randomize-modes" className="text-xs text-slate-500 dark:text-slate-400">Randomize Modes</label>
                             <button id="randomize-modes" onClick={() => setRandomizeModes(!randomizeModes)} className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${randomizeModes ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <span className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${randomizeModes ? 'translate-x-5' : ''}`}></span>
                             </button>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quizModes.map(mode => {
                        const isSelected = selectedModes.has(mode);
                        return (
                            <div key={mode} onClick={() => handleToggleMode(mode)} className={`border rounded-lg p-3 cursor-pointer transition-all text-center ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300'}`}>
                                <Icon name={studyModeIcons[mode]} className={`w-5 h-5 mb-1 mx-auto ${isSelected ? 'text-emerald-500' : 'text-slate-500'}`} />
                                <h3 className="font-semibold text-xs text-slate-800 dark:text-white">{mode}</h3>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        <button
            onClick={handleStart}
            disabled={!isReady}
            className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
        >
            <Icon name="play" className="w-5 h-5" />
            Start Session ({currentWordCount} Questions)
        </button>
    </div>
  );
};

export default StudySetupScreen;