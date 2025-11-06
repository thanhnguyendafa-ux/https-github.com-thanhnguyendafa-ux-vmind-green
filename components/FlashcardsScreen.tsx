import React, { useState, useMemo, useEffect } from 'react';
import { Table, Relation, FlashcardStatus, VocabRow } from '../types';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';

const statusColors: { [key in FlashcardStatus]: { bg: string; text: string } } = {
  [FlashcardStatus.New]: { bg: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300' },
  [FlashcardStatus.Again]: { bg: 'bg-red-200 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
  [FlashcardStatus.Hard]: { bg: 'bg-orange-200 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300' },
  [FlashcardStatus.Good]: { bg: 'bg-blue-200 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300' },
  [FlashcardStatus.Easy]: { bg: 'bg-green-200 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  [FlashcardStatus.Perfect]: { bg: 'bg-purple-200 dark:bg-purple-900', text: 'text-purple-700 dark:text-purple-300' },
};

const FlashcardsScreen: React.FC = () => {
  const { tables, handleStartFlashcardSession } = useAppContext();
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectedRelationIds, setSelectedRelationIds] = useState<Set<string>>(new Set());

  const { availableRelations, globalStats, totalRows } = useMemo(() => {
    if (selectedTableIds.size === 0) {
      return { availableRelations: [], globalStats: {}, totalRows: 0 };
    }

    const stats: { [key in FlashcardStatus]: number } = {
      [FlashcardStatus.New]: 0,
      [FlashcardStatus.Again]: 0,
      [FlashcardStatus.Hard]: 0,
      [FlashcardStatus.Good]: 0,
      [FlashcardStatus.Easy]: 0,
      [FlashcardStatus.Perfect]: 0,
    };

    let total = 0;
    const relations: (Relation & { tableName: string })[] = [];

    tables.forEach(table => {
      if (selectedTableIds.has(table.id)) {
        table.rows.forEach(row => {
          stats[row.stats.flashcardStatus]++;
          total++;
        });
        table.relations.forEach(rel => {
          relations.push({ ...rel, tableName: table.name });
        });
      }
    });

    return { availableRelations: relations, globalStats: stats, totalRows: total };
  }, [tables, selectedTableIds]);
  
  useEffect(() => {
    setSelectedRelationIds(prev => {
        const newSet = new Set<string>();
        const availableIds = new Set(availableRelations.map(r => r.id));
        prev.forEach(id => {
            if (availableIds.has(id)) {
                newSet.add(id);
            }
        });
        return newSet;
    });
  }, [availableRelations]);

  const handleToggleTable = (tableId: string) => {
    const newSet = new Set(selectedTableIds);
    if (newSet.has(tableId)) newSet.delete(tableId);
    else newSet.add(tableId);
    setSelectedTableIds(newSet);
  };

  const handleToggleRelation = (relationId: string) => {
    const newSet = new Set(selectedRelationIds);
    if (newSet.has(relationId)) newSet.delete(relationId);
    else newSet.add(relationId);
    setSelectedRelationIds(newSet);
  };

  const isReady = selectedTableIds.size > 0 && selectedRelationIds.size > 0 && totalRows > 0;
  
  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Flashcards Setup</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Select tables and relations to study.</p>
      </header>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">1. Select Tables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables.map(table => (
              <div key={table.id} onClick={() => handleToggleTable(table.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedTableIds.has(table.id) ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/20 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 dark:text-white">{table.name}</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTableIds.has(table.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                    {selectedTableIds.has(table.id) && <Icon name="check" className="w-3 h-3 text-white"/>}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{table.rows.length} cards</p>
              </div>
            ))}
          </div>
        </div>
        
        {selectedTableIds.size > 0 && (
          <div className="animate-fadeIn grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Card Stats</h2>
              <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-lg p-4">
                <p className="text-sm font-semibold mb-3">Total Cards: {totalRows}</p>
                <div className="space-y-1">
                  {(Object.keys(globalStats) as FlashcardStatus[]).map(status => {
                    const count = globalStats[status];
                    if (count === 0) return null;
                    return (
                      <div key={status} className="flex justify-between items-center text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${statusColors[status].bg} ${statusColors[status].text}`}>{status}</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">2. Select Relations</h2>
              {availableRelations.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {availableRelations.map(rel => (
                     <div key={rel.id} onClick={() => handleToggleRelation(rel.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedRelationIds.has(rel.id) ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/20 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm">{rel.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">from "{rel.tableName}"</p>
                            </div>
                           <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedRelationIds.has(rel.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                             {selectedRelationIds.has(rel.id) && <Icon name="check" className="w-3 h-3 text-white"/>}
                           </div>
                        </div>
                     </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Selected tables have no relations.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button 
          onClick={() => handleStartFlashcardSession(Array.from(selectedTableIds), Array.from(selectedRelationIds))}
          disabled={!isReady}
          className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Icon name="play" className="w-5 h-5" />
          Start Session ({totalRows} cards)
        </button>
      </div>
    </div>
  );
};

export default FlashcardsScreen;
