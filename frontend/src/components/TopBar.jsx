import React from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function TopBar({ title, onOpenMobileSidebar, right }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border dark:border-dark-border bg-surface/90 backdrop-blur-md dark:bg-dark-surface/90 px-4 sm:px-6">
      <button onClick={onOpenMobileSidebar} className="lg:hidden btn-ghost !p-2">
        <Menu size={18} />
      </button>
      <h1 className="font-display font-semibold text-ink dark:text-dark-ink truncate">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {right}
        <button onClick={toggleTheme} className="btn-ghost !p-2" aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </div>
    </header>
  );
}
