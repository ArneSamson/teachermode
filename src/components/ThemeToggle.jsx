'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  // Omdat je de app standaard in dark mode hebt gezet, starten we de state op true
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check of de gebruiker eerder 'light' heeft gekozen toen de pagina laadde
    const opgeslagenThema = localStorage.getItem('thema');
    if (opgeslagenThema === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const wisselThema = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('thema', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('thema', 'dark');
      setIsDark(true);
    }
  };

  return (
    <button 
      onClick={wisselThema}
      className="p-2 px-4 rounded-full bg-bg-card border border-border-main text-text-muted hover:text-text-main hover:bg-border-main transition-colors text-sm font-bold flex items-center gap-2 cursor-pointer"
      title={isDark ? "Schakel over naar Light Mode" : "Schakel over naar Dark Mode"}
    >
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}