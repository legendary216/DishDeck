import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  // 1. BRAND COLORS (The "Personality")
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',       // Your Main Purple
    onPrimary: '#FFFFFF',     // Text on top of purple (White)
    
    secondary: '#03DAC6',     // Teal Accent (Great for "Success" or "Active")
    secondaryContainer: '#EADDFF', // Light purple background for active tabs
    
    background: '#F8F9FA',    // Light Grey (Better than harsh #FFF)
    surface: '#FFFFFF',       // Cards remain pure white
    
    error: '#B00020',         // Standard Red
    
    // Custom Grays for text
    onSurface: '#121212',     // Almost Black (High Emphasis)
    onSurfaceVariant: '#757575', // Grey (Medium Emphasis)
  },

  // 2. SHAPES (The "Feel")
  roundness: 12, // 12px corners feels modern (Standard is 4px)
  
  // 3. TYPOGRAPHY (Optional override)
  // You can stick to defaults for now, they are good.
};