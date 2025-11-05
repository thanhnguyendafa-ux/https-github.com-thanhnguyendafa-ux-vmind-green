import React from 'react';
import Icon from './Icon';

interface VmindScreenProps {
  onBack: () => void;
  onStartStudySession: () => void;
  onNavigateToReading: () => void;
  onNavigateToJournal: () => void;
  onNavigateToFlashcards: () => void; // New prop
}

const VmindScreen: React.FC<VmindScreenProps> = ({ onBack, onStartStudySession, onNavigateToReading, onNavigateToJournal, onNavigateToFlashcards }) => {
  
  const learningModes = [
    { name: 'Study Session', icon: 'brain', description: 'Customizable quiz with various question types.', enabled: true, action: onStartStudySession },
    { name: 'Reading Space', icon: 'file-text', description: 'Extract vocabulary from texts and notes.', enabled: true, action: onNavigateToReading },
    { name: 'Flashcards', icon: 'credit-card', description: 'Classic review with Spaced Repetition.', enabled: true, action: onNavigateToFlashcards },
    { name: 'Journal', icon: 'pencil', description: 'View your automated study log.', enabled: true, action: onNavigateToJournal },
    { name: 'Sentence Scramble', icon: 'table-cells', description: 'Unscramble sentence fragments to test recall.', enabled: false },
    { name: 'Dictation', icon: 'play', description: 'Listen to audio and type what you hear.', enabled: false },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fadeIn">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Learning Center</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Choose your learning mode</p>
      </header>
      
      <main className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {learningModes.map(mode => (
          <div
            key={mode.name}
            onClick={mode.enabled ? mode.action : undefined}
            className={`
              bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 
              rounded-xl p-4 flex flex-col items-start text-left
              group transition-all
              ${mode.enabled 
                ? 'hover:border-emerald-500/80 dark:hover:border-emerald-600 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' 
                : 'opacity-50 cursor-not-allowed'}
            `}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center mb-3
              transition-colors
              ${mode.enabled 
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}
            `}>
              <Icon name={mode.icon} className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-base text-slate-800 dark:text-white mb-1">{mode.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex-grow">{mode.description}</p>
            {!mode.enabled && (
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-3">Coming Soon</span>
            )}
          </div>
        ))}
      </main>
    </div>
  );
};

export default VmindScreen;