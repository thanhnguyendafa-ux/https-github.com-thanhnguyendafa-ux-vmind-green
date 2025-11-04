import React, { useState, useMemo } from 'react';
import { Table, Relation, StudyMode } from '../types';
import Icon from './Icon';

interface StudySetupScreenProps {
  tables: Table[];
  onStartSession: (tableId: string, relationId: string) => void;
  onBack: () => void;
}

const studyModeIcons: { [key in StudyMode]: string } = {
    [StudyMode.Flashcards]: 'credit-card',
    [StudyMode.MultipleChoice]: 'list-bullet',
    [StudyMode.Typing]: 'keyboard',
    [StudyMode.TrueFalse]: 'check',
    [StudyMode.Scrambled]: 'arrows-right-left',
};

const quizModes = [StudyMode.MultipleChoice, StudyMode.Typing, StudyMode.TrueFalse, StudyMode.Scrambled];


const StudySetupScreen: React.FC<StudySetupScreenProps> = ({ tables, onStartSession, onBack }) => {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedModes, setSelectedModes] = useState<Set<StudyMode>>(new Set());
  const [selectedRelation, setSelectedRelation] = useState<{tableId: string, relationId: string} | null>(null);

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId), [tables, selectedTableId]);

  const filteredRelations = useMemo(() => {
    if (!selectedTable || selectedModes.size === 0) {
      return [];
    }
    const relations: (Relation & { tableId: string; tableName: string })[] = [];
    selectedTable.relations.forEach(rel => {
        const isCompatible = rel.compatibleModes?.some(mode => selectedModes.has(mode));
        if (isCompatible) {
            relations.push({ ...rel, tableId: selectedTable.id, tableName: selectedTable.name });
        }
    });
    return relations;
  }, [selectedTable, selectedModes]);

  const handleToggleMode = (mode: StudyMode) => {
    const newSet = new Set(selectedModes);
    if (newSet.has(mode)) newSet.delete(mode);
    else newSet.add(mode);
    setSelectedModes(newSet);
    setSelectedRelation(null);
  };
  
  const handleSelectTable = (tableId: string) => {
      setSelectedTableId(tableId);
      setSelectedRelation(null); // Reset relation selection
  }

  const isReadyToStart = selectedRelation !== null;

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
      
      {/* Step 1: Select Table */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">1. Select a Table</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables.map(table => (
                 <div key={table.id} onClick={() => handleSelectTable(table.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedTableId === table.id ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/20 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 dark:text-white">{table.name}</h3>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTableId === table.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                           {selectedTableId === table.id && <Icon name="check" className="w-3 h-3 text-white"/>}
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400">{table.rows.length} rows, {table.relations.length} relations</p>
                 </div>
            ))}
        </div>
      </div>

      {/* Step 2: Select Modes */}
      {selectedTableId && (
        <div className="mb-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">2. Select Study Modes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quizModes.map(mode => {
                    const isSelected = selectedModes.has(mode);
                    return (
                        <div key={mode} onClick={() => handleToggleMode(mode)} className={`border rounded-lg p-3 cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/20 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm text-slate-800 dark:text-white">{mode}</h3>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {isSelected && <Icon name="check" className="w-3 h-3 text-white"/>}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
      )}

      {/* Step 3: Select Relation */}
      {filteredRelations.length > 0 && (
        <div className="mb-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">3. Select a Relation</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredRelations.map(rel => (
                     <div key={rel.id} onClick={() => setSelectedRelation({tableId: rel.tableId, relationId: rel.id})} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedRelation?.relationId === rel.id ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/20 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white">{rel.name}</h3>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRelation?.relationId === rel.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                {selectedRelation?.relationId === rel.id && <Icon name="check" className="w-3 h-3 text-white"/>}
                            </div>
                        </div>
                     </div>
                ))}
            </div>
        </div>
      )}
      
      <button
        onClick={() => selectedRelation && onStartSession(selectedRelation.tableId, selectedRelation.relationId)}
        disabled={!isReadyToStart}
        className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
      >
        <Icon name="play" className="w-5 h-5" />
        Start Session
      </button>

    </div>
  );
};

export default StudySetupScreen;
