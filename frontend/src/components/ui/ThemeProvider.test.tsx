import { render, screen } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';

function ThemeDisplay() {
  const { theme, resolvedTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
  });

  test('always uses dark theme', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  test('adds dark class to document', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('throws when useTheme is used outside provider', () => {
    const originalError = console.error;
    console.error = () => {};

    expect(() => render(<ThemeDisplay />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );

    console.error = originalError;
  });
});
