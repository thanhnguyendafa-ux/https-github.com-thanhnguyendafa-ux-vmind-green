import React, { useState, useMemo } from 'react';
import { Table, Relation, FlashcardStatus, VocabRow } from '../types';
import Icon from './Icon';

interface FlashcardsScreenProps {
  tables: Table[];
  onStartSession: (tableIds: string[], relationIds: string[]) => void;
}

const statusColors: { [key in FlashcardStatus]: { bg: string; text: string } } = {
  [FlashcardStatus.New]: { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  [FlashcardStatus.Again]: { bg: 'bg-red-200 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
  [FlashcardStatus.Hard]: { bg: 'bg-orange-200 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300' },
  [FlashcardStatus.Good]: { bg: 'bg-blue-200 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
  [FlashcardStatus.Easy]: { bg: 'bg-green-200 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  [FlashcardStatus.Perfect]: { bg: 'bg-purple-200 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
};

const FlashcardsScreen: React.FC<FlashcardsScreenProps> = ({ tables, onStartSession }) => {
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectedRelationIds, setSelectedRelationIds] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(true);

  const globalStats = useMemo(() => {
    const stats: { [key in FlashcardStatus]: number } = {
      [FlashcardStatus.New]: 0, [FlashcardStatus.Again]: 0, [FlashcardStatus.Hard]: 0,
      [FlashcardStatus.Good]: 0, [FlashcardStatus.Easy]: 0, [FlashcardStatus.Perfect]: 0,
    };
    tables.forEach(table => {
      table.rows.forEach(row => {
        stats[row.stats.flashcardStatus]++;
      });
    });
    return stats;
  }, [tables]);

  const selectedTables = useMemo(() => tables.filter(t => selectedTableIds.has(t.id)), [tables, selectedTableIds]);
  const availableRelations = useMemo(() => {
    const allRelations: (Relation & { tableName: string })[] = [];
    const relationIds = new Set<string>();
    selectedTables.forEach(table => {
      table.relations.forEach(rel => {
        if (!relationIds.has(rel.id)) {
          allRelations.push({ ...rel, tableName: table.name });
          relationIds.add(rel.id);
        }
      });
    });
    return allRelations;
  }, [selectedTables]);

  const handleToggleTable = (tableId: string) => {
    const newSet = new Set(selectedTableIds);
    if (newSet.has(tableId)) newSet.delete(tableId);
    else newSet.add(tableId);
    setSelectedTableIds(newSet);
    setSelectedRelationIds(new Set()); // Reset relation selection
  };
  
  const handleToggleRelation = (relId: string) => {
    const newSet = new Set(selectedRelationIds);
    if (newSet.has(relId)) newSet.delete(relId);
    else newSet.add(relId);
    setSelectedRelationIds(newSet);
  }

  const isReadyToStart = selectedTableIds.size > 0 && selectedRelationIds.size > 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fadeIn">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Flashcard Review</h1>
      <p className="text-sm text-slate-500 dark:text-gray-400 mb-6">Select tables and relations to start a spaced repetition session.</p>

      {/* Global Stats */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 shadow-md mb-6">
        <h2 className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Overall Progress</h2>
        <div className="flex flex-wrap gap-2">
{/* FIX: Changed from Object.entries to Object.keys to work around a type inference issue where the count was treated as 'unknown'. */}
          {(Object.keys(globalStats) as Array<keyof typeof globalStats>).map(status => {
            const count = globalStats[status];
            return (
              count > 0 && <div key={status} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[status].bg} ${statusColors[status].text}`}>
                {status}: {count}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Step 1: Select Tables */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">1. Select Tables</h2>
          <button onClick={() => setShowDetails(!showDetails)} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{showDetails ? 'Hide Details' : 'Show Details'}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tables.map(table => {
            const tableStats = table.rows.reduce((acc: Record<string, number>, row) => {
              acc[row.stats.flashcardStatus] = (acc[row.stats.flashcardStatus] || 0) + 1;
              if (row.stats.isFlashcardReviewed) acc['reviewed'] = (acc['reviewed'] || 0) + 1;
              acc['encounters'] = (acc['encounters'] || 0) + row.stats.flashcardEncounters;
              return acc;
            }, {
              [FlashcardStatus.New]: 0,
              [FlashcardStatus.Again]: 0,
              [FlashcardStatus.Hard]: 0,
              [FlashcardStatus.Good]: 0,
              [FlashcardStatus.Easy]: 0,
              [FlashcardStatus.Perfect]: 0,
              reviewed: 0,
              encounters: 0,
            } as Record<string, number>);

            return (
              <div key={table.id} onClick={() => handleToggleTable(table.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedTableIds.has(table.id) ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/20 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-white">{table.name}</h3>
                  <input type="checkbox" readOnly checked={selectedTableIds.has(table.id)} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"/>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400">{table.rows.length} cards</p>
                {showDetails && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {Object.values(FlashcardStatus).map(status => (
                        ((tableStats[status as FlashcardStatus] || 0) > 0) && <span key={status} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[status].bg} ${statusColors[status].text}`}>{status}: {tableStats[status as FlashcardStatus]}</span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 flex justify-between">
                      <span>Reviewed: {tableStats.reviewed} / {table.rows.length} ({Math.round(table.rows.length > 0 ? (tableStats.reviewed / table.rows.length) * 100 : 0)}%)</span>
                      <span>Encounters: {tableStats.encounters}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Step 2: Select Relations */}
      {selectedTableIds.size > 0 && (
        <div className="mb-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">2. Select Relations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableRelations.map(rel => (
              <div key={rel.id} onClick={() => handleToggleRelation(rel.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedRelationIds.has(rel.id) ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/20 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                 <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-white">{rel.name}</h3>
                  <input type="checkbox" readOnly checked={selectedRelationIds.has(rel.id)} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"/>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400">({rel.tableName})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onStartSession(Array.from(selectedTableIds), Array.from(selectedRelationIds))}
        disabled={!isReadyToStart}
        className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Icon name="play" className="w-5 h-5" />
        Start Review
      </button>
    </div>
  );
};

export default FlashcardsScreen;
