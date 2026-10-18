import { useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effective = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  document.documentElement.classList.toggle('dark', effective === 'dark');
  return effective;
}

export function useTheme(initial: ThemeMode = 'system') {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('pg_theme') as ThemeMode) || initial;
  });
  const [effective, setEffective] = useState<'light' | 'dark'>(() => applyTheme(mode));

  useEffect(() => {
    const eff = applyTheme(mode);
    setEffective(eff);
    localStorage.setItem('pg_theme', mode);
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'system') setEffective(applyTheme('system'));
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  return { mode, setMode, effective };
}
