




import React, { useState, useMemo, useEffect } from 'react';
import { VocabRow, Column, AIPrompt } from '../types';
import Icon from './Icon';
import { generateForPrompt } from '../services/geminiService';

interface WordDetailModalProps {
  row: VocabRow | null;
  columns: Column[];
  aiPrompts?: AIPrompt[];
  imageColumnId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRow: VocabRow) => void;
  onDelete: (rowId: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onConfigureAI: (column: Column) => void;
}

const WordDetailModal: React.FC<WordDetailModalProps> = ({ row, columns, aiPrompts, imageColumnId, isOpen, onClose, onSave, onDelete, onShowToast, onConfigureAI }) => {
  const [editableRow, setEditableRow] = useState<VocabRow | null>(null);
  const [generatingFields, setGeneratingFields] = useState<Set<string>>(new Set());

  const promptsByTarget = useMemo(() => {
    const map = new Map<string, AIPrompt>();
    (aiPrompts || []).forEach(p => {
        map.set(p.targetColumnId, p);
    });
    return map;
  }, [aiPrompts]);

  useEffect(() => {
    if (row) {
      setEditableRow(JSON.parse(JSON.stringify(row))); // Deep copy
      setGeneratingFields(new Set());
    }
  }, [row]);

  const stats = useMemo(() => {
    if (!editableRow) return null;
    const { correct, incorrect } = editableRow.stats;
    const encounters = correct + incorrect;
    const successRate = encounters > 0 ? (correct / encounters) * 100 : 0;
    const lastStudied = editableRow.stats.lastStudied ? new Date(editableRow.stats.lastStudied).toLocaleString() : 'Never';
    return { encounters, successRate, lastStudied };
  }, [editableRow]);

  const handleDataChange = (columnId: string, value: string) => {
    if (!editableRow) return;
    setEditableRow({
      ...editableRow,
      cols: {
        ...editableRow.cols,
        [columnId]: value,
      },
    });
  };

  const handleSave = () => {
    if (editableRow) {
      onSave(editableRow);
      onClose();
    }
  };

  const handleDelete = () => {
    if (editableRow) {
        onDelete(editableRow.id);
        onClose();
    }
  }

  const handleGenerateForField = async (columnId: string) => {
    if (!editableRow || !columns) return;

    const promptConfig = promptsByTarget.get(columnId);
    if (!promptConfig) return;

    setGeneratingFields(prev => new Set(prev).add(columnId));
    try {
        const sourceValues = promptConfig.sourceColumnIds.reduce((acc, sourceColId) => {
            const colName = columns.find(c => c.id === sourceColId)?.name;
            if (colName) acc[colName] = editableRow.cols[sourceColId] || '';
            return acc;
        }, {} as Record<string, string>);

        const result = await generateForPrompt(promptConfig.prompt, sourceValues);
        handleDataChange(columnId, result);
    } catch (error: any) {
        if (error.message === "API_KEY_MISSING") {
            onShowToast("Please set your Gemini API key in Settings.", "error");
        } else {
            onShowToast("An unexpected AI error occurred.", "error");
            console.error("Error generating for field:", error);
        }
    } finally {
        setGeneratingFields(prev => {
            const newSet = new Set(prev);
            newSet.delete(columnId);
            return newSet;
        });
    }
  };
  
  if (!isOpen || !editableRow || !stats) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-100 dark:bg-slate-900 w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp">
        <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Edit Row</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="text-red-500 hover:bg-red-500/10 p-2 rounded-md font-semibold flex items-center gap-2">
              <Icon name="trash" className="w-5 h-5"/>
            </button>
            <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full">
              <Icon name="x" className="w-6 h-6"/>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content: Fields */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Fields</h3>
              <div className="space-y-4">
                {columns.map(col => {
                    const promptForCell = promptsByTarget.get(col.id);
                    const isGenerating = generatingFields.has(col.id);
                    const hasContent = !!editableRow.cols[col.id];

                    let isDisabled = isGenerating;
                    let title = '';
                    
                    if (isGenerating) {
                        title = "Generating...";
                    } else if (!promptForCell) {
                        isDisabled = true;
                        title = "Configure an AI prompt first (click the chat icon)";
                    } else if (hasContent) {
                        isDisabled = true;
                        title = "Generation is only available for empty fields";
                    } else {
                        isDisabled = false;
                        title = `Generate with '${promptForCell.name}'`;
                    }

                    return (
                        <div key={col.id}>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{col.name}</label>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleGenerateForField(col.id)}
                                        disabled={isDisabled}
                                        title={title}
                                        className="text-slate-400 dark:text-slate-500 hover:text-emerald-500 transition-colors p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                                    >
                                        {isGenerating ? <Icon name="spinner" className="w-5 h-5 animate-spin"/> : <Icon name="sparkles" className="w-5 h-5"/>}
                                    </button>
                                    <button 
                                        onClick={() => onConfigureAI(col)} 
                                        title={`Configure AI prompt for "${col.name}"`}
                                        className="text-slate-400 dark:text-slate-500 hover:text-cyan-500 transition-colors p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                        <Icon name="chat" className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <textarea
                            value={editableRow.cols[col.id] || ''}
                            onChange={(e) => handleDataChange(col.id, e.target.value)}
                            rows={col.id === imageColumnId ? 1 : 2}
                            disabled={isGenerating}
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-70"
                            />
                            {col.id === imageColumnId && editableRow.cols[col.id] && (
                                <div className="mt-2">
                                    <img 
                                        src={editableRow.cols[col.id]} alt="Preview" 
                                        className="max-h-32 rounded-md object-contain border border-slate-200 dark:border-slate-700"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
              </div>
            </div>
          </div>
          {/* Sidebar: Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 self-start">
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-3">Statistics</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Correct</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{editableRow.stats.correct}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Incorrect</span>
                    <span className="font-medium text-red-600 dark:text-red-400">{editableRow.stats.incorrect}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Encounters</span>
                    <span className="font-medium">{stats.encounters}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Success %</span>
                    <span className="font-medium">{stats.successRate.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Last Studied</span>
                    <span className="font-medium text-right text-xs">{stats.lastStudied}</span>
                </div>
            </div>
          </div>
        </div>
        <footer className="p-4 bg-slate-200/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors text-sm">Cancel</button>
          <button onClick={handleSave} className="bg-emerald-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-emerald-700 transition-colors text-sm">Save</button>
        </footer>
      </div>
    </div>
  );
};

export default WordDetailModal;