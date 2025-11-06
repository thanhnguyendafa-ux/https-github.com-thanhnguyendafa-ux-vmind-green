import React from 'react';
import Icon from './Icon';

const LibraryScreen = () => {
  return (
    <div className="p-4 sm:p-6 md:p-8 mx-auto animate-fadeIn flex flex-col items-center justify-center text-center h-[calc(100vh-5rem)]">
      <Icon name="book" className="w-24 h-24 text-slate-300 dark:text-slate-700 mb-4" />
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Community Library</h1>
      <p className="text-slate-500 dark:text-slate-400">This feature is coming soon!</p>
      <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">You'll be able to browse, download, and share vocabulary tables with other Vmind users from around the world.</p>
    </div>
  );
};

export default LibraryScreen;
