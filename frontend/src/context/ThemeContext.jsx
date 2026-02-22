import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('efficience-dark-mode');
    return saved === 'true';
  });
  const [forcedLight, setForcedLight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (dark && !forcedLight) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('efficience-dark-mode', dark);
  }, [dark, forcedLight]);

  const toggleDark = () => setDark(prev => !prev);

  // When forcedLight is active, dark is effectively false for all consumers
  const effectiveDark = dark && !forcedLight;

  return (
    <ThemeContext.Provider value={{ dark: effectiveDark, toggleDark, setForcedLight }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
