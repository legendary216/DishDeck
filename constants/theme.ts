import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// 1. Zest (Orange - Default)
const OrangeTheme = {
  ...MD3LightTheme,
  name: 'Zest Orange',
  colors: {
    ...MD3LightTheme.colors,
    primary: '#D84315', onPrimary: '#FFFFFF',
    primaryContainer: '#FFDBcf', onPrimaryContainer: '#3E1C00',
    secondary: '#775651', secondaryContainer: '#FFDACC',
    background: '#FFF8F6', surfaceVariant: '#F5DED8', outline: '#85736E',
  },
};

// 2. Fresh (Sage Green)
const GreenTheme = {
  ...MD3LightTheme,
  name: 'Fresh Sage',
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2E7D32', onPrimary: '#FFFFFF',
    primaryContainer: '#B9F6CA', onPrimaryContainer: '#00210B',
    secondary: '#55624C', secondaryContainer: '#D9E7CB',
    background: '#FBFDF9', surfaceVariant: '#DCE5DD', outline: '#72796F',
  },
};

// 3. Ocean (Teal Blue)
const BlueTheme = {
  ...MD3LightTheme,
  name: 'Ocean Blue',
  colors: {
    ...MD3LightTheme.colors,
    primary: '#006978', onPrimary: '#FFFFFF',
    primaryContainer: '#A6EEFF', onPrimaryContainer: '#001F25',
    secondary: '#4A6267', secondaryContainer: '#CCE8E6',
    background: '#F5FCFF', surfaceVariant: '#DBE4E6', outline: '#70797C',
  },
};

// 4. Berry (Crimson Red)
const RedTheme = {
  ...MD3LightTheme,
  name: 'Berry Red',
  colors: {
    ...MD3LightTheme.colors,
    primary: '#B71C1C', onPrimary: '#FFFFFF',
    primaryContainer: '#FFDAD6', onPrimaryContainer: '#410002',
    secondary: '#775652', secondaryContainer: '#FFDAD6',
    background: '#FFF8F7', surfaceVariant: '#F5DDDA', outline: '#857371',
  },
};

// 5. Royal (Deep Purple) - Elegant
const PurpleTheme = {
  ...MD3LightTheme,
  name: 'Royal Purple',
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6750A4', onPrimary: '#FFFFFF',
    primaryContainer: '#EADDFF', onPrimaryContainer: '#21005D',
    secondary: '#625B71', secondaryContainer: '#E8DEF8',
    background: '#FFFBFE', surfaceVariant: '#E7E0EC', outline: '#79747E',
  },
};

// 6. Coffee (Espresso Brown) - Warm/Bakery Vibe
const CoffeeTheme = {
  ...MD3LightTheme,
  name: 'Espresso',
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6D4C41', onPrimary: '#FFFFFF',
    primaryContainer: '#D7CCC8', onPrimaryContainer: '#291815',
    secondary: '#5D4037', secondaryContainer: '#EFEBE9',
    background: '#F8F6F4', surfaceVariant: '#E7E0D8', outline: '#8D6E63',
  },
};

// 7. Sunny (Yellow/Gold) - Bright & Happy
const YellowTheme = {
  ...MD3LightTheme,
  name: 'Lemonade',
  colors: {
    ...MD3LightTheme.colors,
    primary: '#7A5900', onPrimary: '#FFFFFF', // Dark gold text for contrast
    primaryContainer: '#FFDEA4', onPrimaryContainer: '#261900',
    secondary: '#6D5C3F', secondaryContainer: '#F8E0B0',
    background: '#FFFCF3', surfaceVariant: '#EFE5CD', outline: '#7D7663',
  },
};

// 8. Midnight (Dark Mode) - High Contrast
const DarkTheme = {
  ...MD3DarkTheme,
  name: 'Midnight',
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#FFB74D', onPrimary: '#452B00', // Orange accent
    primaryContainer: '#663D00', onPrimaryContainer: '#FFDDB3',
    background: '#121212', surface: '#1E1E1E',
    surfaceVariant: '#49454F', outline: '#938F99',
  },
};

// EXPORT ALL
export const THEMES = [
  OrangeTheme, 
  GreenTheme, 
  BlueTheme, 
  RedTheme, 
  PurpleTheme, 
  CoffeeTheme, 
  YellowTheme,
  DarkTheme
];