import React, { useEffect, useState } from 'react';
import { Sun, Moon, Coffee } from 'lucide-react';
import { Button } from './ui/Button';

type ThemeMode = 'light' | 'dark' | 'sepia';

const applyTheme = (theme: ThemeMode) => {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark', 'theme-sepia', 'dark');
  root.classList.add(`theme-${theme}`);
  if (theme === 'dark') {
    root.classList.add('dark');
  }
};

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'sepia') {
      return stored;
    }
    return 'light';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'sepia';
      return 'light';
    });
  };

  const icon =
    theme === 'dark' ? <Sun className="w-4 h-4" /> : theme === 'sepia' ? <Coffee className="w-4 h-4" /> : <Moon className="w-4 h-4" />;
  const label =
    theme === 'dark' ? 'Switch to sepia' : theme === 'sepia' ? 'Switch to light' : 'Switch to dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="flex items-center gap-2"
      aria-label={label}
    >
      {icon}
    </Button>
  );
};
