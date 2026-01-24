import React, { createContext, useState, useContext } from 'react';
import { THEMES } from '../constants/theme';

// Create Context
const ThemeContext = createContext({
  themeIndex: 0,
  cycleTheme: () => {},
  currentTheme: THEMES[0],
});

// Provider Component
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeIndex, setThemeIndex] = useState(0);

  const cycleTheme = () => {
    setThemeIndex((prev) => (prev + 1) % THEMES.length);
  };

  return (
    <ThemeContext.Provider value={{ 
        themeIndex, 
        cycleTheme, 
        currentTheme: THEMES[themeIndex] 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use it easily
export const useAppTheme = () => useContext(ThemeContext);