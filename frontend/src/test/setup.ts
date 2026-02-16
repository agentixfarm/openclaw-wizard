import '@testing-library/jest-dom/vitest';

// Some runtimes inject a non-standard localStorage object (missing Storage methods).
// Provide a stable in-memory implementation for tests when needed.
if (
  typeof window.localStorage?.getItem !== 'function' ||
  typeof window.localStorage?.setItem !== 'function' ||
  typeof window.localStorage?.removeItem !== 'function' ||
  typeof window.localStorage?.clear !== 'function'
) {
  const storage = new Map<string, string>();
  const localStorageShim = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size;
    },
  } as Storage;

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: localStorageShim,
  });
}

// Mock window.matchMedia for jsdom environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
