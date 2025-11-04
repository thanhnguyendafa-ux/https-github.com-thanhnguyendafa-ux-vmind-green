import React, { useMemo } from 'react';
import { Table, UserStats, Theme, SyncStatus, Screen } from '../types';
import Icon from './Icon';

const XP_PER_LEVEL = 1000;

const SyncStatusIndicator: React.FC<{ status: SyncStatus }> = ({ status }) => {
  const statusMap = {
    idle: { text: 'Up to date', icon: 'check-circle', color: 'text-slate-500 dark:text-gray-400' },
    saving: { text: 'Saving...', icon: 'spinner', color: 'text-slate-500 dark:text-gray-400' },
    saved: { text: 'Saved', icon: 'check-circle', color: 'text-emerald-500' },
    error: { text: 'Sync error', icon: 'error-circle', color: 'text-red-500' },
  };
  const current = statusMap[status];
  return (
    <div className={`flex items-center gap-2 text-sm ${current.color} transition-colors`}>
      <Icon name={current.icon} className={`w-5 h-5 ${status === 'saving' ? 'animate-spin' : ''}`} />
      <span>{current.text}</span>
    </div>
  );
};

const ActivityHeatmap: React.FC<{ activity: UserStats['activity'] }> = ({ activity }) => {
  const days = useMemo(() => {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() + 1);
    
    const dayArray = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dayArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dayArray;
  }, []);
  
  const firstDayOfWeek = days[0]?.getDay() || 0;
  
  const getColor = (count: number | undefined) => {
    if (!count || count === 0) return 'bg-slate-200 dark:bg-slate-700/60';
    if (count < 300) return 'bg-emerald-200 dark:bg-emerald-900';
    if (count < 900) return 'bg-emerald-300 dark:bg-emerald-700';
    if (count < 1800) return 'bg-emerald-400 dark:bg-emerald-500';
    return 'bg-emerald-500 dark:bg-emerald-400';
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 sm:p-5 mb-6 shadow-md">
      <h2 className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Activity Heatmap</h2>
      <div className="flex justify-end text-xs text-slate-500 dark:text-gray-400 gap-1 mb-2 items-center">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-700/60"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-900"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-700"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-500"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400"></div>
        <span>More</span>
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-0.5 justify-start">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`pad-${i}`}></div>)}
        {days.map(day => {
          const dateString = day.toISOString().split('T')[0];
          const count = activity[dateString] || 0;
          return (
            <div 
              key={dateString}
              className={`w-2.5 h-2.5 rounded-sm ${getColor(count)}`}
              title={`${dateString}: ${Math.round(count/60)} minutes`}
            ></div>
          );
        })}
      </div>
    </div>
  );
};

interface HomeScreenProps {
  stats: UserStats;
  tables: Table[];
  theme: Theme;
  syncStatus: SyncStatus;
  isGuest: boolean;
  onSelectTable: (tableId: string) => void;
  onNavigateTo: (screen: keyof typeof Screen) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ stats, tables, theme, syncStatus, isGuest, onSelectTable, onNavigateTo, onToggleTheme, onLogout }) => {
  const currentLevelXp = stats.xp % XP_PER_LEVEL;
  const progressPercentage = (currentLevelXp / XP_PER_LEVEL) * 100;

  const recentlyStudiedTables = useMemo(() => {
    return tables
      .map(table => {
        const lastStudiedTimes = table.rows.map(w => w.stats.lastStudied).filter(Boolean) as number[];
        const mostRecent = Math.max(0, ...lastStudiedTimes);
        return { ...table, mostRecent };
      })
      .filter(table => table.mostRecent > 0)
      .sort((a, b) => b.mostRecent - a.mostRecent)
      .slice(0, 4);
  }, [tables]);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fadeIn">
      <header className="mb-6 flex justify-between items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Vmind</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400">Your personal vocabulary space.</p>
        </div>
        <div className='flex items-center gap-2'>
            {!isGuest && <SyncStatusIndicator status={syncStatus} />}
            <button onClick={onToggleTheme} className="p-2 rounded-full text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-6 h-6" />
            </button>
            {!isGuest && (
                 <button onClick={onLogout} title="Logout" className="p-2 rounded-full text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <Icon name="logout" className="w-6 h-6" />
                </button>
            )}
        </div>
      </header>

      <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 sm:p-5 shadow-md mb-6">
          <h2 className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Your Progress</h2>
          <div>
              <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold text-slate-800 dark:text-white">Level {stats.level}</span>
                  <span className="text-xs text-slate-500 dark:text-gray-400">{stats.xp.toLocaleString()} XP Total</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              <p className="text-right text-xs text-slate-500 dark:text-gray-400 mt-1">{currentLevelXp} / {XP_PER_LEVEL} XP</p>
          </div>
      </div>
      
      <ActivityHeatmap activity={stats.activity} />

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
            onClick={() => onNavigateTo('Vmind')}
            className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/80 dark:hover:border-emerald-600 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all group"
            >
                <Icon name="brain" className="w-8 h-8 text-slate-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors" />
                <div>
                    <h3 className="font-semibold text-sm sm:text-base text-slate-700 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Start Studying</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 hidden sm:block">Choose a mode</p>
                </div>
            </div>
            <div 
            onClick={() => onNavigateTo('Reading')}
            className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/80 dark:hover:border-emerald-600 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all group"
            >
                <Icon name="file-text" className="w-8 h-8 text-slate-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors" />
                <div>
                    <h3 className="font-semibold text-sm sm:text-base text-slate-700 dark:text-gray-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Reading Space</h3>
                     <p className="text-xs text-slate-500 dark:text-gray-400 hidden sm:block">Extract vocabulary</p>
                </div>
            </div>
        </div>
      </div>
      
      {recentlyStudiedTables.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3 text-slate-800 dark:text-white">Recently Studied</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentlyStudiedTables.map(table => (
              <div key={table.id} onClick={() => onSelectTable(table.id)} className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-3 flex items-center justify-between hover:border-emerald-500/80 hover:shadow-md transition-all group cursor-pointer hover:-translate-y-0.5">
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-0.5 truncate">{table.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400">{table.rows.length} words</p>
                  </div>
                   <Icon name="arrowRight" className="w-5 h-5 text-slate-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;