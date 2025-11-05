import * as React from 'react';
import { Note } from '../types';
import Icon from './Icon';
import { useDebounce } from '../hooks/useDebounce';

interface JournalEntryProps {
  note: Note;
  onUpdateNote: (note: Note) => void;
  isInitiallyExpanded: boolean;
}

const JournalEntry: React.FC<JournalEntryProps> = ({ note, onUpdateNote, isInitiallyExpanded }) => {
  const [isExpanded, setIsExpanded] = React.useState(isInitiallyExpanded);
  const [content, setContent] = React.useState(note.content);
  const debouncedContent = useDebounce(content, 500);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (debouncedContent !== note.content) {
      onUpdateNote({ ...note, content: debouncedContent });
    }
  }, [debouncedContent, note, onUpdateNote]);

  React.useEffect(() => {
    setContent(note.content);
  }, [note.content]);

  React.useEffect(() => {
    if (isExpanded && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isExpanded, content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${e.target.scrollHeight}px`;
    }
  };

  const handleExport = () => {
    const blob = new Blob([note.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${note.title}</title></head>
          <body style="font-family: sans-serif; white-space: pre-wrap;">
            <h1>${note.title}</h1>
            <hr />
            <p>${note.content.replace(/\n/g, '<br>')}</p>
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const dateString = note.title.replace('Journal - ', '');
  const date = new Date(dateString);
  const formattedDate = isNaN(date.getTime()) ? dateString : date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl shadow-md transition-all duration-300">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-4 text-left"
        aria-expanded={isExpanded}
      >
        <h3 className="font-bold text-lg text-slate-800 dark:text-white">{formattedDate}</h3>
        <Icon name="chevron-down" className={`w-6 h-6 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>
      {isExpanded && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 animate-fadeIn">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            className="w-full bg-slate-100/50 dark:bg-slate-900/50 rounded-md p-3 text-slate-600 dark:text-slate-300 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none overflow-hidden"
            placeholder="Start writing..."
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Icon name="printer" className="w-4 h-4" /> Print
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm transition-colors bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Icon name="arrow-down-tray" className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface JournalScreenProps {
  notes: Note[];
  onUpdateNote: (note: Note) => void;
  onBack: () => void;
}

const JournalScreen: React.FC<JournalScreenProps> = ({ notes, onUpdateNote, onBack }) => {
  const journalEntries = React.useMemo(() => {
    return notes
      .filter(n => n.title.startsWith('Journal - '))
      .sort((a, b) => {
        // Handle potential invalid date strings gracefully
        const dateA = new Date(a.title.replace('Journal - ', '')).getTime();
        const dateB = new Date(b.title.replace('Journal - ', '')).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
      });
  }, [notes]);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fadeIn">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
          <Icon name="arrowLeft" className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Study Journal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">A log of your learning journey.</p>
        </div>
      </header>
      
      <main className="space-y-4">
        {journalEntries.length > 0 ? (
          journalEntries.map((note, index) => (
            <JournalEntry
              key={note.id}
              note={note}
              onUpdateNote={onUpdateNote}
              isInitiallyExpanded={index === 0} // Expand the most recent entry by default
            />
          ))
        ) : (
          <div className="text-center py-16">
            <Icon name="pencil" className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Your Journal is Empty</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Entries are automatically added when you save items from study sessions.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default JournalScreen;
