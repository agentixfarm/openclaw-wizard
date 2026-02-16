import { createContext, useContext, useEffect, type ReactNode } from 'react';

type ResolvedTheme = 'dark';

interface ThemeContextValue {
  theme: 'dark';
  resolvedTheme: ResolvedTheme;
  setTheme: (t: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const value: ThemeContextValue = {
    theme: 'dark',
    resolvedTheme: 'dark',
    setTheme: () => {}, // no-op, always dark
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Keep the type export for compatibility
export type Theme = 'dark';
