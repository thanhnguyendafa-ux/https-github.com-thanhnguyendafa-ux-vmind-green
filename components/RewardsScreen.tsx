
import React from 'react';
import { Badge, UserStats } from '../types';
import Icon from './Icon';

interface RewardsScreenProps {
  stats: UserStats;
  allBadges: Badge[];
}

const XP_PER_LEVEL = 1000;

const RewardsScreen: React.FC<RewardsScreenProps> = ({ stats, allBadges }) => {

  const getProgress = (badge: Badge): { current: number, target: number, percentage: number } => {
    const target = badge.value;
    let current = 0;
    if (badge.type === 'xp') {
      current = stats.xp;
    } else if (badge.type === 'time') {
      current = stats.totalStudyTimeSeconds;
    }
    const percentage = Math.min((current / target) * 100, 100);
    return { current, target, percentage };
  }
  
  const currentLevelXp = stats.xp % XP_PER_LEVEL;
  const progressPercentage = (currentLevelXp / XP_PER_LEVEL) * 100;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fadeIn">
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Progress & Rewards</h1>
      </div>

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

      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {allBadges.map(badge => {
          const isUnlocked = stats.unlockedBadges.includes(badge.id);
          const progress = getProgress(badge);
          
          return (
            <div 
              key={badge.id}
              className={`border rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 ${isUnlocked ? 'bg-emerald-500/10 dark:bg-emerald-900/40 border-emerald-500/30' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50'}`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${isUnlocked ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                <Icon name={badge.icon} className={`w-8 h-8 ${isUnlocked ? 'text-white' : 'text-slate-500 dark:text-gray-400'}`} />
              </div>
              <h3 className={`font-bold text-base mb-1 ${isUnlocked ? 'text-emerald-800 dark:text-white' : 'text-slate-800 dark:text-gray-300'}`}>{badge.name}</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 flex-grow mb-3">{badge.description}</p>
              
              {!isUnlocked && (
                <div className="w-full">
                    <p className="text-xs text-slate-500 dark:text-gray-500 mb-1 text-right">
                        {progress.current.toLocaleString()} / {progress.target.toLocaleString()}
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                        <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${progress.percentage}%` }}>
                        </div>
                    </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default RewardsScreen;