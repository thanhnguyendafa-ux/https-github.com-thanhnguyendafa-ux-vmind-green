import React from 'react';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';

const SettingsScreen: React.FC = () => {
  const { 
    handleLogout, 
    handleToggleTheme, 
    theme, 
    isGuest, 
    settings, 
    handleUpdateSettings 
  } = useAppContext();

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Settings</h1>
      
      <div className="space-y-6">
        {/* Account Section */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 shadow-md">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Account</h2>
          {isGuest ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">You are currently using Vmind as a guest. Sign up to sync your data across devices.</p>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">You are logged in.</p>
              <button onClick={handleLogout} className="bg-red-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-red-600 transition-colors text-sm">
                Log Out
              </button>
            </div>
          )}
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 shadow-md">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Theme</p>
            <button onClick={handleToggleTheme} className="flex items-center gap-2 bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-full font-semibold text-sm">
              <Icon name={theme === 'dark' ? 'moon' : 'sun'} className="w-5 h-5" />
              <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </div>

        {/* Journaling Section */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 shadow-md">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Journaling</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Choose how items are added to your study journal.</p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">Journal Logging Mode</p>
            <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold">
              <button 
                onClick={() => handleUpdateSettings({ journalMode: 'manual' })}
                className={`px-3 py-1 rounded-full ${settings.journalMode === 'manual' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}
              >
                Manual
              </button>
              <button 
                onClick={() => handleUpdateSettings({ journalMode: 'automatic' })}
                className={`px-3 py-1 rounded-full ${settings.journalMode === 'automatic' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}
              >
                Automatic
              </button>
            </div>
          </div>
           <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-right">
                {settings.journalMode === 'manual' 
                    ? "Manually save items with the bookmark icon." 
                    : "Incorrect answers are saved automatically."}
            </p>
        </div>

        {/* Data Management Section */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 shadow-md opacity-50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Data Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Backup and restore your data. (Coming Soon)</p>
          <div className="flex gap-4">
            <button disabled className="flex-1 bg-slate-600 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-70 cursor-not-allowed text-sm">
              Backup Data
            </button>
            <button disabled className="flex-1 bg-slate-600 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-70 cursor-not-allowed text-sm">
              Restore Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
