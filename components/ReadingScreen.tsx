import * as React from 'react';
import { Note, Table, VocabRow, FlashcardStatus } from '../types';
import Icon from './Icon';
import Modal from './Modal';
import { explainText } from '../services/geminiService';

interface ReadingScreenProps {
  notes: Note[];
  tables: Table[];
  onBack: () => void;
  onCreateNote: () => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateTable: (table: Table) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onSaveToJournal: (source: string, content: string) => void;
}

const ReadingScreen: React.FC<ReadingScreenProps> = ({ notes, tables, onBack, onCreateNote, onUpdateNote, onDeleteNote, onUpdateTable, onShowToast, onSaveToJournal }) => {
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);
  const [selectedText, setSelectedText] = React.useState<string | null>(null);
  const [popupPosition, setPopupPosition] = React.useState<{ top: number; left: number } | null>(null);
  
  const [isExplainModalOpen, setIsExplainModalOpen] = React.useState(false);
  const [explanation, setExplanation] = React.useState('');
  const [isExplainLoading, setIsExplainLoading] = React.useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [selectedTableId, setSelectedTableId] = React.useState<string>('');
  const [selectedColumnId, setSelectedColumnId] = React.useState<string>('');
  
  const editorRef = React.useRef<HTMLDivElement>(null);
  const popupRef = React.useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const activeNote = notes.find(n => n.id === activeNoteId);

  React.useEffect(() => {
    if (!activeNoteId && notes.length > 0) {
      setActiveNoteId(notes[0].id);
    }
     if (notes.length > 0 && !notes.some(n => n.id === activeNoteId)) {
        setActiveNoteId(notes[0]?.id || null);
    }
  }, [notes, activeNoteId]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setPopupPosition(null);
        setSelectedText(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (selection && text) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setPopupPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    } else {
      setPopupPosition(null);
      setSelectedText(null);
    }
  };
  
  const handleUpdateContent = (content: string) => {
    if (activeNote) {
      onUpdateNote({ ...activeNote, content });
    }
  };

  const handleExplain = async () => {
    if (!selectedText) return;
    setIsExplainLoading(true);
    setIsExplainModalOpen(true);
    try {
        const result = await explainText(selectedText);
        setExplanation(result);
    } catch (error: any) {
        if (error.message === "API_KEY_MISSING") {
            onShowToast("Please set your Gemini API key...", "error");
            setIsExplainModalOpen(false);
        } else {
            onShowToast("An unexpected AI error occurred.", "error");
            console.error("Error explaining text:", error);
            setExplanation("Could not get explanation due to an error.");
        }
    } finally {
        setIsExplainLoading(false);
    }
  };
  
  const handleSaveJournalClick = () => {
    if (!selectedText || !activeNote) return;

    onSaveToJournal(
        `From Reading: "${activeNote.title}"`,
        `> ${selectedText}`
    );
    // Close the popup after saving
    setPopupPosition(null);
    setSelectedText(null);
  };

  const handleAddToTable = () => {
    if (!selectedText || !selectedTableId || !selectedColumnId) return;
    const tableToUpdate = tables.find(t => t.id === selectedTableId);
    if (!tableToUpdate) return;
    
    const newRow: VocabRow = {
      id: Date.now().toString(),
      cols: { [selectedColumnId]: selectedText },
      stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
    };
    
    onUpdateTable({ ...tableToUpdate, rows: [...tableToUpdate.rows, newRow] });
    setIsAddModalOpen(false);
    setPopupPosition(null);
    setSelectedText(null);
  };
  
  const handleNoteSelection = (noteId: string) => {
    setActiveNoteId(noteId);
    setIsSidebarOpen(false);
  };

  const SidebarContent = (
    <>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">My Notes</h2>
            <button onClick={onCreateNote} className="text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors p-1">
                <Icon name="plus" className="w-6 h-6"/>
            </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notes.length === 0 && (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">Create a note to get started.</div>
          )}
          {notes.sort((a,b) => b.createdAt - a.createdAt).map(note => (
            <div 
              key={note.id} 
              onClick={() => handleNoteSelection(note.id)}
              className={`p-4 cursor-pointer border-l-4 ${activeNoteId === note.id ? 'border-emerald-500 bg-slate-100 dark:bg-slate-900/50' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{note.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{note.content.substring(0, 50)}...</p>
            </div>
          ))}
        </div>
    </>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-900 animate-fadeIn">
      {popupPosition && selectedText && (
        <div 
          ref={popupRef}
          className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg flex items-center -translate-x-1/2"
          style={{ top: popupPosition.top, left: popupPosition.left }}
        >
          <button onClick={handleExplain} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-l-md">
            <Icon name="sparkles" className="w-4 h-4 text-cyan-500" /> Explain
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
          <button onClick={handleSaveJournalClick} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50">
            <Icon name="book" className="w-4 h-4 text-emerald-500" /> Journal
          </button>
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-r-md">
            <Icon name="plus" className="w-4 h-4" /> Add
          </button>
        </div>
      )}

      {/* Header */}
       <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0 bg-white dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors p-1 rounded-full">
                    <Icon name="arrowLeft" className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">Reading Space</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-500 dark:text-slate-400 p-1">
                <Icon name="list-bullet" className="w-6 h-6"/>
            </button>
        </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar (Drawer) */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
        <aside className={`
            absolute top-0 left-0 h-full w-3/4 max-w-xs bg-white dark:bg-slate-800 flex flex-col z-40
            transition-transform duration-300 ease-in-out 
            md:relative md:z-auto md:translate-x-0 md:w-1/4 md:border-r md:border-slate-200 md:dark:border-slate-700
            ${isSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}
            md:flex
        `}>
           {SidebarContent}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-10 flex flex-col overflow-y-auto">
            {activeNote ? (
            <>
                <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => onUpdateNote({...activeNote, title: e.target.value})}
                    className="text-3xl font-bold bg-transparent focus:outline-none focus:bg-white dark:focus:bg-slate-800 w-full rounded-md p-1 -m-1 text-slate-800 dark:text-white"
                />
                <button onClick={() => onDeleteNote(activeNote.id)} className="text-slate-400 hover:text-red-500 p-2">
                    <Icon name="trash" className="w-5 h-5"/>
                </button>
                </div>
                <div 
                ref={editorRef}
                onMouseUp={handleMouseUp}
                onBlur={(e) => handleUpdateContent(e.currentTarget.innerText)}
                contentEditable
                suppressContentEditableWarning
                className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 prose dark:prose-invert max-w-none prose-p:text-slate-600 dark:prose-p:text-slate-300"
                >
                {activeNote.content}
                </div>
            </>
            ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
                <p>Select a note from the menu, or create a new one.</p>
            </div>
            )}
        </main>
      </div>

      {/* Modals */}
      <Modal isOpen={isExplainModalOpen} onClose={() => setIsExplainModalOpen(false)} title={`Explanation for "${selectedText}"`}>
        <div className="p-6">
            {isExplainLoading ? (
            <div className="flex items-center justify-center h-24">
                <Icon name="spinner" className="w-8 h-8 text-emerald-500 animate-spin"/>
            </div>
            ) : (
            <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{explanation}</div>
            )}
        </div>
      </Modal>
      
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Add "${selectedText}" to a table`}>
          <div className="p-6">
            <div className="flex flex-col gap-4">
                <div>
                <label htmlFor="table-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Table</label>
                <select id="table-select" onChange={(e) => setSelectedTableId(e.target.value)} value={selectedTableId} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Select a table</option>
                    {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                </div>
                {selectedTableId && (
                    <div>
                        <label htmlFor="column-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Column</label>
                        <select 
                            id="column-select" 
                            value={selectedColumnId} 
                            onChange={(e) => setSelectedColumnId(e.target.value)} 
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Select a column</option>
                            {tables.find(t => t.id === selectedTableId)?.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}
            </div>
             <div className="mt-6 flex justify-end">
                <button 
                    onClick={handleAddToTable} 
                    disabled={!selectedTableId || !selectedColumnId} 
                    className="bg-emerald-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                    Add
                </button>
            </div>
          </div>
      </Modal>
    </div>
  );
};

export default ReadingScreen;