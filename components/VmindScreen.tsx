import React from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';
import { Screen } from '../types';

const VmindScreen: React.FC = () => {
  const { setCurrentScreen } = useAppContext();

  const learningModes = [
    { name: 'Study Session', icon: 'brain', colorClasses: { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-600 dark:text-emerald-400' }, description: 'Customizable quiz with various question types.', enabled: true, action: () => setCurrentScreen(Screen.StudySetup) },
    { name: 'Reading Space', icon: 'book', colorClasses: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-400' }, description: 'Extract vocabulary from texts and notes.', enabled: true, action: () => setCurrentScreen(Screen.Reading) },
    { name: 'Flashcards', icon: 'stack-of-cards', colorClasses: { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-600 dark:text-amber-400' }, description: 'Classic review with Spaced Repetition.', enabled: true, action: () => setCurrentScreen(Screen.Flashcards) },
    { name: 'Journal', icon: 'pencil', colorClasses: { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-600 dark:text-indigo-400' }, description: 'View your automated study log.', enabled: true, action: () => setCurrentScreen(Screen.Journal) },
    { name: 'Sentence Scramble', icon: 'puzzle-piece', colorClasses: { bg: 'bg-cyan-100 dark:bg-cyan-900/50', text: 'text-cyan-600 dark:text-cyan-400' }, description: 'Unscramble sentence fragments to test recall.', enabled: true, action: () => setCurrentScreen(Screen.ScrambleSetup) },
    { name: 'Theater Mode', icon: 'film', colorClasses: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400' }, description: 'Passive, auto-playing "movie mode" for review.', enabled: true, action: () => setCurrentScreen(Screen.TheaterSetup) },
    { name: 'Dictation', icon: 'headphones', colorClasses: { bg: 'bg-rose-100 dark:bg-rose-900/50', text: 'text-rose-600 dark:text-rose-400' }, description: 'Listen to audio and type what you hear.', enabled: true, action: () => setCurrentScreen(Screen.Dictation) },
  ];

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
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
                ? `${mode.colorClasses.bg} ${mode.colorClasses.text}` 
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