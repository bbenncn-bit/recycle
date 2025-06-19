'use client';

import { useTheme } from './theme-provider';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    // Return a placeholder with the same dimensions to prevent layout shift
    return (
      <div className="relative p-2 rounded-lg bg-white/10 border border-gray-200/50 w-9 h-9">
        <div className="w-5 h-5" />
      </div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 dark:bg-gray-800/50 dark:hover:bg-gray-700/50 transition-colors duration-200 border border-gray-200/50 dark:border-gray-600/50"
      aria-label={theme === 'light' ? '切换到暗色模式' : '切换到浅色模式'}
      title={theme === 'light' ? '切换到暗色模式' : '切换到浅色模式'}
    >
      <div className="relative w-5 h-5">
        <SunIcon 
          className={`absolute inset-0 w-5 h-5 text-gray-600 dark:text-gray-400 transition-all duration-300 ${
            theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-75'
          }`}
        />
        <MoonIcon 
          className={`absolute inset-0 w-5 h-5 text-gray-600 dark:text-gray-400 transition-all duration-300 ${
            theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
    </button>
  );
} 