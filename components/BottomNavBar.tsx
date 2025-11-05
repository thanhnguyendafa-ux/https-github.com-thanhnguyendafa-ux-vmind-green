import React from 'react';
import { Screen } from '../types';
import Icon from './Icon';
import { useAppContext } from '../context/AppContext';

interface NavItemProps {
  screen: Screen;
  label: string;
  icon: string;
}

const NavItem: React.FC<NavItemProps> = ({ screen, label, icon }) => {
  const { currentScreen, setCurrentScreen } = useAppContext();
  const isActive = currentScreen === screen;
  return (
    <button
      onClick={() => setCurrentScreen(screen)}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${
        isActive ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
      }`}
    >
      <Icon name={icon} className="w-6 h-6" />
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
};

const BottomNavBar: React.FC = () => {
  const navItems = [
    { screen: Screen.Home, label: 'Home', icon: 'compass' },
    { screen: Screen.Tables, label: 'Tables', icon: 'table-cells' },
    { screen: Screen.Library, label: 'Library', icon: 'book' },
    { screen: Screen.Vmind, label: 'Vmind', icon: 'brain' },
    { screen: Screen.Rewards, label: 'Rewards', icon: 'trophy' },
    { screen: Screen.Settings, label: 'Settings', icon: 'cog' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)] z-30">
      <nav className="flex justify-around h-full">
        {navItems.map(item => (
          <NavItem
            key={item.screen}
            screen={item.screen}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>
    </footer>
  );
};

export default BottomNavBar;
