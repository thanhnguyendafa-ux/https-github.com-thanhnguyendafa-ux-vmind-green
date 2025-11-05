import React, { useEffect, useRef } from 'react';
import { Table, VocabRow } from '../types';
import Icon from './Icon';

interface GalleryCardProps {
  row: VocabRow;
  table: Table;
  isInitial: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const GalleryCard: React.FC<GalleryCardProps> = ({ row, table, isInitial, scrollRef }) => {
  const imageColumnId = table.imageConfig?.imageColumnId;
  const imageUrl = imageColumnId ? row.cols[imageColumnId] : null;

  const stats = row.stats;
  const encounters = stats.correct + stats.incorrect;
  const successRate = encounters > 0 ? (stats.correct / encounters) * 100 : 0;

  return (
    <div ref={isInitial ? scrollRef : null} className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl shadow-md overflow-hidden flex flex-col animate-fadeIn">
      {imageUrl && (
        <div className="h-40 bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
          <img src={imageUrl} alt="Card image" className="object-contain w-full h-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
      )}
      <div className="p-4 flex-grow">
        <ul className="space-y-2">
          {table.columns.map(col => {
            if (col.id === imageColumnId) return null;
            return (
              <li key={col.id}>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{col.name}</p>
                <p className="text-sm text-slate-800 dark:text-white">{row.cols[col.id] || '—'}</p>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-700/50 p-2 flex justify-around text-xs text-slate-500 dark:text-slate-400">
        <span title="Success Rate" className="font-medium">{successRate.toFixed(0)}%</span>
        <span title="Correct" className="text-emerald-500 font-bold">✓ {stats.correct}</span>
        <span title="Incorrect" className="text-red-500 font-bold">✗ {stats.incorrect}</span>
      </div>
    </div>
  );
};

interface GalleryViewModalProps {
  table: Table;
  initialRowId?: string;
  onClose: () => void;
}

const GalleryViewModal: React.FC<GalleryViewModalProps> = ({ table, initialRowId, onClose }) => {
  const initialCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the initial card after a short delay to allow rendering
    const timer = setTimeout(() => {
      initialCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(timer);
  }, [initialRowId]);

  return (
    <div className="fixed inset-0 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col animate-fadeIn">
      <header className="flex-shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white truncate pr-4">
          Gallery: {table.name}
        </h2>
        <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <Icon name="x" className="w-6 h-6" />
        </button>
      </header>
      <div className="flex-grow overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {table.rows.map(row => (
            <GalleryCard 
              key={row.id} 
              row={row} 
              table={table} 
              isInitial={row.id === initialRowId} 
              scrollRef={initialCardRef}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryViewModal;
